import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';


export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { error } = await supabaseAdmin.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS batch_contributions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          batch_id INTEGER NOT NULL REFERENCES collection_batches(id) ON DELETE CASCADE,
          farm_id INTEGER NOT NULL REFERENCES farms(id),
          farmer_name TEXT,
          weight_kg NUMERIC DEFAULT 0,
          bag_count INTEGER DEFAULT 0,
          compliance_status TEXT DEFAULT 'pending' CHECK (compliance_status IN ('pending', 'verified', 'flagged')),
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_batch_contributions_batch_id ON batch_contributions(batch_id);
        CREATE INDEX IF NOT EXISTS idx_batch_contributions_farm_id ON batch_contributions(farm_id);
      `
    });

    if (error) {
      const { error: directError } = await supabaseAdmin
        .from('batch_contributions')
        .select('id')
        .limit(1);

      if (directError && directError.code === '42P01') {
        return NextResponse.json({ 
          error: 'Table creation requires direct SQL access. Please create the batch_contributions table in the Supabase dashboard.',
          sql: `CREATE TABLE IF NOT EXISTS batch_contributions (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            batch_id INTEGER NOT NULL REFERENCES collection_batches(id) ON DELETE CASCADE,
            farm_id INTEGER NOT NULL REFERENCES farms(id),
            farmer_name TEXT,
            weight_kg NUMERIC DEFAULT 0,
            bag_count INTEGER DEFAULT 0,
            compliance_status TEXT DEFAULT 'pending',
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );`
        }, { status: 500 });
      }

      return NextResponse.json({ message: 'Table already exists or was created' });
    }

    return NextResponse.json({ message: 'batch_contributions table created successfully' });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
  }
}
