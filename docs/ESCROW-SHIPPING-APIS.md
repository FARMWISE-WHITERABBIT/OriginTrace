# OriginTrace — Shipping-Event-Triggered Escrow Release: Integration Research Report

_Research report, 2026-07-09. Grounded in the repo (lib/services/escrow.ts, lib/services/shipment-stages.ts, app/api/webhooks/paystack) + live web verification where the session rate limit allowed. Claim tags: **[V]** verified today (source given) / **[TK]** training-knowledge — verify before contracting._


**Method note:** Web verification was cut short by a session rate limit. Claims below are tagged: **[V]** = verified via live web search today (source URL given); **[TK]** = training-knowledge, verify before contracting. Codebase facts are from direct inspection of the repo and are reliable.

---

## (A) RECOMMENDED SHORTLIST

| Provider | Carrier/port coverage | Container events (gate-in/load/depart/discharge/gate-out) | Webhooks | Pricing signal | West-Africa fit | DX |
|---|---|---|---|---|---|---|
| **Terminal49** | ~30+ ocean carriers, strong US terminal depth [TK]; carrier-sourced milestones globally | Full milestone set incl. vessel arrivals, discharges, loads, transport milestones **[V]** | Yes, push webhooks; documented webhook-creation API **[V]** | Free dev key, 100 containers **[V]**; tiered "Essential+" plans with API+webhooks **[V]**; historically ~$1/container at volume [TK] | Good via carrier data (Maersk/MSC/CMA CGM serve Lagos/Tema/Abidjan); terminal-direct feeds skew US [TK] | Public docs (terminal49.com/docs), dev portal with request/webhook debugging **[V]** |
| **Vizion API** | Claims tracking coverage of ~99% of global ocean freight; "most shipping lines out of the box" **[V]** | Container event updates incl. gate/load/discharge milestones [TK — event list page not fetched] | Yes — webhook-push is the core model, "multiple times daily" **[V]** | Sales-led; tiered plans exist but numbers not public **[V]**; historically per-container-tracked pricing around $0.50–$1 [TK] | Same as T49: carrier-sourced, so WAF lanes covered to the extent Maersk/MSC/CMA CGM/Hapag publish events [TK] | Public docs at docs.vizionapi.com **[V]** |
| **project44** | Broadest multimodal enterprise coverage (ocean+rail+road) [TK] | Full ocean milestone set + predictive ETA [TK] | Yes [TK] | Enterprise contract, typically 5–6 figures/yr; no self-serve [TK] | Coverage fine; commercially oversized for an MVP [TK] | Enterprise onboarding, not self-serve [TK] |
| **Portcast** | ~20–30 carriers, strong Asia; predictive ETA focus [TK] | Milestones + ETA predictions, API + webhooks [TK] | Yes [TK] | Subscription, sales-led [TK] | Asia-centric; Qingdao leg good, WAF unproven [TK] | Public-ish docs [TK] |
| **Shipsgo** | Budget aggregator, wide carrier list [TK] | Core milestones (loaded/departed/arrived/discharged) but thinner event granularity [TK] | Webhook + email push [TK] | Credit-based, roughly $0.5–1/container, self-serve — cheapest entry [TK] | Used heavily by SME forwarders on Africa lanes [TK] | Simple REST, lighter docs [TK] |
| **SeaRates (DP World)** | DP World ecosystem tracking API [TK] | Basic tracking events [TK] | Polling-oriented [TK] | Per-request/subscription [TK] | DP World has little presence in the Nigerian/Ghanaian container terminals you use [TK] | OK [TK] |

**MVP recommendation: Terminal49.** It is the only shortlisted provider with a verified free developer tier (100 containers), verified push webhooks, public docs, and published plan structure — you can prove the escrow-trigger loop end-to-end this quarter without a procurement cycle. Vizion is the strong #2 / A-B candidate (equally webhook-native, claims broader carrier coverage) but is sales-gated on pricing.

