-- MRL (Maximum Residue Limit) Seed Data
-- Sources: EU Reg (EC) 396/2005 · UK PSD · US EPA 40 CFR 180 · China GB 2763-2021
-- Units: mg/kg (= ppm)
-- Commodities: cocoa, ginger, cashew, sesame, palm_oil
-- Markets: EU, UK, US, China
-- Last reviewed: 2026-04-03

-- Clear existing seed data before re-seeding
DELETE FROM mrl_database WHERE source_regulation IN (
  'EU 396/2005', 'UK PSD 2023', 'US EPA 40 CFR 180', 'China GB 2763-2021'
);

INSERT INTO mrl_database
  (active_ingredient, commodity, market, mrl_ppm, source_regulation, effective_date, mrl_notes)
VALUES

-- ── COCOA ────────────────────────────────────────────────────────────────────

-- Chlorpyrifos (EU/UK very strict since 2020 ban)
('chlorpyrifos',         'cocoa', 'EU',    0.01,  'EU 396/2005',      '2020-04-16', 'Enforcement LOQ'),
('chlorpyrifos',         'cocoa', 'UK',    0.01,  'UK PSD 2023',      '2022-01-01', 'Retained EU level'),
('chlorpyrifos',         'cocoa', 'US',    0.10,  'US EPA 40 CFR 180','2021-02-20', NULL),
('chlorpyrifos',         'cocoa', 'China', 0.50,  'China GB 2763-2021','2021-09-03', NULL),

-- Glyphosate
('glyphosate',           'cocoa', 'EU',    0.10,  'EU 396/2005',      '2022-06-01', NULL),
('glyphosate',           'cocoa', 'UK',    0.10,  'UK PSD 2023',      '2022-01-01', NULL),
('glyphosate',           'cocoa', 'US',    5.00,  'US EPA 40 CFR 180','2016-05-01', NULL),
('glyphosate',           'cocoa', 'China', 0.10,  'China GB 2763-2021','2021-09-03', NULL),

-- Cypermethrin
('cypermethrin',         'cocoa', 'EU',    0.05,  'EU 396/2005',      '2021-01-01', NULL),
('cypermethrin',         'cocoa', 'UK',    0.05,  'UK PSD 2023',      '2022-01-01', NULL),
('cypermethrin',         'cocoa', 'US',    2.00,  'US EPA 40 CFR 180','2018-01-01', NULL),
('cypermethrin',         'cocoa', 'China', 0.20,  'China GB 2763-2021','2021-09-03', NULL),

-- Lambda-cyhalothrin
('lambda_cyhalothrin',   'cocoa', 'EU',    0.02,  'EU 396/2005',      '2021-01-01', NULL),
('lambda_cyhalothrin',   'cocoa', 'UK',    0.02,  'UK PSD 2023',      '2022-01-01', NULL),
('lambda_cyhalothrin',   'cocoa', 'US',    0.50,  'US EPA 40 CFR 180','2018-01-01', NULL),
('lambda_cyhalothrin',   'cocoa', 'China', 0.05,  'China GB 2763-2021','2021-09-03', NULL),

-- Imidacloprid
('imidacloprid',         'cocoa', 'EU',    0.05,  'EU 396/2005',      '2021-01-01', NULL),
('imidacloprid',         'cocoa', 'UK',    0.05,  'UK PSD 2023',      '2022-01-01', NULL),
('imidacloprid',         'cocoa', 'US',    1.00,  'US EPA 40 CFR 180','2018-01-01', NULL),
('imidacloprid',         'cocoa', 'China', 0.50,  'China GB 2763-2021','2021-09-03', NULL),

-- Thiamethoxam
('thiamethoxam',         'cocoa', 'EU',    0.02,  'EU 396/2005',      '2023-04-01', NULL),
('thiamethoxam',         'cocoa', 'UK',    0.02,  'UK PSD 2023',      '2022-01-01', NULL),
('thiamethoxam',         'cocoa', 'US',    0.50,  'US EPA 40 CFR 180','2018-01-01', NULL),
('thiamethoxam',         'cocoa', 'China', 0.20,  'China GB 2763-2021','2021-09-03', NULL),

-- Deltamethrin
('deltamethrin',         'cocoa', 'EU',    0.05,  'EU 396/2005',      '2021-01-01', NULL),
('deltamethrin',         'cocoa', 'UK',    0.05,  'UK PSD 2023',      '2022-01-01', NULL),
('deltamethrin',         'cocoa', 'US',    1.00,  'US EPA 40 CFR 180','2018-01-01', NULL),
('deltamethrin',         'cocoa', 'China', 0.20,  'China GB 2763-2021','2021-09-03', NULL),

