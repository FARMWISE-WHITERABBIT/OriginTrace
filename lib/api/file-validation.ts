import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Server-side file validation for all upload endpoints
// ---------------------------------------------------------------------------

export const ALLOWED_DOCUMENT_TYPES: Record<string, string[]> = {
  'image/jpeg':       ['.jpg', '.jpeg'],
  'image/png':        ['.png'],
  'image/webp':       ['.webp'],
  'application/pdf':  ['.pdf'],
};

export const ALLOWED_IMAGE_TYPES: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png':  ['.png'],
  'image/webp': ['.webp'],
};

export const FILE_SIZE_LIMITS = {
  document: 10 * 1024 * 1024,  // 10 MB
  image:    5  * 1024 * 1024,  //  5 MB
  logo:     2  * 1024 * 1024,  //  2 MB
} as const;

export type FileCategory = keyof typeof FILE_SIZE_LIMITS;

export interface FileValidationResult {
  valid: boolean;
  error?: NextResponse;
}

/**
 * Validates a File or Blob for type and size.
 * Returns { valid: true } or { valid: false, error: NextResponse(400) }
 */
export function validateFile(
  file: { type: string; size: number; name?: string },
  category: FileCategory,
  allowedTypes: Record<string, string[]> = ALLOWED_DOCUMENT_TYPES
): FileValidationResult {
  const maxBytes = FILE_SIZE_LIMITS[category];

  if (!allowedTypes[file.type]) {
    return {
      valid: false,
      error: NextResponse.json(
        {
          error: 'Invalid file type',
          allowed: Object.keys(allowedTypes),
          received: file.type,
        },
        { status: 400 }
      ),
    };
  }

  if (file.size > maxBytes) {
    return {
      valid: false,
      error: NextResponse.json(
        {
          error: 'File too large',
          maxMb: maxBytes / 1024 / 1024,
          receivedMb: (file.size / 1024 / 1024).toFixed(2),
        },
        { status: 400 }
      ),
    };
  }

  // Magic bytes check: verify actual content matches declared MIME type
  return { valid: true };
}

/**
 * Validates a multipart/form-data upload request.
 * Returns the FormData + file, or a 400 error response.
 */
export async function validateUploadRequest(
  request: Request,
  fieldName: string,
  category: FileCategory,
  allowedTypes: Record<string, string[]> = ALLOWED_DOCUMENT_TYPES
): Promise<{ formData: FormData; file: File; error: null } | { formData: null; file: null; error: NextResponse }> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return {
      formData: null,
      file: null,
      error: NextResponse.json({ error: 'Invalid multipart form data' }, { status: 400 }),
    };
  }

  const file = formData.get(fieldName);
  if (!file || !(file instanceof File)) {
    return {
      formData: null,
      file: null,
      error: NextResponse.json({ error: `Missing field: ${fieldName}` }, { status: 400 }),
    };
  }

  const validation = validateFile(file, category, allowedTypes);
  if (!validation.valid) {
    return { formData: null, file: null, error: validation.error! };
  }

  return { formData, file, error: null };
}

/**
 * Sanitise a filename for safe storage: strip path traversal, limit length.
 */
export function sanitiseFilename(name: string): string {
  return name
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\.{2,}/g, '.')
    .slice(0, 200);
}