**Scale path:** (1) Add Vizion as a second aggregator for redundancy/coverage arbitration (two independent sources agreeing on a LOAD/DISC event is itself an anti-fraud control). (2) Go **carrier-direct via DCSA-standard Track & Trace APIs** for the 3–4 carriers that dominate your lanes — Maersk, MSC, CMA CGM, Hapag-Lloyd have all implemented DCSA T&T 2.x **[V]** — which gives you carrier-authoritative events at marginal cost for the bulk of volume, keeping the aggregator for long-tail carriers. Avoid project44 unless/until an enterprise buyer demands it.

---

## (B) PER-PROVIDER NOTES

**Terminal49** — Track any container via a single API; carrier milestones plus ocean/rail terminal data; free Developer Key up to 100 containers; push webhooks fire on status changes (milestones, ETAs); webhook event types include vessel arrivals, discharges, loads, transport milestones; dev portal shows all requests/webhooks/notifications for debugging. Sources: https://terminal49.com/container-tracking-api, https://terminal49.com/docs/api-docs/api-reference/webhooks/create-a-webhook, https://terminal49.com/api-pricing, https://www2.terminal49.com/docs/api-docs/getting-started/tracking-shipments-and-containers/ (all **[V]** from search snippets; exact per-container $ not published — get a quote). Caveats [TK]: terminal-direct integrations are US-centric, so at Apapa/Tin Can/Lekki/Tema you are effectively consuming what the carrier publishes; expect gate-out at destination to be more reliable at Rotterdam/Antwerp/Hamburg than gate-in timestamps at origin.

**Vizion API** — Webhook-first container event API, "updates multiple times daily"; claims coverage across ~99% of global ocean freight, "most shipping lines out of the box", custom quotes for extra carriers/terminals; pricing sales-led (tiered plans referenced in docs but numbers gated). Sources: https://www.vizionapi.com/container-tracking/api-overview, https://docs.vizionapi.com/docs/overview, https://docs.vizionapi.com/docs/plans, https://www.vizionapi.com/container-tracking/pricing (**[V]**). Model [TK]: you POST a reference (container + carrier SCAC, or BL/booking), Vizion pushes normalized milestone arrays to your webhook until the container cycle completes — this subscribe-then-push model maps cleanly onto "subscribe at container stuffing (stage 6), consume events until close".

**project44** [TK throughout] — Enterprise "Movement" visibility platform; ocean events from carrier EDI/API + AIS + terminal feeds; excellent normalization and predictive ETA; webhook and pull APIs. Sales-led, annual enterprise contracts; onboarding measured in weeks-months. Right answer for a Fortune-500 shipper, wrong cost shape for OriginTrace's MVP.

**Portcast** [TK throughout] — Singapore; container tracking + predictive ETA API, webhooks available; strongest on intra-Asia/transpacific data; subscription pricing on tracked-container volume. Worth an RFQ mainly for the China (Qingdao) leg; West-Africa depth unproven.

**Shipsgo** [TK throughout] — Cheapest credible option; credit-per-container model (order of $0.5–1), self-serve signup, REST API + webhook/email notifications; popular with SME forwarders including on Africa–Europe lanes. Event granularity thinner (may not distinguish gate-in vs loaded reliably); fine as a cost-down fallback, weaker as the trust anchor for money movement.

**SeaRates / DP World, GoComet** [TK] — SeaRates tracking API exists but is polling-oriented and DP World's terminal footprint doesn't cover your named origin terminals (Apapa = APM Terminals; Tin Can/TICT and Abidjan = Bolloré/AGL-linked; Tema MPS = APMT/Bolloré JV; Lekki = CMA Terminals-linked consortium — all [TK]). GoComet is a freight-procurement SaaS with tracking bolted on, not a developer-API company. Neither shortlisted.