-- Carbendazim
('carbendazim',          'cocoa', 'EU',    0.10,  'EU 396/2005',      '2021-01-01', NULL),
('carbendazim',          'cocoa', 'UK',    0.10,  'UK PSD 2023',      '2022-01-01', NULL),
('carbendazim',          'cocoa', 'US',    1.00,  'US EPA 40 CFR 180','2018-01-01', NULL),
('carbendazim',          'cocoa', 'China', 1.00,  'China GB 2763-2021','2021-09-03', NULL),

-- ── GINGER ───────────────────────────────────────────────────────────────────

-- Chlorpyrifos
('chlorpyrifos',         'ginger', 'EU',    0.01,  'EU 396/2005',      '2020-04-16', 'Enforcement LOQ'),
('chlorpyrifos',         'ginger', 'UK',    0.01,  'UK PSD 2023',      '2022-01-01', NULL),
('chlorpyrifos',         'ginger', 'US',    0.10,  'US EPA 40 CFR 180','2021-02-20', NULL),
('chlorpyrifos',         'ginger', 'China', 0.50,  'China GB 2763-2021','2021-09-03', NULL),

-- Profenofos (common in ginger growing regions)
('profenofos',           'ginger', 'EU',    0.01,  'EU 396/2005',      '2021-01-01', 'Enforcement LOQ'),
('profenofos',           'ginger', 'UK',    0.01,  'UK PSD 2023',      '2022-01-01', NULL),
('profenofos',           'ginger', 'US',    0.10,  'US EPA 40 CFR 180','2018-01-01', NULL),
('profenofos',           'ginger', 'China', 0.50,  'China GB 2763-2021','2021-09-03', NULL),

-- Dimethoate
('dimethoate',           'ginger', 'EU',    0.02,  'EU 396/2005',      '2020-09-01', NULL),
('dimethoate',           'ginger', 'UK',    0.02,  'UK PSD 2023',      '2022-01-01', NULL),
('dimethoate',           'ginger', 'US',    2.00,  'US EPA 40 CFR 180','2018-01-01', NULL),
('dimethoate',           'ginger', 'China', 1.00,  'China GB 2763-2021','2021-09-03', NULL),

-- Cypermethrin
('cypermethrin',         'ginger', 'EU',    0.05,  'EU 396/2005',      '2021-01-01', NULL),
('cypermethrin',         'ginger', 'UK',    0.05,  'UK PSD 2023',      '2022-01-01', NULL),
('cypermethrin',         'ginger', 'US',    2.00,  'US EPA 40 CFR 180','2018-01-01', NULL),
('cypermethrin',         'ginger', 'China', 1.00,  'China GB 2763-2021','2021-09-03', NULL),

-- Acephate
('acephate',             'ginger', 'EU',    0.01,  'EU 396/2005',      '2021-01-01', 'Enforcement LOQ'),
('acephate',             'ginger', 'UK',    0.01,  'UK PSD 2023',      '2022-01-01', NULL),
('acephate',             'ginger', 'US',    3.00,  'US EPA 40 CFR 180','2018-01-01', NULL),
('acephate',             'ginger', 'China', 0.50,  'China GB 2763-2021','2021-09-03', NULL),

-- ── CASHEW ───────────────────────────────────────────────────────────────────

-- Lambda-cyhalothrin
('lambda_cyhalothrin',   'cashew', 'EU',    0.02,  'EU 396/2005',      '2021-01-01', NULL),
('lambda_cyhalothrin',   'cashew', 'UK',    0.02,  'UK PSD 2023',      '2022-01-01', NULL),
('lambda_cyhalothrin',   'cashew', 'US',    0.50,  'US EPA 40 CFR 180','2018-01-01', NULL),
('lambda_cyhalothrin',   'cashew', 'China', 0.20,  'China GB 2763-2021','2021-09-03', NULL),

-- Chlorpyrifos
('chlorpyrifos',         'cashew', 'EU',    0.01,  'EU 396/2005',      '2020-04-16', 'Enforcement LOQ'),
('chlorpyrifos',         'cashew', 'UK',    0.01,  'UK PSD 2023',      '2022-01-01', NULL),
('chlorpyrifos',         'cashew', 'US',    0.10,  'US EPA 40 CFR 180','2021-02-20', NULL),
('chlorpyrifos',         'cashew', 'China', 0.50,  'China GB 2763-2021','2021-09-03', NULL),

