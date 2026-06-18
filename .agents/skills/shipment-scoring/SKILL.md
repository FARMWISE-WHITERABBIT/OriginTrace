---
name: shipment-scoring
description: >
  Use this skill when working with the multi-regulatory shipment readiness
  engine, adding a new regulatory framework, tuning compliance logic,
  understanding how a readiness decision is calculated, or building any
  feature that reads or displays readiness results. Triggers for any mention
  of "readiness decision", "scoring engine", "regulatory framework", "risk
  flag", "EUDR", "FSMA 204", "compliance score", "lib/services/scoring",
  "why is this shipment flagged", "remediation", or "shipment readiness".
  Always use this skill before modifying any scoring logic — incorrect logic
  changes have compliance implications.
---

# Shipment Scoring Skill

## 1. Overview

Every shipment in OriginTrace undergoes real-time readiness analysis against
multiple international regulatory frameworks. The system generates a
`ReadinessDecision` ('go' | 'conditional' | 'no_go' | 'pending') based on
five scoring dimensions and per-framework checks.

---

## 2. The Five Scoring Dimensions

The orchestrator (`computeShipmentReadiness` in `lib/services/scoring/index.ts`)
evaluates these dimensions with configurable weights from `constants.ts`:

| Dimension | What it measures |
|-----------|-----------------|
| **Traceability Integrity** | Item traceability %, GPS coverage, bag-to-farm links |
| **Chemical & Contamination Risk** | Lab certs, pesticide declarations, aflatoxin tests |
| **Documentation Completeness** | Required export docs present (profile-aware) |
| **Storage & Handling Controls** | Warehouse cert, temp logging, pest control, FIFO |
| **Regulatory Alignment** | Per-framework compliance (EUDR, FSMA, etc.) |

---

## 3. Regulatory Frameworks (`lib/services/scoring/`)

| File | Framework |
|------|-----------|
| `eudr.ts` | EU Deforestation Regulation |
| `fsma204.ts` | US FSMA 204 (food traceability) |
| `uk-environment.ts` | UK Environment Act Schedule 17 |
| `lacey-uflpa.ts` | US Lacey Act / UFLPA |
| `china-green-trade.ts` | China GACC Green Trade |
| `uae-halal.ts` | UAE Halal / ESMA / MoCAE |
| `buyer-standards.ts` | Custom tenant-specific buyer requirements |
| `constants.ts` | Threshold values, weights, penalty multipliers |
| `types.ts` | Shared TypeScript types |

---

## 4. Input Data (`ShipmentScoreInput`)

```typescript
interface ShipmentScoreInput {
  shipment: {
    id: string;
    destination_country: string | null;
    target_regulations: string[];
    doc_status: Record<string, boolean>;
    storage_controls: Record<string, boolean>;
    estimated_ship_date: string | null;
  };
  items: Array<{
    item_type: string;    // 'batch' or 'finished_good'
    weight_kg: number;
    farm_count: number;
    traceability_complete: boolean;
    compliance_status: string;
    batch_data?: { has_gps, bag_count, bags_with_farm_link, ... };
    finished_good_data?: { mass_balance_valid, pedigree_verified, ... };
  }>;
  compliance_profile?: ComplianceProfile;  // per-destination profile
  farm_deforestation_checks?: FarmDeforestationCheck[];
  farm_boundary_analyses?: FarmBoundaryAnalysis[];
  historical_rejection_rate?: number;
  cold_chain_alert_count?: number;
  cold_chain_total_entries?: number;
}
```

---

## 5. Output Structure (`ShipmentReadinessResult`)

```typescript
interface ShipmentReadinessResult {
  overall_score: number;                    // 0-100 weighted aggregate
  decision: ReadinessDecision;              // 'go' | 'conditional' | 'no_go' | 'pending'
  decision_label: string;                   // Human-readable label
  dimensions: ScoreDimension[];             // Per-dimension breakdown
  risk_flags: RiskFlag[];                   // severity + is_hard_fail
  remediation_items: RemediationItem[];     // Actionable steps to fix issues
  summary: string;                          // Natural language summary
}

type RiskFlag = {
  severity: 'critical' | 'warning' | 'info';
  category: string;
  message: string;
  is_hard_fail: boolean;    // Forces decision to 'no_go'
};
```

---

## 6. Adding a New Framework Scorer

1. Create `lib/services/scoring/your-framework.ts`
2. Implement: `export function scoreYourFramework(ctx: FrameworkScorerContext): FrameworkScorerResult`
3. Return `{ met, total, details, riskFlags, remediation }`
4. Register in `scoreRegulatoryAlignment()` in `index.ts` (add a new `regLower.includes()` case)
5. Update `types.ts` if new input fields are needed

---

## 7. Gotchas

- **GeoJSON requirement**: EUDR scorer will flag if `farms.boundary` is missing.
- **Cascading hard fails**: A single `is_hard_fail: true` flag from any dimension forces `decision = 'no_go'`.
- **Unit Testing**: Every framework has tests — run `vitest` after any logic change.
- **Denormalization**: The result is saved to `shipments.readiness_snapshot` JSONB column.
- **Compliance Profiles**: When a `compliance_profile` is present, documentation and regulation requirements are dynamically adjusted to match the profile's framework.
- **Decision thresholds**: Configured in `constants.ts` (`DECISION.GO_THRESHOLD`, `DECISION.CONDITIONAL_FLOOR`).
