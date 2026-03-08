# OriginTrace

## Overview
OriginTrace is Trust Infrastructure for Origin-Sensitive Supply Chains, an enterprise-grade, multi-tenant SaaS platform for mid-to-large exporters and global buyers. Its primary purpose is to prevent shipment rejection through dynamic pre-shipment compliance scoring across five dimensions, initially focusing on agriculture with architecture supporting other sectors like timber, minerals, seafood, and textiles. The platform offers role-based workflows for 8 organizational roles, including features like farm boundary mapping, hybrid bag-batch traceability, an offline-first PWA, a sync dashboard, a document vault, payment tracking, a buyer portal, compliance profiles, Digital Product Passports, and an enterprise API.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Route Architecture
The application utilizes three distinct layouts: `/superadmin/*` for platform governance with a dark theme, `/app/*` for all organizational users with dynamic role-based navigation, and `/app/buyer/*` for buyer portal users with separate navigation. Access control is managed through centralized RBAC (`lib/rbac.ts`) and navigation configuration (`lib/config/navigation.ts`). Tier-based feature gating (`lib/config/tier-gating.ts`) controls feature access based on subscription tiers.

### Roles
The platform supports 8 organizational roles: admin, aggregator, agent, quality_manager, logistics_coordinator, compliance_officer, warehouse_supervisor, and buyer, each with specific access and functionalities.

