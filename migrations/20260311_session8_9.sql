-- Session 8: Helper to resolve org tier (returns 'starter' when unset)
CREATE OR REPLACE FUNCTION get_org_tier(p_org_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_tier TEXT;
BEGIN
  SELECT tier INTO v_tier FROM organizations WHERE id = p_org_id LIMIT 1;
  IF v_tier IS NULL OR v_tier NOT IN ('starter', 'basic', 'pro', 'enterprise') THEN
    RETURN 'starter';
  END IF;
  RETURN v_tier;
END;
$$ LANGUAGE plpgsql;

-- Session 8: JWT custom claims hook
CREATE OR REPLACE FUNCTION custom_access_token_hook(event JSONB)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_claims JSONB;
  v_org_id UUID;
  v_org_tier TEXT;
  v_is_superadmin BOOLEAN;
  v_app_role TEXT;
BEGIN
  v_user_id := event->'user'->>'id';

  SELECT org_id, role INTO v_org_id, v_app_role
  FROM profiles WHERE user_id = v_user_id LIMIT 1;

  SELECT tier INTO v_org_tier
  FROM organizations WHERE id = v_org_id LIMIT 1;

  SELECT COUNT(*) > 0 INTO v_is_superadmin
  FROM system_admins WHERE user_id = v_user_id;

  v_claims := jsonb_build_object(
    'app_role', COALESCE(v_app_role, 'user'),
    'org_id', v_org_id,
    'org_tier', COALESCE(v_org_tier, 'starter'),
    'is_superadmin', COALESCE(v_is_superadmin, FALSE)
  );

  event['user']['app_metadata'] := COALESCE(event['user']['app_metadata'], '{}'::JSONB) || v_claims;
  RETURN event;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION custom_access_token_hook TO supabase_auth_admin;

-- Session 9A: Atomic shipment creation
CREATE OR REPLACE FUNCTION create_shipment_atomic(
  p_org_id UUID,
  p_destination_country TEXT,
  p_commodity TEXT,
  p_contract_id UUID,
  p_document_ids UUID[]
)
RETURNS TABLE (shipment_id UUID) AS $$
DECLARE
  v_shipment_id UUID;
BEGIN
  INSERT INTO shipments (org_id, destination_country, commodity)
  VALUES (p_org_id, p_destination_country, p_commodity)
  RETURNING id INTO v_shipment_id;

  INSERT INTO contract_shipments (contract_id, shipment_id)
  VALUES (p_contract_id, v_shipment_id)
  ON CONFLICT DO NOTHING;

  UPDATE documents
  SET shipment_id = v_shipment_id
  WHERE id = ANY(p_document_ids);

  RETURN QUERY SELECT v_shipment_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION create_shipment_atomic TO service_role;
REVOKE ALL ON FUNCTION create_shipment_atomic FROM public;

-- Session 9B: Atomic batch sync
CREATE OR REPLACE FUNCTION sync_batches_atomic(
  p_org_id UUID,
  p_user_id UUID,
  p_batches JSONB
)
RETURNS TABLE (synced_count INTEGER) AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  BEGIN
    -- Insert new batches; skip already-synced local_ids (idempotent)
    INSERT INTO batches (org_id, local_id, data)
    SELECT p_org_id,
           batch->>'local_id' AS local_id,
           batch AS data
    FROM jsonb_array_elements(p_batches) AS batch
    WHERE NOT EXISTS (
      SELECT 1 FROM batches already_synced
      WHERE already_synced.local_id = batch->>'local_id'
        AND already_synced.org_id = p_org_id
    )
    ON CONFLICT (local_id) DO NOTHING;

    -- Bulk insert batch_contributions from the JSONB array
    INSERT INTO batch_contributions (batch_id, org_id, created_at)
    SELECT (batch->>'id')::UUID, p_org_id, NOW()
    FROM jsonb_array_elements(p_batches) AS batch
    ON CONFLICT DO NOTHING;

    UPDATE bags
    SET updated_at = NOW()
    FROM jsonb_array_elements(p_batches) AS batch
    WHERE batch->>'id' = bags.batch_id::TEXT;

    GET DIAGNOSTICS v_count = ROW_COUNT;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error syncing batches: %', SQLERRM;
  END;

  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION sync_batches_atomic TO service_role;
REVOKE ALL ON FUNCTION sync_batches_atomic FROM public;
