-- Migration: Expand documents.document_type constraint and set up document storage
-- Run this in Supabase SQL Editor

-- ============================================================
-- 1. Expand documents.document_type CHECK constraint
-- ============================================================
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_document_type_check;

ALTER TABLE documents ADD CONSTRAINT documents_document_type_check CHECK (document_type IN (
  'export_license', 'phytosanitary', 'fumigation', 'organic_cert', 'insurance',
  'lab_result', 'customs_declaration', 'bill_of_lading', 'certificate_of_origin',
  'quality_cert',
  'uk_due_diligence', 'fda_prior_notice', 'lacey_act_declaration',
  'gacc_registration', 'gb_standards_cert', 'china_customs_declaration',
  'halal_certificate', 'esma_compliance', 'gulf_certificate_of_conformity',
  'other'
));

-- ============================================================
-- 2. Supabase Storage: documents bucket + RLS policies
-- NOTE: The bucket itself is created automatically on first upload
-- by lib/supabase/storage.ts (ensureDocumentsBucket). The policies
-- below provide org-scoped authenticated access via the service role.
--
-- Run in Supabase Dashboard > Storage > Policies, or via SQL:
-- ============================================================

-- Allow authenticated users to upload documents to their own org folder
-- (path format: <org_id>/<user_id>/<timestamp>_<filename>)
CREATE POLICY "Authenticated users can upload to own org folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = (
    SELECT org_id::text FROM profiles WHERE user_id = auth.uid() LIMIT 1
  )
);

-- Allow authenticated users to read documents in their own org folder
CREATE POLICY "Authenticated users can read own org documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = (
    SELECT org_id::text FROM profiles WHERE user_id = auth.uid() LIMIT 1
  )
);

-- Allow authenticated users to delete documents in their own org folder
CREATE POLICY "Authenticated users can delete own org documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = (
    SELECT org_id::text FROM profiles WHERE user_id = auth.uid() LIMIT 1
  )
);
