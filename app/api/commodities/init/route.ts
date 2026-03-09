import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/api-auth';
import { createClient as createServerClient } from '@/lib/supabase/server';

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS commodity_master (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'crop',
  unit TEXT NOT NULL DEFAULT 'kg',
  is_active BOOLEAN DEFAULT true,
  created_by_org_id INTEGER,
  is_global BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  grades TEXT[] DEFAULT '{}',
  moisture_min NUMERIC,
  moisture_max NUMERIC,
  collection_metrics JSONB DEFAULT '{}'
);
`;

const DEFAULT_COMMODITIES = [
  { name: 'Cocoa', code: 'COCOA', category: 'crop', unit: 'kg', is_active: true, is_global: true, created_by_org_id: null, grades: ['A', 'B', 'C'], moisture_min: 6, moisture_max: 8, collection_metrics: {} },
  { name: 'Cashew', code: 'CASHEW', category: 'crop', unit: 'kg', is_active: true, is_global: true, created_by_org_id: null, grades: ['A', 'B', 'C'], moisture_min: 5, moisture_max: 8, collection_metrics: {} },
  { name: 'Palm Oil', code: 'PALM', category: 'crop', unit: 'kg', is_active: true, is_global: true, created_by_org_id: null, grades: ['A', 'B'], moisture_min: null, moisture_max: null, collection_metrics: {} },
  { name: 'Ginger', code: 'GINGER', category: 'crop', unit: 'kg', is_active: true, is_global: true, created_by_org_id: null, grades: ['A', 'B', 'C'], moisture_min: 10, moisture_max: 12, collection_metrics: {} },
  { name: 'Sesame', code: 'SESAME', category: 'crop', unit: 'kg', is_active: true, is_global: true, created_by_org_id: null, grades: ['A', 'B', 'C'], moisture_min: 6, moisture_max: 8, collection_metrics: {} },
  { name: 'Shea', code: 'SHEA', category: 'crop', unit: 'kg', is_active: true, is_global: true, created_by_org_id: null, grades: ['A', 'B'], moisture_min: 6, moisture_max: 8, collection_metrics: {} },
  { name: 'Timber', code: 'TIMBER', category: 'forestry', unit: 'kg', is_active: true, is_global: true, created_by_org_id: null, grades: ['A', 'B', 'C'], moisture_min: null, moisture_max: null, collection_metrics: {} },
  { name: 'Minerals', code: 'MINERALS', category: 'minerals', unit: 'kg', is_active: true, is_global: true, created_by_org_id: null, grades: ['A', 'B'], moisture_min: null, moisture_max: null, collection_metrics: {} },
  { name: 'Seafood', code: 'SEAFOOD', category: 'seafood', unit: 'kg', is_active: true, is_global: true, created_by_org_id: null, grades: ['A', 'B', 'C'], moisture_min: null, moisture_max: null, collection_metrics: {} },
];

export async function POST(request: NextRequest) {
  try {
    const authClient = await createServerClient();
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    const { data: sysAdmin } = await supabase
      .from('system_admins')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!sysAdmin) {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }

    const projectRef = supabaseUrl.replace('https://', '').split('.')[0];
    const dbHost = `db.${projectRef}.supabase.co`;
    const connectionString = `postgresql://postgres.${projectRef}:${serviceKey}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

    let tableCreated = false;

    try {
      const pg = require('pg');
      const pool = new pg.Pool({ 
        connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
      });
      await pool.query(CREATE_TABLE_SQL);
      await pool.end();
      tableCreated = true;
    } catch (pgError: any) {
      console.log('Pooler connection failed, trying direct:', pgError.message);
      try {
        const pg = require('pg');
        const directConn = `postgresql://postgres:${serviceKey}@${dbHost}:5432/postgres`;
        const pool2 = new pg.Pool({ 
          connectionString: directConn,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 10000,
        });
        await pool2.query(CREATE_TABLE_SQL);
        await pool2.end();
        tableCreated = true;
      } catch (pgError2: any) {
        console.log('Direct DB connection also failed:', pgError2.message);
      }
    }

    if (!tableCreated) {
      return NextResponse.json({ 
        error: 'automatic_creation_failed',
        message: 'Could not automatically create the commodity_master table. Please run the SQL below in your Supabase SQL Editor.',
        sql: CREATE_TABLE_SQL.trim()
      }, { status: 422 });
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    const { data: existing, error: checkError } = await supabase
      .from('commodity_master')
      .select('id')
      .limit(1);

    if (checkError) {
      return NextResponse.json({ 
        success: true, 
        message: 'Table created. PostgREST schema cache may need a moment to refresh. Please reload the page in a few seconds.',
        needsRefresh: true 
      });
    }

    if (!existing || existing.length === 0) {
      const { error: seedError } = await supabase
        .from('commodity_master')
        .insert(DEFAULT_COMMODITIES);

      if (seedError) {
        return NextResponse.json({ 
          success: true, 
          message: `Table created but seeding failed: ${seedError.message}. The table may need a moment to appear in the schema cache. Please reload.`,
          needsRefresh: true
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Commodity master table initialized with default data',
      count: DEFAULT_COMMODITIES.length
    });
  } catch (error: any) {
    console.error('Commodity init error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
