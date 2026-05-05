# OriginTrace

**Export Risk & Trade Compliance Operating System for Agricultural Supply Chains**

OriginTrace is a full-stack traceability and compliance platform that digitalizes agricultural supply chains from farm to finished goods. It provides dynamic pre-shipment compliance scoring, lab result management, automated audit reporting, and NGN disbursement infrastructure to help exporters prevent border rejections and pass due-diligence audits.

Built for agricultural exporters, cooperatives, and aggregators targeting EU, UK, US, and China markets — covering EUDR (EU Deforestation Regulation), UK Environment Act, US Lacey Act / UFLPA, FSMA 204, and buyer-specific standards.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, server + client components) |
| Database | Supabase (Postgres + PostGIS + RLS) |
| Auth | Supabase Auth + custom multi-tenant org context |
| Payments | Paystack (NGN bank transfers, mobile money, payment links) |
| PDF Generation | jsPDF + jsPDF-autotable |
| UI | Tailwind CSS + shadcn/ui |
| Charts | Recharts (via custom chart components) |
| Webhooks | HMAC-SHA256 signed, exponential-backoff retry via cron |

---

## Features

### Farm & Supplier Management
- Register farms with GPS coordinates and PostGIS boundary polygons
- KYC-linked farmer profiles with compliance status tracking
- Deforestation risk assessment with satellite overlay support
- Agent performance dashboards and collection attribution

### Bag-Batch Traceability
- **Hybrid Bag-Batch Model** — link individual bags (QR-scanned) to collection batches
- **Bag-to-Bush Timeline** — full chain-of-custody from finished goods back to farm
- **Lot Management** — group batches into lots with mass-balance validation
- **Finished Goods Pedigree** — pedigree certificate PDF + GeoJSON export for EU TRACES

### Shipment & Readiness Scoring
- Dynamic risk scoring across 5 dimensions: documentation completeness, traceability depth, geospatial verification, regulatory alignment, and storage/handling controls
- Go / Conditional Go / No Go decision with remediation action items
- Cold-chain event logging
- Shipment outcomes (border inspection results, rejection history, financial impact)
- **Evidence Packages** — generate shareable, token-authenticated PDF bundles for border-detention incidents (7-day expiry, public access via `/app/evidence/[token]`, view-count tracking)

### Lab Results & MRL Compliance
- Upload lab test results linked to batches, finished goods, or shipments
- Automatic MRL cross-check against `mrl_database` (80+ entries for EU Reg 396/2005, UK PSD 2023, US EPA 40 CFR 180, China GB 2763-2021)
- Pesticides covered: chlorpyrifos, glyphosate, cypermethrin, lambda-cyhalothrin, imidacloprid, thiamethoxam, deltamethrin, carbendazim, profenofos, dimethoate, acephate, endosulfan, paraquat, ethion
- MRL exceedance flags written back to lab result record and surfaced in shipment view
- Certificate expiry tracking and conditional-pass logic

### Audit Readiness
- **Org-wide Audit Score** — weighted 5-component score (A–F grade):
  - Farm Data Completeness (25%)
  - Batch Record Quality (20%)
  - Lab Test Coverage (20%)
  - Document Health (20%)
  - Clean Shipment Rate (15%)
- Score surfaced on admin and compliance-officer dashboards
- **Compliance Audit Report PDF** — downloadable via `/api/reports/generate` with cover page, grade badge, data sections, and declaration page

### Reports & Analytics
- Period Performance, Shipment DDS, Supplier Audit, Regulatory Readiness, Buyer Intelligence reports
- **Compliance Audit Report** (new) — inline readiness score widget + PDF download
- Print-to-PDF support for all report types
- Tier-gated access (Basic / Pro / Enterprise)

### Payments & Disbursements
- NGN bank transfers via Paystack (resolve account → create recipient → initiate transfer)
- Mobile money (MTN, Airtel, Glo, 9mobile) disbursements
- Farmer bank accounts registry with Paystack account verification
- Paystack webhook handler: `charge.success`, `transfer.success`, `transfer.failed`, `transfer.reversed`
- Payment link generation and tracking

### KYC & Org Verification
- Org KYC submission (CAC, RC number, TIN, director ID, bank account)
- Paystack bank account verification inline
- KYC status: `not_submitted` → `under_review` → `approved` / `rejected`
- Superadmin KYC review UI (approve/reject with notes, dispatches `kyc.approved` / `kyc.rejected` webhook)

### Webhooks
22 event types dispatched with HMAC-SHA256 signatures and exponential-backoff retry:

```
farm.created            batch.created           batch.flagged
finished_good.created   shipment.created        shipment.status_changed
payment.created         payment.completed       payment.failed
document.uploaded       compliance.alert        agent.assigned
lab_result.uploaded     lab_result.non_compliant evidence_package.created
kyc.submitted           kyc.approved            kyc.rejected
payment.transfer_completed payment.transfer_failed
```

