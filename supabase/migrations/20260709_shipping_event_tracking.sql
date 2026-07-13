-- =============================================================================
-- Migration: shipping-event tracking foundation for escrow automation
-- See docs/ESCROW-SHIPPING-APIS.md for the provider research + design.
--
-- Two tables:
--   tracking_subscriptions — one row per (provider, reference) we track for a
--     shipment. Inbound events are matched via provider_reference_id, NEVER by
--     bare container number (container numbers are reused every voyage).
--   shipping_events — idempotent, append-only store of normalized events.
--     UNIQUE (provider, provider_event_id) makes webhook retries harmless.
-- =============================================================================

-- ─── tracking_subscriptions ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tracking_subscriptions (
  id                     UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id                 UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  shipment_id            UUID        NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  provider               TEXT        NOT NULL,  -- 'manual' | 'mock' | 'terminal49' | 'vizion' | ...
  provider_reference_id  TEXT        NOT NULL,  -- the provider's subscription/reference id
  container_number       TEXT,
  bill_of_lading_number  TEXT,
  carrier_scac           TEXT,
  status                 TEXT        NOT NULL DEFAULT 'active'
                                     CHECK (status IN ('active', 'completed', 'cancelled', 'error')),
  -- Escrow auto-release is opt-in per subscription. Even when enabled, the
  -- engine only releases milestones on auto-releasable pipeline stages and
  -- never the final tranche (dual-confirmation stays manual).
  auto_release_enabled   BOOLEAN     NOT NULL DEFAULT FALSE,
  -- The user who set up tracking. Automated releases are attributed to this
  -- user (escrow_transactions.actor_id is FK to auth.users — there is no
  -- "system" user). Automation is skipped if NULL.
  created_by             UUID        REFERENCES auth.users(id),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_reference_id)
);

CREATE INDEX IF NOT EXISTS idx_tracking_subscriptions_org      ON tracking_subscriptions (org_id);
CREATE INDEX IF NOT EXISTS idx_tracking_subscriptions_shipment ON tracking_subscriptions (shipment_id);
CREATE INDEX IF NOT EXISTS idx_tracking_subscriptions_status   ON tracking_subscriptions (status) WHERE status = 'active';

ALTER TABLE tracking_subscriptions ENABLE ROW LEVEL SECURITY;

-- Org members read their own subscriptions. Writes go through API routes using
-- the service-role client (RLS bypass), same as the escrow tables.
CREATE POLICY tracking_subscriptions_org_read ON tracking_subscriptions
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  );

-- ─── shipping_events ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shipping_events (
  id                 UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id             UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  shipment_id        UUID        NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  subscription_id    UUID        NOT NULL REFERENCES tracking_subscriptions(id) ON DELETE CASCADE,
  provider           TEXT        NOT NULL,
  provider_event_id  TEXT        NOT NULL,
  -- DCSA-style equipment/transport/shipment event codes:
  -- GTIN gate-in · STUF stuffed · LOAD loaded · DEPA vessel departed ·
  -- ARRI vessel arrived · DISC discharged · GTOT gate-out · STRP stripped ·
  -- ISSU B/L issued · SURR B/L surrendered
  event_code         TEXT        NOT NULL,
  -- ACT = actual, EST = estimated, PLN = planned. Only ACT events can ever
  -- trigger a release.
  classifier         TEXT        NOT NULL DEFAULT 'ACT'
                                 CHECK (classifier IN ('ACT', 'EST', 'PLN')),
  location_locode    TEXT,
  location_name      TEXT,
  vessel_name        TEXT,
  voyage_number      TEXT,
  event_time         TIMESTAMPTZ NOT NULL,
  raw                JSONB,
  -- NULL until the trigger engine has handled the event. Events inside the
  -- settlement-delay window stay unprocessed ('deferred') and are re-run by
  -- the cron sweep once the delay has elapsed.
  processed_at       TIMESTAMPTZ,
  process_outcome    TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_shipping_events_shipment ON shipping_events (shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipping_events_org      ON shipping_events (org_id);
CREATE INDEX IF NOT EXISTS idx_shipping_events_pending  ON shipping_events (created_at) WHERE processed_at IS NULL;

ALTER TABLE shipping_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY shipping_events_org_read ON shipping_events
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  );
