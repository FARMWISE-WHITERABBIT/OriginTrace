-- Live compatibility fix.
--
-- Inventory and dispatch flows update collection_batches.status to 'resolved'
-- and 'dispatched'. An older constraint migration narrowed the allowed values,
-- which makes those app paths fail on fresh databases. Restore the full status
-- vocabulary used by the UI, dashboard counts, and batch dispatch API.
ALTER TABLE collection_batches
  DROP CONSTRAINT IF EXISTS collection_batches_status_check;

ALTER TABLE collection_batches
  ADD CONSTRAINT collection_batches_status_check
  CHECK (status IN ('collecting', 'completed', 'aggregated', 'resolved', 'dispatched', 'shipped'));
