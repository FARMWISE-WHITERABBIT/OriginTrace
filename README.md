# OriginTrace

**Export Risk & Trade Compliance Infrastructure for Agricultural Supply Chains**

OriginTrace is an enterprise-grade traceability and compliance platform that digitalizes agricultural supply chains from farm to warehouse. It provides dynamic pre-shipment compliance scoring to help organizations prevent shipment rejections at international borders.

Built for agricultural exporters, cooperatives, and aggregators operating across EU, UK, and US regulatory frameworks — including EUDR (EU Deforestation Regulation), UK Environment Act, and US Lacey Act.

---

## Key Features

### Traceability
- **Hybrid Bag-Batch Model** — Link individual bags to collection sessions with full chain-of-custody
- **Bag-to-Bush Timeline** — Complete traceability from finished goods back to the farm
- **QR-Based Verification** — Public verification page for end-to-end supply chain transparency
- **Finished Goods Pedigree** — Generate pedigree certificates with GeoJSON export for EU TRACES

### Compliance & Risk Scoring
- **Shipment Readiness Intelligence** — Dynamic risk scoring across 5 dimensions: documentation completeness, traceability depth, geospatial verification, regulatory alignment, and storage/handling
- **Farm Compliance Review** — Review and approve farm registrations with boundary validation
- **DDS GeoJSON Export** — Generate Due Diligence Statements for EU TRACES compliance
- **Automated Yield Validation** — Flag anomalous yields with configurable crop-specific thresholds
- **Historical Rejection Tracking** — Track border inspection outcomes and factor rejection rates into risk scores
- **Cold Chain Monitoring** — Temperature and humidity logging with threshold-based alerts

### Agent Tools (Offline-First)
- **GPS Farm Boundary Mapping** — Capture farm polygons using device GPS with anti-fraud protections
- **Offline Batch Collection** — Create collection batches offline with automatic sync when connectivity returns
- **AI-Powered OCR** — Scan Nigerian identity documents (NIN, voter's card, driver's license) to auto-fill farmer registration using OpenAI Vision
- **Signature Capture** — Digital farmer consent signatures
- **QR/Barcode Scanning** — Scan bag QR codes during collections

### Admin Tools
- **Bag Inventory Management** — Generate, allocate, and track bag barcodes
- **Batch Management** — Review, approve, and close collection batches
- **Organization Settings** — White-label branding, compliance rules, commodity configuration
- **Team Management** — Invite users, assign roles, manage agent seats
- **Spatial Conflict Resolution** — Detect and resolve overlapping farm boundaries
- **CSV Import/Export** — Bulk data operations with waybill PDF generation

### Superadmin Command Tower
- **KPI Dashboard** — Platform-wide metrics and analytics
- **Tenant Health Monitoring** — Monitor organization activity, data volume, and compliance status
- **Tier-Based Feature Gating** — Configurable subscription tiers (Starter, Growth, Enterprise) with feature flags
- **Location & Commodity Management** — Manage reference data (states, LGAs, villages, crop standards)
- **User Impersonation** — Debug issues by impersonating any user with full audit logging

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI Components | shadcn/ui (Radix UI + Tailwind CSS) |
| Database | Supabase PostgreSQL with PostGIS |
| Authentication | Supabase Auth |
| Multi-Tenancy | Row Level Security (RLS) |
| Maps | Leaflet + GPS Geolocation API |
| Offline Storage | IndexedDB (via `idb`) |
| PWA | next-pwa with service worker |
| AI/OCR | OpenAI Vision API |
| Animations | Framer Motion |
| Onboarding | Driver.js |
| QR Scanning | jsQR |
| PDF Generation | jsPDF + jspdf-autotable |
| Email | Resend |

---

## Architecture

### Multi-Tenant Isolation
Every data table includes an `org_id` column. Supabase Row Level Security policies ensure that users can only access data belonging to their organization. The superadmin role operates outside tenant boundaries for platform governance.

### Role-Based Access Control
Navigation, page access, and API permissions are controlled by a centralized RBAC system. Four user roles exist: `superadmin`, `admin`, `aggregator`, and `agent`. The UI dynamically adapts based on the authenticated user's role.

### Offline-First Architecture
Field agents often work in areas with limited or no connectivity. The platform uses a layered offline strategy:

1. **IndexedDB Sync Store** — Batches created offline are stored in a `pending_batches` store and synced automatically
2. **Auto-Sync** — Background sync every 30 seconds when online; immediate sync on connectivity restoration
3. **Cache Warmer** — Preloads reference data (locations, commodities, farms) into IndexedDB on app load
4. **Offline Cache** — Cache-then-network pattern with 24-hour TTL for all reference data
5. **PWA Fallback** — Branded offline page served when navigating to uncached routes without connectivity