**Carrier-direct / DCSA:** DCSA members include MSC, Maersk, CMA CGM, Hapag-Lloyd, ONE, Evergreen, Yang Ming, HMM, ZIM; implementations as of the DCSA conformance listing: Maersk T&T 2.2; MSC T&T 1.2 + 2.2; Hapag-Lloyd T&T 2.2 (+ reefer events, OVS, JIT port call); CMA CGM T&T 2.1 + 2.2 (+ eBL 2.0) — i.e., all four carriers that matter most on your lanes expose DCSA-conformant Track & Trace APIs. Sources: https://dcsa.org/standard-conformance, https://dcsa.org/standards/track-and-trace/standard-documentation-track-and-trace, https://splash247.com/top-carriers-adopting-dcsa-track-and-trace-standards/ (**[V]**). DCSA T&T standardizes three event families [TK, consistent with the verified spec pages]: **equipment events** (GTIN gate-in, GTOT gate-out, LOAD, DISC, STUF, STRP), **transport events** (ARRI, DEPA), **shipment events** (e.g., B/L ISSU, SURR), each with an ACT/EST/PLN classifier. Carrier developer portals: developer.maersk.com, developerportal.msc.com, Hapag api-portal.hlag.com, CMA CGM API portal [TK — portals exist; onboarding terms, push-vs-poll, and whether non-BCO third parties get access vary by carrier and must be checked; CMA CGM has historically charged for API subscriptions]. Practical note [TK]: DCSA standardizes the *schema*; most carrier T&T APIs are **poll-based** — aggregators exist largely to convert that into push.

**TradeLens: confirmed dead.** Maersk and IBM announced discontinuation Nov 29, 2022; platform offline by end of Q1 2023; cited lack of commercial viability. Do not chase it. Sources: https://www.maersk.com/news/articles/2022/11/29/maersk-and-ibm-to-discontinue-tradelens, https://www.supplychaindive.com/news/Maersk-IBM-shut-down-TradeLens/637580/ (**[V]**).

**AIS / vessel-level:** MarineTraffic was acquired by Kpler (March 2023) and now sells: AIS positions API, port-call/berth-call **events** APIs (live port call updates, STS transfers), plus a separate container-tracking product; credit-based self-serve API pricing has been discontinued in favor of enterprise/sales-led for commercial API feeds (web plans from ~£10–£100/mo are for the human UI, not the API). Sources: https://www.kpler.com/product/maritime/data-services, https://servicedocs.marinetraffic.com/, https://container-tracking.marinetraffic.com/, https://www.g2.com/products/kpler-marinetraffic/pricing, https://datadocked.com/ais-api-providers (**[V]**). Lloyd's List Intelligence sells Seasearcher (vessel movements, ownership, sanctions, dark-fleet/behavioral risk) with a documented REST API (apidocs.lloydslistintelligence.com) offering vessel movements, port data, risk endpoints — enterprise-priced, compliance/risk-oriented rather than container-ops. Sources: https://www.lloydslistintelligence.com/solutions/seasearcher, https://apidocs.lloydslistintelligence.com/, https://www.lloydslistintelligence.com/solutions/api (**[V]**). VesselFinder, Spire Maritime, Datalastic [TK]: Datalastic is the budget self-serve AIS API (roughly €100–500/mo tiers); VesselFinder sells self-serve AIS API too; Spire is satellite-AIS enterprise feeds. **Role in escrow:** AIS proves the *vessel* departed/arrived — it never proves *your container* was aboard. Use it only as (a) corroboration of carrier DEPA/ARRI events, (b) an anomaly detector (vessel never left, AIS gap/dark period, port-call mismatch). Never a primary release trigger.

---

## (C) "LOG MARITIME" IDENTIFICATION

Most likely the user means **Lloyd's List Intelligence** — "Lloyd's" misheard/half-remembered as "log", and the firm was historically known as *Lloyd's Marine/Maritime Intelligence Unit* [TK on the historical name; company and product verified above]. What it actually sells: Seasearcher and REST APIs for vessel tracking, ownership, sanctions/compliance risk, port activity — i.e., vessel-level maritime *intelligence*, not container-milestone tracking, and enterprise-priced. It is the wrong tool for escrow milestone triggers (right tool if you later want counterparty/vessel sanctions screening). Runner-up guesses: MarineTraffic/Kpler (generic "the maritime tracking site"), Windward (maritime-AI risk analytics), Loginno ("log-" prefix, but it sells container IoT hardware) [TK]. Recommend confirming with the user: "Did you mean Lloyd's List Intelligence?"

