import { createClient as createServerClient } from '@/lib/supabase/server';
/**
 * POST /api/import
 * Bulk import farmers/farms from CSV or Excel (KoBoToolbox migration support).
 *
 * Body: multipart/form-data
 *   file: CSV or XLSX file
 *   type: 'farmers' | 'farms' | 'batches'
 *   dry_run: 'true' | 'false'  (preview without inserting)
 *
 * Returns: { imported, skipped, errors, preview (dry_run only) }
 */
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { requireRole } from '@/lib/rbac';
import * as XLSX from 'xlsx';

// ── Column aliases ──────────────────────────────────────────────────────────
// Maps common KoBoToolbox / Excel column names → OriginTrace field names.
// Case-insensitive matching applied before lookup.

const FARMER_ALIASES: Record<string, string> = {
  // farmer_name
  'farmer name': 'farmer_name', 'farmer_name': 'farmer_name', 'name': 'farmer_name',
  'full name': 'farmer_name', 'fullname': 'farmer_name', 'respondent': 'farmer_name',
  'farmer': 'farmer_name',
  // phone
  'phone': 'phone', 'phone number': 'phone', 'mobile': 'phone', 'tel': 'phone',
  'telephone': 'phone', 'contact': 'phone', 'phonenumber': 'phone',
  // community
  'community': 'community', 'village': 'community', 'location': 'community',
  'locality': 'community', 'town': 'community', 'settlement': 'community',
  // area_hectares
  'area_hectares': 'area_hectares', 'area': 'area_hectares', 'farm size': 'area_hectares',
  'farmsize': 'area_hectares', 'hectares': 'area_hectares', 'ha': 'area_hectares',
  'size_ha': 'area_hectares', 'farm_size': 'area_hectares',
  // commodity
  'commodity': 'commodity', 'crop': 'commodity', 'crop type': 'commodity',
  'croptype': 'commodity', 'product': 'commodity',
  // farmer_id
  'farmer_id': 'farmer_id', 'farmer id': 'farmer_id', 'id': 'farmer_id',
  'farmer code': 'farmer_id', 'farmerid': 'farmer_id', 'kobo id': 'farmer_id',
  // latitude / longitude
  'latitude': 'latitude', 'lat': 'latitude', '_gps_latitude': 'latitude',
  'gps_latitude': 'latitude', 'gps latitude': 'latitude',
  'longitude': 'longitude', 'lon': 'longitude', 'lng': 'longitude',
  '_gps_longitude': 'longitude', 'gps_longitude': 'longitude', 'gps longitude': 'longitude',
  // state / lga
  'state': 'state', 'lga': 'lga', 'local government': 'lga',
};

const BATCH_ALIASES: Record<string, string> = {
  'farmer name': 'farmer_name', 'farmer_name': 'farmer_name', 'farmer': 'farmer_name',
  'weight': 'total_weight', 'weight_kg': 'total_weight', 'total weight': 'total_weight',
  'bags': 'bag_count', 'bag count': 'bag_count', 'bag_count': 'bag_count',
  'notes': 'notes', 'note': 'notes', 'remarks': 'notes',
  'date': 'collected_at', 'collection date': 'collected_at', 'collected_at': 'collected_at',
  'commodity': 'commodity', 'crop': 'commodity',
};

// ── CSV parser (no external dep) ────────────────────────────────────────────
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  
  function splitLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQuotes = !inQuotes; }
      else if (c === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
      else { current += c; }
    }
    result.push(current.trim());
    return result;
  }

  const headers = splitLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = splitLine(line).map(v => v.replace(/^"|"$/g, '').trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
    return row;
  });
}

// ── Column normaliser ────────────────────────────────────────────────────────
function normaliseRow(raw: Record<string, string>, aliases: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [rawKey, val] of Object.entries(raw)) {
    const normalised = aliases[rawKey.toLowerCase().trim()] ?? rawKey.toLowerCase().trim();
    if (val !== undefined && val !== '') out[normalised] = val;
  }
  return out;
}

// ── Route handler ────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseAdmin = createAdminClient();
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile?.org_id) return NextResponse.json({ error: 'No organisation found' }, { status: 403 });
    const roleErr = requireRole(profile.role, ['admin', 'aggregator']);
    if (roleErr) return roleErr;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = (formData.get('type') as string) || 'farmers';
    const dryRun = formData.get('dry_run') === 'true';

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (!['farmers', 'farms', 'batches'].includes(type)) {
      return NextResponse.json({ error: 'type must be farmers, farms, or batches' }, { status: 400 });
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const fileName = file.name.toLowerCase();
    let rows: Record<string, string>[] = [];

    if (fileName.endsWith('.csv')) {
      const text = new TextDecoder('utf-8').decode(arrayBuffer);
      rows = parseCSV(text);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const raw = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
      rows = raw.map(r => {
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(r)) { out[k] = String(v ?? ''); }
        return out;
      });
    } else {
      return NextResponse.json({ error: 'Only .csv and .xlsx files are supported' }, { status: 400 });
    }

    if (rows.length === 0) return NextResponse.json({ error: 'File is empty or has no data rows' }, { status: 400 });
    if (rows.length > 5000) return NextResponse.json({ error: 'Maximum 5,000 rows per import. Split into smaller files.' }, { status: 400 });

    const aliases = type === 'batches' ? BATCH_ALIASES : FARMER_ALIASES;
    const normalisedRows = rows.map(r => normaliseRow(r, aliases));

    if (type === 'farmers' || type === 'farms') {
      return handleFarmsImport(normalisedRows, profile.org_id, user.id, supabaseAdmin, dryRun);
    } else {
      return handleBatchesImport(normalisedRows, profile.org_id, user.id, supabaseAdmin, dryRun);
    }

  } catch (err: any) {
    console.error('[import]', err?.message);
    return NextResponse.json({ error: 'Import failed', detail: err?.message }, { status: 500 });
  }
}

