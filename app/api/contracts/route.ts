import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { logAuditEvent } from '@/lib/audit';
import { enforceTier } from '@/lib/api/tier-guard';
import { parsePagination } from '@/lib/api/validation';
import { parseBuyerProfileMetadata } from '@/lib/compliance/buyer-profile';
import {
  contractAndShipmentProfilesMatch,
  profileBelongsToExporter,
} from '@/lib/compliance/contract-profile';
import { z } from 'zod';

const contractCreateSchema = z.object({
  exporter_org_id: z.string().uuid({ message: 'Exporter is required' }),
  commodity: z.string().min(1, 'Commodity is required'),
  quantity_mt: z.number().positive().optional(),
  delivery_deadline: z.string().optional(),
  destination_port: z.string().optional(),
  compliance_profile_id: z.string().uuid('Compliance profile must be a valid UUID').optional(),
  quality_requirements: z.record(z.any()).optional(),
  notes: z.string().optional(),
});

const contractPatchSchema = z.object({
  contract_id: z.string().uuid({ message: 'contract_id is required' }),
  status: z.enum(['draft', 'active', 'fulfilled', 'cancelled']).optional(),
  shipment_id: z.string().uuid().optional(),
  commodity: z.string().min(1).optional(),
  quantity_mt: z.number().positive().optional(),
  delivery_deadline: z.string().optional(),
  destination_port: z.string().optional(),
  compliance_profile_id: z.string().uuid('Compliance profile must be a valid UUID').nullable().optional(),
  quality_requirements: z.record(z.any()).optional(),
  notes: z.string().optional(),
});

const CONTRACT_EDITABLE_FIELDS = [
  'commodity',
  'quantity_mt',
  'delivery_deadline',
  'destination_port',
  'compliance_profile_id',
  'quality_requirements',
  'notes',
] as const;

function getAdminClient() {
  return createAdminClient();
}

