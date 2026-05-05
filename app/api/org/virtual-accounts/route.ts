import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { createVirtualAccount, VirtualAccountCurrency } from '@/lib/payments/grey';
import { logAuditEvent, getClientIp } from '@/lib/audit';
import { z } from 'zod';

const createSchema = z.object({
  currency: z.enum(['USD', 'GBP', 'EUR']),
});

/**
 * GET /api/org/virtual-accounts
 * List all provisioned virtual bank accounts (USD/GBP/EUR) for the org.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if (profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const supabase = createAdminClient();
    const { data: org } = await supabase
      .from('organizations')
      .select('grey_virtual_accounts')
      .eq('id', profile.org_id)
      .single();

    return NextResponse.json({ accounts: org?.grey_virtual_accounts ?? [] });
  } catch (error) {
    console.error('GET org/virtual-accounts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/org/virtual-accounts
 * Provision a new virtual bank account (USD, GBP, or EUR) via Grey.
 * Only one account per currency per org.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if (profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', fields: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { currency } = parsed.data;
    const supabase = createAdminClient();

    const { data: org } = await supabase
      .from('organizations')
      .select('grey_virtual_accounts, name')
      .eq('id', profile.org_id)
      .single();

    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const existing = (org.grey_virtual_accounts ?? []) as any[];
    if (existing.some((a: any) => a.currency === currency)) {
      return NextResponse.json(
        { error: `A ${currency} virtual account is already provisioned for this organization` },
        { status: 409 }
      );
    }

    const reference = `OT-${profile.org_id.slice(0, 8)}-${currency}-${Date.now().toString(36)}`;
    const account = await createVirtualAccount({
      business_name: org.name,
      currency: currency as VirtualAccountCurrency,
      reference,
    });

    const newEntry = {
      currency,
      account_id: account.account_id,
      account_number: account.account_number,
      routing_number: account.routing_number ?? null,
      bank_name: account.bank_name,
      iban: account.iban ?? null,
      swift: account.swift ?? null,
      bic: account.bic ?? null,
      created_at: new Date().toISOString(),
    };

    const updatedAccounts = [...existing, newEntry];
    await supabase
      .from('organizations')
      .update({ grey_virtual_accounts: updatedAccounts })
      .eq('id', profile.org_id);

    await logAuditEvent({
      orgId: profile.org_id,
      actorId: user.id,
      actorEmail: user.email,
      action: 'virtual_account.provisioned',
      resourceType: 'organization',
      resourceId: profile.org_id,
      metadata: { currency, account_id: account.account_id },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ account: newEntry }, { status: 201 });
  } catch (error) {
    console.error('POST org/virtual-accounts error:', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
