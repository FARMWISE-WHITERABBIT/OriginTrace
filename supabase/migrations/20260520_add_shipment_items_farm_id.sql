-- Live compatibility fix.
--
-- Shipment line items need a direct farm reference for traceability drill-downs
-- and item-level inspection. The shipment can still aggregate multiple items,
-- but this nullable pointer preserves the primary source farm when known.
ALTER TABLE shipment_items
  ADD COLUMN IF NOT EXISTS farm_id UUID REFERENCES farms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shipment_items_farm
  ON shipment_items(farm_id);