### API Design
RESTful API routes built with Next.js App Router. All routes validate authentication via Supabase Auth, enforce tenant isolation, and return sanitized error messages (no raw database errors leak to clients).

---

## Project Structure

```
origintrace/
├── app/
│   ├── (marketing)/          # Public marketing site and compliance calculator
│   ├── app/                  # Authenticated app pages (27 pages)
│   │   ├── bags/             # Bag inventory management
│   │   ├── collect/          # Offline batch collection
│   │   ├── compliance/       # Farm compliance review
│   │   ├── farmers/          # Farmer registration (with OCR)
│   │   ├── farms/            # Farm management and GPS mapping
│   │   ├── shipments/        # Shipment management and risk scoring
│   │   ├── sync/             # Sync dashboard
│   │   └── ...               # 20+ more feature pages
│   ├── auth/                 # Authentication pages (login, register, reset, verify)
│   ├── superadmin/           # Platform governance (11 pages)
│   └── api/                  # 35+ API route handlers
│       ├── agents/           # Agent CRUD
│       ├── batches/          # Batch management
│       ├── farms/            # Farm CRUD with GeoJSON
│       ├── ocr/              # AI document scanning
│       ├── pedigree/         # Pedigree generation and certificates
│       ├── shipments/        # Shipment scoring, lots, cold chain, outcomes
│       ├── sync/             # Offline batch sync endpoint
│       └── ...               # 25+ more endpoints
├── components/
│   ├── ui/                   # shadcn/ui base components (30+)
│   ├── dashboards/           # Role-specific dashboard views
│   ├── marketing/            # Marketing site components
│   ├── auto-sync.tsx         # Background sync manager
│   ├── cache-warmer.tsx      # Offline reference data preloader
│   ├── ocr-capture.tsx       # AI-powered ID document scanner
│   ├── live-supply-map.tsx   # Interactive Leaflet supply chain map
│   └── ...                   # 25+ feature components
├── lib/
│   ├── supabase/             # Supabase client, server, and middleware
│   ├── offline/              # IndexedDB sync store, cache, and sync service
│   ├── services/             # Shipment scoring engine
│   ├── hooks/                # Custom React hooks (online status, onboarding)
│   ├── contexts/             # Theme and organization context providers
│   ├── config/               # Navigation config, tier gating rules
│   ├── validation/           # Yield validation logic
│   ├── export/               # CSV export and waybill PDF generation
│   ├── email/                # Resend email client and templates
│   └── rbac.ts               # Role-based access control
├── supabase/
│   ├── schema.sql            # Complete database schema
│   ├── rls-policies.sql      # Row Level Security policies
│   └── seed-locations.sql    # Reference data (Nigerian states/LGAs)
├── public/
│   ├── manifest.json         # PWA manifest
│   ├── offline.html          # Offline fallback page
│   └── images/               # App icons
├── middleware.ts              # Auth and route protection middleware
├── next.config.mjs           # Next.js + PWA configuration
└── package.json
```

---

## User Roles

| Role | Access | Key Capabilities |
|------|--------|-----------------|
| **Superadmin** | `/superadmin/*` | Platform KPIs, tenant health, tier management, user impersonation, location/commodity management |
| **Admin** | `/app/*` (full) | Organization settings, team management, bag inventory, batch approval, compliance review, shipment management, conflict resolution |
| **Aggregator** | `/app/*` (scoped) | Batch management, farmer/farm oversight, collection delegation, bag tracking |
| **Agent** | `/app/*` (field ops) | Farm mapping, batch collection (online/offline), farmer registration with OCR, sync dashboard |

---

## Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- (Optional) OpenAI API key for document OCR

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/origintrace.git
cd origintrace
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Session
SESSION_SECRET=your-random-session-secret

# OpenAI - for document OCR (optional)
AI_INTEGRATIONS_OPENAI_API_KEY=your-openai-api-key
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
```

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are safe to expose client-side (designed to be public by Supabase).
- `SUPABASE_SERVICE_ROLE_KEY` is a server-only secret — never expose it in client code.
- The OCR feature degrades gracefully if OpenAI credentials are not provided.

### 4. Set Up the Database

Run these SQL files in your Supabase SQL Editor, in order:

1. **`supabase/schema.sql`** — Creates all tables (organizations, farms, batches, bags, shipments, etc.)
2. **`supabase/rls-policies.sql`** — Enables Row Level Security policies for multi-tenant isolation
3. **`supabase/seed-locations.sql`** — Seeds Nigerian states and LGAs for location dropdowns

### 5. Run the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5000`.

### 6. Create the First Superadmin

Navigate to `/superadmin/login`. The first user to access this page will be bootstrapped as the platform superadmin. From there, you can create organizations and invite users.

