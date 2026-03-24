import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import * as XLSX from 'xlsx';

const EVENT_SLUG = 'yexdep-2026';

function isAdminAuthorized(request: NextRequest): boolean {
  const key = request.headers.get('x-admin-key');
  const adminKey = process.env.EVENTS_ADMIN_KEY;
  return !!adminKey && key === adminKey;
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('event_registrations')
    .select('full_name, email, phone, organization, role, state, registered_at, checked_in, checked_in_at')
    .eq('event_slug', EVENT_SLUG)
    .order('registered_at', { ascending: true });

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
    'State of Origin': r.state,
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

  // Column widths
  ws['!cols'] = [
    { wch: 4 },  // #
    { wch: 28 }, // Full Name
    { wch: 30 }, // Email
    { wch: 16 }, // Phone
    { wch: 32 }, // Organisation
    { wch: 24 }, // Role
    { wch: 18 }, // State
    { wch: 22 }, // Registered At
    { wch: 12 }, // Checked In
    { wch: 22 }, // Check-in Time
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Registrations');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="YEXDEP_2026_Registrations_${date}.xlsx"`,
    },
  });
}
