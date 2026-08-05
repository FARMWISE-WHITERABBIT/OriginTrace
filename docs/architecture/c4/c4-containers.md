# C4 Level 2 — Containers

> Zooms into the OriginTrace platform boundary and shows the distinct deployable/runnable units.

```mermaid
C4Container
  title Container diagram — OriginTrace Platform

  Person(user, "Platform User", "Any of: Admin, Aggregator, Logistics, Compliance, Viewer")

  System_Boundary(ot, "OriginTrace Platform") {

    Container(nextjs, "Next.js Application", "Next.js 16, App Router, TypeScript", "Delivers the React UI and all API routes. Handles session auth, business logic, PDF generation, and webhook dispatch. Deployed on Vercel.")

    Container(supabaseDb, "Supabase Postgres", "PostgreSQL 15, Row-Level Security", "Primary datastore for all entities: organisations, profiles, farmers, batches, shipments, payments, compliance profiles, audit log, webhooks, API keys.")

    Container(supabaseAuth, "Supabase Auth", "GoTrue, JWT", "Issues and validates session JWTs. Manages user accounts, password reset, and MFA. Consumed by Next.js server components via @supabase/ssr.")

    Container(supabaseStorage, "Supabase Storage", "S3-compatible object store", "Stores uploaded documents (director ID, farm photos, logos). Accessed via signed URLs or public bucket paths.")

    Container(cron, "Scheduled Jobs", "Vercel Cron / cron endpoint", "Periodic tasks: disbursement status polling, shipment payment reconciliation, escrow funding checks. Hits /api/cron/* routes on a schedule.")

    Container(pdfEngine, "PDF Generator", "jsPDF, in-process", "Generates waybill PDFs for shipments. Runs in the Next.js API route process — no separate service.")
  }

  System_Ext(openai, "OpenAI API", "GPT-4o Vision — document OCR")
  System_Ext(paymentRail, "Payment Rails", "NGN bank transfers + account resolution")
  System_Ext(fxProvider, "FX / Multi-currency", "Wallet management, FX conversions")
  System_Ext(webhookTargets, "Customer Webhook Endpoints", "Buyer and ERP systems")
  System_Ext(satellite, "Satellite / Geospatial", "EUDR polygon + deforestation scoring")

  Rel(user, nextjs, "Accesses via browser", "HTTPS")

  Rel(nextjs, supabaseDb, "All data queries and writes", "Supabase JS client / PostgREST")
  Rel(nextjs, supabaseAuth, "Session creation, token validation", "Supabase Auth client")
  Rel(nextjs, supabaseStorage, "Document upload and retrieval", "Supabase Storage client")
  Rel(nextjs, openai, "OCR requests (base64 images)", "HTTPS / REST")
  Rel(nextjs, paymentRail, "Bank transfer + account name resolution", "HTTPS / REST")
  Rel(nextjs, fxProvider, "Wallet + FX operations", "HTTPS / REST")
  Rel(nextjs, webhookTargets, "Signed event dispatch", "HTTPS POST")
  Rel(nextjs, satellite, "Geo-polygon validation", "HTTPS / REST")
  Rel(cron, nextjs, "Triggers scheduled jobs", "HTTPS / internal")
  Rel(nextjs, pdfEngine, "Waybill generation (in-process)", "In-process function call")
```

## Container Responsibilities

| Container | Owns | Does NOT own |
|---|---|---|
| Next.js App | Route handling, auth middleware, business logic, PDF, webhook dispatch | Data durability, file storage, auth sessions |
| Supabase Postgres | All persistent state; RLS enforces org isolation | Application logic, HTTP transport |
| Supabase Auth | User identity, JWT lifecycle | Org roles/permissions (those live in `profiles` table) |
| Supabase Storage | Binary blobs (documents, images) | Metadata (paths stored in Postgres) |
| Cron | Periodic reconciliation triggers | Reconciliation logic itself (that's in API routes) |
| PDF Engine | Waybill layout + rendering | Waybill data (fetched from Postgres by the API route) |

## Data Flow: Batch → Disbursement

```
Aggregator creates batch → Postgres (batches)
  → Aggregator completes batch → status: completed
    → Disbursement calculation → Postgres (disbursement_calculations)
      → Admin approves → Payment Rail (bank transfer)
        → Cron polls status → Postgres (updated)
          → webhookTargets ← event: payment.received
```
