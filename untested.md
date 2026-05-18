# OriginTrace QA Analysis: The 23 Untested Operations

During the recent regression sweep, the OriginTrace platform was confirmed to have **0 failing operations**. However, **23 operations remain categorized as `🔲 UNTESTED`**. 

This document details exactly why these operations cannot currently be verified by the `browser-qa` agent, mapping the blockers directly to the agent skills catalogued in `agents.md`.

---

## 1. Entity-Dependent Operations (15 items)
The majority of untested operations are blocked by a lack of deep relational mock data. While the basic QA users exist, the system requires complex, multi-layered data structures (defined in the `seed-data` skill anatomy: `org → users → farms → suppliers → shipments → certificates → scores`) to reach specific detail pages.

**The Blocker:** According to the `seed-data` skill in `agents.md`, the current seeding scripts do not provision enough deep relational entities for the QA testing accounts. Without these entities, navigating to detail pages (`/[id]`) is impossible.

### Farmer & Farm Management
Requires expanding the `seed-data` skill to generate mock KYC profiles, bank relationships, and PostGIS boundary data (referencing the `geospatial` skill):
* **3.3 View individual farmer profile** (`/app/farmers/[id]`) - Blocked: 0 seeded farmers.
* **3.4 Edit farmer details** (`/app/farmers/[id]`) - Blocked: 0 seeded farmers.
* **3.6 View farmer-linked bank accounts** (`/app/farmers/[id]`) - Blocked: 0 seeded farmers.
* **11.6 View farmer price agreement** (Farmer profile) - Blocked: 0 seeded farmers.
* **4.4 View farm details including GeoJSON** (`/app/farms/[id]`) - Blocked: 0 seeded farm boundaries.
* **4.5 Run deforestation check on farm** (`/app/farms/[id]`) - Blocked: 0 seeded farms. Relies heavily on the `geospatial` and `compliance-regulations` skills to test accurately.

### Supply Chain (Batches, Dispatches, Inventory)
Requires expanding the `seed-data` skill to emulate the `offline-sync` collection flow and warehouse processing:
* **5.4 View batch detail with contributions** (`/app/collect/[id]`) - Blocked: 0 seeded collection batches.
* **5.7 View dispatch details** (`/app/dispatch/[id]`) - Blocked: 0 seeded dispatch records.
* **6.3 View inventory item detail** (`/app/inventory/[id]`) - Blocked: 0 seeded warehouse inventory items.
* **8.3 View processing run detail** (`/app/processing/[id]`) - Blocked: 0 seeded mass-balance processing runs.

### Logistics & Compliance
Requires expanding the `seed-data` skill to build valid logistics chains, invoking the `shipment-scoring` skill:
* **7.3 View shipment detail page** (`/app/shipments/[id]`) - Blocked: 0 seeded shipments.
* **7.4 Update shipment status** (`/app/shipments/[id]`) - Blocked: 0 seeded shipments.
* **7.5 Generate waybill PDF** (`/app/shipments/[id]`) - Blocked: 0 seeded shipments.
* **7.6 View shipment readiness score** (`/app/shipments/[id]`) - Blocked: 0 seeded shipments (Requires evaluating the `shipment-scoring` logic).
* **17.3 Link service provider to shipment** (`/app/shipments/[id]`) - Blocked: 0 seeded shipments.

**Remediation Path:** We must invoke the `seed-data` skill to update the seed workflow, ensuring that at least 1 mock Farmer, 1 Farm (with GeoJSON), 1 Batch, 1 Processing Run, and 1 Shipment are automatically generated for the QA users.

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
