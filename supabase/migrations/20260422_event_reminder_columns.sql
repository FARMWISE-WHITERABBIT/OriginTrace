-- Track whether automated/manual reminder emails have been sent for each event.
-- These booleans prevent the daily cron from double-firing and act as the
-- source of truth for reminder status shown in the superadmin UI.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS reminder_sent_day_before boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_sent_day_of      boolean NOT NULL DEFAULT false;
