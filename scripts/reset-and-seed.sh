#!/usr/bin/env bash
# ================================================================
# reset-and-seed.sh
# Pulls latest code from GitHub, then wipes and re-seeds all
# OriginTrace demo data.
#
# Usage (from the project root on Replit):
#   bash scripts/reset-and-seed.sh
#
# Prerequisites:
#   1. NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must
#      be set in Replit Secrets (or your .env.local file).
#   2. Run the migration SQL first in your Supabase SQL editor:
#      supabase/migrations/20260321_seed_global_commodities.sql
#      (only needed once — adds Hibiscus and Turmeric to
#       the global commodity master).
#
# What this script does:
#   1. git pull origin main        — fetch latest code
#   2. npm install                 — ensure deps are up to date
#   3. seed:demo:wipe              — delete all existing demo data
#   4. seed:demo                   — seed fresh demo data
# ================================================================

set -e  # exit on any error

echo ""
echo "╔═══════════════════════════════════════════════╗"
echo "║   OriginTrace — Demo Data Reset & Reseed      ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""

# ── 1. Pull latest code ─────────────────────────────────────────
echo "▶ Pulling latest code from GitHub..."
git pull origin main
echo "  ✓ Code up to date"
echo ""

# ── 2. Install / update dependencies ───────────────────────────
echo "▶ Installing dependencies..."
npm install --silent
echo "  ✓ Dependencies installed"
echo ""

# ── 3. Verify environment ───────────────────────────────────────
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] && [ -z "$SUPABASE_URL" ]; then
  echo "  ✗ ERROR: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) is not set."
  echo "    Add it to your Replit Secrets or .env.local file."
  exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "  ✗ ERROR: SUPABASE_SERVICE_ROLE_KEY is not set."
  echo "    Add it to your Replit Secrets or .env.local file."
  exit 1
fi
echo "  ✓ Environment variables present"
echo ""

# ── 4. Wipe existing demo data ──────────────────────────────────
echo "▶ Wiping existing demo data..."
npm run seed:demo:wipe
echo ""

# ── 5. Seed fresh demo data ─────────────────────────────────────
echo "▶ Seeding fresh demo data..."
npm run seed:demo
echo ""

echo "╔═══════════════════════════════════════════════╗"
echo "║   ✓  Done! Demo data is ready.               ║"
echo "╠═══════════════════════════════════════════════╣"
echo "║  Login credentials (password: Demo1234!)     ║"
echo "║  Admin:  demo.admin@origintrace-demo.com     ║"
echo "║  Agent:  demo.agent@origintrace-demo.com     ║"
echo "║  Buyer:  demo.buyer@nibseurope-demo.com      ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""