-- Imidacloprid
('imidacloprid',         'cashew', 'EU',    0.05,  'EU 396/2005',      '2021-01-01', NULL),
('imidacloprid',         'cashew', 'UK',    0.05,  'UK PSD 2023',      '2022-01-01', NULL),
('imidacloprid',         'cashew', 'US',    0.20,  'US EPA 40 CFR 180','2018-01-01', NULL),
('imidacloprid',         'cashew', 'China', 0.20,  'China GB 2763-2021','2021-09-03', NULL),

-- Endosulfan (banned in many markets but still detected)
('endosulfan',           'cashew', 'EU',    0.01,  'EU 396/2005',      '2013-07-31', 'Banned — enforcement LOQ'),
('endosulfan',           'cashew', 'UK',    0.01,  'UK PSD 2023',      '2022-01-01', 'Banned'),
('endosulfan',           'cashew', 'US',    0.01,  'US EPA 40 CFR 180','2016-07-29', 'Banned'),
('endosulfan',           'cashew', 'China', 0.05,  'China GB 2763-2021','2021-09-03', NULL),

-- ── SESAME ───────────────────────────────────────────────────────────────────

-- Chlorpyrifos
('chlorpyrifos',         'sesame', 'EU',    0.01,  'EU 396/2005',      '2020-04-16', 'Enforcement LOQ'),
('chlorpyrifos',         'sesame', 'UK',    0.01,  'UK PSD 2023',      '2022-01-01', NULL),
('chlorpyrifos',         'sesame', 'US',    0.10,  'US EPA 40 CFR 180','2021-02-20', NULL),
('chlorpyrifos',         'sesame', 'China', 0.10,  'China GB 2763-2021','2021-09-03', NULL),

-- Dimethoate (EU/UK heavily restricted)
('dimethoate',           'sesame', 'EU',    0.02,  'EU 396/2005',      '2020-09-01', NULL),
('dimethoate',           'sesame', 'UK',    0.02,  'UK PSD 2023',      '2022-01-01', NULL),
('dimethoate',           'sesame', 'US',    2.00,  'US EPA 40 CFR 180','2018-01-01', NULL),
('dimethoate',           'sesame', 'China', 1.00,  'China GB 2763-2021','2021-09-03', NULL),

-- Ethion (common sesame treatment)
('ethion',               'sesame', 'EU',    0.01,  'EU 396/2005',      '2021-01-01', 'Enforcement LOQ'),
('ethion',               'sesame', 'UK',    0.01,  'UK PSD 2023',      '2022-01-01', NULL),
('ethion',               'sesame', 'US',    2.00,  'US EPA 40 CFR 180','2018-01-01', NULL),
('ethion',               'sesame', 'China', 0.10,  'China GB 2763-2021','2021-09-03', NULL),

-- ── PALM OIL ─────────────────────────────────────────────────────────────────

-- Chlorpyrifos
('chlorpyrifos',         'palm_oil', 'EU',    0.01,  'EU 396/2005',      '2020-04-16', 'Enforcement LOQ'),
('chlorpyrifos',         'palm_oil', 'UK',    0.01,  'UK PSD 2023',      '2022-01-01', NULL),
('chlorpyrifos',         'palm_oil', 'US',    0.10,  'US EPA 40 CFR 180','2021-02-20', NULL),
('chlorpyrifos',         'palm_oil', 'China', 0.10,  'China GB 2763-2021','2021-09-03', NULL),

-- Paraquat (banned EU/UK)
('paraquat',             'palm_oil', 'EU',    0.01,  'EU 396/2005',      '2007-07-11', 'Banned — enforcement LOQ'),
('paraquat',             'palm_oil', 'UK',    0.01,  'UK PSD 2023',      '2022-01-01', 'Banned'),
('paraquat',             'palm_oil', 'US',    0.05,  'US EPA 40 CFR 180','2018-01-01', NULL),
('paraquat',             'palm_oil', 'China', 0.05,  'China GB 2763-2021','2021-09-03', NULL),

-- Glyphosate
('glyphosate',           'palm_oil', 'EU',    0.10,  'EU 396/2005',      '2022-06-01', NULL),
('glyphosate',           'palm_oil', 'UK',    0.10,  'UK PSD 2023',      '2022-01-01', NULL),
('glyphosate',           'palm_oil', 'US',    5.00,  'US EPA 40 CFR 180','2016-05-01', NULL),
('glyphosate',           'palm_oil', 'China', 0.50,  'China GB 2763-2021','2021-09-03', NULL);
