import { createAdminClient } from './admin';

const BUCKET_NAME = 'documents';
const SIGNED_URL_EXPIRES_IN = 10 * 365 * 24 * 60 * 60;

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/tiff',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/octet-stream',
];

export async function ensureDocumentsBucket() {
  const supabase = createAdminClient();
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error('Failed to list buckets:', error.message);
    return;
  }
  const exists = buckets?.some(b => b.name === BUCKET_NAME);
  if (!exists) {
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: false,
      fileSizeLimit: 20 * 1024 * 1024,
      allowedMimeTypes: ALLOWED_MIME_TYPES,
    });
    if (createError) {
      console.error('Failed to create documents bucket:', createError.message);
    }
  }
}

export async function uploadDocumentFile(
  orgId: string,
  userId: string,
  fileBuffer: ArrayBuffer,
  fileName: string,
  contentType: string
): Promise<{ url: string; path: string; file_name: string }> {
  const supabase = createAdminClient();
  await ensureDocumentsBucket();

  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${orgId}/${userId}/${timestamp}_${safeName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, fileBuffer, {
      contentType: contentType || 'application/octet-stream',
      upsert: false,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data: signedData, error: signedError } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(data.path, SIGNED_URL_EXPIRES_IN);

  if (signedError || !signedData) {
    throw new Error(`Failed to generate signed URL: ${signedError?.message}`);
  }

  return {
    url: signedData.signedUrl,
    path: data.path,
    file_name: fileName,
  };
}

export async function deleteDocumentFile(storagePath: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
}
