import pkg from 'pg';
const { Client } = pkg;
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const dbUrl = process.env.SUPABASE_DB_URL;

async function applySchema() {
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    console.log('Connected to database.');

    const schemaPath = path.resolve(process.cwd(), 'supabase/schema.sql');
    let sql = fs.readFileSync(schemaPath, 'utf8');

    // Simple comment stripping
    sql = sql.split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    console.log('Applying schema.sql...');
    await client.query(sql);
    console.log('Schema applied successfully.');

  } catch (err) {
    console.error('Failed to apply schema:', err);
  } finally {
    await client.end();
  }
}

applySchema();
