-- Event registrations table for OriginTrace × NEPC events
-- First event: Youth Export Development Programme (YEXDEP), 25 March 2026

CREATE TABLE IF NOT EXISTS event_registrations (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  event_slug      TEXT        NOT NULL DEFAULT 'yexdep-2026',
  full_name       TEXT        NOT NULL,
  email           TEXT        NOT NULL,
  phone           TEXT        NOT NULL,
  organization    TEXT        NOT NULL,
  role            TEXT        NOT NULL,
  state           TEXT        NOT NULL,
  registered_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  checked_in      BOOLEAN     DEFAULT FALSE NOT NULL,
  checked_in_at   TIMESTAMPTZ
);

-- Prevent duplicate registrations for the same event
CREATE UNIQUE INDEX IF NOT EXISTS event_registrations_email_event_uidx
  ON event_registrations (lower(email), event_slug);

-- Index for fast check-in lookups (search by name or email)
CREATE INDEX IF NOT EXISTS event_registrations_search_idx
  ON event_registrations (event_slug, lower(full_name), lower(email));
