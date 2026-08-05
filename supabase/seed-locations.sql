-- Seed Nigerian States and LGAs
-- Run this after schema.sql

-- Insert States
INSERT INTO states (name, code) VALUES
  ('Ondo', 'ON'),
  ('Osun', 'OS'),
  ('Oyo', 'OY'),
  ('Ekiti', 'EK'),
  ('Cross River', 'CR'),
  ('Edo', 'ED'),
  ('Abia', 'AB'),
  ('Imo', 'IM'),
  ('Akwa Ibom', 'AK'),
  ('Rivers', 'RI')
ON CONFLICT (name) DO NOTHING;

-- Insert LGAs for Ondo
INSERT INTO lgas (state_id, name)
SELECT s.id, lga_name FROM states s,
  unnest(ARRAY['Akure South', 'Akure North', 'Idanre', 'Ondo West', 'Ondo East', 'Owo', 'Okitipupa', 'Ilaje', 'Ese Odo']) AS lga_name
WHERE s.code = 'ON'
ON CONFLICT (state_id, name) DO NOTHING;

-- Insert LGAs for Osun
INSERT INTO lgas (state_id, name)
SELECT s.id, lga_name FROM states s,
  unnest(ARRAY['Osogbo', 'Ife Central', 'Ife East', 'Ife North', 'Ife South', 'Ilesa East', 'Ilesa West', 'Iwo', 'Ede North', 'Ede South']) AS lga_name
WHERE s.code = 'OS'
ON CONFLICT (state_id, name) DO NOTHING;

-- Insert LGAs for Oyo
INSERT INTO lgas (state_id, name)
SELECT s.id, lga_name FROM states s,
  unnest(ARRAY['Ibadan North', 'Ibadan South West', 'Ibadan South East', 'Ibadan North East', 'Akinyele', 'Egbeda', 'Oluyole', 'Ona Ara', 'Oyo West', 'Oyo East']) AS lga_name
WHERE s.code = 'OY'
ON CONFLICT (state_id, name) DO NOTHING;

-- Insert LGAs for Ekiti
INSERT INTO lgas (state_id, name)
SELECT s.id, lga_name FROM states s,
  unnest(ARRAY['Ado Ekiti', 'Ikere', 'Oye', 'Ikole', 'Ido Osi', 'Ijero', 'Ekiti West', 'Ekiti East', 'Efon', 'Gbonyin']) AS lga_name
WHERE s.code = 'EK'
ON CONFLICT (state_id, name) DO NOTHING;

-- Insert LGAs for Cross River
INSERT INTO lgas (state_id, name)
SELECT s.id, lga_name FROM states s,
  unnest(ARRAY['Calabar Municipal', 'Calabar South', 'Ikom', 'Ogoja', 'Obubra', 'Yakurr', 'Boki', 'Akamkpa', 'Biase', 'Etung']) AS lga_name
WHERE s.code = 'CR'
ON CONFLICT (state_id, name) DO NOTHING;

-- Insert LGAs for Edo
INSERT INTO lgas (state_id, name)
SELECT s.id, lga_name FROM states s,
  unnest(ARRAY['Benin City', 'Oredo', 'Egor', 'Ikpoba Okha', 'Ovia North East', 'Ovia South West', 'Orhionmwon', 'Uhunmwonde', 'Etsako West', 'Etsako East']) AS lga_name
WHERE s.code = 'ED'
ON CONFLICT (state_id, name) DO NOTHING;

-- Insert LGAs for Abia
INSERT INTO lgas (state_id, name)
SELECT s.id, lga_name FROM states s,
  unnest(ARRAY['Aba North', 'Aba South', 'Umuahia North', 'Umuahia South', 'Osisioma', 'Ugwunagbo', 'Ukwa West', 'Ukwa East', 'Bende', 'Ohafia']) AS lga_name
WHERE s.code = 'AB'
ON CONFLICT (state_id, name) DO NOTHING;

-- Insert LGAs for Imo
INSERT INTO lgas (state_id, name)
SELECT s.id, lga_name FROM states s,
  unnest(ARRAY['Owerri Municipal', 'Owerri North', 'Owerri West', 'Orlu', 'Ideato North', 'Ideato South', 'Nkwerre', 'Isu', 'Okigwe', 'Onuimo']) AS lga_name
WHERE s.code = 'IM'
ON CONFLICT (state_id, name) DO NOTHING;

-- Insert LGAs for Akwa Ibom
INSERT INTO lgas (state_id, name)
SELECT s.id, lga_name FROM states s,
  unnest(ARRAY['Uyo', 'Ikot Ekpene', 'Eket', 'Oron', 'Abak', 'Ikono', 'Itu', 'Uruan', 'Etinan', 'Nsit Ibom']) AS lga_name
WHERE s.code = 'AK'
ON CONFLICT (state_id, name) DO NOTHING;

-- Insert LGAs for Rivers
INSERT INTO lgas (state_id, name)
SELECT s.id, lga_name FROM states s,
  unnest(ARRAY['Port Harcourt', 'Obio Akpor', 'Eleme', 'Ikwerre', 'Etche', 'Oyigbo', 'Okrika', 'Ogu Bolo', 'Bonny', 'Degema']) AS lga_name
WHERE s.code = 'RI'
ON CONFLICT (state_id, name) DO NOTHING;
