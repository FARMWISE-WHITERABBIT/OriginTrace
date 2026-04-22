# C4 Level 1 — System Context

> Describes who uses OriginTrace and which external systems it depends on.

```mermaid
C4Context
  title System Context — OriginTrace

  Person(admin, "Admin", "Manages organisation settings, KYC, subscription tier, and user access")
  Person(aggregator, "Aggregator", "Registers farmers and farms, creates collection batches, disburses payments")
  Person(logistics, "Logistics Coordinator", "Creates dispatch batches and shipments, tracks delivery costs")
  Person(compliance, "Compliance Officer", "Reviews audit logs, manages regulation profiles, exports DDS reports")
  Person(viewer, "Viewer", "Read-only access to dashboards and reports")

  System_Boundary(ot, "OriginTrace Platform") {
    System(app, "OriginTrace Web App", "Next.js 16 App Router — serves the UI and all API routes. Handles auth, business logic, and data orchestration.")
  }

  System_Ext(supabase, "Supabase", "Managed Postgres database with Row-Level Security. Also provides authentication (JWT + session cookies) and file storage for documents and logos.")
  System_Ext(openai, "OpenAI API", "GPT-4o Vision used for document OCR — extracts farmer name, ID number, and document type from uploaded images.")
  System_Ext(paymentRail, "Payment Rails", "NGN bank transfer execution and account name resolution. Presented to users as 'OriginTrace Payments' — provider identity is hidden.")
  System_Ext(fxProvider, "FX / Multi-currency", "Multi-currency wallet and FX conversion for USD/EUR export settlements. Presented as 'OriginTrace Wallet'.")
  System_Ext(webhookTargets, "Customer Webhook Endpoints", "Buyer systems, ERP integrations, and compliance portals that subscribe to platform events (batch.completed, shipment.dispatched, etc.).")
  System_Ext(satellite, "Satellite / Geospatial", "Polygon boundary verification and deforestation-risk scoring for EUDR compliance. Consumed via the compliance profile geo-verification pipeline.")

  Rel(admin, app, "Configures org, manages users, reviews KYC")
  Rel(aggregator, app, "Registers farmers, manages batches, initiates disbursements")
  Rel(logistics, app, "Creates shipments, records freight costs, dispatches batches")
  Rel(compliance, app, "Audits activity, manages regulation profiles, exports DDS")
  Rel(viewer, app, "Views dashboards and reports")

  Rel(app, supabase, "Reads/writes all data; delegates auth session management", "HTTPS / Supabase client")
  Rel(app, openai, "Sends base64 document images for OCR extraction", "HTTPS / REST")
  Rel(app, paymentRail, "Initiates bank transfers and resolves account names", "HTTPS / REST")
  Rel(app, fxProvider, "Manages multi-currency wallets and FX conversions", "HTTPS / REST")
  Rel(app, webhookTargets, "Dispatches signed event payloads to registered endpoints", "HTTPS / POST")
  Rel(app, satellite, "Requests polygon validation and deforestation-risk scores", "HTTPS / REST")
```

## Key Decisions

| Decision | Rationale |
|---|---|
| Single Next.js app for UI + API | Reduces operational complexity; no separate backend service to deploy or scale independently at this stage |
| Supabase for DB + Auth | Row-Level Security enforces org-level data isolation without application-layer tenant filters on every query |
| Provider branding hidden | All payment/FX providers are presented as "OriginTrace" — decouples the UX from vendor lock-in |
| Webhook event catalog (ADR-003) | Typed event strings prevent undocumented integrations from silently breaking customer pipelines |
