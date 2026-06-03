-- Insert Border Compliance Webinar 2026
-- OriginTrace
-- Friday 12 June 2026, Free virtual event (Zoom)
-- Speaker: Chikaodi (Chinyere) Nwaosu, One Acre Fund
-- Registration closes at 10 PM WAT on 11 June 2026 (21:00 UTC)

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
  'border-compliance-2026',
  'How to Get Your Exports Into Europe, the US, China, the UK and UAE Without Getting Flagged at the Border',
  'Border Compliance Webinar',
  'A free virtual session for Nigerian exporters covering EUDR, UK due diligence, US import rules, and China green trade requirements — what each market demands and what documentation you need in place before your next shipment.',
  'Don''t let a missing document stop your next shipment.',
  'OriginTrace',
  '2026-06-12',
  '10:00',
  'Online · Zoom',
  'Virtual — link sent to registered attendees',
  ARRAY['Export', 'Compliance', 'EUDR', 'Traceability', 'Virtual', 'Nigeria', 'UK Due Diligence', 'US Import Rules'],
  true,
  true,
  '2026-06-11 21:00:00+00'
)
ON CONFLICT (slug) DO UPDATE SET
  title                  = EXCLUDED.title,
  short_title            = EXCLUDED.short_title,
  description            = EXCLUDED.description,
  theme                  = EXCLUDED.theme,
  partner                = EXCLUDED.partner,
  date                   = EXCLUDED.date,
  start_time             = EXCLUDED.start_time,
  location               = EXCLUDED.location,
  location_address       = EXCLUDED.location_address,
  tags                   = EXCLUDED.tags,
  is_free                = EXCLUDED.is_free,
  registration_open      = EXCLUDED.registration_open,
  registration_closes_at = EXCLUDED.registration_closes_at,
  updated_at             = now();
