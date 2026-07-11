# Importer Funnel & Escrow Positioning — Implementation Plan

_2026-07-10. Status: **AWAITING APPROVAL — no building until signed off.** Companion to docs/CONTENT-STRATEGY.md and docs/ESCROW-SHIPPING-APIS.md._

## 0. Why this plan exists

The `/importers` landing page (v1) was shipped before a full touchpoint review. That review has now been done, and it changes things: the funnel endpoint v1 uses is wrong for the persona, the page under-covers regions, and the escrow story is framed backwards. This plan covers every touchpoint, sequences the work, and flags the decisions only the founder can make.

## 1. Ground truth (verified in the codebase, 2026-07-10)

| Finding | Evidence |
|---|---|
| Homepage is 100% exporter-voiced | h1: "Know you're compliant before you export." No persona routing anywhere above the fold |
| `/demo` assumes the visitor is an exporter | Benefit copy: "We map **your export destinations**…"; form has no buyer/importer persona field |
| All 8 importer-post CTAs point to `/demo` | 4 buyer-facing posts × 2 CTAs each → an importer convinced by "verify your supplier" lands on exporter copy. Funnel breaks at the last step |
| **Buyer self-registration was deliberately removed** | `app/auth/buyer-register/page.tsx` → `redirect('/auth/login')`; API states "buyer organisations are provisioned by the superadmin." ⚠ Any plan that says "point CTA at buyer-register" is invalid |
| A full buyer product exists behind login | `app/app/buyer/{suppliers, shipments, contracts, tenders, documents, traceability, analytics}` + `app/api/buyer/*` — invisible from marketing |
| Compliance pages exist for all 5 regimes | `compliance/{eudr, uk, usa, china, uae}` — v1 importers page only cards 3 of them (EU, UAE, China) |
| `/importers` v1 is live | Solutions-pattern page; CTAs → `/demo`; escrow section framed as buyer protection only |

## 2. Decisions required before building (D1–D3)

**D1 — Buyer acquisition endpoint.** Since self-serve buyer signup is removed, the funnel must end somewhere real:
- **(a) Recommended: buyer-aware `/demo`.** Add an "I am a…" persona selector (exporter / importer–buyer) to the demo form + a `?role=buyer` variant of the page copy. Buyer submissions route to the existing lead flow (contact API/HubSpot) and the superadmin provisions the buyer org after the call — matching how the product actually works today. Zero product/schema change; honest CTA copy ("Request buyer access — we set up your workspace").
- (b) Reinstate self-serve buyer registration — a product/security decision (it was removed on purpose), not a marketing patch. Out of scope unless you choose it.
- (c) A separate stand-alone "request buyer access" form — more surface to maintain than (a) for the same outcome.

**D2 — Escrow narrative (corrected).** Approve the §3 story as the canonical positioning before any copy is written.

**D3 — URL.** `/importers` is already live and in the sitemap. Recommend keeping it (renaming to `/for-importers` costs a redirect and re-indexing for zero gain).

## 3. Escrow: the corrected story (dual-sided, exporter-first)

**Correction (2026-07-10):** the version of this section in the original draft (never signed off — caught in review) claimed escrow is "LC-grade" and that LCs "typically pay against documents late in the cycle." That's not accurate enough to ship. A *sight* LC actually pays close to shipment time against compliant documents — that's the LC's core selling point, and it's roughly as fast as what escrow offers. The real LC pain points are more specific than "slow": (1) **usance/deferred LCs** (30–180 days post-shipment) are what buyers negotiate specifically to defer their own cash outlay — that's where the long wait actually comes from, not LCs as a category; (2) **documentary discrepancy risk** — banks reject LC drafts over trivial mismatches under the "strict compliance" doctrine, and a rejected or amended presentation costs real time and money, a well-known and underappreciated friction point for African SME exporters; (3) **confirming-bank fees**, when the exporter's bank doesn't trust the issuing bank's country risk — a real, but not "punitive," cost. Escrow is also not a structural substitute for an LC: an LC substitutes the *issuing bank's* creditworthiness for the buyer's own, so the exporter gets paid even if the buyer hasn't moved cash yet. OriginTrace escrow requires the buyer to fund it *before* anything ships — economically closer to secured prepayment than to a bank credit facility. **Do not claim credit substitution — we don't offer it.**