---

## (D) MILESTONE → EVENT MAP

Escrow stages map to the existing 9-stage shipment pipeline in `lib/services/shipment-stages.ts` (stage 6 = Container Stuffing requires `container_number` + `container_seal_number`; stage 7 = Departure requires `actual_departure_date` + `bill_of_lading_number`; stage 8 = Arrival). Event codes below are DCSA vocabulary, which the aggregators normalize to near-equivalents.

| Escrow milestone | Trigger event | Source of truth | Trust level | Notes / anti-fraud |
|---|---|---|---|---|
| Funds held | Internal: `createEscrow()` hold tx | OriginTrace | n/a | Already implemented |
| Gate-in origin port | Equipment event **GTIN** (classifier ACT) at POL terminal | Carrier via aggregator | Carrier-confirmed, but origin-terminal timestamps at Apapa/Tin Can/Tema can lag or be missing [TK] | Keep this tranche small; require container check-digit-valid ISO 6346 number matched to a subscription you created, not a global lookup |
| On board + B/L issued | **LOAD** (ACT) at POL **and/or** shipment event **B/L ISSU** | Carrier | **Strongest trigger** — mirrors the legal "shipped on board" endorsement | Best milestone for the largest pre-arrival tranche; cross-check BL number ↔ carrier SCAC |
| Vessel departed | Transport event **DEPA** (ACT) for the POL | Carrier; corroborate with Kpler/MarineTraffic port-call event (AIS) | Carrier-confirmed; AIS-inferred as secondary | Release only on ACT, never EST/PLN. Watch **rolled cargo**: booking moved to a later vessel emits revised events — re-baseline on vessel/voyage change instead of releasing |
| Transhipment (e.g., Algeciras/Tangier/Lomé [TK]) | DISC + LOAD pair at T/S port | Carrier | Carrier-confirmed | Recommend **tracking, not releasing** here — transshipment is where container/vessel substitution and event noise concentrate |
| Discharged destination | **DISC** (ACT) at POD | Carrier/destination terminal | Carrier-confirmed; EU/China/UAE terminal data quality is high | Good release point; corroborate with vessel ARRI |
| Delivered / gate-out | **GTOT** (ACT) at POD terminal; final door delivery | Terminal (gate-out) / trucker or consignee (delivery) | Gate-out: carrier/terminal-confirmed. Door delivery: often **self-reported** | Weakest link — keep the **final tranche on manual dual-confirmation** (existing `escrow_disputes.exporter_confirmed` + `buyer_confirmed` gate), with gate-out as supporting evidence |

Cross-cutting anti-fraud rules: (1) container numbers are **reused every voyage** — always match events to your (provider, subscription/reference id, expected voyage window), never to bare container number; (2) accept only ACT-classified events; (3) apply a 24–48h settlement delay before money moves — carriers issue corrections; (4) require two-source agreement (aggregator + carrier-direct or AIS corroboration) for tranches above a configurable amount; (5) exporter-typed data (`container_number`, `bill_of_lading_number`) is an *input* to matching, never itself a trigger; (6) any open dispute freezes automation (already enforced in `releaseMilestone()` — it throws on `status === 'disputed'`).

---

## (E) ORIGINTRACE INTEGRATION SKETCH

Grounded in the actual repo:

