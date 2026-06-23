import pkg from 'pg';
const { Client } = pkg;
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env files
dotenv.config({ path: join(__dirname, '../.env') }); // Source (Production)
const prodDbUrl = process.env.SUPABASE_DB_URL;

dotenv.config({ path: join(__dirname, '../.env.local'), override: true }); // Target (Preproduction)
const preprodDbUrl = `postgresql://postgres:${process.env.SUPABASE_DB_PASSWORD}@db.daahttcxnboazhazaocc.supabase.co:5432/postgres`;

async function migrate() {
  if (!prodDbUrl || !preprodDbUrl) {
    console.error('Error: Missing DB URLs in .env or .env.local');
    process.exit(1);
  }

  const sourceClient = new Client({ connectionString: prodDbUrl });
  const targetClient = new Client({ connectionString: preprodDbUrl });

  try {
    console.log('Connecting to databases...');
    await sourceClient.connect();
    await targetClient.connect();
    console.log('Connected.');

    // List of tables to migrate in dependency order
    const tables = [
      'organizations',
      'system_admins',
      'profiles',
      'states',
      'lgas',
      'villages',
      'farms',
      'collection_batches',
      'bags',
      'compliance_files',
      'escrow_accounts',
      'escrow_transactions',
      'escrow_disputes',
      'payments'
    ];

    // Disable triggers on target
    console.log('Disabling triggers on target database...');
    await targetClient.query('SET session_replication_role = "replica";');

    for (const table of tables) {
      console.log(`Migrating table: ${table}...`);
      
      // Clear target table
      await targetClient.query(`TRUNCATE TABLE public.${table} CASCADE;`);

      // Fetch data from source
      const { rows } = await sourceClient.query(`SELECT * FROM public.${table};`);
      
      if (rows.length === 0) {
        console.log(`  No data found in ${table}.`);
        continue;
      }

      // Prepare bulk insert
      const columns = Object.keys(rows[0]);
      const columnList = columns.map(c => `"${c}"`).join(', ');
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const insertQuery = `INSERT INTO public.${table} (${columnList}) VALUES (${placeholders});`;

      for (const row of rows) {
        const values = columns.map(col => row[col]);
        await targetClient.query(insertQuery, values);
      }
      
      console.log(`  Successfully migrated ${rows.length} rows.`);
    }

    // Re-enable triggers
    console.log('Re-enabling triggers on target database...');
    await targetClient.query('SET session_replication_role = "origin";');

    console.log('Migration completed successfully!');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await sourceClient.end();
    await targetClient.end();
  }
}

migrate();
