-- ============================================================
-- Container Stuffing Records
-- Per-shipment load tally — each row is one item stuffed into
-- the container (bag count, weight, batch/lot reference).
-- ============================================================

CREATE TABLE IF NOT EXISTS container_stuffing_records (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id   UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  org_id        UUID NOT NULL REFERENCES organizations(id),

  -- Item identification
  item_description  TEXT NOT NULL,           -- e.g. "Cocoa Beans Grade A"
  lot_number        TEXT,                    -- bag lot / mark
  bag_count         INT NOT NULL DEFAULT 0,
  gross_weight_kg   DECIMAL(12,3) NOT NULL DEFAULT 0,
  net_weight_kg     DECIMAL(12,3),
  tare_weight_kg    DECIMAL(12,3),

  -- Traceability reference
  batch_id          UUID REFERENCES collection_batches(id),
  remarks           TEXT,

  -- Audit
  recorded_by   UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE container_stuffing_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stuffing_records_org_access"
  ON container_stuffing_records
  FOR ALL
  USING (org_id = (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

-- Index
CREATE INDEX IF NOT EXISTS idx_stuffing_records_shipment
  ON container_stuffing_records(shipment_id);
