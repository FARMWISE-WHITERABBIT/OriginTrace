import pkg from 'pg';
const { Client } = pkg;
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const dbUrl = process.env.SUPABASE_DB_URL;

if (!dbUrl) {
  console.error(
    'Error: SUPABASE_DB_URL is not set.\n' +
    '  Set it in .env.local (or the environment) to a Postgres connection string, e.g.\n' +
    '  SUPABASE_DB_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres\n' +
    '  This matches the convention used by scripts/apply-migrations.ts and scripts/apply-schema.ts.'
  );
  process.exit(1);
}

async function checkDb() {
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    const { rows } = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('Tables found in public schema:');
    console.log(rows.map(r => r.table_name));
  } catch (err) {
    console.error('Failed to check DB:', err);
  } finally {
    await client.end();
  }
}

checkDb();