1. **Webhook receiver** — `app/api/webhooks/terminal49/route.ts` (or `vizion`), mirroring `app/api/webhooks/paystack/route.ts` exactly: read raw body → verify provider signature/shared secret (Paystack pattern uses HMAC-SHA512 via `verifyWebhookSignature`; Terminal49 signs webhook notifications — confirm header name in their docs [TK]) → parse → `createAdminClient()` → process → **always return 200** to stop retries. No `getAuthenticatedProfile` — this folder authenticates by signature by design (per CLAUDE.md).
2. **Subscription/matching table** (new migration in `supabase/migrations/`): `tracking_subscriptions (id, org_id, shipment_id FK, provider, provider_reference_id UNIQUE, container_number, bl_number, carrier_scac, status, created_at)`. Create the subscription (POST to the provider) when stage 6 sets `container_number` (fields + partial indexes on `shipments.container_number` / `bill_of_lading_number` / `vessel_name` already exist via `supabase/migrations/20260402_shipment_logistics_fields.sql`). Match inbound events by `provider_reference_id` → `shipment_id`, never by global container lookup (reuse risk). Verify live schema before coding (schema-verify skill) per project rules.
3. **Idempotent event store**: `shipping_events (id, org_id, shipment_id, provider, provider_event_id, event_code, classifier, location_locode, event_time, raw jsonb)` with `UNIQUE (provider, provider_event_id)`; insert with `ON CONFLICT DO NOTHING`. Money-layer idempotency already exists: `releaseMilestone()` in `lib/services/escrow.ts` refuses re-release via the `milestone.released_at` check and refuses on dispute/`status !== 'active'`.
4. **Trigger engine**: a config map `event_code → pipeline stage → milestone_id`; on a stored ACT event, load escrow via `getEscrowStatus(shipmentId)`, skip if `hasOpenDispute`, optionally enforce the settlement delay, then call `releaseMilestone({escrowId, milestoneId, actorId: SYSTEM_ACTOR, orgId})`. It already writes the immutable `escrow_transactions` ledger row, `logAuditEvent('escrow.milestone_released')`, and `dispatchWebhookEvent('escrow.released')`. Add `metadata.source_event_id` to the audit call for traceability. The same event can auto-fill `actual_departure_date` / `actual_arrival_date` used by the stage-7/8 gates in `shipment-stages.ts`.
5. **Blocker to fix first**: `EscrowMilestone.stage` is currently `string | number` because two callers disagree (`app/api/escrow/route.ts` uses numeric stage 1–9; `payment-setup` uses free text like `'on_delivery'` — documented in `lib/types/escrow.ts`). Automation needs one canonical scheme; normalize to the numeric pipeline stage.
6. **Polling fallback**: an `app/api/cron/` job (Bearer `CRON_SECRET` pattern) that re-fetches subscriptions with no events in N days — covers missed webhooks and poll-only carrier-direct APIs. Note Vercel Hobby cron limits (per CLAUDE.md).
7. **Human override stays**: auto-release covers early/mid milestones only; the final tranche and any anomaly (rolled vessel, event regression, two-source disagreement) routes to the existing dual-confirmation dispute gate (`escrow_disputes.exporter_confirmed && buyer_confirmed`), which already blocks `releaseMilestone`.

---

## (F) UNVERIFIED ITEMS (verify before contracting)

- All **[TK]** rows above, especially: Terminal49/Vizion **per-container $ figures**; Vizion's exact event-code list; Shipsgo/Portcast/project44/SeaRates/GoComet details (entire entries are training-knowledge); Terminal49 webhook signature mechanism.
- Aggregator **event completeness at Apapa/Tin Can/Lekki/Tema/Abidjan specifically** — no vendor publishes this; demand a paid pilot on 20–50 real containers on your lanes before wiring money to events. (The 3 killed research agents were tasked with exactly this; nothing came back.)
- Carrier developer-portal onboarding terms (customer-only? fees? push support?) for Maersk/MSC/CMA CGM/Hapag; CMA CGM API charging.
- West-Africa port systems: Nigeria PCS status, Eto, ICUMS (Ghana Link/UNI-PASS, replaced GCNet ~2020), Abidjan single window — all [TK]; my strong prior (also [TK]) is **none offer third-party APIs** and port-authority data is only reachable via carriers/terminal operators, i.e., via the aggregators.
- eBL: WaveBL/Bolero/ICE Digital Trade (ex-essDOCS) event-API availability to non-transacting third parties (likely **not** available — closed networks), Bolero's current ownership, DCSA eBL 3.x status, FIT Alliance adoption %, all [TK]. Treat "B/L ISSU" from the *carrier T&T API* as the practical proxy instead.
- Terminal operator direct feeds (APM Terminals API program) [TK].