**The actual problem being solved:** open-account terms (no LC, no escrow — just an invoice and trust) leave the exporter waiting until the buyer chooses to pay, commonly **months** depending on route and negotiated terms — which locks down working capital exactly when the exporter needs cash to buy next season's crop. A sight LC solves the payment-timing problem but is expensive and slow to arrange, and still exposes the exporter to discrepancy-driven rejection even after the goods have shipped. Escrow is aimed at buyers and exporters who've decided a bank-guaranteed credit facility isn't the friction they're actually solving for — they already trust each other's capital, just not yet each other's performance.

**What OriginTrace escrow does:** the buyer funds escrow at contract — real funds, held, not a bank's promise — and milestones release against **verified shipping events** (gate-in, loaded on board + B/L, discharge), so the exporter gets paid close to shipment rather than waiting for the goods to land. The buyer pays on carrier-confirmed proof, not on the exporter's word, and the final tranche always stays behind dual confirmation.

**Positioning line:** *Skip the LC paperwork, not the LC-level trust.* Not "as good as an LC on speed" — **cheaper and faster to arrange than one**, without confirming-bank fees, correspondent-banking delays, or discrepancy-rejection risk, and (when funded via USDC) settlement is near-instant rather than the days-to-weeks a wire transfer or LC issuance can take. Escrow complements formal terms rather than replacing them outright — an enterprise deal with real financing needs can still run an LC alongside — but for SME lanes where the real ask is "prove it happened, then pay," it removes the LC machinery without giving up the payment-on-proof guarantee.

**Copy consequences (both personas, everywhere escrow is mentioned):**
- Exporter-facing: "Get paid when the container is loaded — not when it lands, and without the LC paperwork." Working-capital framing first; never claim escrow substitutes for buyer financing.
- Buyer-facing: "Pay on proof, not promises" stays — but add *why suppliers accept it*: your best suppliers prefer buyers whose money releases at verified milestones over buyers who ask for 90-day usance LC terms; it makes you the customer they prioritize.
- Never imply escrow releases without evidence, never name payment providers (standing rule), and **never claim escrow is a credit facility or a bank-backed guarantee** — it's pre-funded, not bank-guaranteed.

⚠ **Accuracy rule (same bar as §7):** the open-account wait-time figure and any specific LC fee/cost claims need a real source (trade-finance literature, or your own deal history) before they ship as hard numbers. Use qualitative framing ("commonly months," "a real but variable cost") until a source is found — the previous draft's "3–4 months" and "90–120-day wait" were asserted, not sourced, and should not go into copy as precise figures.

## 4. Touchpoint matrix

Every surface the importer funnel + escrow narrative touches. "Phase" refers to §5.

