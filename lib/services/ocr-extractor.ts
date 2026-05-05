/**
 * lib/services/ocr-extractor.ts
 *
 * Application-service layer: encapsulates all AI prompt engineering,
 * model I/O, and response parsing for identity-document OCR.
 *
 * The route handler (app/api/ocr/route.ts) handles only transport
 * concerns (auth, rate-limit, validation) and delegates here.
 *
 * Dependency direction: lib/services → AI SDK (infra-like, but
 * scoped to application logic, not route logic).
 */

import OpenAI from 'openai';

export interface OcrResult {
  farmerName:   string;
  idNumber:     string;
  confidence:   number;
  documentType: string;
}

/** Thrown when the model returns a response that cannot be parsed as JSON. */
export class OcrParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OcrParseError';
  }
}

const SYSTEM_PROMPT = `You are a document OCR specialist for agricultural traceability. Extract the farmer's full name and ID number from identity documents. Common document types include Nigerian NIN slips, voter's cards, driver's licenses, national ID cards, and similar government-issued IDs from West African countries.

Return ONLY valid JSON in this exact format:
{"farmerName": "FULL NAME", "idNumber": "ID_NUMBER", "confidence": 0.95, "documentType": "NIN Slip"}

Rules:
- farmerName: The person's full name as written on the document. Use title case.
- idNumber: The primary identification number on the document. Include any prefixes.
- confidence: A number between 0 and 1 representing how confident you are in the extraction. Use 0.9+ for clear documents, 0.7-0.9 for partially visible, below 0.7 for poor quality.
- documentType: The type of document detected (e.g., "NIN Slip", "Voter's Card", "Driver's License", "National ID", "Unknown").
- If you cannot read the document at all, return {"farmerName": "", "idNumber": "", "confidence": 0, "documentType": "Unreadable"}.
- Do NOT include any text outside the JSON object.`;

/**
 * Extract name and ID number from a base64-encoded identity document image.
 *
 * @param imageBase64 - Raw base64 string or a data-URI (`data:image/...;base64,...`).
 * @throws {OcrParseError} If the model response cannot be parsed as valid JSON.
 * @throws Any OpenAI SDK error on network/auth/quota failure (caller decides how to surface these).
 */
export async function extractDocumentOcr(imageBase64: string): Promise<OcrResult> {
  const openai = new OpenAI({
    apiKey:   process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL:  process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });

  const dataUri = imageBase64.startsWith('data:')
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Extract the farmer name and ID number from this identity document photo.' },
          { type: 'image_url', image_url: { url: dataUri } },
        ],
      },
    ],
    max_completion_tokens: 200,
  });

  const content = completion.choices[0]?.message?.content ?? '';
  const jsonMatch = content.match(/\{[\s\S]*\}/);

  if (!jsonMatch) throw new OcrParseError('No JSON found in model response');

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  } catch {
    throw new OcrParseError('Model response contained malformed JSON');
  }

  return {
    farmerName:   typeof parsed.farmerName   === 'string' ? parsed.farmerName   : '',
    idNumber:     typeof parsed.idNumber     === 'string' ? parsed.idNumber     : '',
    confidence:   typeof parsed.confidence   === 'number' ? parsed.confidence   : 0.5,
    documentType: typeof parsed.documentType === 'string' ? parsed.documentType : 'Unknown',
  };
}
