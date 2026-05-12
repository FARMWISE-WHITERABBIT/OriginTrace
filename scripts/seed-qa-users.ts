#!/usr/bin/env tsx
/**
 * OriginTrace QA User Seed — creates one test user per role
 *
 * Creates users for every role in lib/rbac.ts so that browser-qa agents
 * can test all operations in Operations_ai.md.
 *
 * All users are created inside the existing demo org ("demo-whiterabbit").
 * The buyer user is created inside the existing buyer org ("demo-nibseurope").
 *
 * Usage:
 *   npm run seed:qa          — create QA users (idempotent — skips existing)
 *   npm run seed:qa -- --wipe — remove all QA users
 *
 * Password for ALL QA users: Demo1234!
 */

import { createClient } from '@supabase/supabase-js';

const WIPE = process.argv.includes('--wipe');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
if (!url || !key) { console.error('Missing SUPABASE env vars'); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false } });

const ok   = (msg: string) => console.log(`  ✓  ${msg}`);
const warn = (msg: string) => console.log(`  ⚠  ${msg}`);
const fail = (msg: string): never => { console.error(`❌  ${msg}`); throw new Error(msg); };

const PASS = 'Demo1234!';

// ─── QA user definitions ────────────────────────────────────────────────────
// One user per RBAC role, matching the credentials expected by browser-qa SKILL.md
// We use the `.test` TLD per seed-data conventions.

interface QAUser {
  email: string;
  role: string;
  full_name: string;
  /** If set, user goes into buyer_profiles instead of profiles */
  isBuyer?: boolean;
  /** If set, user is linked as a farmer to an existing farm */
  isFarmer?: boolean;
}

const QA_USERS: QAUser[] = [
  { email: 'admin@demo.test',                role: 'admin',                  full_name: 'QA Admin' },
  { email: 'aggregator@demo.test',           role: 'aggregator',             full_name: 'QA Aggregator' },
  { email: 'agent@demo.test',                role: 'agent',                  full_name: 'QA Field Agent' },
  { email: 'quality@demo.test',              role: 'quality_manager',        full_name: 'QA Quality Manager' },
  { email: 'logistics@demo.test',            role: 'logistics_coordinator',  full_name: 'QA Logistics Coordinator' },
  { email: 'compliance@demo.test',           role: 'compliance_officer',     full_name: 'QA Compliance Officer' },
  { email: 'warehouse@demo.test',            role: 'warehouse_supervisor',   full_name: 'QA Warehouse Supervisor' },
  { email: 'buyer@demo.test',               role: 'buyer',                  full_name: 'QA Buyer', isBuyer: true },
  { email: 'farmer@demo.test',              role: 'farmer',                 full_name: 'QA Farmer', isFarmer: true },
];

// ─── WIPE ────────────────────────────────────────────────────────────────────
async function wipeQAUsers() {
  console.log('\n▶  Wiping QA test users');
  const { data: listRes } = await db.auth.admin.listUsers() as any;
  const allUsers = listRes?.users || [];

  for (const qa of QA_USERS) {
    const existing = allUsers.find((u: any) => u.email === qa.email);
    if (!existing) { warn(`${qa.email} — not found, skip`); continue; }

    // Remove profile/buyer_profile first
    if (qa.isBuyer) {
      await db.from('buyer_profiles').delete().eq('user_id', existing.id);
    } else {
      await db.from('profiles').delete().eq('user_id', existing.id);
    }

    // Remove auth user
    const { error } = await db.auth.admin.deleteUser(existing.id);
    if (error) warn(`${qa.email}: ${error.message}`);
    else ok(`deleted ${qa.email}`);
  }
  ok('Wipe complete.');
}

// ─── SEED ────────────────────────────────────────────────────────────────────
async function seedQAUsers() {
  console.log('\n▶  Seeding QA test users (one per role)');

  // 1. Resolve demo org
  const { data: demoOrg, error: orgErr } = await db
    .from('organizations')
    .select('id')
    .eq('slug', 'demo-whiterabbit')
    .single();
  if (orgErr || !demoOrg) fail('Demo org "demo-whiterabbit" not found. Run npm run seed:demo first.');
  const orgId = (demoOrg as any).id;
  ok(`org: demo-whiterabbit → ${orgId}`);

  // 2. Resolve buyer org (for buyer user)
  const { data: buyerOrg } = await db
    .from('buyer_organizations')
    .select('id')
    .eq('slug', 'demo-nibseurope')
    .single();
  const buyerOrgId = (buyerOrg as any)?.id ?? null;
  if (buyerOrgId) ok(`buyer org: demo-nibseurope → ${buyerOrgId}`);
  else warn('Buyer org not found — buyer user will be skipped');

  // 3. Create each user
  const { data: listRes } = await db.auth.admin.listUsers() as any;
  const allUsers = listRes?.users || [];

  for (const qa of QA_USERS) {
    // Skip buyer if no buyer org
    if (qa.isBuyer && !buyerOrgId) { warn(`Skipping ${qa.email} — no buyer org`); continue; }

    // Check if user already exists
    const existing = allUsers.find((u: any) => u.email === qa.email);
    let userId: string;

    if (existing) {
      userId = existing.id;
      ok(`exists: ${qa.email} (${qa.role})`);
    } else {
      const { data: created, error } = await db.auth.admin.createUser({
        email: qa.email,
        password: PASS,
        email_confirm: true,
        user_metadata: { full_name: qa.full_name },
      });
      if (error) { warn(`createUser ${qa.email}: ${error.message}`); continue; }
      userId = created!.user.id;
      ok(`created: ${qa.email} (${qa.role})`);
    }

    // Create profile or buyer_profile
    if (qa.isBuyer) {
      const { error } = await db.from('buyer_profiles').upsert(
        { user_id: userId, buyer_org_id: buyerOrgId, full_name: qa.full_name, role: 'buyer_admin' },
        { onConflict: 'user_id' }
      );
      if (error) warn(`buyer_profile ${qa.email}: ${error.message}`);
      else ok(`  → buyer_profile linked`);
    } else {
      const { error } = await db.from('profiles').upsert(
        { user_id: userId, org_id: orgId, role: qa.role, full_name: qa.full_name },
        { onConflict: 'user_id' }
      );
      if (error) warn(`profile ${qa.email}: ${error.message}`);
      else ok(`  → profile: ${qa.role} in demo-whiterabbit`);
    }
  }

  // 4. Summary
  console.log(`
  ┌─────────────────────────────────────────────────────────────────┐
  │              QA Test Users — OriginTrace                       │
  │  Password for ALL: Demo1234!                                  │
  ├───────────────────────┬────────────────────────────────────────┤
  │ Role                  │ Email                                  │
  ├───────────────────────┼────────────────────────────────────────┤
  │ admin                 │ admin@demo.test                        │
  │ aggregator            │ aggregator@demo.test                   │
  │ agent                 │ agent@demo.test                        │
  │ quality_manager       │ quality@demo.test                      │
  │ logistics_coordinator │ logistics@demo.test                    │
  │ compliance_officer    │ compliance@demo.test                   │
  │ warehouse_supervisor  │ warehouse@demo.test                    │
  │ buyer                 │ buyer@demo.test                        │
  │ farmer                │ farmer@demo.test                       │
  └───────────────────────┴────────────────────────────────────────┘
  `);
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  if (WIPE) {
    await wipeQAUsers();
  } else {
    await seedQAUsers();
  }
}

main().catch(err => { console.error('\n❌  Fatal:', err.message || err); process.exit(1); });
