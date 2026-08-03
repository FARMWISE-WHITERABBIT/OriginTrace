# Funnel Measurement Protocol (P3)

_2026-07-10. Implements docs/IMPORTER-FUNNEL-PLAN.md T14. Companion: docs/CONTENT-STRATEGY.md §6 (per-geo targets), docs/BUYER-PROVISIONING-RUNBOOK.md._

## What is instrumented (first-party, in this repo)

| Signal | Where it lives | Since |
|---|---|---|
| Demo submissions by persona | `lead_nurture_jobs.persona` (+ `org_type`) — set by `/api/contact` from the demo form | 2026-07-10 (⚠ pending migration, see below) |
| Submission page + on-site referrer | `lead_nurture_jobs.source_path` / `referrer_path` (e.g. `/demo?role=buyer` via `/blog/escrow-vs-letter-of-credit-commodity-imports`) | same |
| GA4 conversion event | `generate_lead` with `persona`, `organization_type`, `source_path` params — fired by the demo form on successful submit (consent-gated; GA4 property `G-EVZ942SKW9`) | 2026-07-10 |
| Persona in HubSpot | Note body on the contact ("Persona: Buyer / Importer") + `industry` property = organization type | P1 |
| Buyer-voiced nurture | `cron/nurture-drip` branches on persona/org_type → `buildBuyerNurtureEmail1–3` | 2026-07-10 |

⚠ **Blocking item:** `supabase/migrations/20260710_lead_attribution.sql` could **not** be applied to the live DB — the Supabase MCP connection lost write permission mid-session (`You do not have permission to perform this action`, previously working). Apply it via the dashboard SQL editor (file is idempotent), then regenerate types (`SUPABASE_PROJECT_ID=gnvcvvsnnesieugnzmrz npm run gen:types`). Until then, `/api/contact` detects the missing columns and falls back to the base insert — **lead capture is safe either way**, attribution just stays NULL.

## Monthly review protocol (first Monday)

**1. GSC — content clusters × target geo** (Search Console → Performance → filter by page + country):
- Cluster A/B/C (exporter posts): Nigeria + Ghana impressions and CTR. Target: Nigeria impressions growing, CTR ≥ 5%.
- Cluster D (buyer posts) + `/importers`: UK/NL/DE clicks. Target: clicks up month-over-month; `/importers` impressions from ~0 baseline.
- Cluster E (Dubai posts): UAE impressions from ~0 baseline (137 at July 2026 start).
- GACC pages: re-check CTR after the July title rework; ignore US/Brazil impression mass (off-ICP bycatch — never optimize for it).
- **Kill/iterate rule:** any P0 post with <1% CTR at >1k impressions in its target geo after 8 weeks → rework title/description (the GACC playbook), don't rewrite the body.

**2. GA4** (property `G-EVZ942SKW9`):
- `generate_lead` events split by `persona` param — the demo-conversion headline number.
- Path exploration: sessions containing `/importers` → `/demo` (the funnel the P1 work built); landing-page report filtered to `/blog/*` with `generate_lead` as conversion.

**3. First-party SQL** (Supabase SQL editor; works once the migration is applied):
```sql
-- Leads by persona per week
SELECT date_trunc('week', created_at) AS week,
       COALESCE(persona, CASE WHEN org_type IN ('importer','trading_house','manufacturer','retailer') THEN 'buyer' ELSE 'exporter' END) AS persona,
       COUNT(*) FROM lead_nurture_jobs GROUP BY 1, 2 ORDER BY 1 DESC;

-- Which pages produce leads (top source paths + referrers)
SELECT source_path, referrer_path, COUNT(*) FROM lead_nurture_jobs
WHERE source_path IS NOT NULL GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 25;
```

**4. HubSpot:** filter contacts by `industry` ∈ {importer, trading_house, manufacturer, retailer} for the buyer pipeline; persona is also in each contact's note. Optional upgrade (manual, portal-side): create a custom `persona` contact property, then map it in `lib/hubspot.ts` — **create the portal property first**; an unmapped property 400s the whole upsert.

## North star

Demo requests by persona per month → provisioned buyer workspaces (runbook) → suppliers onboarded per buyer. Everything above exists to grow that chain; report those three numbers together.
