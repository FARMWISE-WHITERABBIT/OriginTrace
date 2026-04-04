/**
 * DELETE /api/shipments/[id]/stuffing/[recordId] — remove a stuffing line item
 *
 * Roles: admin, logistics_coordinator
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, getAuthenticatedProfile } from '@/lib/api-auth';

const WRITE_ROLES = ['admin', 'logistics_coordinator'];

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; recordId: string } }
) {
  try {
    const supabase = createServiceClient();
    const { user, profile } = await getAuthenticatedProfile();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if (!WRITE_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { error } = await supabase
      .from('container_stuffing_records')
      .delete()
      .eq('id', params.recordId)
      .eq('shipment_id', params.id)
      .eq('org_id', profile.org_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Stuffing record DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
