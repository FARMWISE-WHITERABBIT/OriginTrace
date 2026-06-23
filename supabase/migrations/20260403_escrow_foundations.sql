-- ============================================================
-- WS-I Sprint 10: Escrow Foundations
-- Milestone-aware escrow with dispute hold and dual-confirmation
-- ============================================================

-- ─── escrow_accounts ─────────────────────────────────────────
-- One per shipment/contract deal. Holds the full fund lifecycle.

CREATE TABLE IF NOT EXISTS escrow_accounts (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id            UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  buyer_org_id      UUID        REFERENCES organizations(id),
  contract_id       UUID        REFERENCES contracts(id),
  shipment_id       UUID        REFERENCES shipments(id),
  currency          TEXT        NOT NULL DEFAULT 'USD'
                                CHECK (currency IN ('USD', 'EUR', 'GBP', 'NGN', 'XOF')),
  total_amount      DECIMAL(14,2) NOT NULL CHECK (total_amount > 0),
  held_amount       DECIMAL(14,2) NOT NULL DEFAULT 0 CHECK (held_amount >= 0),
  released_amount   DECIMAL(14,2) NOT NULL DEFAULT 0 CHECK (released_amount >= 0),
  status            TEXT        NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active', 'completed', 'disputed', 'cancelled')),
  -- JSONB array: [{milestone_id, stage, amount, description, released_at?}]
  milestone_config  JSONB,
  created_by        UUID        REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_escrow_accounts_org      ON escrow_accounts (org_id);
CREATE INDEX idx_escrow_accounts_shipment ON escrow_accounts (shipment_id);
CREATE INDEX idx_escrow_accounts_contract ON escrow_accounts (contract_id);
CREATE INDEX idx_escrow_accounts_buyer    ON escrow_accounts (buyer_org_id);

CREATE OR REPLACE FUNCTION update_escrow_accounts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER escrow_accounts_updated_at
  BEFORE UPDATE ON escrow_accounts
  FOR EACH ROW EXECUTE FUNCTION update_escrow_accounts_timestamp();

-- RLS
ALTER TABLE escrow_accounts ENABLE ROW LEVEL SECURITY;

-- Exporter org members can manage their escrow accounts
CREATE POLICY "exporter_manage_escrow"
  ON escrow_accounts FOR ALL TO authenticated
  USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  );

-- Buyer org members can read escrow accounts linked to their org
CREATE POLICY "buyer_read_escrow"
  ON escrow_accounts FOR SELECT TO authenticated
  USING (
    buyer_org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  );


-- ─── escrow_transactions ─────────────────────────────────────
-- Immutable ledger: every hold, release, forfeit, or refund event.

CREATE TABLE IF NOT EXISTS escrow_transactions (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  escrow_id     UUID        NOT NULL REFERENCES escrow_accounts(id) ON DELETE CASCADE,
  type          TEXT        NOT NULL
                            CHECK (type IN ('hold', 'release', 'forfeit', 'refund')),
  amount        DECIMAL(14,2) NOT NULL CHECK (amount > 0),
  currency      TEXT        NOT NULL,
  milestone_id  TEXT,
  actor_id      UUID        REFERENCES auth.users(id),
  reason        TEXT,
  payment_id    UUID        REFERENCES payments(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- No updated_at — this table is append-only / immutable
);

CREATE INDEX idx_escrow_tx_escrow   ON escrow_transactions (escrow_id);
CREATE INDEX idx_escrow_tx_type     ON escrow_transactions (type);

ALTER TABLE escrow_transactions ENABLE ROW LEVEL SECURITY;

-- Members of the owning org (exporter) can view and create transactions
CREATE POLICY "exporter_manage_escrow_tx"
  ON escrow_transactions FOR ALL TO authenticated
  USING (
    escrow_id IN (
      SELECT id FROM escrow_accounts
      WHERE org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    escrow_id IN (
      SELECT id FROM escrow_accounts
      WHERE org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
    )
  );

-- Buyer org members can read transactions on their escrow accounts
CREATE POLICY "buyer_read_escrow_tx"
  ON escrow_transactions FOR SELECT TO authenticated
  USING (
    escrow_id IN (
      SELECT id FROM escrow_accounts
      WHERE buyer_org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
    )
  );


-- ─── escrow_disputes ─────────────────────────────────────────
-- Formal dispute workflow with dual-confirmation release gate.

CREATE TABLE IF NOT EXISTS escrow_disputes (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  escrow_id           UUID        NOT NULL REFERENCES escrow_accounts(id) ON DELETE CASCADE,
  raised_by           UUID        NOT NULL REFERENCES auth.users(id),
  reason              TEXT        NOT NULL,
  status              TEXT        NOT NULL DEFAULT 'open'
                                  CHECK (status IN ('open', 'under_review', 'resolved', 'escalated')),
  resolution          TEXT,
  resolved_by         UUID        REFERENCES auth.users(id),
  resolved_at         TIMESTAMPTZ,
  -- Dual-confirmation: both exporter and buyer must confirm before release resumes
  exporter_confirmed  BOOLEAN     NOT NULL DEFAULT FALSE,
  buyer_confirmed     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_escrow_disputes_escrow ON escrow_disputes (escrow_id);
CREATE INDEX idx_escrow_disputes_status ON escrow_disputes (status);

CREATE OR REPLACE FUNCTION update_escrow_disputes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER escrow_disputes_updated_at
  BEFORE UPDATE ON escrow_disputes
  FOR EACH ROW EXECUTE FUNCTION update_escrow_disputes_timestamp();

ALTER TABLE escrow_disputes ENABLE ROW LEVEL SECURITY;

-- Both exporter and buyer can read disputes on their shared escrow
CREATE POLICY "parties_read_disputes"
  ON escrow_disputes FOR SELECT TO authenticated
  USING (
    escrow_id IN (
      SELECT id FROM escrow_accounts
      WHERE
        org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
        OR buyer_org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
    )
  );

-- Exporter can manage (raise, update) disputes on their own escrow
CREATE POLICY "exporter_manage_disputes"
  ON escrow_disputes FOR ALL TO authenticated
  USING (
    escrow_id IN (
      SELECT id FROM escrow_accounts
      WHERE org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    escrow_id IN (
      SELECT id FROM escrow_accounts
      WHERE org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
    )
  );

-- Buyer can also raise and update disputes on escrow accounts linked to them
CREATE POLICY "buyer_manage_disputes"
  ON escrow_disputes FOR ALL TO authenticated
  USING (
    escrow_id IN (
      SELECT id FROM escrow_accounts
      WHERE buyer_org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    escrow_id IN (
      SELECT id FROM escrow_accounts
      WHERE buyer_org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
    )
  );
