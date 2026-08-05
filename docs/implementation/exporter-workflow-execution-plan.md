# Exporter Workflow Execution Plan (Build-Out)

Date: 2026-04-03  
Audience: Product, Engineering, Compliance Ops, Customer Success

## 1) Scope and intent

This document operationalizes the gap analysis into an executable plan for delivery teams.

**Primary customer objective:** Improve reliability and speed for exporters in emerging markets across the full operating loop:

1. Field capture
2. Compliance preparation
3. Shipment execution
4. Evidence sharing
5. Settlement

## 2) Delivery model

- Sprint length: 2 weeks
- Planning horizon: 20 weeks
- Release type: feature-flagged progressive rollout
- Design rule: each sprint must improve at least one exporter KPI

## 3) Workstreams and owners

| Workstream | Owner | Supporting Teams | Core KPI |
|---|---|---|---|
| WS-A Farm Eligibility Gate | Backend Lead | Compliance, Product | % blocked before shipment stage |
| WS-B Policy Consistency (Role/Tier) | Platform Lead | Backend, Frontend | contradictory access incidents |
| WS-C Offline Safety & Reliability | Mobile/Web Lead | Platform, CX | offline sync error rate |
| WS-D Market Hard-Fail Gate Matrix | Compliance Eng | Product, Backend | false-ready shipment rate |
| WS-E 9-Stage Shipment Controls | Logistics Eng | Backend, UI | stage rollback / skip incidents |
| WS-F Audit & Detention Evidence | Compliance Ops Eng | Backend, Frontend | time-to-evidence package |
| WS-G Buyer Trust Surface | Frontend Lead | Compliance, Product | buyer clarification requests |
| WS-H Payout Ops Maturity | Payments Eng | Finance Ops | days batch-close-to-payout |
| WS-I Escrow Foundations | Payments/Platform | Legal, Finance | milestone release integrity |

## 4) Sprint-by-sprint plan

## Sprint 0 (Week 0–1): Baseline and controls

### Deliverables
- KPI baseline SQL snapshots and dashboard views.
- Rollout template for high-risk features (flag + fallback + rollback checklist).
- Incident taxonomy for exporter workflow failures.

### Definition of done
- Baseline report generated for last 90 days.
- Feature-flag metadata documented per upcoming workstream.

## Sprint 1 (Week 1–2): Farm gate domain model

### Deliverables
- `farm_eligibility_status` service computation (eligible/conditional/blocked).
- Rule matrix draft per market profile.
- API contract update draft for eligibility checks.

### Definition of done
- Test fixtures cover rejected/missing-polygon/failed-deforestation permutations.
- Eligibility responses are deterministic and explainable.

## Sprint 2 (Week 3–4): Enforce farm gate in write paths

### Deliverables
- Farm gate enforcement in batch contribution and shipment-linking write routes.
- Admin/compliance override workflow schema and audit logging.
- End-user error semantics for blocked actions.

### Definition of done
- Blocking rules enforced in API (not UI-only).
- Override actions create immutable audit events.

## Sprint 3 (Week 5–6): Policy consistency consolidation

### Deliverables
- Single source-of-truth policy map (route/role/tier/severity).
- Navigation + middleware + API policy consumers refactored to shared config.
- CI contract tests for policy drift.

### Definition of done
- No contradictory route/tier declarations across layers.
- Unlisted route behavior is explicit, not accidental.

## Sprint 4 (Week 7–8): Offline governance and reliability

### Deliverables
- Local data retention TTL and purge routines.
- Shared-device quick-clear mode on logout.
- Sync error reason taxonomy + UI actions.

### Definition of done
- 95%+ sync failures map to known reason classes.
- Sensitive stale data auto-purges on schedule.

## Sprint 5 (Week 9–10): Readiness hard-fail parity

### Deliverables
- Market hard-fail matrix enforced in readiness gate.
- Score semantics split: info vs conditional vs hard blocker.
- “Why blocked” export for compliance officer workflow.

### Definition of done
- Shipment cannot transition to ready with unresolved hard blockers.
- Block reason includes exact missing evidence item.

## Sprint 6 (Week 11–12): 9-stage shipment transition guards

### Deliverables
- Stage schema finalization with required fields per stage.
- Guarded transition service with audit timeline events.
- Stage skip prevention + API validator suite.

### Definition of done
- Stages cannot be skipped via UI or API.
- Every stage transition emits a timeline event.

## Sprint 7 (Week 13–14): Audit package + detention evidence

### Deliverables
- Formal audit package generator (v1: EUDR/general).
- Detention evidence package generation with scoped link + expiry.
- Access logging and export trail.

### Definition of done
- One-click evidence package for a shipment from a single screen.
- Shared evidence access is fully logged and time-bound.

## Sprint 8 (Week 15–16): Buyer trust surface

### Deliverables
- Buyer-facing shipment proof status fields.
- Compliance scorecard summary and corrective-action highlights.
- Buyer visibility policy checks.

### Definition of done
- Buyer can self-verify required shipment evidence without exporter hand-holding.

## Sprint 9 (Week 17–18): Payout ops maturity

### Deliverables
- Batch-close disbursement summary and reconciliation views.
- Bulk payout retry + exception queue.
- Per-farmer payout history timeline.

### Definition of done
- Exporter can reconcile payout totals to batch contributions without spreadsheets.

## Sprint 10 (Week 19–20): Escrow foundations

### Deliverables
- Escrow entity model + milestone configuration.
- Milestone-triggered release control stubs.
- Dispute hold workflow + audit traces.

### Definition of done
- No release action is possible without validated milestone state.

## 5) Acceptance test packs (must exist before rollout)

1. **Eligibility Pack**
   - Farm rejected/missing polygon/failed deforestation cases.
2. **Policy Pack**
   - Role/tier access matrix parity across nav/middleware/API.
3. **Offline Pack**
   - airplane mode flows, queue persistence, reconnect conflict behavior.
4. **Gate Pack**
   - readiness hard blockers per market.
5. **Shipment Pack**
   - stage transition requirements and no-skip enforcement.
6. **Evidence Pack**
   - generated package completeness and link expiry.
7. **Payout Pack**
   - contribution-to-payout reconciliation.

## 6) Rollout and risk controls

- All critical gates start in **observe mode** (log-only), then switch to enforce mode by org cohort.
- Cohorts: internal demo org → 2 pilot exporters → 5 pilot exporters → general rollout.
- Rollback trigger: >5% spike in blocked writes without valid reason code.

## 7) KPI targets by phase

- Phase 1–2:
  - 100% explicit reason codes on blocked actions.
  - 30% reduction in late-stage shipment blockers.
- Phase 3:
  - 50% reduction in time-to-evidence compilation.
  - 20% reduction in buyer doc clarification loops.
- Phase 4:
  - 25% faster batch-close-to-payout cycle.
  - 0 unauthorized milestone release events.

## 8) Customer workflow success criteria

A pilot exporter is successful when:

1. Field team captures once (online/offline) without re-entry.
2. Compliance team sees blockers immediately with exact fixes.
3. Logistics team can progress shipment stages without hidden dependencies.
4. Admin can produce complete evidence package within minutes.
5. Finance can reconcile farmer payouts and shipment settlement from one system.
