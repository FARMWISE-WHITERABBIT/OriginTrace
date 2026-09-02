import pkg from 'pg';
const { Client } = pkg;
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const dbUrl = process.env.SUPABASE_DB_URL;

async function applyMigrations() {
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    console.log('Connected to database.');

    const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      console.log(`Applying migration: ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      // Simple sanitization for pg driver
      const cleanSql = sql.split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n');

      if (cleanSql.trim()) {
        try {
          await client.query(cleanSql);
          console.log(`  ✓ ${file} applied.`);
        } catch (err) {
          console.error(`  ✗ Error in ${file}:`, err.message);
          // Continue with other migrations if it's already applied or simple error
        }
      }
    }
    console.log('All migrations processed.');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

applyMigrations();