| # | Touchpoint | Current state | Change | Phase |
|---|---|---|---|---|
| T1 | `/demo` page + `DemoFormWidget` | Exporter-only copy, no persona field | Persona selector in form; `?role=buyer` copy variant (hero, benefit bullets); lead routing carries persona (contact API/HubSpot property) | P1 |
| T2 | `/importers` v2 | 3 region cards; escrow = buyer-protection framing; CTAs → `/demo` | Add **UK** (Environment Act/UKTR) + **USA** (FSMA 204, Lacey) cards → all 5 regimes covered, each linking its compliance page; rewrite escrow section per §3 (dual-sided); CTAs → `/demo?role=buyer` per D1(a); add FAQ + FAQ schema | P1 |
| T3 | Homepage | Exporter-only hero | Minimal persona routing: secondary "I'm a buyer / importer →" link under the hero CTA → `/importers`. No hero rebuild | P1 |
| T4 | 4 importer blog posts (8 CTAs) | All → `/demo` | Mid-article CTA → `/demo?role=buyer`; end CTA (onboarding play) → `/importers` | P1 |
| T5 | Nav + footer + sitemap | Done in v1 ("For Importers") | No change; verify in E2E smoke | P1 (verify) |
| T6 | Pedigree page "For Buyers" card | Text-only | Link the card to `/importers` | P2 |
| T7 | `/solutions` | Exporter-voiced | One cross-link block: "Buying, not selling? → For Importers" | P2 |
| T8 | Compliance pages (5) | Exporter-voiced | Small "For importers" callout linking `/importers` (each page already gets buyer impressions per GSC: UK 729, NL 774, DE 720) | P2 |
| T9 | Escrow copy — exporter side | No marketing mention of "paid at loading" | New solutions-page payments blurb + one exporter-facing blog post: "Skip the LC paperwork: milestone escrow for exporters" (§3 framing — cost/friction comparison, not a speed-superiority claim; no hard wait-time figure without a source) | P2 |
| T10 | Escrow copy — buyer side | `/importers` v1 section + D-posts | Align to §3; add buyer-facing post "Escrow vs Letter of Credit for African Commodity Trades" (strategy addendum — new topic; must state plainly that escrow doesn't substitute for LC-style credit financing, only for the paperwork/cost/discrepancy-risk overhead) | P2 |
| T11 | `verify-nigerian-exporter-legitimacy` payment section | Mentions LC/escrow briefly | Align with §3 + link the escrow posts when they exist | P2 |
| T12 | docs (CONTENT-STRATEGY §4, BLOG-STYLE-GUIDE CTA table) | CTA guidance predates D1 | Update importer CTA endpoints + add escrow-narrative rules | P1 |
| T13 | Tests | No `/importers` coverage | Playwright smoke: `/importers` renders, nav link works, demo form persona selector submits (structural/`data-testid` assertions only — no copy assertions) | P1 |
| T14 | Analytics/measurement | GSC per-geo targets defined | Add: `/importers` sessions by geo, demo submissions by persona (HubSpot property), blog→importers→demo path | P3 |
| T15 | Superadmin buyer-provisioning runbook | Implicit | One-pager: what happens after a buyer demo request (who provisions, SLA) — else the funnel dead-ends operationally. **Done: `docs/BUYER-PROVISIONING-RUNBOOK.md`.** | P1 |

## 5. Phases & gates

- **P0 — Approval (you).** Decide D1 (recommend a), D2 (approve §3), D3 (recommend keep `/importers`).
- **P1 — Fix the funnel (one PR-sized batch).** T1, T2, T3, T4, T5, T12, T13, T15. Gate: `npm run preflight` + Playwright smoke green + a manual walkthrough of the full path (blog post → /importers → /demo?role=buyer → form submit with persona) before push.
- **P2 — Narrative depth.** T6–T11 (cross-links + the two escrow posts + copy alignment). Gate: style-guide review pass on both posts; regulation facts re-verified per CONTENT-STRATEGY §5.
- **P3 — Measure & iterate.** T14; review after 4 weeks of GSC/HubSpot data; iterate titles/CTAs on the same kill/iterate rule as the content strategy (<1% CTR at >1k impressions → rework).

## 6. Risks & rollbacks

- **Demo form changes touch the live lead flow** (highest-blast-radius item): persona field must be additive/optional so existing exporter submissions are untouched; verify the contact API accepts the new field before deploying; rollback = remove field, variant copy is param-gated so default page is unchanged.
- **Blog CTA repoints are trivially reversible** (content files only).
- **No schema/product changes in P1** under D1(a) — the only ops dependency is T15 (someone must actually provision buyer orgs).
- **Out of scope until explicitly decided:** reinstating self-serve buyer registration; any change to escrow *mechanics* (the engine is built and hardened; this plan only changes how it's *told*).

## 7. Regional compliance coverage on `/importers` v2 (T2 detail)

Five cards, one per regime the buyer answers to, each with its verified hook and link:
1. **EU** — EUDR liability (30 Dec 2026, 4% fines) + food-safety border controls (2019/1793: sesame 50% checks) → `/compliance/eudr`
2. **UK** — UK deforestation due diligence under the Environment Act (in force schedule to be re-verified before copy is written) + FSA import controls → `/compliance/uk`
3. **USA** — FSMA 204 traceability rule + Lacey Act declarations → `/compliance/usa`
4. **China** — GACC Decree 248, enforcement live since June 2026 → `/compliance/china`
5. **UAE/GCC** — Dubai Municipality FIRS clearance + re-export inheritance ("origin follows the goods") → `/compliance/uae`

⚠ Accuracy rule: UK/USA hooks above are from the existing compliance pages' claims — re-verify dates/status against primary sources before the cards ship (same discipline as the blog work; UK timber/forest-risk commodity regulations have shifted repeatedly).
