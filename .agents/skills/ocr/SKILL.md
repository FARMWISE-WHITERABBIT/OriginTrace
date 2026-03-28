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

**Mission:** OriginTrace allows field agents to quickly register farmers by scanning their government-issued IDs. We use OpenAI Vision (`gpt-4o`) to extract names and ID numbers from photos taken in the field.

---

## 2. Implementation (`app/api/ocr/route.ts`)

The OCR endpoint receives a base64-encoded image and passes it to OpenAI with a specialized vision system prompt.

### Extraction Logic
- **Farmer Name**: Full name in title case.
- **ID Number**: Primary identification number including prefixes.
- **Confidence**: 0.0 to 1.0 score representing extraction quality.
- **Document Type**: Detected type (NIN Slip, Voter's Card, etc.).

---

## 3. Supported Documents

The system is trained via prompt engineering to recognize West African identity documents:
- Nigerian NIN (Slips and Cards)
- Voter's Cards
- Driver's Licenses
- National ID Cards

---

## 4. Rate Limiting & Safety

OCR is an expensive operation and is protected by:
- **Role Enforcement**: Only internal roles (`admin`, `compliance_officer`, `quality_manager`) can trigger OCR.
- **Rate Limits**: Controlled via `RATE_LIMIT_PRESETS.ocr` in `lib/api/rate-limit.ts`.
- **Budget Protection**: Handles `FREE_CLOUD_BUDGET_EXCEEDED` errors by prompting manual entry.

---

## 5. Gotchas

- **Base64 Padding**: The API expects the image data to optionally include the data URI prefix (`data:image/jpeg;base64,...`).
- **Prompt Sensitivity**: The JSON output is strictly enforced. Any changes to the prompt must ensure the output remains a single parsable JSON object.
- **Vision Limitations**: Poor lighting, blurry photos, or extreme angles will significantly lower extraction confidence. The UI should guide the user to retake the photo if `confidence < 0.7`.
