-- Migration: Expand documents.document_type constraint to include all supported types
-- Run this in Supabase SQL Editor

-- Drop the old constraint
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_document_type_check;

-- Add expanded constraint with all supported types
ALTER TABLE documents ADD CONSTRAINT documents_document_type_check CHECK (document_type IN (
  'export_license', 'phytosanitary', 'fumigation', 'organic_cert', 'insurance',
  'lab_result', 'customs_declaration', 'bill_of_lading', 'certificate_of_origin',
  'quality_cert',
  'uk_due_diligence', 'fda_prior_notice', 'lacey_act_declaration',
  'gacc_registration', 'gb_standards_cert', 'china_customs_declaration',
  'halal_certificate', 'esma_compliance', 'gulf_certificate_of_conformity',
  'other'
));
