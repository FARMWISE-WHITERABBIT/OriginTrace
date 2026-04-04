# OriginTrace Demo Walkthrough Script — GACON

> Internal use only. Presenter copy — read the **Say:** lines aloud, follow the **Do:** actions exactly.
> Last updated: 2026-03-26.

---

## All credentials at a glance

| Role | Email | Password |
|------|-------|----------|
| GACON Admin (presenter) | `demo.admin@gacon-demo.com` | `Demo1234!` |
| GACON Agent | `demo.agent@gacon-demo.com` | `Demo1234!` |

> Org: **GACON — Gum Arabic & Commodities Nigeria** · Tier: **Pro** · Commodities: Ginger · Hibiscus · Gum Arabic

---

## Step 0 — Setup before the audience arrives

**Run this at least 5 minutes before the session:**

```bash
# Set environment variables if not already in .env.local
export NEXT_PUBLIC_SUPABASE_URL="<your-supabase-project-url>"
export SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>"

# Wipe and reseed a clean GACON dataset
npm run seed:gacon:reset
```

**If this is a fresh Supabase database**, apply the Gum Arabic migration first in the Supabase SQL Editor:
```
supabase/migrations/20260326_add_gum_arabic.sql
```

**Then open your browser:**

1. Open a new **incognito / private** window
2. Navigate to `[APP_URL]/login`
3. Leave the login page visible — do not log in yet

---

## Step 1 — Login

**URL:** `[APP_URL]/login`

**Do:**
- Enter email: `demo.admin@gacon-demo.com`
- Enter password: `Demo1234!`
- Click **Sign In**

**Expected on screen:**
- Redirects to `/app/dashboard`
- Top-left shows the GACON organisation name
- Dashboard displays recent batch activity, pending farms count, and shipment statuses

**Say:**
> "I'm logged in as the GACON compliance admin. GACON is a Nigerian commodities exporter — ginger, hibiscus, and gum arabic — shipping primarily into the EU. You'll see their full supply chain in the next few minutes."

---

## Step 2 — Farms → Pending Review tab

**URL:** `/app/farms`

**Do:**
- Click **Farms** in the left sidebar
- Click the **Pending Review** tab at the top of the page

**Expected on screen:**
- One farm is listed: **Musa Danladi**, 1.9 ha, Kachia, Kaduna
- Status badge reads **Pending**
- Notes: "Pending boundary verification. New GACON member, 2026 season."
- The other 4 farms (Abubakar Sule, Hadiza Ibrahim, Hauwa Bello, Garba Yakubu) are on the **Approved** tab

**Say:**
> "This is the Farms view. Musa Danladi is a new cooperative member this season — his 1.9-hectare ginger farm in Kachia is registered and his delivery is already logged, but the GPS boundary polygon is still awaiting field verification. The platform flags it so the compliance officer knows exactly which farm visit is outstanding. Nothing falls through the cracks.
>
> Notice we're in Kaduna State — Kachia and Kagarko LGAs specifically. These are smallholder farms. The platform works at that level of granularity."

---

## Step 3 — Collect → Batches

**URL:** `/app/collect` (then click the **Batches** tab if not already selected)

**Do:**
- Click **Collect** in the left sidebar
- Select or confirm the **Batches** tab

**Expected on screen:**
- Batch **GCN-GNG-2026-001** is listed
- Status: **Completed**
- Weight: **3,200 kg · 64 bags · Grade 1**
- Commodity: Ginger
- LGA: Kachia, Kaduna State

**Do:**
- Click into the batch to open the detail view

**Expected on batch detail screen:**
- Three farm contributions shown: Abubakar Sule (1,050 kg / 21 bags), Hadiza Ibrahim (1,280 kg / 26 bags), Musa Danladi (870 kg / 17 bags)
- Collected at timestamp ~25 days ago

**Say:**
> "This is the ginger collection batch from Kachia. Three farms pooled their harvest — this is a cooperative model. Each farm's contribution is recorded separately at bag level, with weight and grade per farm.
>
> You'll notice Musa Danladi's farm contributed 870 kg even though his polygon is still pending. The delivery is accepted and logged — but the compliance flag on his farm stays open until the boundary is verified. The two things are tracked independently."

---

## Step 4 — Shipments list

**URL:** `/app/shipments`

**Do:**
- Click **Shipments** in the left sidebar

**Expected on screen:**
- A list showing at least one shipment: **GCN-SHP-2026-001**
- Destination: **Hamburg, Germany**
- Commodity: Dried Split Ginger
- A **yellow badge** reading **Conditional** next to the shipment

**Say:**
> "Here is the shipments view. GCN-SHP-2026-001 is a draft EU shipment heading to Hamburg. The yellow badge — Conditional — means the system has assessed the readiness and found gaps. It's not blocked, but it's not clear either. Let me open it."

---

## Step 5 — Shipment detail & readiness score

**URL:** `/app/shipments/GCN-SHP-2026-001`

**Do:**
- Click on **GCN-SHP-2026-001** to open the detail page

**Expected on screen:**
- **Readiness score widget:** `67 / 100` — **Conditional**
- **Score breakdown** (five dimensions):
  | Dimension | Score |
  |-----------|-------|
  | Traceability Integrity | 90 |
  | Documentation Completeness | 45 |
  | Chemical & Contamination Risk | 88 |
  | Storage & Handling Controls | 72 |
  | Regulatory Alignment | 70 |
- **Two risk flags** (yellow warnings, not red hard fails):
  1. Due Diligence Statement not yet uploaded. Required for EUDR compliance.
  2. Phytosanitary certificate pending NAFDAC issuance.
