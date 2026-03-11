import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import OpenAI from 'openai';
import { checkRateLimit, RATE_LIMIT_PRESETS } from '@/lib/api/rate-limit';
import { z } from 'zod';

const ocrSchema = z.object({
  image: z.string().min(1, 'Image data is required'),
});

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function POST(request: NextRequest) {
  const rateCheck = await checkRateLimit(request, null, RATE_LIMIT_PRESETS.ocr);
  if (rateCheck) return rateCheck;

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const ocrAllowedRoles = ['admin', 'compliance_officer', 'quality_manager'];
    if (!ocrAllowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();

    const parsed = ocrSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { image } = parsed.data;

    const base64Data = image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a document OCR specialist for agricultural traceability. Extract the farmer's full name and ID number from identity documents. Common document types include Nigerian NIN slips, voter's cards, driver's licenses, national ID cards, and similar government-issued IDs from West African countries.

Return ONLY valid JSON in this exact format:
{"farmerName": "FULL NAME", "idNumber": "ID_NUMBER", "confidence": 0.95, "documentType": "NIN Slip"}

Rules:
- farmerName: The person's full name as written on the document. Use title case.
- idNumber: The primary identification number on the document. Include any prefixes.
- confidence: A number between 0 and 1 representing how confident you are in the extraction. Use 0.9+ for clear documents, 0.7-0.9 for partially visible, below 0.7 for poor quality.
- documentType: The type of document detected (e.g., "NIN Slip", "Voter's Card", "Driver's License", "National ID", "Unknown").
- If you cannot read the document at all, return {"farmerName": "", "idNumber": "", "confidence": 0, "documentType": "Unreadable"}.
- Do NOT include any text outside the JSON object.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract the farmer name and ID number from this identity document photo.',
            },
            {
              type: 'image_url',
              image_url: { url: base64Data },
            },
          ],
        },
      ],
      max_completion_tokens: 200,
    });

    const content = response.choices[0]?.message?.content || '';

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch {
      return NextResponse.json(
        { error: 'Could not parse document. Please try again with a clearer photo.' },
        { status: 422 }
      );
    }

    return NextResponse.json({
      farmerName: result.farmerName || '',
      idNumber: result.idNumber || '',
      confidence: typeof result.confidence === 'number' ? result.confidence : 0.5,
      documentType: result.documentType || 'Unknown',
    });
  } catch (error: any) {
    console.error('OCR processing error:', error);

    if (error?.message?.includes('FREE_CLOUD_BUDGET_EXCEEDED')) {
      return NextResponse.json(
        { error: 'AI service temporarily unavailable. Please enter details manually.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process document. Please try again or enter details manually.' },
      { status: 500 }
    );
  }
}
