-- Create events table for dynamic event management from superadmin
CREATE TABLE IF NOT EXISTS events (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  text UNIQUE NOT NULL,
  title                 text NOT NULL,
  short_title           text,
  description           text,
  theme                 text,
  partner               text,
  date                  date NOT NULL,
  start_time            time NOT NULL DEFAULT '09:00',
  location              text NOT NULL,
  location_address      text,
  tags                  text[] DEFAULT '{}',
  is_free               boolean NOT NULL DEFAULT true,
  registration_open     boolean NOT NULL DEFAULT true,
  -- Auto-close registrations at this timestamp (null = never auto-close)
  registration_closes_at timestamptz,
  image_url             text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Seed YEXDEP 2026 (end-of-day WAT = UTC+1, so 22:59:59 UTC)
INSERT INTO events (
  slug, title, short_title, description, theme, partner,
  date, start_time, location, location_address,
  tags, is_free, registration_open, registration_closes_at
) VALUES (
  'yexdep-2026',
  'Youth Export Development Programme',
  'YEXDEP 2026',
  'A one-day programme bringing together young Nigerian exporters and aspiring exporters to learn, connect, and grow.',
  '"From Passion to Port: Unlocking Youth Export Potential"',
  'Nigerian Export Promotion Council',
  '2026-03-25',
  '09:00',
  'NEPC Enugu Regional Office',
  'Agric Bank Building, Upper Presidential Road, Independence Layout, Enugu',
  ARRAY['Export', 'Youth', 'Nigeria'],
  true,
  true,
  '2026-03-25 22:59:59+00'
) ON CONFLICT (slug) DO NOTHING;
