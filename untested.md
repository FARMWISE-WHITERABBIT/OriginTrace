# OriginTrace QA Analysis: The 17 Untested Operations

During the recent regression sweep, the OriginTrace platform was confirmed to have **0 failing operations**. However, **17 operations remain categorized as `🔲 UNTESTED`**. 

This document details why these operations remain `UNTESTED`, mapping the remaining retest work directly to the agent skills catalogued in `agents.md`.

---

## 1. Entity-Dependent Operations (9 items)
The previous deep relational mock-data blocker is resolved after running `npm run seed:qa:data`. The command seeds the complex, multi-layered data structures (defined in the `seed-data` skill anatomy: `org → users → farms → suppliers → shipments → certificates → scores`) needed to reach specific detail pages for `demo-whiterabbit`.

**Current Status:** These rows remain `UNTESTED` only because the `browser-qa` agent has not yet run against the route anchors printed by `npm run seed:qa:data` and recorded evidence. Do not mark them `PASS` until that browser retest completes.

### Farmer & Farm Management
`npm run seed:qa:data` generates QA KYC profiles, bank relationships, price agreement data, and WGS84 GeoJSON boundary data (referencing the `geospatial` skill):
* **3.3 View individual farmer profile** (`/app/farmers/[id]`) - ✅ PASS. Browser evidence recorded.
* **3.4 Edit farmer details** (`/app/farmers/[id]`) - Seeded via QA farmers; browser evidence pending.
* **3.6 View farmer-linked bank accounts** (`/app/farmers/[id]`) - Seeded bank account for `QA-FARMER-001`; browser evidence pending.
* **11.6 View farmer price agreement** (Farmer profile) - Seeded price agreement for `QA-FARMER-001`; browser evidence pending.
* **4.4 View farm details including GeoJSON** (`/app/farms/[id]`) - Seeded WGS84 boundaries and `/app/farms/[id]` alias; browser evidence pending.
* **4.5 Run deforestation check on farm** (`/app/farms/[id]`) - Seeded deforestation check JSON; browser evidence pending.

### Supply Chain (Batches, Dispatches, Inventory)
`npm run seed:qa:data` emulates the collection flow and warehouse processing around `QA-BCH-001` and `QA-RUN-001`:
* **5.4 View batch detail with contributions** (`/app/collect/[id]`) - ✅ PASS. Browser evidence recorded.
* **5.7 View dispatch details** (`/app/dispatch/[id]`) - ✅ PASS. Browser evidence recorded.
* **6.3 View inventory item detail** (`/app/inventory/[id]`) - ✅ PASS. Browser evidence recorded.
* **8.3 View processing run detail** (`/app/processing/[id]`) - ✅ PASS. Browser evidence recorded.

### Logistics & Compliance
`npm run seed:qa:data` builds a logistics chain around `QA-SHP-001`, invoking the `shipment-scoring` skill assumptions for readiness fields:
* **7.3 View shipment detail page** (`/app/shipments/[id]`) - ✅ PASS. Browser evidence recorded.
* **7.4 Update shipment status** (`/app/shipments/[id]`) - Seeded `QA-SHP-001` anchor for action retest; browser evidence pending.
* **7.5 Generate waybill PDF** (`/app/shipments/[id]`) - Seeded logistics fields and documents for waybill retest; browser evidence pending.
* **7.6 View shipment readiness score** (`/app/shipments/[id]`) - Seeded readiness fields; browser evidence pending.
* **17.3 Link service provider to shipment** (`/app/shipments/[id]`) - Seeded preferred providers and copied their contact fields onto `QA-SHP-001`; browser evidence pending.

**Remediation Path:** Run `npm run seed:qa:data`, then use the printed route anchors in a targeted browser QA retest. Keep all listed operations `UNTESTED` until evidence is recorded.

---

## 2. Action/Scenario Operations (8 items)
These operations are not blocked by seed data. The UI pages successfully render their empty states. However, they remain untested because the `browser-qa` agent has not yet executed the *specific, multi-step user flows* required to prove the action works end-to-end.

**The Blocker:** Testing these flows requires composing multiple skills from `agents.md` (e.g., combining `browser-qa` with `compliance-regulations` and `rbac`) to execute state-mutating actions, rather than just verifying that a page renders.

### Document & Compliance Workflows
* **10.5 Create compliance profile** (`/app/compliance`) - Route renders properly, but the QA agent has not filled out and submitted the compliance creation form. Demands context from the `compliance-regulations` skill.
* **16.2 Upload document** (`/app/documents`) - Document Vault renders, but the file upload logic has not been exercised.
* **16.3 Download document** (`/app/documents`) - Blocked until 16.2 is executed (cannot download what hasn't been uploaded).

### Buyer Portal & Procurement
* **12.2 Create a new contract** (`/app/contracts`) - Route renders, but the form submission has not been simulated.
* **12.4 Create a new tender** (`/app/tenders`) - Route renders, but tender publication has not been simulated.
* **12.5 Submit bid on a tender** (`/app/tenders`) - Buyer portal access is verified, but this requires a multi-actor simulation: Admin creates a tender, Buyer logs in to submit a bid.

### Security & RBAC Scenarios
Requires leveraging the `rbac` and `security` skills to assert precise UI restrictions:
* **21.2 Viewer cannot see invite button in `/app/team`** - Not tested because the `viewer` role does not currently have a dedicated QA login session.
* **21.4 Tier-gated feature shows upgrade prompt** - Not tested. The `browser-qa` agent hasn't been instructed to intentionally trigger a tier-gate violation to assert the presence of the upgrade CTA.

**Remediation Path:** We must author specific, targeted testing scenarios for the `browser-qa` agent, or transition these complex, multi-actor state mutations to deterministic E2E scripts using the `testing` skill (Playwright/Vitest).
