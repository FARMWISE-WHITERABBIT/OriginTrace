-- Migration: organizations.invite_code, organizations.active_lgas
-- app/api/settings/route.ts has always generated/regenerated a 6-digit invite
-- code and persisted it to organizations.invite_code; app/api/locations/route.ts
-- has always read/written organizations.active_lgas. Neither column was ever
-- added by a migration — both features have always failed at the DB layer.
-- Date: 2026-07-09

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS active_lgas UUID[] DEFAULT ARRAY[]::UUID[];
