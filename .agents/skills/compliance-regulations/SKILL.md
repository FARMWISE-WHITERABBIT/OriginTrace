---
name: compliance-regulations
description: >
  Use this skill when working on any feature related to trade compliance
  regulations, DDS (Due Diligence Statement) export, pedigree certificates,
  EUDR requirements, the UK Environment Act, or the US Lacey Act. Triggers for
  any mention of "EUDR", "EU Deforestation Regulation", "UK Environment Act",
  "Lacey Act", "DDS", "due diligence", "pedigree certificate", "regulation",
  "compliance export", "geolocation requirement", or "commodity traceability".
  Always use this skill before building any compliance-related feature to
  understand the regulatory context it must satisfy.
---

# Compliance Regulations Skill

## 1. Overview

OriginTrace exists to help African exporters comply with three major international
regulations that require documented, deforestation-free supply chains for key
agricultural commodities. Each regulation maps directly to product features.

---

## 2. The Three Regulations

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
| Risk assessment | 5-dimension Shipment Scoring Engine |
| Traceability | Shipment → supplier → farm linkage chain |

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
Both often overlap in practice.

**How OriginTrace maps to it:**
- Pedigree Certificate documents country-of-origin legality compliance
- Supplier verification status captures local law compliance evidence
- Annual report export (under `reports:export` permission)

---

### US Lacey Act (16 U.S.C. §§ 3371–3378)

**In force:** 1900 (wildlife), extended to plants/wood products 2008
**Scope:** Import of plants and plant products into the United States

**Covered commodities:** Wood, paper, cotton, and other plant-based materials
(broader than EUDR/UK Act)

**What it requires:**
- **Import Declaration:** PS Form 505 — species name, value, quantity, country
  of harvest for all plant-material imports
- **Due care:** Importers must exercise "due care" that plants were legally
  sourced — no specific documentation format required, but records must be
  kept to demonstrate due care

**How OriginTrace maps to it:**
- Species and origin tracking in shipment metadata
- Document completeness scoring includes Lacey Act declaration for wood/cotton

---

## 3. DDS Export Feature

The Due Diligence Statement is the most critical compliance output.

### DDS data structure
```typescript
// lib/compliance/dds-types.ts
export interface DDSStatement {
  // Operator info
  operator: {
    name:     string
    country:  string   // EU country of establishment
    eori:     string   // Economic Operators Registration and Identification
  }

  // Commodity info
  commodity: {
    hsCode:       string     // Harmonized System code (e.g., '1801' for cocoa beans)
    description:  string
    quantityKg:   number
    countryOfProduction: string   // ISO 3166-1 alpha-2
  }

  // Geolocation — mandatory under EUDR
  plots: Array<{
    farmName:   string
    country:    string
    polygon:    GeoJSON.Polygon   // from farm boundary
    areaHa:     number
  }>

  // Risk assessment summary
  riskAssessment: {
    deforestationRisk: 'negligible' | 'low' | 'standard'
    mitigationMeasures: string[]
    documentIds: string[]
  }

  // Metadata
  referenceNumber: string    // shipment ID
  statementDate:   string    // ISO date
}
```

### DDS generation
```typescript
// lib/compliance/dds-generator.ts
export async function generateDDS(shipmentId: string, orgId: string): Promise<DDSStatement> {
  // Fetch shipment with full supply chain context
  const { data: shipment } = await supabase
    .from('shipments')
    .select(`
      *,
      supplier:suppliers(*),
      items:shipment_items(*),
      farms:shipment_farms(farm:farms(*))
    `)
    .eq('id', shipmentId)
    .eq('org_id', orgId)
    .single()

  if (!shipment) throw new Error('Shipment not found')

  // Block DDS generation for critical-risk shipments
  if (shipment.risk_tier === 'critical') {
    throw new Error('Cannot generate DDS for critical-risk shipment. Resolve risk flags first.')
  }

  return {
    operator: await getOperatorProfile(orgId),
    commodity: buildCommoditySection(shipment),
    plots: shipment.farms.map(f => buildPlotSection(f.farm)),
    riskAssessment: buildRiskSection(shipment),
    referenceNumber: shipmentId,
    statementDate: new Date().toISOString().split('T')[0],
  }
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

## 5. Commodity-to-Regulation Mapping

Quick reference for which regulations apply to each commodity:

| Commodity | EUDR | UK Env Act | US Lacey |
|-----------|------|-----------|---------|
| Cocoa     | ✅ | ✅ | ❌ |
| Coffee    | ✅ | ✅ | ❌ |
| Palm Oil  | ✅ | ✅ | ❌ |
| Soya      | ✅ | ✅ | ❌ |
| Timber/Wood | ✅ | ✅ | ✅ |
| Rubber    | ✅ | ✅ | ❌ |
| Cotton    | ❌ | ✅ | ✅ |
| Cattle    | ✅ | ✅ | ❌ |

---
# Compliance Regulations Skill

## 1. Overview

**Mission:** OriginTrace helps exporters comply with a tightening global landscape of agricultural regulations. Our primary mechanism is the multi-regulatory scoring engine which evaluates shipments against specific legal requirements.

---

## 2. Core Regulations

- **EUDR (EU Deforestation Regulation)**:
  - **Requirement**: No products from land deforested after Dec 31, 2020.
  - **Data**: GPS polygons for every plot, deforestation analysis status.
  - **Threshold**: Zero tolerance for high risk flags.

- **FSMA 204 (US Food Safety)**:
  - **Requirement**: Traceability Lot Codes (TLC) and Key Data Elements (KDEs).
  - **Data**: Full chain of custody from farm to port.

- **UK Environment Act / Lacey Act**:
  - **Requirement**: Harvesters must comply with local laws in the country of origin.
  - **Data**: Legality of harvest declarations and supplier verification.

---

## 3. Compliance Documentation

Regulations often require specific PDFs to be generated and shared:
- **DDS (Due Diligence Statement)**: Required for EUDR.
- **Pedigree Certificate**: A full summary of the batch's journey.
- **DPP (Digital Product Passport)**: Future requirement for circularity and transparency.

---

## 4. Implementation

Scoring logic for each regulation is isolated in `lib/services/scoring/`.
- `eudr.ts`
- `fsma204.ts`
- `uk-environment.ts`
- `lacey-uflpa.ts`

Results are aggregated in `computeShipmentReadiness`.

---

## 5. Gotchas

- **Changing Cutoffs**: EUDR has a fixed cutoff of 2020-12-31. Never hardcode this in multiple places; it should always be referenced from the regulation config.
- **Country Risk**: Some regulations (like EUDR) vary requirements based on the country's risk tier (Low, Standard, High). Check the `countries` table for current risk designations.
- **Hard Fails**: A regulation might return a `critical` flag which acts as a "hard fail" for the entire shipment's readiness.
- **EUDR geolocation is mandatory, not optional.** A shipment of a covered commodity without farm polygon data cannot have a valid DDS. Block DDS generation if farm boundaries are missing.
- **Dec 31 2020 is the deforestation cutoff.** Under EUDR, land converted to agricultural use after this date is non-compliant, regardless of current tree cover. This date must be used in deforestation risk assessment queries.
- **EUDR applies to SMEs from June 2025.** The scoring engine's `critical` tier should treat any EUDR-covered commodity shipment without a DDS as non-compliant from that date.
- **The Lacey Act covers finished goods too.** A wooden furniture item imported from Nigeria is covered even if the exporter isn't a timber company.
- **Regulations change.** The commodity lists under both EUDR and the UK Act can be expanded by secondary legislation. The commodity list in `lib/compliance/commodities.ts` must be updated when regulations are amended.
