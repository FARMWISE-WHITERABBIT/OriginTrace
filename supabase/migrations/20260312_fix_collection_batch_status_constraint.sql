-- Fix collection_batches status constraint
-- The live DB was created before 'aggregated' was added to the allowed values.
-- This migration drops the old constraint and recreates it to match schema.sql.
ALTER TABLE collection_batches
  DROP CONSTRAINT IF EXISTS collection_batches_status_check;

ALTER TABLE collection_batches
  ADD CONSTRAINT collection_batches_status_check
  CHECK (status IN ('collecting', 'completed', 'aggregated', 'shipped'));
