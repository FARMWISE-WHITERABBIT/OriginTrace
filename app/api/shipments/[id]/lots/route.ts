import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, getAuthenticatedProfile, checkTierAccess } from '@/lib/api-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient();

    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const shipmentRoles = ['admin', 'logistics_coordinator', 'compliance_officer'];
    if (!shipmentRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const hasAccess = await checkTierAccess(supabase, profile.org_id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Shipment Readiness requires Pro tier or above' }, { status: 403 });
    }

    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('id')
      .eq('id', params.id)
      .eq('org_id', profile.org_id)
      .single();

    if (shipmentError || !shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    const { data: lots, error } = await supabase
      .from('shipment_lots')
      .select('*')
      .eq('shipment_id', params.id)
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching shipment lots:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const lotsWithItems = await Promise.all(
      (lots || []).map(async (lot: any) => {
        const { data: items } = await supabase
          .from('shipment_lot_items')
          .select('*')
          .eq('lot_id', lot.id);
        return { ...lot, items: items || [] };
      })
    );

    return NextResponse.json({ lots: lotsWithItems });

  } catch (error) {
    console.error('Shipment lots API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient();

    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const shipmentRoles = ['admin', 'logistics_coordinator', 'compliance_officer'];
    if (!shipmentRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const hasAccess = await checkTierAccess(supabase, profile.org_id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Shipment Readiness requires Pro tier or above' }, { status: 403 });
    }

    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('id, shipment_code')
      .eq('id', params.id)
      .eq('org_id', profile.org_id)
      .single();

    if (shipmentError || !shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    const body = await request.json();
    let { lot_code } = body;

    if (!lot_code) {
      const { count } = await supabase
        .from('shipment_lots')
        .select('id', { count: 'exact', head: true })
        .eq('shipment_id', params.id)
        .eq('org_id', profile.org_id);

      const index = (count || 0) + 1;
      lot_code = `LOT-${shipment.shipment_code}-${index}`;
    }

    const insertData: Record<string, any> = {
      shipment_id: params.id,
      org_id: profile.org_id,
      lot_code,
    };

    if (body.commodity !== undefined) insertData.commodity = body.commodity;
    if (body.notes !== undefined) insertData.notes = body.notes;

    const { data: lot, error: insertError } = await supabase
      .from('shipment_lots')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating shipment lot:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ lot, success: true });

  } catch (error) {
    console.error('Shipment lots API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient();

    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const shipmentRoles = ['admin', 'logistics_coordinator', 'compliance_officer'];
    if (!shipmentRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const hasAccess = await checkTierAccess(supabase, profile.org_id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Shipment Readiness requires Pro tier or above' }, { status: 403 });
    }

    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('id')
      .eq('id', params.id)
      .eq('org_id', profile.org_id)
      .single();

    if (shipmentError || !shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    const body = await request.json();
    const { lot_id, add_items, remove_items, update } = body;

    if (!lot_id) {
      return NextResponse.json({ error: 'lot_id is required' }, { status: 400 });
    }

    const { data: lot, error: lotError } = await supabase
      .from('shipment_lots')
      .select('*')
      .eq('id', lot_id)
      .eq('shipment_id', params.id)
      .eq('org_id', profile.org_id)
      .single();

    if (lotError || !lot) {
      return NextResponse.json({ error: 'Lot not found' }, { status: 404 });
    }

    if (add_items && Array.isArray(add_items)) {
      const insertRows = add_items.map((item: any) => {
        const row: Record<string, any> = {
          lot_id,
          shipment_item_id: item.shipment_item_id,
        };
        if (item.batch_id !== undefined) row.batch_id = item.batch_id;
        if (item.weight_kg !== undefined) row.weight_kg = item.weight_kg;
        if (item.bag_count !== undefined) row.bag_count = item.bag_count;
        return row;
      });

      const { error: addError } = await supabase
        .from('shipment_lot_items')
        .insert(insertRows);

      if (addError) {
        console.error('Error adding lot items:', addError);
        return NextResponse.json({ error: addError.message }, { status: 500 });
      }

      const { data: allLotItems } = await supabase
        .from('shipment_lot_items')
        .select('shipment_item_id, weight_kg, bag_count')
        .eq('lot_id', lot_id);

      const totalWeight = (allLotItems || []).reduce((sum: number, i: any) => sum + (i.weight_kg || 0), 0);
      const totalBags = (allLotItems || []).reduce((sum: number, i: any) => sum + (i.bag_count || 0), 0);

      const shipmentItemIds = [...new Set((allLotItems || []).map((i: any) => i.shipment_item_id))];
      let farmCount = 0;
      if (shipmentItemIds.length > 0) {
        const { data: shipmentItems } = await supabase
          .from('shipment_items')
          .select('farm_id')
          .in('id', shipmentItemIds);
        const distinctFarms = new Set((shipmentItems || []).map((si: any) => si.farm_id).filter(Boolean));
        farmCount = distinctFarms.size;
      }

      let massBalanceValid = true;
      if (shipmentItemIds.length > 0) {
        const { data: sourceItems } = await supabase
          .from('shipment_items')
          .select('weight_kg')
          .in('id', shipmentItemIds);
        const totalSourceWeight = (sourceItems || []).reduce((sum: number, i: any) => sum + (i.weight_kg || 0), 0);
        if (totalWeight > totalSourceWeight) {
          massBalanceValid = false;
        }
      }

      await supabase
        .from('shipment_lots')
        .update({
          total_weight_kg: totalWeight,
          total_bags: totalBags,
          farm_count: farmCount,
          mass_balance_valid: massBalanceValid,
        })
        .eq('id', lot_id);
    }

    if (remove_items && Array.isArray(remove_items)) {
      const { error: removeError } = await supabase
        .from('shipment_lot_items')
        .delete()
        .in('id', remove_items)
        .eq('lot_id', lot_id);

      if (removeError) {
        console.error('Error removing lot items:', removeError);
        return NextResponse.json({ error: removeError.message }, { status: 500 });
      }

      const { data: remainingItems } = await supabase
        .from('shipment_lot_items')
        .select('shipment_item_id, weight_kg, bag_count')
        .eq('lot_id', lot_id);

      const totalWeight = (remainingItems || []).reduce((sum: number, i: any) => sum + (i.weight_kg || 0), 0);
      const totalBags = (remainingItems || []).reduce((sum: number, i: any) => sum + (i.bag_count || 0), 0);

      const shipmentItemIds = [...new Set((remainingItems || []).map((i: any) => i.shipment_item_id))];
      let farmCount = 0;
      if (shipmentItemIds.length > 0) {
        const { data: shipmentItems } = await supabase
          .from('shipment_items')
          .select('farm_id')
          .in('id', shipmentItemIds);
        const distinctFarms = new Set((shipmentItems || []).map((si: any) => si.farm_id).filter(Boolean));
        farmCount = distinctFarms.size;
      }

      await supabase
        .from('shipment_lots')
        .update({
          total_weight_kg: totalWeight,
          total_bags: totalBags,
          farm_count: farmCount,
        })
        .eq('id', lot_id);
    }

    if (update && typeof update === 'object') {
      const updateData: Record<string, any> = {};
      if (update.commodity !== undefined) updateData.commodity = update.commodity;
      if (update.notes !== undefined) updateData.notes = update.notes;
      if (update.mass_balance_valid !== undefined) updateData.mass_balance_valid = update.mass_balance_valid;

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('shipment_lots')
          .update(updateData)
          .eq('id', lot_id);

        if (updateError) {
          console.error('Error updating lot:', updateError);
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }
      }
    }

    const { data: updatedLot } = await supabase
      .from('shipment_lots')
      .select('*')
      .eq('id', lot_id)
      .single();

    const { data: lotItems } = await supabase
      .from('shipment_lot_items')
      .select('*')
      .eq('lot_id', lot_id);

    return NextResponse.json({
      lot: { ...updatedLot, items: lotItems || [] },
      success: true,
    });

  } catch (error) {
    console.error('Shipment lots API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
