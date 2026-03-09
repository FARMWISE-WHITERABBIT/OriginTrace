# OriginTrace

## Overview
OriginTrace is an enterprise-grade, multi-tenant SaaS platform providing trust infrastructure for origin-sensitive supply chains. It aims to prevent shipment rejection by offering dynamic pre-shipment compliance scoring across five dimensions, initially focusing on agriculture but architected to support other sectors. The platform offers role-based workflows for 8 organizational roles, enabling features like farm boundary mapping, hybrid bag-batch traceability, an offline-first PWA, a sync dashboard, a document vault, payment tracking, a buyer portal, compliance profiles, Digital Product Passports, and an enterprise API. The business vision is to become the leading compliance and traceability platform, expanding into new markets and commodities while enhancing data analytics capabilities for sustainable sourcing.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Route Architecture
The application uses three layouts: `/superadmin/*` for platform governance (dark theme), `/app/*` for organizational users (dynamic role-based navigation), and `/app/buyer/*` for buyer portal users (separate navigation). Access is controlled by centralized RBAC (`lib/rbac.ts`) and tier-based feature gating (`lib/config/tier-gating.ts`).

### Roles
The platform supports 9 organizational roles: admin, aggregator, agent, quality_manager, logistics_coordinator, compliance_officer, warehouse_supervisor, buyer, and farmer. The farmer role uses a mobile-first portal (`/app/farmer/*`).