- **Documents already uploaded (4 present):**
  - Certificate of Origin (NEPC) ✓
  - Export Licence (NAFDAC) ✓
  - MRL Lab Result — Pesticide Residue ✓
  - GPS Polygon Verification Report — 3 Farms ✓

**Say:**
> "Score is 67 out of 100 — Conditional. The platform breaks this down across five dimensions. Traceability is 90 — strong. The drop is in Documentation Completeness at 45, and that's because two documents are outstanding: the Due Diligence Statement for EUDR, and the phytosanitary certificate which is with NAFDAC right now.
>
> These are warnings, not hard fails. The shipment isn't blocked — GACON can proceed to loading once those two documents are uploaded. The platform tells the team exactly what to do next, not just that something is wrong."

**Point to the GPS Polygon Verification Report, then say:**
> "One thing worth highlighting — Nigeria is classified as a high-risk country under EUDR, which is exactly why the regulation requires farm-level verification. OriginTrace runs a satellite check on every individual farm polygon. A farm can be in Nigeria and still be certified deforestation-free. We show that per-farm, not per-country. All three Kachia farms are clean — you can see the verification report right here in the document list."

---

## Step 6 — DDS Export

**URL:** still on `/app/shipments/GCN-SHP-2026-001`

**Do:**
- Locate the **Export DDS** button on the shipment detail page
- Click it to trigger the Due Diligence Statement export flow

**Expected on screen:**
- DDS export modal or download initiated
- The statement pre-populates with the shipment's farm data, batch references, and GPS coordinates

**Say:**
> "When the compliance officer is ready, they hit Export DDS — the system generates the Due Diligence Statement pre-filled with all the supply chain data: farm polygons, batch traceability chain, operator details. That's the document EUDR requires before goods clear EU customs. No manual spreadsheet, no copy-paste. It's generated from the live data."

---

## Q&A — Likely questions and scripted answers

### "Is this on blockchain?"

> "No — and we'll be straight about that. What we run today is a fully auditable PostgreSQL system with row-level security, event logging, and cryptographic integrity checks. Every record carries a timestamp and user identity; nothing can be silently altered. Blockchain is on our roadmap. But the auditability guarantees that matter for EUDR and buyer due diligence — we deliver those today, without the latency or cost overhead of a distributed ledger. We're not going to tell you it's blockchain when it isn't."

### "Nigeria is high-risk — how do you actually prove deforestation-free?"

> "Nigeria is classified as a high-risk country — which is exactly why EUDR requires farm-level verification. OriginTrace runs a satellite deforestation check on every individual farm polygon, cross-referenced against Global Forest Watch and Copernicus land-cover data. A farm in Nigeria can be — and in this dataset is — certified deforestation-free. We show that per-farm, not per-country. The GPS Polygon Verification Report on this shipment is the audit artefact."

### "What happens when Musa Danladi's farm gets approved?"

> "The compliance flag clears automatically. His farm moves from Pending Review to Approved, his polygon gets its satellite check, and on any future shipment that includes his farm's batches, his deforestation status is part of the readiness score. His delivery in this batch is already in the system — the approval just unlocks the compliance chain for that polygon."

### "What is Gum Arabic doing in the catalogue?"

> "GACON's expansion commodity. Gum Arabic is harvested from Acacia senegal — a tree crop native to Northern Nigeria — so we've added it to the global commodity catalogue alongside the other tree crops. HS code 1301.20, yield benchmark of 0.4 kg per tree per year for Nigeria. It's not yet in an active shipment, but the infrastructure is ready for when GACON starts exporting it."

### "Can I log in as the field agent to see the collection side?"

> "Yes. The agent account is `demo.agent@gacon-demo.com`, same password `Demo1234!`. The agent view shows the mobile collection flow — batch sync, bag scanning, farm GPS capture."

---

## Navigation warning

**Do NOT click the Compliance link in the left sidebar** (`/app/compliance`). This page is not part of the demo flow and may show incomplete data.

The demo route is:
```
Dashboard → Farms (Pending Review) → Collect → Batches
→ Shipments → Shipment detail → DDS export
```

---

## Appendix — Key data reference

| Item | Value |
|------|-------|
| Org | GACON — Gum Arabic & Commodities Nigeria |
| Slug | `gacon` |
| Tier | `pro` |
| Commodities | Ginger · Hibiscus · Gum Arabic |
| Farms total | 5 |
| — Kachia LGA (ginger) | Abubakar Sule ✓ · Hadiza Ibrahim ✓ · Musa Danladi ⏳ |
| — Kagarko LGA (hibiscus) | Hauwa Bello ✓ · Garba Yakubu ✓ |
| Batch | GCN-GNG-2026-001 · 3,200 kg · 64 bags · Grade 1 |
| Processing run | GCN-RUN-001 · 24.4% recovery |
| Finished good | PED-GCN-001 · 780 kg dried split ginger |
| Shipment | GCN-SHP-2026-001 · Hamburg · **67/100 Conditional** |
| Gap 1 | Due Diligence Statement not uploaded |
| Gap 2 | Phytosanitary certificate pending NAFDAC |
| Docs present | COO · Export Licence · MRL Lab Result · GPS Polygon Report |
| Gum Arabic HS code | 1301.20 |
| Gum Arabic yield benchmark | 0.4 kg/tree/year · Nigeria (0.40 t/ha at 1,000 trees/ha) |
| Seed command | `npm run seed:gacon:reset` |
