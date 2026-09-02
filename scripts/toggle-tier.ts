import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const tier = process.argv[2] || 'starter';

if (!url || !key) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

async function run() {
  const { error } = await db
    .from('organizations')
    .update({ 
      subscription_tier: tier,
      settings: { subscription_tier: tier }
    })
    .eq('slug', 'demo-whiterabbit');
  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Successfully set tier of demo-whiterabbit to ${tier}`);
  }
}
run();
