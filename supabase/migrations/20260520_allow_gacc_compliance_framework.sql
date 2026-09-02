-- Live compatibility fix.
--
-- The application and demo domain create China-bound compliance profiles with
-- regulation_framework = 'GACC'. A later constraint replacement preserved China
-- Green Trade but accidentally omitted the plain GACC value, so fresh databases
-- rejected valid China export profiles. Keep this constraint aligned with the
-- frameworks used by the scoring/compliance flows and seed data.
ALTER TABLE compliance_profiles
  DROP CONSTRAINT IF EXISTS compliance_profiles_regulation_framework_check;

ALTER TABLE compliance_profiles
  ADD CONSTRAINT compliance_profiles_regulation_framework_check
  CHECK (regulation_framework IN (
    'EUDR',
    'FSMA_204',
    'UK_Environment_Act',
    'Lacey_Act_UFLPA',
    'China_Green_Trade',
    'GACC',
    'UAE_Halal',
    'custom'
  ));