### Superadmin Panel (`/superadmin`)
- Organization management: create, impersonate, upgrade tier, suspend/activate
- **KYC Review** — inline approve/reject dialog with record details
- User management, billing, feature toggles, commodity config
- Platform health metrics and event log
- Tenant health dashboard

---

## Role System

| Role | Description |
|---|---|
| `superadmin` | Platform-wide admin (system_admins table) |
| `admin` | Org admin — full access to all features |
| `aggregator` | Aggregator with batch/farm management |
| `agent` | Field agent — collections and farm registration |
| `quality_manager` | QC and lab results |
| `logistics_coordinator` | Shipments and dispatch |
| `compliance_officer` | Compliance, audit reports, lab results |
| `warehouse_supervisor` | Warehouse and storage management |

---

## Subscription Tiers

| Tier | Key Unlocks |
|---|---|
| Starter | Farm registration, basic batches |
| Basic | Analytics, shipments |
| Pro | Compliance profiles, lab results, audit reports, evidence packages |
| Enterprise | Buyer intelligence, advanced analytics |

---

## API Reference (Summary)

### Farms & Batches
- `GET/POST /api/farms`
- `GET/PATCH /api/batches/[id]`

### Lab Results
- `GET/POST /api/lab-results` — list (filters: batch_id, shipment_id, finished_good_id, test_type, result) or create
- `GET/PATCH/DELETE /api/lab-results/[id]`

### Shipments
- `GET/POST /api/shipments`
- `GET/PATCH /api/shipments/[id]`
- `POST /api/shipments/[id]/evidence-package` — generate evidence bundle, returns token + PDF base64
- `GET /api/shipments/[id]/evidence-package` — list active packages

### Public Evidence
- `GET /api/evidence/[token]` — no auth, validates token expiry, increments view count

### Audit & Compliance
- `GET /api/audit-readiness` — weighted org score (A–F) + component breakdown
- `POST /api/reports/generate` — generate compliance audit PDF, returns base64 + fileName

### KYC
- `GET/POST /api/org/kyc` — fetch or submit org KYC record
- `POST /api/org/kyc/verify-bank` — Paystack account resolve
- `GET /api/org/kyc/banks` — Nigerian banks list (24h cache)
- `PATCH /api/org/kyc/[orgId]/review` — superadmin approve/reject

### Payments
- `POST /api/payments/disburse` — NGN bank transfer (paystack_transfer) or mobile money
- `GET /api/farmer-bank-accounts` — list farmer bank accounts
- `POST /api/farmer-bank-accounts` — register farmer bank account
- `POST /api/webhooks/paystack` — Paystack webhook (HMAC-SHA512 verified)

---

## Database Migrations

All migrations are in `supabase/migrations/`:

| File | Tables |
|---|---|
| `20260403_lab_results.sql` | `lab_results`, `evidence_packages` |
| `20260403_org_kyc.sql` | `org_kyc_records`, `farmer_bank_accounts` |

Seed data: `supabase/seeds/mrl_data.sql` — MRL limits for 14 pesticides × 5 commodities × 4 markets.

---

## Setup

### Prerequisites
- Node.js 18+
- Supabase project with PostGIS extension
- Paystack account (for payments)

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PAYSTACK_SECRET_KEY=
PAYSTACK_WEBHOOK_SECRET=
CRON_SECRET=                    # for /api/cron/webhook-retry
NEXT_PUBLIC_APP_URL=
```

### Installation

```bash
npm install
# Apply migrations
supabase db push
# Seed MRL data
supabase db execute --file supabase/seeds/mrl_data.sql
npm run dev
```

---

## Project Structure

```
app/
  api/                    # API routes
    lab-results/          # Lab result CRUD + MRL cross-check
    audit-readiness/      # Org audit score
    reports/generate/     # Audit PDF generation
    shipments/[id]/
      evidence-package/   # Border detention evidence bundles
    evidence/[token]/     # Public token-based evidence access
    org/kyc/              # KYC submission, bank verify, superadmin review
    farmer-bank-accounts/ # Farmer bank account registry
    payments/disburse/    # NGN bank transfer + mobile money
    webhooks/paystack/    # Paystack webhook handler
  app/                    # Authenticated app pages
    shipments/[id]/       # Shipment detail with lab results + evidence panel
    lab-results/          # Lab results list + upload dialog
    inventory/[id]/       # Batch detail with lab results section
    analytics/reports/    # Report builder + Compliance Audit Report
    payments/             # Disbursements + farmer bank accounts
    settings/             # KYC & Payments tab (admin)
  superadmin/
    organizations/        # Org management + KYC review
lib/
  services/events/        # Domain event system + lab result handler
  export/
    audit-report-pdf.ts   # Compliance audit PDF generator
    evidence-pdf.ts       # Border evidence package PDF generator
  payments/paystack.ts    # Paystack API client
  webhooks.ts             # Webhook event types + dispatch
  config/navigation.ts    # Role + tier filtered navigation
supabase/
  migrations/             # SQL migration files
  seeds/                  # MRL seed data
```

---

## License

Proprietary — OriginTrace / FarmWise WhiteRabbit. All rights reserved.
