-- Insert Export Readiness 2026 event
-- NEPC South East Regional Office × Union Bank × OriginTrace
-- Thursday 23 April 2026, 9 AM, Top Floor Union Bank Ogui Road Enugu
-- Registration closes at 6 PM WAT (17:00 UTC)

INSERT INTO events (
  slug,
  title,
  short_title,
  description,
  theme,
  partner,
  date,
  start_time,
  location,
  location_address,
  tags,
  is_free,
  registration_open,
  registration_closes_at
) VALUES (
  'export-readiness-2026',
  'Export Readiness & Mentorship Training',
  'Export Readiness 2026',
  'A one-day capacity building training designed for registered and potential exporters, hosted by the NEPC South East Regional Office in collaboration with Union Bank, Enugu.',
  'Empowering Nigerian Exporters for Sustainable Growth in Global Market',
  'NEPC × Union Bank',
  '2026-04-23',
  '09:00',
  'Union Bank, Ogui Road, Enugu',
  'Top Floor, Union Bank, Ogui Road, Enugu',
  ARRAY['Export', 'Capacity Building', 'Mentorship', 'Nigeria'],
  true,
  true,
  '2026-04-23 17:00:00+00'
)
ON CONFLICT (slug) DO UPDATE SET
  title                 = EXCLUDED.title,
  short_title           = EXCLUDED.short_title,
  description           = EXCLUDED.description,
  theme                 = EXCLUDED.theme,
  partner               = EXCLUDED.partner,
  date                  = EXCLUDED.date,
  start_time            = EXCLUDED.start_time,
  location              = EXCLUDED.location,
  location_address      = EXCLUDED.location_address,
  tags                  = EXCLUDED.tags,
  is_free               = EXCLUDED.is_free,
  registration_open     = EXCLUDED.registration_open,
  registration_closes_at = EXCLUDED.registration_closes_at,
  updated_at            = now();
