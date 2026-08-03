-- =============================================================================
-- Migration: lead attribution for P3 funnel measurement
-- (docs/IMPORTER-FUNNEL-PLAN.md T14 / docs/MEASUREMENT.md)
--
-- Adds to lead_nurture_jobs:
--   persona      — 'exporter' | 'buyer' as self-identified on the demo form.
--                  Enables persona-split lead counts and the buyer-voiced
--                  nurture branch (the drip was exporter-voiced for everyone).
--   source_path  — the on-site path (incl. query, e.g. /demo?role=buyer) the
--                  lead submitted from.
--   referrer_path — document.referrer pathname at submit time (blog post →
--                  demo attribution without third-party analytics).
-- =============================================================================

ALTER TABLE lead_nurture_jobs
  ADD COLUMN IF NOT EXISTS persona       TEXT,
  ADD COLUMN IF NOT EXISTS source_path   TEXT,
  ADD COLUMN IF NOT EXISTS referrer_path TEXT;

CREATE INDEX IF NOT EXISTS idx_lead_nurture_jobs_persona
  ON lead_nurture_jobs (persona) WHERE persona IS NOT NULL;
