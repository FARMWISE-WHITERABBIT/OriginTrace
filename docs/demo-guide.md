# OriginTrace Demo Guide — GACON

> Internal use only. Last updated: 2026-03-26.

---

## Pre-demo checklist

Before starting, confirm:
- [ ] `npm run seed:gacon` has been run (or `seed:gacon:reset` for a clean slate)
- [ ] Logged in as `demo.admin@gacon-demo.com` / `Demo1234!`
- [ ] GACON org is on **Pro** tier (check superadmin or run `SELECT subscription_tier FROM organizations WHERE slug = 'gacon'`)
- [ ] Migration `20260326_add_gum_arabic.sql` has been applied in Supabase SQL Editor

---

## Demo flow

Follow this exact route. **Do not click the Compliance sidebar link** (`/app/compliance`) — it is not part of this demo path.

| Step | Route | What to show |
|------|-------|--------------|
| 1 | **Dashboard** | Activity summary, recent batches, shipment statuses at a glance |
| 2 | **Farms → Pending Review tab** | Musa Danladi's farm (1.9 ha, Kachia) awaiting boundary verification — live tension |
| 3 | **Collect → Batches** | GCN-GNG-2026-001 (3,200 kg ginger, 64 bags, 3-farm cooperative, Kachia LGA) |
| 4 | **Shipments list** | Show mix of statuses: one Conditional score draws attention |
| 5 | **Shipment detail — GCN-SHP-2026-001** | Readiness score **67 — Conditional**. Two flagged gaps visible. |
| 6 | **DDS export button** | Trigger the Due Diligence Statement export flow |

> Skip the **Compliance** item in the left navigation entirely.

---

## Talking points

### Readiness score (step 5)

The score is **67/100 — Conditional**, not a perfect green. This is intentional and more convincing than a perfect score:

- Two soft warnings (non-blocking), not hard fails:
  1. Due Diligence Statement not yet uploaded
  2. Phytosanitary certificate pending NAFDAC issuance
- Everything else is clean: GPS polygons verified, MRL lab result uploaded, certificate of origin present, all farms deforestation-free
- Message: _"The platform tells you exactly what's missing and why — so your team can act, not guess."_

### Deforestation risk (Nigeria / EUDR)

> "Nigeria is classified as a high-risk country — which is exactly why EUDR requires farm-level verification. OriginTrace runs a satellite check on every individual farm polygon. A farm can be in Nigeria and still be certified deforestation-free. We show that per-farm, not per-country."

Point to the GPS Polygon Verification Report document on the shipment detail page. All three Kachia farms show green.

### Pending farm (step 2)

> "Musa Danladi's farm is pending boundary verification — he's a new cooperative member this season. His delivery is already logged in the batch, but the platform flags the unverified polygon so the compliance officer can prioritise the field visit. Nothing falls through the cracks."

---

## Corrected technology language

**Do not say:** "blockchain ledger" or "on the blockchain."

**Say instead:**
- "immutable audit ledger with row-level cryptographic integrity"
- "tamper-evident data store"
- "fully auditable record — every change is logged with a timestamp and user identity"

**If asked directly about blockchain:**

> "Blockchain is on our roadmap. What we run today is a fully auditable PostgreSQL system with row-level security, event logging, and cryptographic integrity checks — it gives you the same auditability guarantees that matter for EUDR and buyer due diligence, without the latency or cost overhead of a distributed ledger. We're not going to tell you it's blockchain when it isn't."

This answer builds trust. Buyers appreciate the honesty.

---

## GACON seed credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `demo.admin@gacon-demo.com` | `Demo1234!` |
| Agent | `demo.agent@gacon-demo.com` | `Demo1234!` |

---

## Key data reference

| Item | Value |
|------|-------|
| Org slug | `gacon` |
| Tier | `pro` |
| Commodities | Ginger · Hibiscus · Gum Arabic |
| Farms | 5 (Kachia LGA: 3 ginger · Kagarko LGA: 2 hibiscus) |
| Batch | GCN-GNG-2026-001 · 3,200 kg · 64 bags |
| Shipment | GCN-SHP-2026-001 · Hamburg · 67/100 Conditional |
| Gaps | DDS missing · Phytosanitary pending |
| Gum Arabic HS code | 1301.20 |
| Gum Arabic yield benchmark | 0.4 kg/tree/year · Nigeria |
