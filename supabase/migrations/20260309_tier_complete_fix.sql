-- ============================================================
-- COMPLETE TIER FIX — idempotent, safe to run multiple times
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- STEP 1: Ensure subscription_tier column exists with correct constraint
-- -----------------------------------------------------------------------
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'starter';
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_subscription_tier_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_subscription_tier_check
  CHECK (subscription_tier IN ('starter', 'basic', 'pro', 'enterprise'));

-- STEP 2: Fix subscription_status — remove 'trial', normalise existing rows
-- -----------------------------------------------------------------------
-- Normalise any 'trial' or NULL rows to 'active' before changing constraint
UPDATE organizations
SET subscription_status = 'active'
WHERE subscription_status IS NULL OR subscription_status NOT IN ('active', 'grace_period', 'expired', 'cancelled', 'suspended');

ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_subscription_status_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_subscription_status_check
  CHECK (subscription_status IN ('active', 'grace_period', 'expired', 'cancelled', 'suspended'));

-- Also fix the column DEFAULT so new orgs don't get 'trial'
ALTER TABLE organizations ALTER COLUMN subscription_status SET DEFAULT 'active';

-- STEP 3: Fix any NULL subscription_tier rows (can't violate constraint)
-- -----------------------------------------------------------------------
UPDATE organizations
SET subscription_tier = 'starter'
WHERE subscription_tier IS NULL;

-- STEP 4: Set WhiteRabbit org to enterprise / active
-- -----------------------------------------------------------------------
-- Matches by name pattern — safe to run even if already set
UPDATE organizations
SET
  subscription_tier   = 'enterprise',
  subscription_status = 'active'
WHERE
  LOWER(name) LIKE '%whiterabbit%'
  OR LOWER(name) LIKE '%white rabbit%'
  OR LOWER(slug) LIKE '%whiterabbit%';

-- STEP 5: Diagnostic — show current state of all orgs
-- -----------------------------------------------------------------------
SELECT
  id,
  name,
  slug,
  subscription_tier,
  subscription_status,
  created_at
FROM organizations
ORDER BY created_at DESC;
