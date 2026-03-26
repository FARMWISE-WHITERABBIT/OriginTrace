-- Performance: composite indexes for common multi-column query patterns
-- Run in Supabase SQL Editor or via supabase db push

-- Farm list filtered by org + compliance status (review queue, approval workflow)
-- Query pattern: SELECT ... FROM farms WHERE org_id = $1 AND compliance_status = $2
CREATE INDEX IF NOT EXISTS idx_farms_org_compliance
  ON farms(org_id, compliance_status);

-- Audit log pagination (org + time descending — audit trail queries on every audit page load)
-- Query pattern: SELECT ... FROM audit_events WHERE org_id = $1 ORDER BY created_at DESC LIMIT n
CREATE INDEX IF NOT EXISTS idx_audit_events_org_created
  ON audit_events(org_id, created_at DESC);

-- Notification unread count (queried on every page load for header badge)
-- Query pattern: SELECT count(*) FROM notifications WHERE org_id = $1 AND is_read = false
CREATE INDEX IF NOT EXISTS idx_notifications_org_read
  ON notifications(org_id, is_read, created_at DESC);

-- Batch contributions weight/bag aggregation per batch
-- Query pattern: SELECT SUM(weight_kg), SUM(bag_count) FROM batch_contributions WHERE org_id = $1
CREATE INDEX IF NOT EXISTS idx_batch_contributions_org
  ON batch_contributions(org_id);

-- Shipments filtered by org + status (shipments list page)
-- Query pattern: SELECT ... FROM shipments WHERE org_id = $1 AND status = $2
CREATE INDEX IF NOT EXISTS idx_shipments_org_status
  ON shipments(org_id, status);
