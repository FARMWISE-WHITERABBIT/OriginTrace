#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!url || !key) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in .env.local');
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

async function seedRedTeam() {
  console.log('Seeding Red Team environment...');

  // 1. Create Org A (Attacker)
  const ts = Date.now();
  const { data: orgA, error: errA } = await db.from('organizations').insert({
    name: 'Attacker Corp', slug: `attacker-${ts}`, subscription_status: 'active', subscription_tier: 'pro'
  }).select().single();
  if (errA) throw new Error(`Org A failed: ${errA.message}`);
  console.log(`Org A created: ${orgA.id}`);

  // 2. Create Org B (Victim)
  const { data: orgB, error: errB } = await db.from('organizations').insert({
    name: 'Victim LLC', slug: `victim-${ts}`, subscription_status: 'active', subscription_tier: 'enterprise'
  }).select().single();
  if (errB) throw new Error(`Org B failed: ${errB.message}`);
  console.log(`Org B created: ${orgB.id}`);

  // 3. Create Admin for Org A
  const adminAEmail = `admin-${Date.now()}@attacker.test`;
  const { data: authA, error: authAError } = await db.auth.admin.createUser({
    email: adminAEmail, password: 'ProbePassword123!', email_confirm: true
  });
  if (authAError) throw new Error(`Auth A failed: ${authAError.message}`);
  
  const { error: profAError } = await db.from('profiles').insert({
    user_id: authA.user.id, org_id: orgA.id, role: 'admin', full_name: 'Attacker Admin'
  });
  if (profAError) throw new Error(`Profile A failed: ${profAError.message}`);

  // 4. Create Admin for Org B
  const adminBEmail = `admin-${Date.now()}@victim.test`;
  const { data: authB, error: authBError } = await db.auth.admin.createUser({
    email: adminBEmail, password: 'ProbePassword123!', email_confirm: true
  });
  if (authBError) throw new Error(`Auth B failed: ${authBError.message}`);
  
  const { error: profBError } = await db.from('profiles').insert({
    user_id: authB.user.id, org_id: orgB.id, role: 'admin', full_name: 'Victim Admin'
  });
  if (profBError) throw new Error(`Profile B failed: ${profBError.message}`);

  // 4b. Create Field Agent for Org B (to test RBAC)
  const agentBEmail = `agent-${Date.now()}@victim.test`;
  const { data: authAgentB, error: authAgentBError } = await db.auth.admin.createUser({
    email: agentBEmail, password: 'ProbePassword123!', email_confirm: true
  });
  if (authAgentBError) throw new Error(`Auth Agent B failed: ${authAgentBError.message}`);
  
  const { error: profAgentBError } = await db.from('profiles').insert({
    user_id: authAgentB.user.id, org_id: orgB.id, role: 'agent', full_name: 'Victim Agent'
  });
  if (profAgentBError) throw new Error(`Profile Agent B failed: ${profAgentBError.message}`);

  // 5. Create Shipment for Org B
  const { data: shipmentB } = await db.from('shipments').insert({
    org_id: orgB.id, shipment_code: 'VIC-SHP-001', destination_country: 'USA', status: 'ready', payment_status: 'funded'
  }).select().single();

  // 6. Create Escrow for Org B
  const { data: escrowB } = await db.from('escrow_accounts').insert({
    org_id: orgB.id,
    shipment_id: shipmentB.id,
    total_amount: 10000,
    held_amount: 10000,
    status: 'active',
    milestone_config: [
      { milestone_id: 'm1', stage: 1, amount: 5000, description: 'Initial' },
      { milestone_id: 'm2', stage: 2, amount: 5000, description: 'Final' }
    ]
  }).select().single();

  console.log(`\nRED TEAM TARGETS:`);
  console.log(`Org A (Attacker) Admin: ${adminAEmail}`);
  console.log(`Org B (Victim) Admin: ${adminBEmail}`);
  console.log(`Org B (Victim) Agent: ${agentBEmail}`);
  console.log(`Org B (Victim) Escrow ID: ${escrowB.id}`);
  console.log(`Org B (Victim) Shipment ID: ${shipmentB.id}`);
  console.log(`\nDONE. Use these IDs in your Playwright probe.`);
}

seedRedTeam().catch(console.error);
