-- ============================================================
-- Shipment Templates
-- Saved configurations for reuse when creating new shipments.
-- Stores defaults for destination, commodity, regulations,
-- buyer, freight forwarder, and cost fields.
-- ============================================================

CREATE TABLE IF NOT EXISTS shipment_templates (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  name          TEXT NOT NULL,
  description   TEXT,

  -- Core shipment defaults
  destination_country     TEXT,
  destination_port        TEXT,
  buyer_company           TEXT,
  buyer_contact           TEXT,
  commodity               TEXT,
  target_regulations      TEXT[] DEFAULT '{}',

  -- Logistics defaults
  freight_forwarder_name  TEXT,
  freight_forwarder_contact TEXT,
  shipping_line           TEXT,
  port_of_loading         TEXT,
  port_of_discharge       TEXT,
  clearing_agent_name     TEXT,
  clearing_agent_contact  TEXT,
  container_type          TEXT CHECK (container_type IN ('20FT', '40FT', '40HC', 'Reefer')),

  -- Commercial defaults
  contract_price_per_mt   DECIMAL(14,2),
  usd_ngn_rate            DECIMAL(10,4),

  -- Cost defaults
  customs_fees_ngn        DECIMAL(14,2),
  inspection_fees_ngn     DECIMAL(14,2),
  phyto_lab_costs_ngn     DECIMAL(14,2),
  certification_costs_ngn DECIMAL(14,2),
  port_handling_charges_ngn DECIMAL(14,2),
  freight_cost_usd        DECIMAL(14,2),
  freight_insurance_usd   DECIMAL(14,2),

  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE shipment_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shipment_templates_org_access"
  ON shipment_templates
  FOR ALL
  USING (org_id = (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_shipment_templates_org
  ON shipment_templates(org_id, is_active);