---

## API Reference

### Authentication & Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new organization + admin user |
| POST | `/api/auth/join` | Join an existing organization via invite |
| GET | `/api/profile` | Get current user profile and role |

### Farm & Farmer Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/farms` | List or create farms (with GeoJSON boundaries) |
| GET/POST | `/api/farmers` | List or register farmers |
| POST | `/api/ocr` | AI-powered ID document scanning |
| GET/POST | `/api/conflicts` | Spatial boundary conflict detection |

### Collection & Traceability
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST/PATCH | `/api/batches` | Manage collection batches |
| GET/POST | `/api/bags` | Manage bag inventory |
| GET/POST | `/api/batch-contributions` | Track agent batch contributions |
| POST | `/api/sync` | Sync offline-created batches |
| GET | `/api/traceability` | Query bag-to-farm traceability chain |

### Shipments & Compliance
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/shipments` | Manage shipments with risk scoring |
| GET/PATCH | `/api/shipments/[id]` | Get or update specific shipment |
| GET/POST | `/api/shipments/[id]/outcomes` | Track border inspection results |
| GET/POST | `/api/shipments/[id]/cold-chain` | Cold chain temperature logs |
| GET/POST | `/api/shipments/[id]/lots` | Lot management with mass balance |
| GET/POST | `/api/finished-goods` | Finished goods management |
| GET | `/api/pedigree` | Generate pedigree data |
| GET | `/api/pedigree/certificate` | Generate pedigree PDF certificate |
| GET | `/api/pedigree/geojson` | Export GeoJSON for EU TRACES DDS |
| GET | `/api/yield-validation` | Validate yields against crop standards |

### Platform Administration
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/agents` | Manage field agents |
| GET/POST | `/api/team` | Team and invitation management |
| GET/PATCH | `/api/settings` | Organization settings |
| GET/POST | `/api/commodities` | Commodity management |
| GET/POST | `/api/locations` | Location hierarchy (states/LGAs/villages) |
| GET/POST | `/api/feature-toggles` | Feature flag management |
| GET/POST | `/api/tier-templates` | Subscription tier configuration |
| GET | `/api/tenant-health` | Tenant health metrics |
| GET/POST | `/api/superadmin` | Superadmin operations |
| POST | `/api/superadmin/create-org` | Create organization (superadmin only) |
| GET/POST | `/api/impersonate` | User impersonation with audit log |
| GET | `/api/sync-metrics` | Sync performance metrics |
| GET | `/api/data-vault` | Data sovereignty and export |

### Public
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/public/verify` | Public QR verification (no auth required) |

---

## Offline Architecture

OriginTrace is designed for field agents working in remote agricultural areas with intermittent connectivity.

```
┌─────────────────────────────────────────────────┐
│                    Browser                       │
│                                                  │
│  ┌───────────┐  ┌────────────┐  ┌────────────┐ │
│  │  UI Layer │  │   Cache    │  │   Sync     │  │
│  │           │  │   Warmer   │  │  Service   │  │
│  └─────┬─────┘  └──────┬─────┘  └──────┬─────┘ │
│        │               │               │        │
│  ┌─────▼───────────────▼───────────────▼──────┐ │
│  │              IndexedDB                      │ │
│  │  ┌────────────────┐  ┌───────────────────┐ │  │
│  │  │pending_batches │  │ origintrace-cache │ │  │
│  │  │  (sync queue)  │  │   (ref data)     │ │  │
│  │  └────────────────┘  └───────────────────┘ │  │
│  └─────────────────────────────────────────────┘ │
│                      │                            │
│           ┌──────────▼──────────┐                │
│           │   Service Worker    │                │
│           │    (next-pwa)       │                │
│           └──────────┬──────────┘                │
└──────────────────────┼───────────────────────────┘
                       │
               ┌───────▼───────┐
               │  Supabase API │
               └───────────────┘
```

**Stores:**
- `pending_batches` — Offline-created collection batches queued for sync
- `origintrace-cache` — Cached reference data (locations, commodities, farms) with 24h TTL

**Sync Behavior:**
- Auto-sync every 30 seconds when online
- Immediate sync triggered when device transitions from offline to online
- Manual sync available via the Sync Dashboard
- Conflict resolution: server wins (last-write-wins with timestamp comparison)

---

## Deployment

The application is configured for deployment on [Replit](https://replit.com) with:

```bash
npm run build    # Build for production
npm run start    # Start production server
```

For other platforms (Vercel, Railway, etc.), ensure:
1. All environment variables are set
2. The Supabase database is accessible
3. The build command is `npm run build`
4. The start command is `npm run start`
5. PWA service worker generation is enabled in production

---

## License

MIT
