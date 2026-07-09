# OriginTrace Blog Style Guide

_Every blog post — new or updated — follows this guide. The goal chain: readable, conversational content → longer time on page → CTA clicks → demo requests. Companion to docs/CONTENT-STRATEGY.md._

## Voice

Write like a knowledgeable trade-compliance friend explaining something over coffee — not a regulator, not a brochure, not an AI.

- **Talk to one reader.** "You" and "your shipment", not "exporters should ensure that their consignments…"
- **Use contractions.** It's, you'll, don't, here's. Their absence is the #1 robotic tell.
- **Short sentences win.** Average under 20 words. One idea per sentence. If a sentence has two commas and an "and", split it.
- **Open with the reader's problem, not the regulation.** Bad: "Regulation (EU) 2019/1793 establishes increased official controls…" Good: "If you ship sesame from Nigeria to Europe, there's a 50% chance your container gets pulled for testing. Here's how to make sure it passes."
- **Concrete beats abstract.** Name the port (Rotterdam, Apapa), the agency (NEPC, NAFDAC, Dubai Municipality), the cost (demurrage per day), the form (NXP, CHED-D). Numbers and named things hold attention.
- **It's fine to have a view.** "Honestly, this rule catches almost everyone off guard" builds more trust than neutral hedging.
- **Vary rhythm.** Follow a long explanatory sentence with a short punch. Like this.
- **No filler transitions** ("Moreover", "Furthermore", "It is worth noting that", "In today's fast-paced world", "navigating the complex landscape"). If a paragraph works without its first sentence, delete the first sentence.
- **Explain jargon on first use, once, in plain words.** "A due diligence statement (DDS) — basically a signed declaration to the EU that your product didn't come from deforested land."

## Structure (scannability = time on page)

- **Hook in the first two paragraphs**: the reader's pain + what they'll walk away with. No throat-clearing.
- An `h2` every 150–250 words. Question-phrased headings where natural ("Who actually files the DDS?") — they match search queries and read conversationally.
- **Break up text walls** with the section types: `callout` (info/warning/tip/deadline) for the thing people screenshot, `table` for anything comparative, `bullets`/`numbered` for steps and checklists, `image` for visual pacing.
- **Inline images**: 1–2 per long post from `/public/images/` (ports, farmers, warehouses — pick one that matches the topic; reuse of existing images is fine). Always a real `alt`; caption optional but nice.
- **End with a `faq` section** (3–5 questions) phrased the way people actually search — it renders FAQPage schema automatically and catches long-tail queries.
- **`references` section last** when the post cites regulations — CELEX numbers and official links. Precision is our differentiation; competitors don't cite properly.
- 1,200–2,000 words for guides; shorter is fine for updates. Reading time field ≈ words/230.

## Conversion (the actual point)

- **Two CTAs per post, persona-matched**, using the `cta` section type:
  - One **mid-article**, right after the pain is most vivid (e.g. after the rejection-costs section).
  - One at the end.
- CTA copy by persona (vary wording, keep the promise):
  - **Exporters**: "See how ready your next shipment is" / "Get your farms mapped and your documents in one place" → `/demo`
  - **EU importers**: two-step funnel — mid-article: "Verify a supplier before you commit — request a supplier risk snapshot"; end: **the onboarding play** — "Bring your suppliers onto OriginTrace" (importers onboard their exporters and make on-platform documentation part of the order: farm records, lab tests, compliance docs, shipment tracking, visible from the buyer workspace). Verification is the hook; onboarding is the product motion.
  - **UAE importers/re-exporters**: mid: "One data pack for Dubai, the GCC, and the EU — see it live"; end: "Onboard your origin suppliers" (same onboarding play, re-export framing)
- CTA text sells the outcome, never the feature. "Stop losing containers at Rotterdam" beats "Explore our compliance module."
- **Link the money page early**: a natural in-text link to the relevant `/compliance/*` page within the first third of the post, plus 1–2 links to related posts. Not just the bottom CTA.

## Accuracy rules (non-negotiable)

- Cite regulations by number and date the first time (Reg (EU) 2023/1115; Reg (EU) 2025/2650; CIR 2019/1793; CIR 2025/1093). After that, use the plain name.
- **EUDR applies to cocoa (and coffee, palm, soy, rubber, wood, cattle). It does NOT apply to sesame or ginger.** Never imply otherwise.
- EUDR dates (as of July 2026): large/medium operators **30 Dec 2026**; micro/small **30 June 2027** (second delay, Reg 2025/2650). Ghana = low risk; Nigeria & Côte d'Ivoire = standard risk (CIR 2025/1093).
- Facts flagged "unverified" in docs/CONTENT-STRATEGY.md §5 must be hedged ("as of the January 2026 update…", "check the current annex before you ship") or omitted — never stated flat.
- Dates age content. Prefer "as of mid-2026" over bare "now"; set `dateModifiedISO` on any substantive update.

## Mechanics

- Posts live in `content/blog/<slug>.ts` exporting `post: BlogPost` (type in `lib/blog.ts`), registered in `content/blog/index.ts`.
- Keep the existing `slug` when updating a post — the URL holds the ranking equity. Retitle freely.
- `title` ≤ ~60 chars where possible, benefit-led; `description` ≤ ~155 chars, written as the SERP snippet (lead with the pain, end with the promise).
- Escape apostrophes in single-quoted TS strings (`\'`) — or use double quotes.
- Never mention payment-provider brand names (Paystack, Blockradar, Grey, Leatherback).