### Color System
The UI follows a light-first enterprise design with a primary brand color of Origin Green (#2E7D6B), Deep Forest (#1F5F52) for headers and active states, Muted Sage (#6FB8A8) for secondary accents, Main Background (#F8FAF9), Card/Panel (#FFFFFF), and Dividers (#E5E7EB).

### Frontend
Developed with Next.js 16 (App Router), `shadcn/ui` (Radix UI, Tailwind CSS) for components, Geist Mono typography, and `recharts` for data visualization. Key features include GPS-based farm mapping, light/dark mode, interactive onboarding, a public QR verification page, and analytics dashboards. The PWA provides offline-first capabilities using IndexedDB.

### Backend
Implemented using Next.js serverless functions (App Router API routes) with TypeScript. Authentication is handled by Supabase Auth using `createServerClient()` from `@/lib/supabase/server` (SSR-compatible pattern). Admin/service-role operations use `createAdminClient()` from `@/lib/supabase/admin` (centralized helper replacing 50+ inline client creations). APIs are RESTful, with an enterprise API layer (`/api/v1/`) supporting API key authentication (`lib/api-auth.ts`) with scope enforcement, DB-backed rate limiting (`api_rate_limits` table), and tier gating (`lib/api/tier-guard.ts`). The V1 API supports both read (GET) and write (POST/PATCH) operations with `write` scope enforcement for mutations. RBAC is enforced in middleware (`lib/supabase/middleware.ts`) via `hasAccess()` from `lib/rbac.ts` — unauthorized role/route combinations redirect to `/app`.

### Satellite & Deforestation Monitoring
Farm map (`app/app/farms/map/satellite-map.tsx`) uses ESRI World Imagery tiles for satellite view (gated by `satellite_overlays` feature flag) with OpenStreetMap as fallback/toggle. Deforestation check API (`app/api/deforestation-check/route.ts`) integrates with Global Forest Watch (GFW) API for polygon-based forest loss analysis, with country-level EUDR risk benchmarking as fallback. Results stored in `deforestation_check` JSONB column on farms table. Medium/high risk triggers email alerts to org admins/compliance officers via Resend.

### Email Notifications
Email notifications use Resend integration (`lib/email/resend-client.ts`) with templates in `lib/email/templates.ts`. Triggers include: document expiry alerts (cron at `app/api/cron/document-expiry/route.ts`), buyer invitation emails, compliance alerts (yield flags, farm conflicts, deforestation risk). Templates follow OriginTrace branding with Deep Forest header.

### Tenant Customization
Organizations can set custom brand colors (`brand_colors` JSONB on organizations table) via settings page. `TenantThemeProvider` component (`components/tenant-theme-provider.tsx`) injects CSS custom properties (--tenant-primary, --tenant-secondary, --tenant-accent). Guided tours auto-start on first login per role via `OnboardingProvider` (`lib/hooks/use-onboarding.tsx`).

### Data Storage
Supabase PostgreSQL is used with Row Level Security (RLS) for multi-tenant isolation. The schema encompasses core organizational data, processing information, a document vault, payment records (multi-currency), buyer portal data, compliance profiles, Digital Product Passports, and system configurations.

### Tier System
The platform offers four subscription tiers: Starter, Basic, Pro, and Enterprise, with increasingly comprehensive features. Core traceability features are available across all tiers. Tier enforcement is centralized in `lib/api/tier-guard.ts` (reads `org.subscription_tier` top-level column) and `lib/config/tier-gating.ts` (feature→tier mapping). Schema CHECK constraint allows: `starter | basic | pro | enterprise`.

### Key Design Patterns
The system employs patterns such as Server-Side Registration, RLS Policies for multi-tenancy, Role-Based UI, an Offline-First PWA with IndexedDB, a Hybrid Bag-Batch Model for traceability, Impersonation for superadmins, an Anti-Fraud Layer (yield-to-area validation, GPS spoof protection), a Spatial Conflict Engine for farm boundaries, Finished Goods Pedigree, Tier-Based Feature Gating, Shipment Readiness Intelligence, Buyer-Invites-Exporter Flow, Document Vault with expiry tracking, API Key Authentication, and Digital Product Passports in JSON-LD format.

### Analytics Architecture
The platform separates operational dashboards from strategic analytics:
- **Operational Dashboards** (`components/dashboards/`): Role-specific dashboards (admin, aggregator, quality_manager) with 6+ chart types each, focused on "what needs action now" — volume trends, active flags, agent performance, compliance status, document health.
- **Strategic Analytics** (`app/app/analytics/page.tsx`): Dedicated analytics section with 4 tabs (Operations, Compliance, Financial, Traceability) for pattern analysis and trend discovery across all supply chain dimensions.
- **Report Builder** (`app/app/analytics/reports/page.tsx`): 5 structured report types (Period Performance, Shipment DDS, Supplier Audit, Regulatory Readiness, Buyer Intelligence) with tier gating (Basic/Pro/Enterprise), print-friendly CSS layout for PDF export.
- **Reusable Chart Components** (`components/charts/`): PieDonutChart, VerticalBarChart, HorizontalBarChart, StackedBarChart, RadarSpiderChart, TrendLineChart — all using OriginTrace green palette with consistent tooltips and responsive containers.
- **Analytics API** (`app/api/analytics/route.ts`): Returns comprehensive data via `section` parameter (operational/strategic/shipments/documents/financial/all) including commodity breakdown, compliance rates, agent performance, shipment scores, document health, payment summaries, and risk intelligence.

### 5-Framework Compliance Engine
The shipment scoring engine (`lib/services/shipment-scoring.ts`) evaluates shipments against 5 regulatory frameworks with distinct rules:
- **EUDR**: GPS polygon verification, deforestation-free status (post-Dec 2020), DDS submission, satellite imagery cross-check.
- **FSMA 204**: KDE completeness, CTE verification, lot-level traceability, supplier KYC, food safety certifications.
- **UK Environment Act**: Due diligence assessment, risk scoring, polygon geo-verification, legality verification, country risk classification.
- **Lacey Act / UFLPA**: Supply chain transparency, country-of-origin docs, forced labor risk assessment, import declaration compliance.
- **Buyer Standards**: Profile-driven custom rules — required docs, geo level, traceability depth, certifications, ESG metrics.

### Core Features
Key features include comprehensive Traceability (hybrid bag-batch, search, timeline, pedigree), Compliance management (farm review, DDS GeoJSON export, yield validation, compliance profiles for EUDR/FSMA/UK/Lacey Act/UFLPA/Buyer Standards), Analytics & Reports (strategic analytics with 4 tabs, report builder with 5 report types, operational dashboards with 6+ chart types), Agent Tools (GPS mapping, offline collection, anti-fraud, AI OCR), Admin Tools (inventory, batch generation, user management, white-label branding), Document Vault (upload, expiry tracking, alerts), Payment Tracking (multi-currency, ledger, export), a Buyer Portal (registration, invitations, contract management, shipment visibility), Compliance Profiles (pre-built templates for all 5 frameworks, geo verification), Digital Product Passports (JSON-LD, public endpoint, QR verification), an Enterprise API (versioned endpoints, key management, rate limiting), Shipment Planning (wizard, batch selection, scoring, document checklist), and a Superadmin Command Tower (KPI dashboard, tenant health, tier management, feature toggles).

### Marketing Website Design
The marketing website is positioned as "Trust Infrastructure for Origin-Sensitive Supply Chains" and features a modern design with animated components, a focus on compliance (EUDR, FSMA 204, UK Environment Act), and dedicated landing pages for various industries (Agriculture, Timber, Textiles, Minerals) and compliance regulations. It includes SEO-optimized metadata, navigation with hover dropdowns, structured data (Organization, WebSite, FAQPage JSON-LD schemas), Twitter Cards, comprehensive sitemap (16 pages), and optimized robots.txt. The FAQ schema component is at `components/marketing/faq-schema.tsx`.

## External Dependencies
- **Supabase**: PostgreSQL database, authentication, Row Level Security (RLS)
- **Next.js 16**: Frontend and backend API routes
- **React**: Frontend library
- **Tailwind CSS**: Styling utility framework
- **shadcn/ui & Radix UI**: UI component libraries
- **recharts**: Charting library for analytics dashboards
- **IndexedDB (via `idb`)**: Offline data storage and synchronization queueing
- **next-pwa**: Progressive Web Application configuration
- **OpenAI (via Replit AI Integrations)**: Document OCR for farmer ID scanning
- **Driver.js**: Interactive guided tours
- **Signature Pad**: Signature capture functionality
- **jsQR**: QR/barcode scanning capabilities