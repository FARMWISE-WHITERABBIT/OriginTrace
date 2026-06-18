---
name: compliance-regulations
description: >
  Use this skill when working on any feature related to trade compliance
  regulations, DDS (Due Diligence Statement) export, pedigree certificates,
  EUDR requirements, the UK Environment Act, the US Lacey Act, FSMA 204,
  China Green Trade, UAE Halal, or Digital Product Passports. Triggers for
  any mention of "EUDR", "EU Deforestation Regulation", "UK Environment Act",
  "Lacey Act", "FSMA", "FSMA 204", "DDS", "due diligence", "pedigree
  certificate", "regulation", "compliance export", "geolocation requirement",
  "commodity traceability", "halal", "China Green Trade", "GACC", or "DPP".
  Always use this skill before building any compliance-related feature to
  understand the regulatory context it must satisfy.
---

# Compliance Regulations Skill

## 1. Overview

OriginTrace helps exporters comply with a tightening global landscape of
agricultural regulations. The primary mechanism is the multi-regulatory
scoring engine (`lib/services/scoring/`) which evaluates shipments against
specific legal requirements and produces a `ReadinessDecision`.

---

## 2. The Regulations

### EU Deforestation Regulation (EUDR)

**In force:** December 2024 (large operators), June 2025 (SMEs)
**Scope:** Products placed on or exported from the EU market

**Covered commodities:** Cattle, cocoa, coffee, palm oil, soya, wood, rubber
(and derived products — chocolate, leather, paper, tyres, etc.)

**What it requires:**
- **Geolocation data:** GPS coordinates or polygon for every plot of land where
  commodity was produced
- **Due Diligence Statement (DDS):** Mandatory declaration submitted to the EU
  Information System before customs clearance
- **Risk assessment:** Evidence that commodity is deforestation-free (after
  Dec 31 2020) and produced in compliance with local laws
- **Traceability:** Link from the final product back to the farm/plot

**How OriginTrace maps to it:**
| Regulation requirement | OriginTrace feature |
|------------------------|---------------------|
| Plot geolocation | Farm boundary polygons (Leaflet + PostGIS) |
| DDS submission | DDS Export wizard + Pedigree Certificate |
| Risk assessment | Scoring engine (`lib/services/scoring/eudr.ts`) |
| Traceability | Shipment → supplier → farm linkage chain |

---

### FSMA 204 (US Food Safety Modernization Act)

**In force:** January 2026
**Scope:** Foods on the FDA Food Traceability List imported or sold in the US

**What it requires:**
- **Traceability Lot Codes (TLC):** Every Critical Tracking Event needs a lot code
- **Key Data Elements (KDE):** Who, what, where, when at each supply chain step
- **Full chain of custody:** From farm to port

**How OriginTrace maps to it:**
- Bag serial tracking with lot codes
- Batch → contributor → farm chain of custody
- Scoring engine (`lib/services/scoring/fsma204.ts`)

---

### UK Environment Act 2021 (Schedule 17)

**In force:** Phased from January 2024
**Scope:** UK businesses using "forest risk commodities" in commercial activities

**Covered commodities:** Cattle, cocoa, coffee, palm oil, soya, leather, rubber,
pulp/paper, and others designated by the Secretary of State

**What it requires:**
- **Due diligence system:** Document that commodities were produced legally
  (in compliance with local laws in producer country)
- **Risk assessment and mitigation:** Identify and reduce risk of illegal production
- **Annual reporting:** Report to UK Government on due diligence activities

**Key difference from EUDR:** The UK Act focuses on *legality* (produced in
compliance with local laws) rather than *deforestation-free* specifically.

**Scoring:** `lib/services/scoring/uk-environment.ts`

---

### US Lacey Act / UFLPA (16 U.S.C. §§ 3371–3378)

**In force:** 1900 (wildlife), extended to plants/wood products 2008
**Scope:** Import of plants and plant products into the United States

**What it requires:**
- **Import Declaration:** PS Form 505 — species name, value, quantity, country
  of harvest for all plant-material imports
- **Due care:** Importers must exercise "due care" that plants were legally sourced

**Scoring:** `lib/services/scoring/lacey-uflpa.ts`

---

### China Green Trade (GACC)

**Scope:** Agricultural commodities exported to China

**What it requires:**
- GACC registration for foreign facilities
- Chinese phytosanitary import protocols
- Traceability documentation per GACC standards

**Scoring:** `lib/services/scoring/china-green-trade.ts`

---

### UAE Halal / ESMA / MoCAE

