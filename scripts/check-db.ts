import pkg from 'pg';
const { Client } = pkg;
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const dbUrl = `postgresql://postgres:CloudNineC69@db.daahttcxnboazhazaocc.supabase.co:5432/postgres`;

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