async function getAuthUser() {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

function toComplianceProfileSummary(profile: {
  id: string;
  org_id: string;
  name: string;
  destination_market: string;
  regulation_framework: string;
  custom_rules: unknown;
}) {
  const metadata = parseBuyerProfileMetadata(profile.custom_rules);

  return {
    id: profile.id,
    exporter_org_id: profile.org_id,
    name: profile.name,
    destination_market: profile.destination_market,
    regulation_framework: profile.regulation_framework,
    version: metadata?.version ?? null,
    is_placeholder: metadata?.is_placeholder ?? false,
    buyer_approved: metadata?.buyer_approved ?? null,
    disclaimer: metadata?.disclaimer ?? null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const supabaseAdmin = await getAdminClient();
    if (!supabaseAdmin) return NextResponse.json({ error: 'Server config error' }, { status: 500 });

    const { data: buyerProfile } = await supabaseAdmin
      .from('buyer_profiles')
      .select('buyer_org_id')
      .eq('user_id', user.id)
      .single();

    const { data: exporterProfile } = await supabaseAdmin
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (exporterProfile) {
      const tierBlock = await enforceTier(exporterProfile.org_id, 'contracts');
      if (tierBlock) return tierBlock;
    }

    const { searchParams } = new URL(request.url);
    const { from, to, page, limit } = parsePagination(searchParams);

    let contracts: any[] = [];
    let complianceProfileOptions: ReturnType<typeof toComplianceProfileSummary>[] = [];

    if (buyerProfile) {
      const { data, error } = await supabaseAdmin
        .from('contracts')
        .select('*, exporter_org:organizations!contracts_exporter_org_id_fkey(id, name, slug)')
        .eq('buyer_org_id', buyerProfile.buyer_org_id)
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      contracts = data || [];

      const { data: activeLinks, error: linksError } = await supabaseAdmin
        .from('supply_chain_links')
        .select('exporter_org_id')
        .eq('buyer_org_id', buyerProfile.buyer_org_id)
        .eq('status', 'active');
      if (linksError) throw linksError;

      const linkedExporterIds = [
        ...new Set(
          (activeLinks || [])
            .map((link) => link.exporter_org_id)
            .filter((id): id is string => id !== null)
        ),
      ];
      if (linkedExporterIds.length > 0) {
        const { data: availableProfiles, error: profilesError } = await supabaseAdmin
          .from('compliance_profiles')
          .select('id, org_id, name, destination_market, regulation_framework, custom_rules')
          .in('org_id', linkedExporterIds)
          .order('name', { ascending: true });
        if (profilesError) throw profilesError;
        complianceProfileOptions = (availableProfiles || []).map(toComplianceProfileSummary);
      }
    } else if (exporterProfile) {
      const { data, error } = await supabaseAdmin
        .from('contracts')
        .select('*, buyer_org:buyer_organizations!contracts_buyer_org_id_fkey(id, name, slug)')
        .eq('exporter_org_id', exporterProfile.org_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      contracts = data || [];
    }

    const selectedProfileIds = [
      ...new Set(
        contracts
          .map((contract) => contract.compliance_profile_id)
          .filter((id): id is string => typeof id === 'string')
      ),
    ];
    const contractExporterIds = [
      ...new Set(
        contracts
          .map((contract) => contract.exporter_org_id)
          .filter((id): id is string => typeof id === 'string')
      ),
    ];

    if (selectedProfileIds.length > 0 && contractExporterIds.length > 0) {
      const { data: selectedProfiles, error: selectedProfilesError } = await supabaseAdmin
        .from('compliance_profiles')
        .select('id, org_id, name, destination_market, regulation_framework, custom_rules')
        .in('id', selectedProfileIds)
        .in('org_id', contractExporterIds);
      if (selectedProfilesError) throw selectedProfilesError;

      const selectedProfileMap = new Map(
        (selectedProfiles || []).map((profile) => [
          `${profile.org_id}:${profile.id}`,
          toComplianceProfileSummary(profile),
        ])
      );
      contracts = contracts.map((contract) => ({
        ...contract,
        compliance_profile: contract.compliance_profile_id
          ? selectedProfileMap.get(`${contract.exporter_org_id}:${contract.compliance_profile_id}`) ?? null
          : null,
      }));
    } else {
      contracts = contracts.map((contract) => ({ ...contract, compliance_profile: null }));
    }

    return NextResponse.json({
      contracts,
      compliance_profile_options: buyerProfile ? complianceProfileOptions : [],
      pagination: { page, limit, total: contracts.length },
    });
  } catch (error) {
    console.error('Contracts GET error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const supabaseAdmin = await getAdminClient();
    if (!supabaseAdmin) return NextResponse.json({ error: 'Server config error' }, { status: 500 });

    const { data: buyerProfile } = await supabaseAdmin
      .from('buyer_profiles')
      .select('buyer_org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!buyerProfile || buyerProfile.role !== 'buyer_admin') {
      return NextResponse.json({ error: 'Only buyer admins can create contracts' }, { status: 403 });
    }

    const body = await request.json();

    const parsed = contractCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      exporter_org_id,
      commodity,
      quantity_mt,
      delivery_deadline,
      destination_port,
      compliance_profile_id,
      quality_requirements,
      notes,
    } = parsed.data;

    const tierBlock = await enforceTier(exporter_org_id, 'contracts');
    if (tierBlock) return tierBlock;

    const { data: link } = await supabaseAdmin
      .from('supply_chain_links')
      .select('id, status')
      .eq('buyer_org_id', buyerProfile.buyer_org_id)
      .eq('exporter_org_id', exporter_org_id)
      .eq('status', 'active')
      .single();

    if (!link) {
      return NextResponse.json({ error: 'No active supply chain link with this exporter' }, { status: 400 });
    }

    if (compliance_profile_id) {
      const { data: complianceProfile, error: profileError } = await supabaseAdmin
        .from('compliance_profiles')
        .select('id, org_id')
        .eq('id', compliance_profile_id)
        .eq('org_id', exporter_org_id)
        .maybeSingle();

      if (profileError) {
        console.error('Compliance profile lookup error:', profileError);
        return NextResponse.json({ error: 'Failed to validate compliance profile' }, { status: 500 });
      }
      if (!profileBelongsToExporter(exporter_org_id, compliance_profile_id, complianceProfile)) {
        return NextResponse.json(
          { error: 'Selected compliance profile is not available for this exporter' },
          { status: 400 }
        );
      }
    }

    const contractRef = `CTR-${Date.now().toString(36).toUpperCase()}`;

    const { data: contract, error: insertError } = await supabaseAdmin
      .from('contracts')
      .insert({
        buyer_org_id: buyerProfile.buyer_org_id,
        exporter_org_id,
        contract_reference: contractRef,
        commodity,
        quantity_mt: quantity_mt || null,
        delivery_deadline: delivery_deadline || null,
        destination_port: destination_port || null,
        compliance_profile_id: compliance_profile_id || null,
        quality_requirements: quality_requirements || {},
        notes: notes || null,
        status: 'draft',
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Contract insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create contract' }, { status: 500 });
    }

    await logAuditEvent({
      orgId: buyerProfile.buyer_org_id,
      actorId: user.id,
      actorEmail: user.email,
      action: 'contract.created',
      resourceType: 'contract',
      resourceId: contract.id?.toString(),
      metadata: { commodity, exporter_org_id, compliance_profile_id: compliance_profile_id || null },
    });

    return NextResponse.json({ contract });
  } catch (error) {
    console.error('Contracts POST error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const supabaseAdmin = await getAdminClient();
    if (!supabaseAdmin) return NextResponse.json({ error: 'Server config error' }, { status: 500 });

    const body = await request.json();

    const parsed = contractPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { contract_id, status, shipment_id, ...editFields } = parsed.data;

    const { data: contract } = await supabaseAdmin
      .from('contracts')
      .select('id, buyer_org_id, exporter_org_id, contract_reference, compliance_profile_id, status')
      .eq('id', contract_id)
      .single();

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    const tierBlock = await enforceTier(contract.exporter_org_id, 'contracts');
    if (tierBlock) return tierBlock;

    const { data: buyerProfile } = await supabaseAdmin
      .from('buyer_profiles')
      .select('buyer_org_id')
      .eq('user_id', user.id)
      .single();

    const { data: exporterProfile } = await supabaseAdmin
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    const isBuyer = buyerProfile && contract.buyer_org_id === buyerProfile.buyer_org_id;
    const isExporter = exporterProfile && contract.exporter_org_id === exporterProfile.org_id && exporterProfile.role === 'admin';

    if (!isBuyer && !isExporter) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    if (shipment_id && isExporter) {
      const orgId = exporterProfile!.org_id;

      const { data: shipment } = await supabaseAdmin
        .from('shipments')
        .select('id, org_id, compliance_profile_id')
        .eq('id', shipment_id)
        .eq('org_id', orgId)
        .single();

      if (!shipment) {
        return NextResponse.json({ error: 'Shipment not found or not owned by your organization' }, { status: 403 });
      }

      if (!contractAndShipmentProfilesMatch(
        contract.compliance_profile_id,
        shipment.compliance_profile_id
      )) {
        return NextResponse.json(
          { error: 'Shipment compliance profile must match the contract compliance profile' },
          { status: 400 }
        );
      }

      const { error: linkError } = await supabaseAdmin
        .from('contract_shipments')
        .upsert({ contract_id, shipment_id }, { onConflict: 'contract_id,shipment_id', ignoreDuplicates: true });

      if (linkError) {
        console.error('Contract shipment link error:', linkError);
        return NextResponse.json({ error: 'Failed to link shipment' }, { status: 500 });
      }

      // Bidirectional update: stamp the contract reference onto the shipment record
      // so shipments reflect the link without a separate join at read time.
      await supabaseAdmin
        .from('shipments')
        .update({ notes: `Linked to contract: ${contract.contract_reference}` })
        .eq('id', shipment_id)
        .eq('org_id', orgId)
        .is('notes', null); // Only set if notes are currently empty (non-destructive)

      return NextResponse.json({ success: true, contract_reference: contract.contract_reference });
    }

    const requestedEdits = Object.fromEntries(
      CONTRACT_EDITABLE_FIELDS
        .filter((field) => editFields[field] !== undefined)
        .map((field) => [field, editFields[field]])
    );

    if (Object.keys(requestedEdits).length > 0) {
      if (!isBuyer) {
        return NextResponse.json({ error: 'Only the buyer can edit contract terms' }, { status: 403 });
      }
      if (contract.status !== 'draft') {
        return NextResponse.json({ error: 'Only draft contracts can be edited' }, { status: 400 });
      }

      if (requestedEdits.compliance_profile_id) {
        const { data: complianceProfile, error: profileError } = await supabaseAdmin
          .from('compliance_profiles')
          .select('id, org_id')
          .eq('id', requestedEdits.compliance_profile_id as string)
          .eq('org_id', contract.exporter_org_id)
          .maybeSingle();

        if (profileError) {
          console.error('Compliance profile lookup error:', profileError);
          return NextResponse.json({ error: 'Failed to validate compliance profile' }, { status: 500 });
        }
        if (!profileBelongsToExporter(contract.exporter_org_id, requestedEdits.compliance_profile_id as string, complianceProfile)) {
          return NextResponse.json(
            { error: 'Selected compliance profile is not available for this exporter' },
            { status: 400 }
          );
        }
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('contracts')
        .update(requestedEdits)
        .eq('id', contract_id)
        .select()
        .single();

      if (updateError) {
        console.error('Contract edit error:', updateError);
        return NextResponse.json({ error: 'Failed to update contract' }, { status: 500 });
      }

      await logAuditEvent({
        orgId: contract.buyer_org_id,
        actorId: user.id,
        actorEmail: user.email,
        action: 'contract.edited',
        resourceType: 'contract',
        resourceId: contract_id,
        metadata: { fields: Object.keys(requestedEdits) },
      });

      return NextResponse.json({ contract: updated });
    }

    if (status) {
      if (!['draft', 'active', 'fulfilled', 'cancelled'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('contracts')
        .update({ status })
        .eq('id', contract_id)
        .select()
        .single();

      if (updateError) {
        console.error('Contract update error:', updateError);
        return NextResponse.json({ error: 'Failed to update contract' }, { status: 500 });
      }

      return NextResponse.json({ contract: updated });
    }

    return NextResponse.json({ error: 'No update action specified' }, { status: 400 });
  } catch (error) {
    console.error('Contracts PATCH error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
