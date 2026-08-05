-- ============================================================
-- Shipment cost additions
-- Adds phytosanitary/lab cost line and USD/NGN exchange rate
-- for per-shipment net margin calculations
-- ============================================================

-- Separate line for phyto certificate fees + lab test costs
-- (distinct from inspection_fees_ngn which covers pre-shipment inspection body)
ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS phyto_lab_costs_ngn DECIMAL(14,2);

-- Exchange rate stored per shipment so margin calculations are
-- reproducible regardless of later market rate changes
ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS usd_ngn_rate DECIMAL(10,4);
