import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getAdminClient } from '@/lib/supabase/admin';
import * as XLSX from 'xlsx';

async function assertSuperadmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const admin = getAdminClient();
  const { data } = await admin.from('system_admins').select('id').eq('user_id', user.id).single();
  return !!data;
}

export async function GET(request: NextRequest) {
  if (!(await assertSuperadmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }

  const supabase = getAdminClient();
  const { data: rawData, error } = await supabase
    .from('event_registrations')
    .select(
      'full_name, email, phone, organization, role, state, ' +
      'currently_exporting, export_products, nepc_registered, ' +
      'registered_at, checked_in, checked_in_at'
    )
    .eq('event_slug', slug)
    .order('registered_at', { ascending: true });

  if (error) {
    console.error('[superadmin/events/export] DB error:', error);
    return NextResponse.json({ error: 'Failed to export' }, { status: 500 });
  }

  const data = rawData as unknown as Array<{
    full_name: string | null; email: string | null; phone: string | null;
    organization: string | null; role: string | null; state: string | null;
    currently_exporting: boolean | null; export_products: string | null;
    nepc_registered: boolean | null; registered_at: string | null;
    checked_in: boolean | null; checked_in_at: string | null;
  }> | null;

  const rows = (data ?? []).map((r, i) => ({
    '#': i + 1,
    'Full Name': r.full_name,
    'Email': r.email,
    'Phone': r.phone,
    'Organisation': r.organization,
    'Role / Job Title': r.role,
    'State': r.state,
    'Currently Exporting': r.currently_exporting === true ? 'Yes' : r.currently_exporting === false ? 'No' : '',
    'Export Products': r.export_products ?? '',
    'NEPC Registered': r.nepc_registered === true ? 'Yes' : r.nepc_registered === false ? 'No' : '',
    'Registered At (WAT)': r.registered_at
      ? new Date(r.registered_at).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })
      : '',
    'Checked In': r.checked_in ? 'Yes' : 'No',
    'Check-in Time (WAT)': r.checked_in_at
      ? new Date(r.checked_in_at).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })
      : '',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 4 }, { wch: 28 }, { wch: 30 }, { wch: 16 }, { wch: 32 },
    { wch: 24 }, { wch: 18 }, { wch: 18 }, { wch: 30 }, { wch: 18 },
    { wch: 22 }, { wch: 12 }, { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Registrations');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  const date = new Date().toISOString().slice(0, 10);
  const label = slug.toUpperCase().replace(/-/g, '_');

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${label}_Registrations_${date}.xlsx"`,
    },
  });
}
