/**
 * POST /api/ocr
 *
 * Transport layer only: rate-limit → auth → role-check → validation
 * → delegate to OcrExtractor service → shape response.
 *
 * All AI prompt engineering and response parsing live in
 * lib/services/ocr-extractor.ts (ADR-001: no business logic in routes).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit, RATE_LIMIT_PRESETS } from '@/lib/api/rate-limit';
import { z } from 'zod';
import { extractDocumentOcr, OcrParseError } from '@/lib/services/ocr-extractor';

const OCR_ALLOWED_ROLES = ['admin', 'compliance_officer', 'quality_manager'] as const;

const bodySchema = z.object({
  image: z.string().min(1, 'Image data is required'),
});

export async function POST(request: NextRequest) {
  const rateCheck = await checkRateLimit(request, null, RATE_LIMIT_PRESETS.ocr);
  if (rateCheck) return rateCheck;

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseAdmin = createAdminClient();
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!OCR_ALLOWED_ROLES.includes(profile.role as any)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // ── Validation ────────────────────────────────────────────────────────────
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    // ── Extraction (delegated to service) ─────────────────────────────────────
    try {
      const result = await extractDocumentOcr(parsed.data.image);
      return NextResponse.json(result);
    } catch (err: any) {
      if (err instanceof OcrParseError) {
        return NextResponse.json(
          { error: 'Could not parse document. Please try again with a clearer photo.' },
          { status: 422 },
        );
      }
      if (err?.message?.includes('FREE_CLOUD_BUDGET_EXCEEDED')) {
        return NextResponse.json(
          { error: 'AI service temporarily unavailable. Please enter details manually.' },
          { status: 503 },
        );
      }
      throw err;
    }
  } catch (error: any) {
    console.error('OCR route error:', error);
    return NextResponse.json(
      { error: 'Failed to process document. Please try again or enter details manually.' },
      { status: 500 },
    );
  }
}
