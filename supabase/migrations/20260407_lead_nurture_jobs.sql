-- Lead nurture jobs table
-- Tracks every demo/calculator lead through the booking + reminder funnel

CREATE TABLE IF NOT EXISTS lead_nurture_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_email      TEXT NOT NULL,
  lead_name       TEXT NOT NULL,
  lead_phone      TEXT,
  lead_company    TEXT,
  commodity       TEXT,
  org_type        TEXT,
  hubspot_deal_id TEXT,
  -- active | booked | no_show | completed | cancelled | nurture_dropped
  status          TEXT NOT NULL DEFAULT 'active',
  meeting_at      TIMESTAMPTZ,
  calcom_booking_uid TEXT,
  nurture_step    INT NOT NULL DEFAULT 0,
  reminders_sent  JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_nurture_jobs_email      ON lead_nurture_jobs (lead_email);
CREATE INDEX IF NOT EXISTS idx_lead_nurture_jobs_status     ON lead_nurture_jobs (status);
CREATE INDEX IF NOT EXISTS idx_lead_nurture_jobs_meeting_at ON lead_nurture_jobs (meeting_at);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION set_lead_nurture_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_lead_nurture_updated_at ON lead_nurture_jobs;
CREATE TRIGGER trg_lead_nurture_updated_at
  BEFORE UPDATE ON lead_nurture_jobs
  FOR EACH ROW EXECUTE FUNCTION set_lead_nurture_updated_at();
