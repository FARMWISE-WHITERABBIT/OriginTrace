# OriginTrace

## Overview
OriginTrace is an enterprise-grade traceability and compliance platform for agricultural organizations, digitalizing supply chains from farm to warehouse. It provides a role-based workflow for admins, aggregators, and field agents, featuring farm boundary mapping, hybrid bag-batch traceability, an offline-first Progressive Web Application (PWA), and a sync dashboard. The platform supports compliance review, generates due diligence statements for EU TRACES, and ensures multi-tenant isolation with Row Level Security. OriginTrace aims to enhance traceability, ensure compliance, improve efficiency, expand market access, and incorporate anti-fraud measures, spatial intelligence, farmer performance analytics, data sovereignty, feature gating, and a finished goods pedigree system.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Route Architecture
The application uses two main dashboard layouts: `/superadmin/*` for platform governance with a dark slate theme, and `/app/*` for all organizational users with dynamic role-based navigation. Centralized Role-Based Access Control (RBAC) and a single source of truth for navigation configuration are key.

### Color System
OriginTrace employs a light-first enterprise UI with a specific palette: Primary Brand (Origin Green #2E7D6B), Headers/Active States (Deep Forest #1F5F52), Secondary UI/Accents (Muted Sage #6FB8A8), Main Background (#F8FAF9), Card/Panel (#FFFFFF), Dividers (#E5E7EB), and a range of text and status colors.

### Frontend
Built with Next.js 16 (App Router), `shadcn/ui` (Radix UI, Tailwind CSS) for components, and Geist Mono for specific typography. Features include GPS-based farm mapping, light/dark mode, interactive onboarding, and a public QR verify page. The PWA offers offline-first capabilities using IndexedDB for sync queuing, optimized for outdoor use with high contrast.

### Backend
Utilizes Next.js serverless functions (App Router API routes) with TypeScript. Authentication is handled by Supabase Auth. APIs are RESTful for CRUD and specialized functions like tenant health, feature toggles, and pedigree generation.

### Data Storage
Supabase PostgreSQL serves as the database, enforcing multi-tenant isolation via Row Level Security (RLS). The schema includes GeoJSON storage for farm boundaries and manages entities such as organizations, collection batches, agents, farms, bags, collections, and compliance files. Additional tables support `crop_standards`, `farmer_performance_ledger`, `processing_runs`, and `finished_goods`.

### Key Design Patterns
-   **Server-Side Registration**: Secure user and organization creation.
-   **RLS Policies**: Enforce multi-tenancy.
-   **Role-Based UI**: Dynamic dashboard views via RBAC.
-   **Offline-First PWA**: IndexedDB-based sync queue with optimistic UI.
-   **Hybrid Bag-Batch Model**: Links multiple bags to a collection session.
-   **Impersonation**: Superadmin capability with audit logging.
-   **Anti-Fraud Layer**: Yield-to-area validation, GPS spoof protection.
-   **Spatial Conflict Engine**: Detects and resolves overlapping farm boundaries.
-   **Finished Goods Pedigree**: QR-based verification and export compliance.
-   **Tier-Based Feature Gating**: Scalable tier model for features, with core traceability never gated.
-   **Shipment Readiness Intelligence**: Dynamic risk scoring for exports.
-   **Offline Reference Data Cache**: IndexedDB for locations, commodities, and farm data for offline form usage.

### Core Features
-   **Traceability**: Hybrid Bag-Batch, bag search, bag-to-bush timeline, finished goods pedigree.
-   **Compliance**: Farm review, DDS GeoJSON export for EU TRACES, automated yield validation, farmer performance ledger.
-   **Agent Tools**: GPS farm mapping, offline batch collection, sync dashboard, anti-fraud measures.
-   **Admin Tools**: Bag inventory, batch generation, org/user/team management, compliance rules, white-label branding, conflict resolution.
-   **Superadmin Command Tower**: KPI dashboard, tenant health, configurable tier management.
-   **Marketing Site**: Public-facing pages focused on "Export Risk & Trade Compliance Infrastructure" covering multiple regulations (EU, UK, US) and including a compliance calculator.

## Recent Changes (Mar 2026 Cleanup & OCR)
-   **AI-Powered OCR for Farmer ID Scanning**: Real document OCR via OpenAI vision model (Replit AI Integrations). API route at `/api/ocr` accepts base64 image, extracts farmer name + ID number from Nigerian identity documents (NIN, voter's card, driver's license). `OCRCapture` component (`components/ocr-capture.tsx`) integrated into farmer registration page (`app/app/farmers/new/page.tsx`) — agents can scan IDs to auto-fill name fields. Shows offline fallback message when no connection. Confidence score and document type displayed.
-   **SMS Service Removed**: Deleted `lib/services/sms-service.ts` and all SMS references from `app/api/batches/route.ts`. Platform no longer has SMS notification capability.
-   **Auto-Sync Activated**: `AutoSync` component (`components/auto-sync.tsx`) added to app layout (`app/app/layout.tsx`), calling `setupAutoSync()` globally. Pending batches now auto-sync every 30 seconds when online and immediately when device transitions from offline to online.
-   **Offline Fallback Page**: `public/offline.html` with OriginTrace branding serves when navigating to uncached pages while offline. Configured via `next-pwa` fallbacks in `next.config.mjs`.
-   **Unused Dependencies Cleaned**: Removed ~30 unused npm packages from Express/Wouter template artifacts (passport, express-session, recharts, react-icons, embla-carousel, react-resizable-panels, vaul, cmdk, input-otp, multiple unused Radix UI primitives, etc.).
-   **API Error Sanitization**: `app/api/locations/route.ts` and `app/api/sync/route.ts` no longer leak raw database error messages to clients. Generic error messages returned; real errors logged server-side.
-   **Dead `sync_queue` Removed**: Unused `sync_queue` IndexedDB object store removed from `lib/offline/sync-store.ts`. All sync flows use `pending_batches`. DB version bumped with migration to clean up existing users.
-   **Stale Config Fixed**: `components.json` CSS path updated from non-existent `client/src/index.css` to `app/globals.css`.

## External Dependencies

-   **Supabase**: PostgreSQL database, authentication, RLS.
-   **Next.js**: Frontend and backend API routes.
-   **React**: Frontend library.
-   **Tailwind CSS**: Styling.
-   **shadcn/ui & Radix UI**: UI component libraries.
-   **IndexedDB (via `idb` library)**: Offline data storage and sync queuing.
-   **next-pwa**: PWA configuration.
-   **OpenAI (via Replit AI Integrations)**: Document OCR for farmer ID scanning.
-   **Driver.js**: Interactive guided tours.
-   **Signature Pad**: Signature capture.
-   **jsQR**: QR/barcode scanning.