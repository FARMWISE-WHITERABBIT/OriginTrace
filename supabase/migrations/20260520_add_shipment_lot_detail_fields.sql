-- Live compatibility fix.
--
-- The shipment lot UI and /api/shipments/[id]/lots route use lot_code and
-- summary fields to create stable lot anchors and show lot-level traceability.
-- Older fresh schemas only had lot_number/weight_kg, so these nullable columns
-- bridge the richer live UI model without rewriting existing lots.
ALTER TABLE shipment_lots
  ADD COLUMN IF NOT EXISTS lot_code TEXT,
  ADD COLUMN IF NOT EXISTS commodity TEXT,
  ADD COLUMN IF NOT EXISTS total_weight_kg NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS total_bags INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS farm_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_shipment_lots_lot_code
  ON shipment_lots(shipment_id, lot_code);
