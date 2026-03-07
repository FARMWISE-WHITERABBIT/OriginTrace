# OriginTrace

## Overview
OriginTrace is Trust Infrastructure for Origin-Sensitive Supply Chains — an enterprise-grade, multi-tenant SaaS platform for mid-to-large exporters and global buyers. Core value proposition: prevent shipment rejection through dynamic pre-shipment compliance scoring across 5 dimensions. Agriculture is the primary vertical, with architecture supporting timber, minerals, seafood, and textiles.

The platform provides role-based workflows for 8 organizational roles (admin, aggregator, agent, quality_manager, logistics_coordinator, compliance_officer, warehouse_supervisor, buyer), featuring farm boundary mapping, hybrid bag-batch traceability, offline-first PWA, sync dashboard, document vault, payment tracking, buyer portal (buyer-invites-exporter flow), compliance profiles, Digital Product Passport, and enterprise API.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Route Architecture
The application uses three main layouts:
- `/superadmin/*` for platform governance with a dark slate theme
- `/app/*` for all organizational users (exporter roles) with dynamic role-based navigation
- `/app/buyer/*` for buyer portal users with separate navigation
Centralized RBAC (`lib/rbac.ts`) and navigation config (`lib/config/navigation.ts`) are the single source of truth. Tier-based feature gating (`lib/config/tier-gating.ts`) controls feature access per subscription tier.

### Roles
- **admin**: Full organizational access — settings, team, compliance, exports, analytics, buyer management
- **aggregator**: Procurement and field operations — batches, bags, agents, farmers, payments
- **agent**: Field operations — collection, farm mapping, farmer registration, sync (offline-first optimized)
- **quality_manager**: Quality control — compliance review, yield alerts, bags, traceability, verification
- **logistics_coordinator**: Shipment planning — dispatch, cold chain, inventory, shipments, documents
- **compliance_officer**: Regulatory compliance — DDS, pedigree, DPP, compliance profiles, farm polygons
- **warehouse_supervisor**: Warehouse operations — inventory, bags, receiving, dispatch, verification
- **buyer**: Supply chain visibility (separate portal) — contracts, shipments, traceability, shared documents

