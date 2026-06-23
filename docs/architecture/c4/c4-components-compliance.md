# C4 Level 3 — Components: Compliance Module

> Shows the internal structure of the compliance feature slice within the Next.js application.

```mermaid
C4Component
  title Component diagram — Compliance Module (within Next.js App)

  Person(complianceOfficer, "Compliance Officer", "Reviews audit trail, manages regulation profiles, exports DDS")
  Person(admin, "Admin", "Configures compliance frameworks and settings")

  Container_Boundary(nextjs, "Next.js Application") {

    Component(settingsPage, "Settings Page — Compliance Tab", "app/app/settings/page.tsx + components/settings/compliance-profiles-content.tsx", "UI for configuring compliance frameworks (EUDR, FSMA, etc.) and managing regulation profiles per destination market.")

    Component(complianceApi, "Compliance Profiles API", "app/api/compliance-profiles/route.ts + [id]/route.ts", "REST endpoints: GET lists profiles for org, POST creates a new profile, DELETE removes a profile. All requests authenticate via getAuthenticatedProfile().")

    Component(auditReadinessApi, "Audit Readiness API", "app/api/audit-readiness/route.ts", "Computes a compliance score by checking framework rule coverage against org settings. Returns a per-rule readiness report consumed by the admin dashboard.")

    Component(ddsExportApi, "DDS Export API", "app/api/dds-export/route.ts", "Generates the Due Diligence Statement document for EUDR. Queries batch, farm, and farmer data to produce a compliance package.")

    Component(complianceGauge, "Compliance Gauge", "components/compliance-gauge.tsx", "SVG semicircle speedometer showing the org's overall compliance score. Rendered on the admin dashboard.")

    Component(auditLog, "Audit Log", "app/app/audit/ + app/api/audit/route.ts", "Time-ordered log of all write actions across the platform. Filterable by actor, resource type, and date range. Required for EUDR traceability evidence.")

    Component(auditLib, "Audit Library", "lib/audit.ts", "logAuditEvent() utility called by all API routes that mutate data. Writes to audit_log table via admin Supabase client.")

    Component(supabaseAdapter, "Supabase Adapter", "lib/supabase/admin.ts + server.ts", "Creates Supabase clients (admin bypasses RLS; server respects RLS via session cookie).")
  }

  ContainerDb(db, "Supabase Postgres", "compliance_profiles, org_settings, audit_log, batches, farmers, farms tables")

  Rel(complianceOfficer, auditLog, "Views activity log, filters by resource/actor")
  Rel(complianceOfficer, ddsExportApi, "Requests DDS export for a batch")
  Rel(admin, settingsPage, "Configures EUDR/FSMA/Lacey framework toggles and regulation profiles")

  Rel(settingsPage, complianceApi, "CRUD regulation profiles", "fetch() /api/compliance-profiles")
  Rel(settingsPage, supabaseAdapter, "Saves org_settings (framework toggles)", "Supabase client")

  Rel(complianceApi, supabaseAdapter, "Reads/writes compliance_profiles", "Admin client")
  Rel(complianceApi, auditLib, "Logs create/delete profile actions")

  Rel(auditReadinessApi, supabaseAdapter, "Reads org_settings and compliance_profiles", "Admin client")
  Rel(auditReadinessApi, complianceGauge, "Score consumed by dashboard", "JSON response")

  Rel(ddsExportApi, supabaseAdapter, "Queries batch, farm, farmer records", "Admin client")
  Rel(ddsExportApi, auditLib, "Logs DDS export event")

  Rel(auditLog, supabaseAdapter, "Reads audit_log with pagination and filters", "Server client")
  Rel(auditLib, supabaseAdapter, "Inserts audit_log rows", "Admin client")

  Rel(supabaseAdapter, db, "SQL queries via PostgREST", "Supabase JS")
```

## Compliance Framework Data Model

```
org_settings (jsonb columns per framework)
  enabled_frameworks[]          -- array of framework IDs
  eudr_deforestation_cutoff     -- bool
  eudr_geolocation_proof        -- bool
  gfl_supplier_traceability     -- bool
  ...

compliance_profiles
  id, org_id
  name, destination_market
  regulation_framework          -- EUDR | FSMA_204 | UK_Environment_Act | ...
  required_documents[]          -- string array
  geo_verification_level        -- basic | polygon | satellite
  min_traceability_depth        -- int (1–10)
  is_default                    -- bool

audit_log
  id, org_id, actor_id, actor_email
  action                        -- e.g. "batch.completed", "profile.created"
  resource_type, resource_id
  metadata (jsonb)
  created_at, ip_address
```

## Regulation Profile Templates

Six pre-built templates are defined in `components/settings/compliance-profiles-content.tsx` (`CP_TEMPLATES`):

| Key | Market | Framework |
|---|---|---|
| EU | European Union | EUDR |
| UK | United Kingdom | UK_Environment_Act |
| US_FSMA | United States | FSMA_204 |
| US_LACEY | United States | Lacey_Act_UFLPA |
| CN | China | China_Green_Trade |
| UAE | UAE / Middle East | UAE_Halal |
