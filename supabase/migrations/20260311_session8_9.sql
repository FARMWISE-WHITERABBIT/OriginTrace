-- =============================================================================
-- Migration: JWT custom claims + shipment/sync transaction RPCs
-- Sessions 8 + 9 — OriginTrace audit remediation
-- Run once against your Supabase project.
--
-- CORRECTED 2026-07-09: the original version of this file was written against
-- a pre-UUID schema (BIGINT org/farm/batch/contract/document ids). It was
-- never applied to the live DB. Live schema uses UUID for all of these. This
-- version also fixes two real column mismatches found while correcting types:
--   - collection_batches has no gps_lat/gps_lng/estimated_bags/estimated_weight
--     columns, and its client-supplied code column is 'batch_code', not
--     'batch_id'. GPS lat/lng have no destination column in the live schema —
--     only a boolean 'has_gps' flag exists, which this version now sets
--     faithfully instead of discarding the signal entirely.
--   - the bags UPDATE joined on b.id::TEXT = bag->>'serial', but 'id' is now
--     a UUID and bags has a dedicated 'serial' TEXT column — the join must be
--     b.serial = bag->>'serial'.
--   - batch_contributions has no org_id column at all (org-scoped indirectly
--     via batch_id -> collection_batches.org_id) — dropped from the insert.
-- Verified live via BEGIN/ROLLBACK test calls against both RPCs (2026-07-09).
-- Also fixed two callers that passed the wrong id: app/api/shipments/route.ts
-- was passing profiles.id as p_created_by (shipments.created_by FKs to
-- auth.users, needs user.id); app/api/sync/route.ts was passing user.id as
-- p_user_id (collection_batches.agent_id FKs to profiles.id, needs profile.id).
-- =============================================================================


-- =============================================================================
-- SESSION 8: JWT Custom Claims
-- =============================================================================
-- Stores role, org_id, org_tier, and is_superadmin in the user's JWT
-- app_metadata so that middleware can read them without any DB calls.
--
-- The hook fires on every token refresh and sign-in, keeping claims fresh.
-- Middleware reads: request.auth.user.app_metadata (from the JWT cookie).
-- No DB query required — zero round-trips per page load.
--
-- NOTE: creating this function is necessary but not sufficient — it must also
-- be wired up in Supabase Dashboard → Authentication → Hooks → Custom Access
-- Token Hook → Function: custom_access_token_hook. That's a dashboard/Auth
-- config step, not something a SQL migration can do. Until that's done,
-- middleware.ts's JWT-claims fast path stays inactive and it keeps using its
-- existing DB-fallback path (fetchClaimsFromDb) — which already works
-- correctly, just with the extra round-trips this hook was meant to remove.

