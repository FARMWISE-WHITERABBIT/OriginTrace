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

**The actual problem being solved:** trade today runs on letters of credit or formal payment terms — and for African SME exporters both fail the cash-flow test. An LC is expensive to obtain, slow to negotiate, often needs confirmation by a second bank at punitive rates, and still typically pays against documents late in the cycle; open-account terms mean the exporter waits **3–4 months** — until the shipment reaches the importer — before seeing money. That waiting **locks down working capital**: the exporter can't buy the next season's crop while this season's cash sits on the water.

**What OriginTrace escrow does:** the buyer funds the escrow at contract; milestones release against **verified shipping events** — gate-in, loaded on board + B/L, discharge — so the exporter receives most of the shipment's value **at loading, not at arrival**. The buyer, in turn, pays on carrier-confirmed proof rather than trust, and always holds the final tranche behind dual confirmation.

**Positioning line:** *LC-grade assurance, milestone-speed cash flow.* Escrow complements formal terms (an enterprise deal can still run an LC alongside) but for SME lanes it replaces a 90–120-day wait with event-triggered releases.

**Copy consequences (both personas, everywhere escrow is mentioned):**
- Exporter-facing: "Get paid when the container is on the water — not when it lands." Working-capital framing first.
- Buyer-facing: "Pay on proof, not promises" stays — but add *why suppliers accept it*: your best suppliers prefer buyers whose money releases at verified milestones; it makes you the customer they prioritize.
- Never imply escrow releases without evidence, and never name payment providers (standing rule).

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
| T9 | Escrow copy — exporter side | No marketing mention of "paid at loading" | New solutions-page payments blurb + one exporter-facing blog post: "Stop waiting 120 days to get paid: milestone escrow for exporters" (§3 framing; LC comparison table) | P2 |
| T10 | Escrow copy — buyer side | `/importers` v1 section + D-posts | Align to §3; add buyer-facing post "Escrow vs Letter of Credit for African commodity trades" (strategy addendum — new topic) | P2 |
| T11 | `verify-nigerian-exporter-legitimacy` payment section | Mentions LC/escrow briefly | Align with §3 + link the escrow posts when they exist | P2 |
| T12 | docs (CONTENT-STRATEGY §4, BLOG-STYLE-GUIDE CTA table) | CTA guidance predates D1 | Update importer CTA endpoints + add escrow-narrative rules | P1 |
| T13 | Tests | No `/importers` coverage | Playwright smoke: `/importers` renders, nav link works, demo form persona selector submits (structural/`data-testid` assertions only — no copy assertions) | P1 |
| T14 | Analytics/measurement | GSC per-geo targets defined | Add: `/importers` sessions by geo, demo submissions by persona (HubSpot property), blog→importers→demo path | P3 |
| T15 | Superadmin buyer-provisioning runbook | Implicit | One-pager: what happens after a buyer demo request (who provisions, SLA) — else the funnel dead-ends operationally | P1 |

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
