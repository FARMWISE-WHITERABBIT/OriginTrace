---
name: marketing-page
description: >
  Use this skill when creating or modifying any page under app/(marketing)/ —
  landing, solutions, industries, compliance (EUDR/UK/USA/China/UAE), pedigree,
  processors, demo, blog. Triggers for "marketing page", "landing page",
  "compliance page", "industry page", "hero section", "design system",
  "marketing.css", "new compliance framework page", or "match the EUDR pattern".
  These pages were rebuilt repeatedly (marketing.css is the most-churned file in
  the repo) because there was no shared template and pixel geometry was tweaked
  by iteration. Follow the design system and reuse components instead of
  copy-pasting JSX.
---

# Marketing Page Skill

Canonical rules live in `CLAUDE.md` → "Marketing Website Design System" and in
`app/marketing.css`. Read those first. This skill is the working checklist.

## Never do

- **Never set `max-width` inline** on a section — use a `.mk-container*` class.
- **Never write ad-hoc button styles** — use `.btn-mk-*`.
- **Never put `style={{ gridTemplateColumns }}` inline** — CSS can't override it
  without `!important`, which caused repeated mobile-layout churn. Put columns in
  a CSS class; keep only dynamic values (e.g. `order`) inline. (`aa201bc`)
- **Never add `overflow:hidden`** to a child that must scroll horizontally (the
  layout already wraps pages in `overflow-x-hidden`).
- **Never suffix `metadata.title` with `| OriginTrace`** — the layout template
  adds it.

## Reuse, don't re-author

Section components already exist in `components/marketing/` (hero-background,
faq-section, compliance-calculator, blog-carousel, stat-counter, motion, …).
Compose those. A new compliance/industry page should mirror
`app/(marketing)/compliance/eudr/page.tsx` — copy its **structure**, swap the
content, keep the shared components. Don't rewrite 300 lines of bespoke JSX.

## Tests

Marketing E2E specs broke repeatedly because they asserted exact heading copy
(`99aecf6`). When adding test hooks, assert on **structure / `data-testid`**,
not literal marketing text. Marketing copy changes often; structure doesn't.

## Before pushing

Marketing changes have broken the Vercel build before — run the
`vercel-preflight` skill (`npm run build`), not just `tsc`.
