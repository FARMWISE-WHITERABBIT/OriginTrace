-- ============================================================
-- Tier fix migration — run in Supabase SQL Editor
-- Fixes: subscription_status still has 'trial' in CHECK constraint
-- Fixes: ensures WhiteRabbit/internal org gets correct enterprise tier
-- ============================================================

-- 1. Fix subscription_status constraint — drop old one (includes 'trial'), add new clean one
--    First normalise any remaining 'trial' rows to 'active'
UPDATE organizations
SET subscription_status = 'active'
WHERE subscription_status = 'trial';

ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_subscription_status_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_subscription_status_check
  CHECK (subscription_status IN ('active', 'grace_period', 'expired', 'cancelled', 'suspended'));

-- 2. Verify subscription_tier column exists with correct constraint (idempotent)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'starter';
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_subscription_tier_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_subscription_tier_check
  CHECK (subscription_tier IN ('starter', 'basic', 'pro', 'enterprise'));

-- 3. Show current org tiers so you can verify / fix the WhiteRabbit org manually
-- SELECT id, name, subscription_tier, subscription_status FROM organizations ORDER BY created_at;

-- 4. To upgrade a specific org to enterprise (replace the name):
-- UPDATE organizations SET subscription_tier = 'enterprise', subscription_status = 'active'
-- WHERE name = 'WhiteRabbit Agro Limited';
