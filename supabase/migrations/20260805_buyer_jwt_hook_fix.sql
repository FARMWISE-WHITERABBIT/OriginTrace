-- Fix custom_access_token_hook() (added in 20260311_session8_9.sql) to also
-- resolve buyer accounts. The original version only queried `profiles`, so a
-- buyer_profiles-only user (no profiles row) would get app_role='viewer' and
-- org_id=NULL in their JWT -- breaking the buyer redirect guard and tier
-- scoping wherever the fast JWT-claims path is used instead of the DB
-- fallback.
--
-- This mirrors the DB-fallback logic already used (and already correct) in
-- lib/supabase/middleware.ts's fetchClaimsFromDb(): if there's no profiles
-- row and the user isn't a superadmin, fall back to buyer_profiles ->
-- buyer_organizations, role = 'buyer', org_id = buyer_org_id, tier from
-- buyer_organizations.settings (default 'pro').
--
-- NOTE: as with the original migration, wiring this hook into Supabase
-- Dashboard -> Authentication -> Hooks -> Custom Access Token is a separate
-- config step this SQL cannot perform. Until that's done, this function is
-- unused and middleware keeps using its already-correct DB-fallback path --
-- this migration just makes the hook safe to enable whenever that happens.

CREATE OR REPLACE FUNCTION custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id        UUID;
  v_role           TEXT;
  v_org_id         UUID;
  v_tier           TEXT;
  v_superadmin     BOOLEAN := FALSE;
  v_buyer_org_id   UUID;
  v_buyer_settings JSONB;
  v_claims         JSONB;
BEGIN
  v_user_id := (event->>'user_id')::UUID;

  -- Fetch profile (role + org)
  SELECT role, org_id
  INTO v_role, v_org_id
  FROM profiles
  WHERE user_id = v_user_id
  LIMIT 1;

  -- Check superadmin
  SELECT EXISTS (
    SELECT 1 FROM system_admins WHERE user_id = v_user_id
  ) INTO v_superadmin;

  -- Fall back to buyer_profiles when the user has no tenant profile.
  IF v_role IS NULL AND NOT v_superadmin THEN
    SELECT bp.buyer_org_id, bo.settings
    INTO v_buyer_org_id, v_buyer_settings
    FROM buyer_profiles bp
    JOIN buyer_organizations bo ON bo.id = bp.buyer_org_id
    WHERE bp.user_id = v_user_id
    LIMIT 1;

    IF v_buyer_org_id IS NOT NULL THEN
      v_role   := 'buyer';
      v_org_id := v_buyer_org_id;
      v_tier   := COALESCE(NULLIF(v_buyer_settings->>'subscription_tier', ''), 'pro');
    END IF;
  END IF;

  -- Resolve tier for tenant (exporter) orgs; buyer tier is already resolved above.
  IF v_tier IS NULL THEN
    IF v_org_id IS NOT NULL THEN
      v_tier := get_org_tier(v_org_id);
    ELSE
      v_tier := 'starter';
    END IF;
  END IF;

  -- Build claims object to merge into app_metadata
  v_claims := jsonb_build_object(
    'app_role',       COALESCE(v_role, 'viewer'),
    'org_id',         v_org_id,
    'org_tier',       v_tier,
    'is_superadmin',  v_superadmin
  );

  -- Merge into app_metadata in the event payload
  RETURN jsonb_set(
    event,
    '{claims, app_metadata}',
    COALESCE(event->'claims'->'app_metadata', '{}'::JSONB) || v_claims
  );
END;
$$;

-- The hook now also reads buyer_profiles / buyer_organizations.
GRANT SELECT ON buyer_profiles TO supabase_auth_admin;
GRANT SELECT ON buyer_organizations TO supabase_auth_admin;
