import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import * as XLSX from 'xlsx';

function isAdminAuthorized(request: NextRequest): boolean {
  const key = request.headers.get('x-admin-key');
  const adminKey = process.env.EVENTS_ADMIN_KEY;
  return !!adminKey && key === adminKey;
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const slug = request.nextUrl.searchParams.get('slug') ?? 'yexdep-2026';
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

  const data = rawData as unknown as Array<{
    full_name: string | null;
    email: string | null;
    phone: string | null;
    organization: string | null;
    role: string | null;
    state: string | null;
    currently_exporting: boolean | null;
    export_products: string | null;
    nepc_registered: boolean | null;
    registered_at: string | null;
    checked_in: boolean | null;
    checked_in_at: string | null;
  }> | null;

  if (error) {
    console.error('[events/export] DB error:', error);
    return NextResponse.json({ error: 'Failed to export registrations' }, { status: 500 });
  }

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
    { wch: 4 },  // #
    { wch: 28 }, // Full Name
    { wch: 30 }, // Email
    { wch: 16 }, // Phone
    { wch: 32 }, // Organisation
    { wch: 24 }, // Role
    { wch: 18 }, // State
    { wch: 18 }, // Currently Exporting
    { wch: 30 }, // Export Products
    { wch: 18 }, // NEPC Registered
    { wch: 22 }, // Registered At
    { wch: 12 }, // Checked In
    { wch: 22 }, // Check-in Time
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
