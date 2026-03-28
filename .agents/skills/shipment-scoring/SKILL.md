---
name: shipment-scoring
description: >
  Use this skill when working with the 5-dimension shipment risk scoring engine,
  Use this skill when working with the multi-regulatory shipment readiness engine,
  adding a new regulatory framework, tuning compliance logic, understanding how a
  readiness decision is calculated, or building any feature that reads or displays
  readiness results. Triggers for any mention of "readiness decision", "scoring
  engine", "regulatory framework", "risk flag", "EUDR", "FSMA 204", "compliance
  score", "lib/services/scoring", or "why is this shipment flagged". Always use
  this skill before modifying any scoring logic — incorrect logic changes have
  compliance implications.
---

# Shipment Scoring Skill

## 1. Overview

**Mission:** Every shipment in OriginTrace undergoes real-time readiness analysis against multiple international regulatory frameworks. Instead of a single score, the system generates a set of flags and a "Readiness Decision" based on specific compliance requirements.

---

## 2. Regulatory Frameworks (`lib/services/scoring/`)

The scoring engine evaluates shipments against:
- **`EUDR`**: EU Deforestation Regulation (geolocation, cutoff dates).
- **`FSMA 204`**: US Food Safety Modernization Act (traceability event tracking).
- **`UK Environment`**: Schedule 17 (legality of harvest).
- **`Lacey / UFLPA`**: US plant protection and forced labor acts.
- **`UAE Halal`**: Religious compliance for specific markets.
- **`Buyer Standards`**: Custom tenant-specific requirements.

---

## 3. The Orchestrator (`lib/services/scoring/index.ts`)

`computeShipmentReadiness(input)` runs all relevant scorers based on the destination and commodity.

### Input Data
- `shipmentId`, `orgId`
- `items`: bag-level data
- `farms`: GeoJSON and compliance profiles
- `destination`: ISO country code (triggers specific framework scorers)

### Output Structure (`ReadinessResult`)
- `isReady`: Boolean boolean decision.
- `frameworks`: Map of results per framework (e.g., `EUDR: { status: 'fail', flags: [...] }`).
- `flags`: Global array of `RiskFlag` objects (tier: `info`|`warning`|`critical`).
- `remediations`: Actionable steps to fix `critical` flags.

---

## 4. Adding a New Framework Scorer

1. Create `lib/services/scoring/your-framework.ts`.
2. Implement the `FrameworkScorer` interface.
3. Define specific `RiskFlag` types for your framework.
4. Register the scorer in `lib/services/scoring/index.ts`.
5. Update the `types.ts` to include any new input requirements.

---

## 5. Gotchas

- **GeoJSON requirement**: EUDR Scorers *will* fail if `farms.boundary` is missing.
- **Cascading Failure**: A single `critical` flag from *any* framework makes the entire shipment `isReady = false`.
- **Unit Testing**: Every framework has a corresponding test in `tests/scoring.test.ts`. Run `vitest` after any logic change.
- **Denormalization**: The result is saved to the `shipments.readiness_snapshot` JSONB column.
