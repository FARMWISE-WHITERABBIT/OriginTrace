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
Implemented using Next.js serverless functions (App Router API routes) with TypeScript. Authentication is handled by Supabase Auth. APIs are RESTful, with an enterprise API layer (`/api/v1/`) supporting API key authentication (`lib/api-auth.ts`) with scope enforcement and rate limiting.

### Data Storage
Supabase PostgreSQL is used with Row Level Security (RLS) for multi-tenant isolation. The schema encompasses core organizational data, processing information, a document vault, payment records (multi-currency), buyer portal data, compliance profiles, Digital Product Passports, and system configurations.

### Tier System
The platform offers four subscription tiers: Starter, Basic, Pro, and Enterprise, with increasingly comprehensive features. Core traceability features are available across all tiers.

### Key Design Patterns
The system employs patterns such as Server-Side Registration, RLS Policies for multi-tenancy, Role-Based UI, an Offline-First PWA with IndexedDB, a Hybrid Bag-Batch Model for traceability, Impersonation for superadmins, an Anti-Fraud Layer (yield-to-area validation, GPS spoof protection), a Spatial Conflict Engine for farm boundaries, Finished Goods Pedigree, Tier-Based Feature Gating, Shipment Readiness Intelligence, Buyer-Invites-Exporter Flow, Document Vault with expiry tracking, API Key Authentication, and Digital Product Passports in JSON-LD format.

### Core Features
Key features include comprehensive Traceability (hybrid bag-batch, search, timeline, pedigree), Compliance management (farm review, DDS GeoJSON export, yield validation, compliance profiles for EUDR/FSMA/UK), Analytics (volume trends, performance metrics), Agent Tools (GPS mapping, offline collection, anti-fraud, AI OCR), Admin Tools (inventory, batch generation, user management, white-label branding), Document Vault (upload, expiry tracking, alerts), Payment Tracking (multi-currency, ledger, export), a Buyer Portal (registration, invitations, contract management, shipment visibility), Compliance Profiles (pre-built templates, geo verification), Digital Product Passports (JSON-LD, public endpoint, QR verification), an Enterprise API (versioned endpoints, key management, rate limiting), Shipment Planning (wizard, batch selection, scoring, document checklist), and a Superadmin Command Tower (KPI dashboard, tenant health, tier management, feature toggles).

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