async function handleFarmsImport(
  rows: Record<string, string>[],
  orgId: string,
  userId: string,
  supabase: any,
  dryRun: boolean
) {
  const results = { imported: 0, skipped: 0, errors: [] as string[], preview: [] as any[] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-based + header

    const name = row['farmer_name']?.trim();
    const community = row['community']?.trim() || 'Unknown';

    if (!name) {
      results.errors.push(`Row ${rowNum}: missing farmer name`);
      results.skipped++;
      continue;
    }

    const record = {
      org_id: orgId,
      farmer_name: name,
      farmer_id: row['farmer_id'] || null,
      phone: row['phone'] || null,
      community,
      commodity: row['commodity']?.toLowerCase().trim() || 'cocoa',
      area_hectares: row['area_hectares'] ? parseFloat(row['area_hectares']) || null : null,
      compliance_status: 'pending' as const,
      created_by: userId,
    };

    if (isNaN(record.area_hectares as any) || (record.area_hectares !== null && (record.area_hectares as number) <= 0)) {
      record.area_hectares = null;
    }

    if (dryRun) {
      results.preview.push(record);
      results.imported++;
      continue;
    }

    const { error } = await supabase.from('farms').insert(record);
    if (error) {
      results.errors.push(`Row ${rowNum} (${name}): ${error.message}`);
      results.skipped++;
    } else {
      results.imported++;
    }
  }

  return NextResponse.json({
    success: true,
    type: 'farms',
    dry_run: dryRun,
    total_rows: rows.length,
    imported: results.imported,
    skipped: results.skipped,
    errors: results.errors.slice(0, 50), // cap error list
    preview: dryRun ? results.preview.slice(0, 10) : undefined,
    message: dryRun
      ? `Preview: ${results.imported} rows ready to import, ${results.skipped} would be skipped`
      : `Imported ${results.imported} records. ${results.skipped} skipped.`,
  });
}

async function handleBatchesImport(
  rows: Record<string, string>[],
  orgId: string,
  userId: string,
  supabase: any,
  dryRun: boolean
) {
  const results = { imported: 0, skipped: 0, errors: [] as string[], preview: [] as any[] };

  // Get profile id for agent_id
  const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', userId).single();
  const agentId = profile?.id;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const farmerName = row['farmer_name']?.trim();
    const weight = parseFloat(row['total_weight'] || '0');

    if (!farmerName) {
      results.errors.push(`Row ${rowNum}: missing farmer name`);
      results.skipped++;
      continue;
    }

    // Try to find matching farm
    const { data: farm } = await supabase
      .from('farms')
      .select('id')
      .eq('org_id', orgId)
      .ilike('farmer_name', farmerName)
      .limit(1)
      .single();

    if (!farm) {
      results.errors.push(`Row ${rowNum}: no farm found for "${farmerName}" — import farmers first`);
      results.skipped++;
      continue;
    }

    const record = {
      org_id: orgId,
      farm_id: farm.id,
      agent_id: agentId,
      total_weight: isNaN(weight) ? 0 : weight,
      bag_count: parseInt(row['bag_count'] || '0') || 0,
      notes: row['notes'] || null,
      collected_at: row['collected_at'] ? new Date(row['collected_at']).toISOString() : new Date().toISOString(),
      status: 'completed' as const,
    };

    if (dryRun) {
      results.preview.push({ ...record, farmer_name: farmerName });
      results.imported++;
      continue;
    }

    const { error } = await supabase.from('collection_batches').insert(record);
    if (error) {
      results.errors.push(`Row ${rowNum} (${farmerName}): ${error.message}`);
      results.skipped++;
    } else {
      results.imported++;
    }
  }

  return NextResponse.json({
    success: true,
    type: 'batches',
    dry_run: dryRun,
    total_rows: rows.length,
    imported: results.imported,
    skipped: results.skipped,
    errors: results.errors.slice(0, 50),
    preview: dryRun ? results.preview.slice(0, 10) : undefined,
    message: dryRun
      ? `Preview: ${results.imported} rows ready to import, ${results.skipped} would be skipped`
      : `Imported ${results.imported} batch records. ${results.skipped} skipped.`,
  });
}