**Scope:** Food products entering the UAE market

**What it requires:**
- Halal certification from accredited body
- ESMA conformity assessment
- MoCAE import permit for agricultural goods

**Scoring:** `lib/services/scoring/uae-halal.ts`

---

### Buyer Standards (Custom)

Tenant-specific requirements set by individual buyers via compliance profiles.
These are evaluated by `lib/services/scoring/buyer-standards.ts`.

---

## 3. DDS Export Feature

The Due Diligence Statement is the most critical compliance output.

### DDS data structure
```typescript
// lib/compliance/dds-types.ts
export interface DDSStatement {
  operator: {
    name:     string
    country:  string   // EU country of establishment
    eori:     string   // Economic Operators Registration and Identification
  }
  commodity: {
    hsCode:       string     // Harmonized System code (e.g., '1801' for cocoa beans)
    description:  string
    quantityKg:   number
    countryOfProduction: string   // ISO 3166-1 alpha-2
  }
  plots: Array<{
    farmName:   string
    country:    string
    polygon:    GeoJSON.Polygon   // from farm boundary
    areaHa:     number
  }>
  riskAssessment: {
    deforestationRisk: 'negligible' | 'low' | 'standard'
    mitigationMeasures: string[]
    documentIds: string[]
  }
  referenceNumber: string    // shipment ID
  statementDate:   string    // ISO date
}
```

---

## 4. Pedigree Certificate

The Pedigree Certificate is OriginTrace's branded compliance document — a
blockchain-verifiable PDF that combines the DDS data with supply chain provenance.

```typescript
// lib/compliance/pedigree-certificate.ts
export interface PedigreeCertificate {
  certificateId:   string    // XRPL transaction hash for on-chain anchor
  shipmentId:      string
  orgId:           string
  issuedAt:        string
  expiresAt:       string    // 12 months from issue
  dds:             DDSStatement
  supplyChain: Array<{
    stage:   'farm' | 'processing' | 'export' | 'port'
    actor:   string
    country: string
    date:    string
    verified: boolean
  }>
  qrCode:          string    // URL to public verification page
}
```

---

## 5. Digital Product Passport (DPP)

A future-facing requirement for circularity and transparency. The DPP provides
a public-facing summary of a product's journey. Generated via `app/api/dpp/`.

---

## 6. Commodity-to-Regulation Mapping

| Commodity | EUDR | UK Env Act | Lacey | FSMA 204 | China Green | UAE Halal |
|-----------|------|-----------|-------|----------|-------------|-----------|
| Cocoa     | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| Coffee    | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| Palm Oil  | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Soya      | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Timber    | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Rubber    | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Cotton    | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Cattle    | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |

---

## 7. Scoring Engine Integration

Scoring logic for each regulation is isolated in `lib/services/scoring/`:
- `eudr.ts`
- `fsma204.ts`
- `uk-environment.ts`
- `lacey-uflpa.ts`
- `china-green-trade.ts`
- `uae-halal.ts`
- `buyer-standards.ts`
- `constants.ts` — Threshold values and weights
- `types.ts` — Shared types (`RiskFlag`, `ReadinessDecision`, etc.)

Results are aggregated in `computeShipmentReadiness()` in `index.ts`.

---

## 8. Gotchas

- **Changing Cutoffs**: EUDR has a fixed cutoff of 2020-12-31. Never hardcode this in multiple places; reference it from the regulation config.
- **Country Risk**: Some regulations (like EUDR) vary requirements based on the country's risk tier (Low, Standard, High). Check the `countries` table.
- **Hard Fails**: A regulation might return a `critical` flag with `is_hard_fail: true` which forces the entire shipment's decision to `no_go`.
- **EUDR geolocation is mandatory, not optional.** A shipment of a covered commodity without farm polygon data cannot have a valid DDS. Block DDS generation if farm boundaries are missing.
- **Dec 31 2020 is the deforestation cutoff.** Land converted to agricultural use after this date is non-compliant regardless of current tree cover.
- **EUDR applies to SMEs from June 2025.**
- **The Lacey Act covers finished goods too.** A wooden furniture item imported from Nigeria is covered even if the exporter isn't a timber company.
- **Regulations change.** Commodity lists under EUDR and the UK Act can be expanded by secondary legislation. Update `lib/compliance/commodities.ts` when regulations are amended.
- **Compliance Profiles** allow tenants to customize regulatory requirements per destination market via `compliance_profiles` table and `lib/services/scoring/buyer-standards.ts`.