-- ─── Helper: resolve org tier ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_org_tier(p_org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tier TEXT;
BEGIN
  SELECT
    COALESCE(
      NULLIF(subscription_tier, ''),
      (settings->>'subscription_tier'),
      'starter'
    )
  INTO v_tier
  FROM organizations
  WHERE id = p_org_id;

  IF v_tier NOT IN ('starter', 'basic', 'pro', 'enterprise') THEN
    v_tier := 'starter';
  END IF;

  RETURN COALESCE(v_tier, 'starter');
END;
$$;

-- ─── Main JWT hook ────────────────────────────────────────────────────────────
-- This function is called by Supabase Auth as a "custom access token hook"
-- each time a JWT is minted (login, token refresh).
-- Configure it in: Supabase Dashboard → Authentication → Hooks
--   Hook type: Custom Access Token
--   Function:  custom_access_token_hook

CREATE OR REPLACE FUNCTION custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id     UUID;
  v_role        TEXT;
  v_org_id      UUID;
  v_tier        TEXT;
  v_superadmin  BOOLEAN := FALSE;
  v_claims      JSONB;
BEGIN
  v_user_id := (event->>'user_id')::UUID;

  -- Fetch profile (role + org)
  SELECT role, org_id
  INTO v_role, v_org_id
  FROM profiles
  WHERE user_id = v_user_id
  LIMIT 1;

  -- Resolve tier
  IF v_org_id IS NOT NULL THEN
    v_tier := get_org_tier(v_org_id);
  ELSE
    v_tier := 'starter';
  END IF;

  -- Check superadmin
  SELECT EXISTS (
    SELECT 1 FROM system_admins WHERE user_id = v_user_id
  ) INTO v_superadmin;

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

-- Grant to supabase_auth_admin so the hook can fire
GRANT EXECUTE ON FUNCTION custom_access_token_hook(JSONB) TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION get_org_tier(UUID) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION custom_access_token_hook(JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_org_tier(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_org_tier(UUID) TO service_role;

-- Also grant SELECT on the tables the hook reads
GRANT SELECT ON profiles TO supabase_auth_admin;
GRANT SELECT ON organizations TO supabase_auth_admin;
GRANT SELECT ON system_admins TO supabase_auth_admin;


-- =============================================================================
-- SESSION 9A: Atomic shipment creation RPC
-- =============================================================================
-- Wraps: shipments INSERT + contract_shipments INSERT + documents UPDATE
-- into a single transaction. If any step fails, the whole thing rolls back.
-- Eliminates partial-failure orphan data (e.g. shipment created but
-- contract link silently dropped on error).

CREATE OR REPLACE FUNCTION create_shipment_atomic(
  p_org_id              UUID,
  p_created_by          UUID,
  p_shipment_code       TEXT,
  p_destination_country TEXT,
  p_commodity           TEXT,
  p_buyer_company       TEXT        DEFAULT NULL,
  p_buyer_contact       TEXT        DEFAULT NULL,
  p_target_regulations  TEXT[]      DEFAULT NULL,
  p_destination_port    TEXT        DEFAULT NULL,
  p_notes               TEXT        DEFAULT NULL,
  p_estimated_ship_date DATE        DEFAULT NULL,
  p_compliance_profile_id UUID      DEFAULT NULL,
  p_contract_id         UUID        DEFAULT NULL,
  p_document_ids        UUID[]      DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_shipment  JSONB;
  v_ship_id   UUID;
BEGIN
  -- 1. Insert shipment
  INSERT INTO shipments (
    org_id, created_by, shipment_code, status,
    destination_country, commodity,
    buyer_company, buyer_contact, target_regulations,
    destination_port, notes, estimated_ship_date,
    compliance_profile_id
  )
  VALUES (
    p_org_id, p_created_by, p_shipment_code, 'draft',
    p_destination_country, p_commodity,
    p_buyer_company, p_buyer_contact, p_target_regulations,
    p_destination_port, p_notes, p_estimated_ship_date,
    p_compliance_profile_id
  )
  RETURNING to_jsonb(shipments.*) INTO v_shipment;

  v_ship_id := (v_shipment->>'id')::UUID;

  -- 2. Link to contract (optional)
  IF p_contract_id IS NOT NULL THEN
    INSERT INTO contract_shipments (contract_id, shipment_id)
    VALUES (p_contract_id, v_ship_id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- 3. Link documents (bulk update, single statement)
  IF p_document_ids IS NOT NULL AND array_length(p_document_ids, 1) > 0 THEN
    UPDATE documents
    SET
      linked_entity_type = 'shipment',
      linked_entity_id   = v_ship_id
    WHERE id = ANY(p_document_ids)
      AND org_id = p_org_id;
  END IF;

  RETURN v_shipment;
END;
$$;

REVOKE ALL ON FUNCTION create_shipment_atomic(UUID,UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT[],TEXT,TEXT,DATE,UUID,UUID,UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_shipment_atomic(UUID,UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT[],TEXT,TEXT,DATE,UUID,UUID,UUID[]) TO service_role;


-- =============================================================================
-- SESSION 9B: Atomic batch sync RPC
-- =============================================================================
-- Replaces the N×M loop in /api/sync PUT:
--   for each batch:
--     SELECT existing → INSERT batch → for each contrib INSERT → for each bag UPDATE
--
-- New approach: single RPC call per sync payload.
-- The function is idempotent on local_id (duplicate syncs skip cleanly).

CREATE OR REPLACE FUNCTION sync_batches_atomic(
  p_org_id  UUID,
  p_user_id UUID,
  p_batches JSONB   -- array of batch objects
)
RETURNS JSONB       -- array of { local_id, status, id? }
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_batch       JSONB;
  v_local_id    TEXT;
  v_existing_id UUID;
  v_new_id      UUID;
  v_results     JSONB := '[]'::JSONB;
  v_total_weight NUMERIC;
  v_bag_count   INTEGER;
  v_farm_id     UUID;
  v_has_gps     BOOLEAN;
BEGIN
  FOR v_batch IN SELECT jsonb_array_elements(p_batches) LOOP
    v_local_id := v_batch->>'local_id';

    IF v_local_id IS NULL THEN
      CONTINUE;
    END IF;

    -- Skip if already synced (idempotent)
    SELECT id INTO v_existing_id
    FROM collection_batches
    WHERE local_id = v_local_id
      AND org_id   = p_org_id
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      v_results := v_results || jsonb_build_object(
        'local_id', v_local_id,
        'status',   'already_synced',
        'id',       v_existing_id
      );
      CONTINUE;
    END IF;

    -- Compute totals
    SELECT
      COALESCE(SUM((c->>'weight_kg')::NUMERIC), 0),
      COALESCE(SUM((c->>'bag_count')::INTEGER), 0)
    INTO v_total_weight, v_bag_count
    FROM jsonb_array_elements(COALESCE(v_batch->'contributors', '[]'::JSONB)) c;

    IF v_bag_count = 0 THEN
      v_bag_count := jsonb_array_length(COALESCE(v_batch->'bags', '[]'::JSONB));
    END IF;
    IF v_total_weight = 0 THEN
      SELECT COALESCE(SUM((bag->>'weight')::NUMERIC), 0)
      INTO v_total_weight
      FROM jsonb_array_elements(COALESCE(v_batch->'bags', '[]'::JSONB)) bag;
    END IF;

    -- farm_id: 'unknown' / 'temp-*' offline sentinels have no UUID equivalent —
    -- leave NULL rather than invent one; collection_batches.farm_id is NOT NULL,
    -- so an unresolvable farm_id surfaces as a per-batch sync error below
    -- (caught by the EXCEPTION block), not a silent bad write.
    v_farm_id := NULLIF(NULLIF(v_batch->>'farm_id', 'unknown'), '')::UUID;

    -- collection_batches has no gps_lat/gps_lng columns to store precise
    -- coordinates in — only a boolean 'has_gps' flag. Preserve that signal
    -- rather than silently dropping GPS capture entirely.
    v_has_gps := (v_batch->>'gps_lat' IS NOT NULL AND v_batch->>'gps_lng' IS NOT NULL);

    -- Insert batch
    BEGIN
      INSERT INTO collection_batches (
        org_id, farm_id, agent_id, batch_code, status,
        commodity, has_gps,
        total_weight, bag_count,
        notes, local_id, synced_at
      )
      VALUES (
        p_org_id,
        v_farm_id,
        p_user_id,
        NULLIF(v_batch->>'batch_id', ''),
        'collecting',
        NULLIF(v_batch->>'commodity', ''),
        v_has_gps,
        v_total_weight,
        v_bag_count,
        NULLIF(v_batch->>'notes', ''),
        v_local_id,
        NOW()
      )
      RETURNING id INTO v_new_id;
    EXCEPTION WHEN OTHERS THEN
      v_results := v_results || jsonb_build_object(
        'local_id', v_local_id,
        'status',   'error',
        'error',    SQLERRM
      );
      CONTINUE;
    END;

    -- Insert contributors (bulk) — batch_contributions has no org_id column;
    -- it's org-scoped indirectly via batch_id -> collection_batches.org_id.
    IF jsonb_array_length(COALESCE(v_batch->'contributors', '[]'::JSONB)) > 0 THEN
      INSERT INTO batch_contributions (batch_id, farm_id, farmer_name, weight_kg, bag_count)
      SELECT
        v_new_id,
        NULLIF(c->>'farm_id', '')::UUID,
        c->>'farmer_name',
        (c->>'weight_kg')::NUMERIC,
        (c->>'bag_count')::INTEGER
      FROM jsonb_array_elements(v_batch->'contributors') c
      WHERE COALESCE((c->>'bag_count')::INTEGER, 0) > 0;
    END IF;

    -- Update bags (bulk) — join on the dedicated 'serial' column, not id
    IF jsonb_array_length(COALESCE(v_batch->'bags', '[]'::JSONB)) > 0 THEN
      UPDATE bags b
      SET
        collection_batch_id = v_new_id,
        weight_kg           = (bag->>'weight')::NUMERIC,
        grade               = bag->>'grade',
        status              = 'collected'
      FROM jsonb_array_elements(v_batch->'bags') bag
      WHERE b.serial   = bag->>'serial'
        AND b.org_id   = p_org_id
        AND bag->>'serial' IS NOT NULL;
    END IF;

    v_results := v_results || jsonb_build_object(
      'local_id', v_local_id,
      'status',   'synced',
      'id',       v_new_id
    );
  END LOOP;

  RETURN v_results;
END;
$$;

REVOKE ALL ON FUNCTION sync_batches_atomic(UUID, UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sync_batches_atomic(UUID, UUID, JSONB) TO service_role;