### Color System
Light-first enterprise UI: Primary Brand (Origin Green #2E7D6B), Headers/Active States (Deep Forest #1F5F52), Secondary UI/Accents (Muted Sage #6FB8A8), Main Background (#F8FAF9), Card/Panel (#FFFFFF), Dividers (#E5E7EB).

### Frontend
Built with Next.js 16 (App Router), `shadcn/ui` (Radix UI, Tailwind CSS), Geist Mono typography, `recharts` for analytics visualization. Features include GPS-based farm mapping, light/dark mode, interactive onboarding, public QR verify page, and analytics dashboards with trend charts. PWA offers offline-first capabilities using IndexedDB.

### Backend
Next.js serverless functions (App Router API routes) with TypeScript. Authentication: Supabase Auth. APIs are RESTful. Enterprise API layer (`/api/v1/`) uses API key authentication (`lib/api-auth.ts`) with scope enforcement and rate limiting.

### Data Storage
Supabase PostgreSQL with RLS for multi-tenant isolation. Schema includes:
- **Core**: organizations, profiles, farms, bags, collections, collection_batches, agent_sync_status, compliance_files, dds_exports
- **Processing**: processing_runs, processing_run_batches, finished_goods, recovery_standards
- **Document Vault**: documents (with expiry tracking), document_alerts
- **Payments**: payments (multi-currency: NGN/USD/EUR/GBP/XOF)
- **Buyer Portal**: buyer_organizations, buyer_profiles, supply_chain_links, contracts, contract_shipments
- **Compliance**: compliance_profiles (EUDR/FSMA_204/UK_Environment_Act/custom), crop_standards, farm_conflicts
- **DPP**: digital_product_passports (JSON-LD, chain of custody, sustainability claims)
- **Enterprise**: api_keys (hashed, scoped, rate-limited)
- **System**: system_admins, system_config, states, lgas, villages

### Tier System
- **Starter**: smart_collect, farmer_registration, farm_mapping, sync_dashboard, traceability, farm_polygons, farmers_list
- **Basic**: + analytics, documents, payments, inventory, bags, yield_alerts, agents, scan_verify, dispatch
- **Pro**: + compliance_review, dds_export, processing, pedigree, boundary_conflicts, delegations, resolve, shipment_readiness, supplier_scorecards, cost_analysis, compliance_profiles, shipment_planning, buyer_portal, contracts
- **Enterprise**: + data_vault, digital_product_passport, enterprise_api

### Key Design Patterns
- **Server-Side Registration**: Secure user and organization creation
- **RLS Policies**: Enforce multi-tenancy
- **Role-Based UI**: Dynamic dashboard views via RBAC (8 roles)
- **Offline-First PWA**: IndexedDB-based sync queue with optimistic UI
- **Hybrid Bag-Batch Model**: Links multiple bags to a collection session
- **Impersonation**: Superadmin capability with audit logging
- **Anti-Fraud Layer**: Yield-to-area validation, GPS spoof protection
- **Spatial Conflict Engine**: Detects overlapping farm boundaries
- **Finished Goods Pedigree**: QR-based verification and export compliance
- **Tier-Based Feature Gating**: 4-tier model, core traceability never gated
- **Shipment Readiness Intelligence**: Dynamic risk scoring for exports
- **Buyer-Invites-Exporter Flow**: Buyers initiate supply chain connections
- **Document Vault**: Expiry tracking with 7d/30d alerts
- **API Key Auth**: SHA-256 hashed keys, scope-based access, rate limiting
- **Digital Product Passport**: JSON-LD output, public verification endpoint

### Core Features
- **Traceability**: Hybrid Bag-Batch, bag search, bag-to-bush timeline, finished goods pedigree
- **Compliance**: Farm review, DDS GeoJSON export, yield validation, farmer performance ledger, compliance profiles (EUDR/FSMA/UK)
- **Analytics**: Volume trends (recharts), agent performance, supplier scorecards, compliance metrics, period selectors
- **Agent Tools**: GPS farm mapping, offline batch collection, sync dashboard, anti-fraud, AI OCR for ID scanning
- **Admin Tools**: Bag inventory, batch generation, org/user/team management, compliance rules, white-label branding, analytics dashboard
- **Document Vault**: Upload, expiry tracking, entity linking, type filtering, alert banners
- **Payment Tracking**: Multi-currency (NGN/USD/EUR/GBP/XOF), 4 methods, ledger, CSV export, summaries
- **Buyer Portal**: Buyer registration, supplier invitations, contract management, shipment visibility, traceability, shared documents
- **Compliance Profiles**: Per-destination configuration, pre-built templates (EU/UK/US), document requirements, geo verification levels
- **Digital Product Passport**: JSON-LD, public endpoint, sustainability claims, QR verification
- **Enterprise API**: Versioned endpoints (/api/v1/), API key management, scope enforcement, rate limiting, API docs page
- **Shipment Planning**: Creation wizard, batch selection, compliance scoring, document checklist
- **Superadmin Command Tower**: KPI dashboard, tenant health, tier management, feature toggles
- **Marketing Site**: Positioned as "Trust Infrastructure for Origin-Sensitive Supply Chains" covering EUDR, FSMA 204, UK Environment Act

## Recent Changes (Mar 2026 — Platform Expansion)

### 10-Phase Expansion
- **Role Expansion**: Added 5 new roles (quality_manager, logistics_coordinator, compliance_officer, warehouse_supervisor, buyer) with RBAC and navigation support
- **Tier Gating Update**: Added 11 new tier features across Basic/Pro/Enterprise tiers; all page-level TierGate props synchronized with central config
- **Analytics Dashboard**: API route `/api/analytics` with volume trends, agent performance, compliance metrics, role+tier access control. Admin and aggregator dashboards enhanced with recharts visualization
- **Role-Specific Dashboards**: Created tailored dashboards for all 8 roles; sidebar properly detects all roles
- **Document Vault**: Full CRUD API + UI with expiry tracking and entity linking
- **Payment Tracking**: Multi-currency payment recording with entity linking (batch/contract), ledger, summaries, CSV export
- **Buyer Portal**: Buyer registration (`/auth/buyer-register`), supplier invitation flow, contract management, real shipment/traceability/document views (not placeholders)
- **Compliance Profiles**: EUDR/FSMA_204/UK_Environment_Act profiles with document requirements; dynamically integrated with shipment scoring
- **Digital Product Passport**: DPP generation from finished goods, JSON-LD output, public verification
- **Enterprise API**: API key management page (`/app/api-keys`), versioned endpoints (/api/v1/), rate limiting, API documentation page
- **Shipment Planning**: 6-step creation wizard (contract → batches → compliance profile → review → documents → confirm), detail page with lifecycle timeline (all 6 stages reachable: Planning → Packed → Dispatched → In Transit → Arrived → Cleared)
- **Marketing Repositioning**: From "agricultural traceability" to "trust infrastructure for origin-sensitive supply chains"
- **Marketing Website Redesign (Mar 2026)**: Complete homepage redesign inspired by Tello Framer website. New components: `IndustryTicker` (animated vertical text cycling), `LogoMarquee` (auto-scrolling compliance standard badges), `TestimonialCarousel` (6 testimonials with auto-advance and manual nav), `StatCounter` (animated count-up on scroll). Homepage sections in order: Hero (centered, bold headline with industry ticker + dual CTAs), Logo Marquee, About OriginTrace (side-by-side + stats), Problem Discovery, Platform Capabilities (numbered accordion 01-06), Shipment Readiness Score mockup, Use Cases grid (6 verticals), Compliance Coverage Grid, Supply Chain Flow, Testimonials, Regulatory Readiness Assessment (calculator), Pedigree CTA banner, Blog/Insights teasers, Final CTA. All sections use bracketed labels `[ Section Name ]`. Updated nav (Solutions, Use Cases, Pedigree, Readiness Score, API, Sign In). Updated footer (4 columns with social icons, contact info, legal links).
- **Superadmin Expansion**: Command Tower dashboard updated with Platform Expansion metrics (buyer ecosystem, document vault, payment volume, DPP passports, enterprise API usage, compliance profiles); user management supports all 8 roles; feature toggles show all 33 features with buyer_portal_access and dpp_access add-on flags; new Buyer Organizations management page (`/superadmin/buyer-orgs`) with detail dialog

### Previous Cleanup (Early Mar 2026)
- AI-Powered OCR for Farmer ID Scanning (OpenAI GPT-5.2)
- SMS Service Removed
- Auto-Sync Activated (30s interval + online event)
- Offline Fallback Page
- ~30 Unused Dependencies Cleaned
- API Error Sanitization
- Dead sync_queue Removed

## External Dependencies
- **Supabase**: PostgreSQL database, authentication, RLS
- **Next.js 16**: Frontend and backend API routes
- **React**: Frontend library
- **Tailwind CSS**: Styling
- **shadcn/ui & Radix UI**: UI component libraries
- **recharts**: Chart visualization for analytics dashboards
- **IndexedDB (via `idb`)**: Offline data storage and sync queuing
- **next-pwa**: PWA configuration
- **OpenAI (via Replit AI Integrations)**: Document OCR for farmer ID scanning
- **Driver.js**: Interactive guided tours
- **Signature Pad**: Signature capture
- **jsQR**: QR/barcode scanning
