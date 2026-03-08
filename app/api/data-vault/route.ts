import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { enforceTier } from '@/lib/api/tier-guard';
import { z } from 'zod';

const dataVaultExportSchema = z.object({
  format: z.enum(['csv', 'geojson', 'json'], { required_error: 'Invalid format' }),
  tables: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();
    
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    if (!profile.org_id) {
      return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    }

    const tierBlock = await enforceTier(profile.org_id, 'data_vault');
    if (tierBlock) return tierBlock;

    const { data: orgData } = await supabaseAdmin
      .from('organizations')
      .select('name, created_at')
      .eq('id', profile.org_id)
      .single();

    const { count: farmsCount } = await supabaseAdmin
      .from('farms')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', profile.org_id);

    const { count: batchesCount } = await supabaseAdmin
      .from('collection_batches')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', profile.org_id);

    const { count: bagsCount } = await supabaseAdmin
      .from('bags')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', profile.org_id);

    const { count: usersCount } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', profile.org_id);

    const { data: flaggedBatches, count: flaggedCount } = await supabaseAdmin
      .from('collection_batches')
      .select(`
        id,
        farm_id,
        total_weight,
        status,
        yield_flag_reason,
        created_at,
        farms (farmer_name, area_hectares, commodity)
      `, { count: 'exact' })
      .eq('org_id', profile.org_id)
      .eq('status', 'flagged_for_review')
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      organization: orgData?.name || 'Unknown',
      created_at: orgData?.created_at,
      stats: {
        farms: farmsCount || 0,
        batches: batchesCount || 0,
        bags: bagsCount || 0,
        users: usersCount || 0,
        flaggedBatches: flaggedCount || 0
      },
      flaggedBatches: flaggedBatches || []
    });
    
  } catch (error) {
    console.error('Data vault GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();
    
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    if (!profile.org_id) {
      return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    }

    const tierBlock = await enforceTier(profile.org_id, 'data_vault');
    if (tierBlock) return tierBlock;

    const body = await request.json();

    const parsed = dataVaultExportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { format, tables } = parsed.data;

    const validTables = ['farms', 'collection_batches', 'bags', 'profiles'];
    const selectedTables = tables?.filter(t => validTables.includes(t)) || validTables;

    const exportData: Record<string, unknown[]> = {};

    for (const table of selectedTables) {
      const { data, error } = await supabaseAdmin
        .from(table)
        .select('*')
        .eq('org_id', profile.org_id);

      if (!error && data) {
        if (table === 'profiles') {
          exportData[table] = data.map((p: Record<string, unknown>) => ({
            id: p.id,
            full_name: p.full_name,
            email: p.email,
            role: p.role,
            created_at: p.created_at
          }));
        } else {
          exportData[table] = data;
        }
      }
    }

    if (format === 'geojson' && exportData.farms) {
      const features = (exportData.farms as Array<{ boundary?: { coordinates?: number[][][] }; [key: string]: unknown }>).map(farm => ({
        type: 'Feature',
        geometry: farm.boundary || null,
        properties: {
          id: farm.id,
          farmer_name: farm.farmer_name,
          community: farm.community,
          commodity: farm.commodity,
          area_hectares: farm.area_hectares,
          compliance_status: farm.compliance_status,
          created_at: farm.created_at
        }
      }));

      const geojson = {
        type: 'FeatureCollection',
        features,
        metadata: {
          export_date: new Date().toISOString(),
          total_farms: features.length
        }
      };

      return new NextResponse(JSON.stringify(geojson, null, 2), {
        headers: {
          'Content-Type': 'application/geo+json',
          'Content-Disposition': `attachment; filename="farms_export_${new Date().toISOString().split('T')[0]}.geojson"`
        }
      });
    }

    if (format === 'csv') {
      const csvParts: string[] = [];
      
      for (const [tableName, records] of Object.entries(exportData)) {
        if (!records.length) continue;
        
        csvParts.push(`# TABLE: ${tableName}\n`);
        const headers = Object.keys(records[0] as object);
        csvParts.push(headers.join(',') + '\n');
        
        for (const record of records) {
          const values = headers.map(h => {
            const val = (record as Record<string, unknown>)[h];
            if (val === null || val === undefined) return '';
            if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
            return `"${String(val).replace(/"/g, '""')}"`;
          });
          csvParts.push(values.join(',') + '\n');
        }
        csvParts.push('\n');
      }

      return new NextResponse(csvParts.join(''), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="data_export_${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="data_export_${new Date().toISOString().split('T')[0]}.json"`
      }
    });
    
  } catch (error) {
    console.error('Data vault POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
