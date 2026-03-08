import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getResendClient } from '@/lib/email/resend-client';
import { buildDocumentExpiryEmail } from '@/lib/email/templates';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error('[CRON] CRON_SECRET env var is not set — refusing to run cron job');
      return NextResponse.json({ error: 'Server misconfiguration: CRON_SECRET is required' }, { status: 500 });
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase is not properly configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const { data: expiringDocs, error: docsError } = await supabase
      .from('documents')
      .select('id, org_id, title, document_type, expiry_date, status')
      .not('expiry_date', 'is', null)
      .neq('status', 'archived')
      .lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0])
      .order('expiry_date', { ascending: true });

    if (docsError) {
      console.error('Error fetching expiring documents:', docsError);
      return NextResponse.json(
        { error: 'Failed to fetch documents', details: docsError.message },
        { status: 500 }
      );
    }

    if (!expiringDocs || expiringDocs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No expiring documents found',
        emails_sent: 0,
        notifications_created: 0,
      });
    }

    const docsByOrg: Record<string, typeof expiringDocs> = {};
    for (const doc of expiringDocs) {
      if (!docsByOrg[doc.org_id]) {
        docsByOrg[doc.org_id] = [];
      }
      docsByOrg[doc.org_id].push(doc);
    }

    const orgIds = Object.keys(docsByOrg);

    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name')
      .in('id', orgIds);

    const orgMap: Record<string, string> = {};
    for (const org of orgs || []) {
      orgMap[org.id] = org.name;
    }

    const { data: admins } = await supabase
      .from('profiles')
      .select('user_id, org_id, full_name, role')
      .in('org_id', orgIds)
      .in('role', ['admin', 'compliance_officer']);

    const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const userEmailMap: Record<string, string> = {};
    for (const u of authUsers?.users || []) {
      if (u.email) {
        userEmailMap[u.id] = u.email;
      }
    }

    const adminsByOrg: Record<string, Array<{ userId: string; email: string; fullName: string }>> = {};
    for (const admin of admins || []) {
      const email = userEmailMap[admin.user_id];
      if (!email) continue;
      if (!adminsByOrg[admin.org_id]) {
        adminsByOrg[admin.org_id] = [];
      }
      adminsByOrg[admin.org_id].push({
        userId: admin.user_id,
        email,
        fullName: admin.full_name,
      });
    }

    let emailsSent = 0;
    let notificationsCreated = 0;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://origintrace.trade';

    let resendClient: Awaited<ReturnType<typeof getResendClient>> | null = null;
    try {
      resendClient = await getResendClient();
    } catch (e) {
      console.warn('Resend not configured, skipping emails:', e);
    }

    for (const orgId of orgIds) {
      const docs = docsByOrg[orgId];
      const orgName = orgMap[orgId] || 'Your Organization';
      const orgAdmins = adminsByOrg[orgId] || [];

      const docsWithDays = docs.map(doc => {
        const expiryDate = new Date(doc.expiry_date);
        const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: doc.id,
          title: doc.title,
          documentType: doc.document_type,
          expiryDate: expiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
          daysRemaining,
        };
      });

      const alertType = (days: number) =>
        days <= 0 ? 'expired' : days <= 7 ? 'expiry_7d' : 'expiry_30d';

      for (const doc of docsWithDays) {
        const type = alertType(doc.daysRemaining);
        const { data: existingAlert } = await supabase
          .from('document_alerts')
          .select('id')
          .eq('document_id', doc.id)
          .eq('alert_type', type)
          .maybeSingle();

        if (!existingAlert) {
          await supabase.from('document_alerts').insert({
            document_id: doc.id,
            org_id: orgId,
            alert_type: type,
          });
        }
      }

      for (const admin of orgAdmins) {
        const urgencyPrefix = docsWithDays.some(d => d.daysRemaining <= 0)
          ? 'Documents have expired'
          : docsWithDays.some(d => d.daysRemaining <= 7)
          ? 'Documents expiring within 7 days'
          : 'Documents expiring within 30 days';

        const { error: notifError } = await supabase.from('notifications').insert({
          user_id: admin.userId,
          org_id: orgId,
          type: 'document_expiry',
          title: `${urgencyPrefix} (${docsWithDays.length})`,
          message: `${docsWithDays.length} document(s) for ${orgName} require attention. Review and renew them in the Document Vault.`,
          is_read: false,
          link: '/app/documents',
        });

        if (!notifError) {
          notificationsCreated++;
        }

        if (resendClient) {
          try {
            const { html, text } = buildDocumentExpiryEmail({
              recipientName: admin.fullName,
              orgName,
              documents: docsWithDays.map(d => ({
                title: d.title,
                documentType: d.documentType,
                expiryDate: d.expiryDate,
                daysRemaining: d.daysRemaining,
              })),
              documentVaultUrl: `${baseUrl}/app/documents`,
            });

            await resendClient.client.emails.send({
              from: resendClient.fromEmail,
              to: admin.email,
              subject: `[OriginTrace] ${urgencyPrefix} - ${orgName}`,
              html,
              text,
            });

            emailsSent++;
          } catch (emailErr) {
            console.error(`Failed to send email to ${admin.email}:`, emailErr);
          }
        }
      }

      for (const doc of docs) {
        const expiryDate = new Date(doc.expiry_date);
        const newStatus = expiryDate < now ? 'expired' : 'expiring_soon';
        if (doc.status !== newStatus) {
          await supabase
            .from('documents')
            .update({ status: newStatus })
            .eq('id', doc.id);
        }
      }
    }

    return NextResponse.json({
      success: true,
      documents_checked: expiringDocs.length,
      organizations_affected: orgIds.length,
      emails_sent: emailsSent,
      notifications_created: notificationsCreated,
    });
  } catch (error: any) {
    console.error('Document expiry cron error:', error);
    return NextResponse.json(
      { error: 'Cron job failed', details: error.message },
      { status: 500 }
    );
  }
}
