-- ============================================================
-- Storage Bucket Setup
-- Ensures the 'documents' bucket exists and has RLS policies
-- so org members can manage their org's documents.
-- ============================================================

-- Ensure documents storage bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  20971520,  -- 20MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- RLS: allow org members to manage their org's documents
-- The storage path convention is: {org_id}/{user_id}/{timestamp}_{filename}
-- so the first folder segment is the org_id.
DROP POLICY IF EXISTS "org_members_manage_documents" ON storage.objects;
CREATE POLICY "org_members_manage_documents"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] IN (
      SELECT org_id::text FROM public.profiles WHERE user_id = auth.uid()
    )
  );