Sources: [Maersk TradeLens discontinuation](https://www.maersk.com/news/articles/2022/11/29/maersk-and-ibm-to-discontinue-tradelens), [Supply Chain Dive – TradeLens shutdown](https://www.supplychaindive.com/news/Maersk-IBM-shut-down-TradeLens/637580/), [DCSA conformance](https://dcsa.org/standard-conformance), [DCSA T&T documentation](https://dcsa.org/standards/track-and-trace/standard-documentation-track-and-trace), [Splash247 – carriers adopting DCSA T&T](https://splash247.com/top-carriers-adopting-dcsa-track-and-trace-standards/), [Vizion API overview](https://www.vizionapi.com/container-tracking/api-overview), [Vizion docs – plans](https://docs.vizionapi.com/docs/plans), [Vizion pricing](https://www.vizionapi.com/container-tracking/pricing), [Terminal49 container tracking API](https://terminal49.com/container-tracking-api), [Terminal49 webhooks](https://terminal49.com/docs/api-docs/api-reference/webhooks/create-a-webhook), [Terminal49 API pricing](https://terminal49.com/api-pricing), [Kpler MarineTraffic data services](https://www.kpler.com/product/maritime/data-services), [MarineTraffic AIS API docs](https://servicedocs.marinetraffic.com/), [MarineTraffic container tracking](https://container-tracking.marinetraffic.com/), [Data Docked AIS API comparison](https://datadocked.com/ais-api-providers), [Lloyd's List Intelligence Seasearcher](https://www.lloydslistintelligence.com/solutions/seasearcher), [LLI API docs](https://apidocs.lloydslistintelligence.com/), [LLI API solutions](https://www.lloydslistintelligence.com/solutions/api)
---

## (G) MVP skeleton — BUILT (2026-07-09)

Implemented on this branch, provider-agnostic (Terminal49/Vizion slot in as adapters later):

| Piece | Where |
|---|---|
| Tables `tracking_subscriptions` + `shipping_events` (RLS, idempotency constraints) | `supabase/migrations/20260709_shipping_event_tracking.sql` — **applied to the live DB**; types regenerated |
| Trigger engine (pure decision fn + ingest + processor + cron sweep) | `lib/services/shipping-events.ts` |
| Provider webhook receiver with adapter registry (`mock` HMAC adapter shipped) | `app/api/webhooks/tracking/[provider]/route.ts` |
| Subscription API (GET/POST, role-gated, audit-logged) | `app/api/shipments/[id]/tracking/route.ts` |
| Manual event recording (ops path + E2E test path, admin-only) | `app/api/shipments/[id]/tracking/events/route.ts` |
| Settlement-window sweep | `app/api/cron/tracking-sync/route.ts` (Bearer CRON_SECRET; NOT in vercel.json — Hobby cron cap; schedule via GH Action) |
| Decision-matrix tests (21) | `tests/shipping-events.test.ts` |

**Safety invariants encoded:** ACT-only; stages 6–8 only (stage 9/delivery permanently manual via dual-confirmation); auto-release opt-in per subscription; settlement delay (default 24h, `TRACKING_SETTLEMENT_DELAY_HOURS`); dispute freeze; no-double-release; releases attributed to the subscription creator (`auth.users` FK — no system user); events matched by provider reference, never bare container number.

**New env vars:** `TRACKING_WEBHOOK_SECRET` (HMAC key for the `mock` webhook adapter; unset = adapter rejects everything), `TRACKING_SETTLEMENT_DELAY_HOURS` (optional, default 24).

**Milestone stage normalization:** the engine accepts both numeric stages (1–9) and the legacy payment-setup labels (`on_delivery` → 9 etc.) via `normalizeMilestoneStage()`; unknown labels are never automated.

**Next step (deferred by design):** wire Terminal49 — add an adapter in the webhook route (their signature scheme + payload mapping), POST subscriptions to their API on stage-6 container assignment, and run the 20–50-container pilot before enabling `auto_release_enabled` on real escrows.