### Color System
The UI follows a light-first enterprise design using Origin Green (#2E7D6B) as the primary brand color, Deep Forest (#1F5F52) for headers, Muted Sage (#6FB8A8) for accents, and a clean background/card palette. Organizations can customize brand colors via `TenantThemeProvider`.

### Frontend
Developed with Next.js 16 (App Router), `shadcn/ui` (Radix UI, Tailwind CSS) for components, Geist Mono typography, and `recharts` for data visualization. It includes GPS-based farm mapping, light/dark mode, interactive onboarding, a public QR verification page, and analytics dashboards. The PWA provides offline-first capabilities using IndexedDB.

### Backend
Implemented using Next.js serverless functions (App Router API routes) with TypeScript. Authentication is handled by Supabase Auth (`createServerClient()`). Admin operations use `createAdminClient()`. Shared auth utilities in `lib/api-auth.ts` provide `createServiceClient()`, `getAuthenticatedUser()`, and `getAuthenticatedProfile()` across API routes. APIs are RESTful, with an enterprise API layer (`/api/v1/`) supporting API key authentication, scope enforcement, DB-backed rate limiting, tier gating, and generic error responses (no DB details leaked). RBAC is enforced in middleware. Tier gating is enforced both in middleware (route-level via `checkRouteAccess`) and in API routes (via `enforceTier`). Payment callbacks verify provider signatures via HMAC. Farmer PIN login is rate-limited (5 attempts per 15 minutes per phone). All API routes enforce org_id null guards (returning 403 if profile has no org). Write endpoints enforce role-based access (documents: admin/compliance_officer/quality_manager; payments: admin/aggregator; DDS: admin/compliance_officer; OCR: admin/compliance_officer/quality_manager; deforestation-check: admin/aggregator/quality_manager). Public routes (pedigree, DPP) strip buyer identity, trade routes, and DDS references. Superadmin auto-bootstrap removed — system_admins must be seeded manually. No 'use server' directives in API routes. Compliance file writes go through `/api/compliance-files` route (not direct client DB writes).

### Satellite & Deforestation Monitoring
Farm map uses ESRI World Imagery tiles (gated by feature flag) with OpenStreetMap fallback. A deforestation check API integrates with Global Forest Watch for polygon-based forest loss analysis, with results stored and triggering email alerts for high-risk findings.

### Email Notifications
Email notifications use Resend integration for various triggers, including document expiry, buyer invitations, and compliance alerts.

### Audit Event Log
An immutable, append-only audit log (`audit_events` table) records all mutations, accessible via a searchable viewer and API.

### Webhook Event Streaming
A system dispatches signed webhook POSTs for 14 event types (including `tender.created` and `tender.awarded`), supporting HMAC-SHA256 signatures, an admin UI, and retries. All event types are fully wired into their respective API routes.

### Farmer Digital Identity Portal
Agent-assisted onboarding creates farmer accounts. A mobile-first activation page allows phone confirmation and PIN setup. The portal provides pages for farm data, deliveries, payments, training, inputs, and digital identity.

### Mobile Money Payments
A payment provider abstraction supports MTN MoMo, OPay, and PalmPay for disbursements, with an API for disbursement and callbacks for status updates.

### i18n Infrastructure
Internationalization is handled with `next-intl` (English, French, Arabic with RTL support). Locale preference persists per user.

### Supply Chain Network Graph
An interactive force-directed SVG graph using D3-force simulates the supply chain network (farms → batches → processing → finished goods → shipments) with clickable nodes for detail.

### Buyer ESG Portfolio Dashboard
Aggregates ESG analytics across supplier links, displaying KPIs and charts for compliance, risk, volume, and document coverage.

### Satellite Boundary Comparison
`lib/services/boundary-analysis.ts` provides `analyzeBoundaryAuthenticity()` to detect fake polygon drawing. Checks 5 dimensions: shape regularity, vertex spacing uniformity, area plausibility, location plausibility, and edge straightness. Returns a 0-100 confidence score. API at `/api/farms/boundary-check`. Results stored in `boundary_analysis` JSONB column on farms. Feeds into EUDR readiness scoring. Visible on farm map page and farm review.

### Yield Prediction Models
`lib/services/yield-prediction.ts` provides `predictYield()` using weighted historical data, input intensity, regional benchmarks, certifications, and seasonal factors. Returns predicted yield, confidence range, trend (improving/stable/declining), and actionable recommendations. API at `/api/farmer/predictions` (farmer view) and `/api/yield-predictions` (org-wide admin view). Predictions tab on yield-alerts page. Integrated with yield validation — actual collection exceeding prediction by >200% triggers auto-flagging.

### Spot Market / Tender System
Buyer-side tender management with exporter marketplace. Schema: `tenders` (open/closed/awarded/cancelled, public/invited visibility) and `tender_bids` (submitted/shortlisted/awarded/rejected/withdrawn). APIs at `/api/tenders` and `/api/tenders/[id]/bids`. Buyer page at `/app/buyer/tenders` for creating tenders and comparing bids. Exporter marketplace at `/app/tenders` for browsing and bidding. Auto-calculates compliance score from exporter shipment history. Awarding a bid auto-creates a contract. Webhook events: `tender.created`, `tender.awarded`.

### Data Storage
Supabase PostgreSQL is used exclusively (no Replit PostgreSQL) with Row Level Security (RLS) for multi-tenant isolation, storing core organizational data, processing information, document vault, payment records, buyer portal data, compliance profiles, and DPPs. All database tables are defined in `supabase/schema.sql` with a migration script at `supabase/migration-missing-tables.sql`. The `commodity_master` table stores platform commodities. No Drizzle ORM or Replit database is used.

### Tier System
Four subscription tiers (Starter, Basic, Pro, Enterprise) offer increasing features, with tier enforcement centralized in `lib/api/tier-guard.ts` and `lib/config/tier-gating.ts`.

### Key Design Patterns
The system employs Server-Side Registration, RLS Policies, Role-Based UI, Offline-First PWA, Hybrid Bag-Batch Model, Impersonation, Anti-Fraud Layer, Spatial Conflict Engine, Finished Goods Pedigree, Tier-Based Feature Gating, Shipment Readiness Intelligence, Buyer-Invites-Exporter Flow, Document Vault, API Key Authentication, and Digital Product Passports in JSON-LD.

### Analytics Architecture
Separates operational dashboards (role-specific, action-oriented) from strategic analytics (pattern analysis, 4 tabs). Includes a Report Builder with 5 structured report types and reusable chart components. A comprehensive Analytics API provides data across all dimensions.

### 7-Framework Compliance Engine
A shipment scoring engine evaluates against 7 regulatory frameworks (EUDR, FSMA 204, UK Environment Act, Lacey Act / UFLPA, China Green Trade, UAE / Halal, Buyer Standards) using distinct rules and data points.

### Core Features
Key features include comprehensive Traceability (hybrid bag-batch, network graph), Compliance management (farm review, DDS export, yield validation, profiles for 7 frameworks, certifications), Analytics & Reports (strategic, operational, buyer ESG, report builder), Agent Tools (GPS mapping, offline collection, anti-fraud), Admin Tools (inventory, batch generation, user management, white-label branding), Document Vault (upload, expiry, alerts), Payment Tracking (multi-currency, mobile money disbursement), Farmer Digital Identity Portal (onboarding, yield, training, inputs, QR), Buyer Portal (registration, invitations, contract management, ESG analytics, spot market/tenders), Compliance Profiles (pre-built templates, geo verification), Digital Product Passports (JSON-LD, public endpoint), Enterprise API (versioned, key management, rate limiting), Shipment Planning (wizard, scoring), Webhook Event Streaming (14 types, signed), Immutable Audit Log, i18n, Satellite Boundary Comparison (anti-fraud polygon analysis), Yield Prediction Models (historical + input-based forecasting), Spot Market / Tender System (buyer tenders, exporter marketplace, bid comparison), and a Superadmin Command Tower.

### Marketing Website Design
The marketing website is positioned as "Trust Infrastructure for Origin-Sensitive Supply Chains," featuring a modern design, animated components, and a focus on compliance (EUDR, FSMA 204, UK Environment Act). It includes SEO-optimized metadata, structured data, and dedicated landing pages.

## External Dependencies
- **Supabase**: PostgreSQL database, authentication, RLS
- **Next.js 16**: Frontend and backend API routes
- **React**: Frontend library
- **Tailwind CSS**: Styling utility framework
- **shadcn/ui & Radix UI**: UI component libraries
- **recharts**: Charting library
- **IndexedDB (via `idb`)**: Offline data storage
- **next-pwa**: Progressive Web Application configuration
- **OpenAI (via Replit AI Integrations)**: Document OCR
- **Driver.js**: Interactive guided tours
- **Signature Pad**: Signature capture
- **jsQR**: QR/barcode scanning
- **next-intl**: Internationalization
- **D3-force**: Force-directed graph simulation