-- Live compatibility fix.
--
-- Shipment scoring and detail views persist readiness checklist state on the
-- shipment row. doc_status records uploaded/verified compliance documents, and
-- storage_controls records handling controls used by readiness scoring.
ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS doc_status JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS storage_controls JSONB DEFAULT '{}';
