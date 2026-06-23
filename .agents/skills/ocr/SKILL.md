---
name: ocr
description: >
  Use this skill when working with the AI-powered identity document OCR system,
  improving extraction accuracy, adding support for new document types, or
  handling OCR vision failures. Triggers for any mention of "NIN", "voter card",
  "OCR", "ID scanning", "identity document", or "OpenAI vision".
---

# OCR Skill

## 1. Overview

OriginTrace uses an AI-powered OCR system to extract data from farmer identity
documents (NIN, Voter Cards, Passports). This reduces manual entry errors
during field registration.

---

## 2. Technical Stack

- **Frontend**: `components/ocr-capture.tsx` (handles camera/upload).
- **Backend Service**: `lib/services/ocr-extractor.ts`.
- **AI Engine**: OpenAI GPT-4o Vision (via API).
- **Storage**: Temporary base64 for processing; permanent storage in
  Supabase `compliance_docs` bucket.

---

## 3. Supported Documents

| Document | Key Fields Extracted |
|----------|----------------------|
| **National ID (NIN)** | NIN Number, Full Name, DOB, Gender |
| **Voter Card** | VIN, Name, State, LGA |
| **Passport** | Passport Number, Nationality, Expiry |

---

## 4. Usage Pattern

```typescript
// components/ocr-capture.tsx
import { extractIdData } from '@/lib/services/ocr-extractor';

async function handleCapture(imageFile: File) {
  const result = await extractIdData(imageFile);
  if (result.success) {
    updateForm(result.data);
  } else {
    showError(result.error);
  }
}
```

---

## 5. RBAC & Permissions

OCR functionality is restricted to roles involved in field data collection:
- `admin`
- `aggregator`
- `agent` (Primary user)

*Note: `quality_manager` can view the results but typically does not perform
the capture.*

---

## 6. Gotchas

- **Image Quality**: Low-light or blurry images significantly reduce accuracy.
- **Rate Limiting**: OpenAI API calls are rate-limited per org to prevent
  abuse.
- **Privacy**: OCR results are never logged in plain text. Only the final
  extracted fields are stored in the database.
- **Size Limits**: Keep image uploads under 5MB to avoid processing timeouts.
- **Fallback**: Always provide a manual entry form if OCR fails.
