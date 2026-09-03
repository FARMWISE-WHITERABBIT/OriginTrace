# Orchestrator — Standing Implementation Rules for OriginTrace

**Read this before scoping, planning, or implementing any non-trivial change in this repo.** It exists because
unverified claims of "done" have shipped real defects here before — most recently, a farmer-registration
regression that traced back to a migration that was committed to the repo, compiled cleanly, typechecked cleanly,
and was never actually applied to production (see the Log at the bottom). Nothing in this codebase's tooling
would have caught that before this document and the CI jobs it describes existed. This is the countermeasure:
nothing is accepted as true — including your own prior output in the same session — until it is checked against
the actual code, schema, config, or running system.

This file has two parts: a **project-agnostic core** (rules that apply to implementation work generally) and an
**OriginTrace appendix** (bug classes and evidence mechanics specific to this repo, built from real incidents —
not invented from general knowledge of the stack). Read both. If you're an agent working across multiple
repos, the core section is the part worth carrying with you; the appendix is what makes it concrete here.

---

## Part 1 — Core rules

### Prime directive

Nothing is done because someone said it's done, including you, a minute ago, in the same turn. Every claim
("this fixes X," "this is now visible," "the migration applied cleanly") is a hypothesis until independently
checked against the live artifact it's a claim about: the code, the schema, the running page, the CI output, the
config.

### Step 0: Triage risk before doing anything

Not every change earns the same evidentiary bar, and pretending otherwise is how the ritual gets skipped under
time pressure. Classify the change before starting:

- **Trivial** (copy change, styling, a log message, a comment) — read the file you're changing, make the change,
  confirm it renders/compiles. No formal verification log needed.
- **Moderate** (new feature on an existing pattern, a bug fix, a non-destructive schema addition) — full "before
  implementing" and "evidence standards" sections below apply. Verification log required.
- **High-risk** (anything touching auth/access control, payments, data deletion or migration, the production
  database, a public API contract, or anything named in the OriginTrace appendix below as previously-burned
  territory) — everything in "moderate," plus the hard gates below apply, plus independent adversarial
  verification (see Delegation) where feasible.

If you're unsure which tier a change is in, treat it as one tier higher, not lower. State the tier you assigned
and why, so it can be challenged.

### Before implementing: locate, don't assume

The most common failure mode in this repo is building or fixing the right thing in the wrong place, or against a
stale mental model of where things live. Before writing code:

1. **Find where the user will actually encounter this**, not where it logically "should" go. Read the actual
   nav/routing/entry point — grep for the literal user-facing label or the literal request path, don't infer
   from a file or route name that it matches. (See the OriginTrace appendix: `app/api/farmers/route.ts` is
   GET-only despite the name; the real farmer-creation endpoint is `app/api/farms/route.ts`.) A
   technically-correct but unreachable or wrongly-targeted location is a shipped defect, not a completed feature.
2. **Read the full data or interface contract you're about to consume**, not just enough to get the first field
   working. A schema, view, RPC, or API response with N fields and a consumer that only handles N-1 will compile
   clean and look correct in the one case you tested.
3. **Check this repo's stated conventions first** — this file, `CLAUDE.md`, `agents.md`, the relevant
   `.agents/skills/*.md` — in case the pattern already exists elsewhere in a different shape. Grep for an
   existing shared schema/type/helper before writing a new local one; a file explicitly commented as the shared
   source of truth can still be orphaned and unused (see appendix) — check who actually imports it, don't trust
   the comment.

### The verification loop (required for moderate and high-risk work)

Plan → Implement → Verify → Log → Report. The verify and log steps are not optional narration — they produce an
artifact, because prose discipline alone is what already failed here before.

For every claim you're about to make in your completion report, write one line in this shape before you write
the report:

```
CLAIM: <what you're about to assert is true>
METHOD: <how you checked it — not how you'd check it, what you actually did>
RESULT: <what you observed>
```

If you can't fill in METHOD with something concrete ("read the schema," "ran the query," "hit the endpoint and
inspected the response"), the claim isn't verified yet — go verify it or report it as unverified. "I reasoned
through the code and it looks correct" is not a METHOD.

When multi-part work is being reported complete, walk back through every part of the original ask individually
against this log. Partial completion reported as full completion is the specific failure mode this file exists
to prevent.

### Evidence standards by claim type

- **"This field/column/value exists and is written correctly"** — verified via a direct schema or data read
  (`information_schema`, generated types cross-checked against a live read, or the equivalent) plus an actual
  read-back, not by re-reading the code you just wrote that's supposed to produce it.
- **"This error is now handled"** — verified via a forced-failure test that proves the failure is now visible,
  not by reading the code and reasoning that it looks handled.
- **Access-control / RBAC changes** — verified with POSITIVE and NEGATIVE tests: an authorized caller still
  succeeds AND an unauthorized caller is now blocked. One without the other is not verification.
- **Migrations / schema changes** — tested against a real or branched environment where feasible (a
  rollback-wrapped transaction against the live DB, or a fresh local `supabase start` replay), with a way to
  prove failure surfaces as a different, unambiguous error, and rollback guaranteed either way.
- **UI/feature-placement claims ("this is now visible on X")** — verified by reading the actual page/screen the
  user will land on and confirming the new code is reachable from there, not by confirming the component you
  wrote is syntactically correct.
- **Third-party integration/webhook claims ("this is now handled/synced")** — verified against an actual call or
  received payload, including the failure and retry path, not just the happy-path shape.
- **Documentation claims** — verified against the current code, not written from memory of an earlier session or
  an assumption of what "should" be true. A stale or invented fact in a doc is a defect, not a style issue.

### Known bug classes to hunt for in every diff

- Phantom fields — extra keys in a write payload that don't exist on the target schema. Type-checking passing
  does not prove this is clean; it only proves internal consistency, which can be wrong in exactly this way.
- Swallowed/silent errors — including any update/delete whose filter matches zero rows without raising an error.
  Checking only an `error` field misses this. Prefer a rows-affected check or a `.single()`-style assertion.
- A data source (view, API response, function return) with more fields than its consumer destructures — data
  silently never reaching the UI. Read the producer in full before trusting the consumer.
- Hardcoding anything specific to one org, tier, or deployment — counts, names, units, hierarchy labels, or a
  conditional keyed to one tenant.
- Placement mismatches — a feature or fix built on a technically-correct but user-invisible or wrongly-named
  route (see "locate, don't assume" above).

The OriginTrace appendix below adds to this list from real incidents in this repo. It doesn't replace it.

### Delegation

- Scope every subagent's reading explicitly — don't let an agent re-discover context you already have.
- Demand structured, cited (file:line) output for every factual claim a subagent returns.
- Vary the verification lens across rounds (correctness, security/access, production-breakage, reachability)
  rather than running the same check repeatedly.
- Independent verifiers should be briefed to try to PROVE a change broken, not to confirm it works.
- Chain sequentially (not fanned out) when each step's output shapes the next step's input — parallelism is for
  genuinely independent work only.
- When agents run in parallel in a shared working tree (not isolated worktrees), a verifier diffing "the whole
  file" can pick up a *different* parallel task's legitimate, separately-verified changes to the same file.
  Before treating that as a defect, check whether the flagged change belongs to another in-scope task.

### Hard gates — stop and wait for explicit confirmation before proceeding

Surfacing means stating the issue and waiting for a response before the next action, not mentioning it in
passing while continuing to work.

1. **Before applying any migration or schema change to a production environment.**
2. **Before an expensive-to-reverse architectural or vendor decision** — state the decision, the alternatives
   rejected, and what it would take to unwind it.
3. **Any time the plan is discovered wrong mid-implementation** — don't quietly patch around it; state what was
   wrong and what changed.
4. **Before reporting multi-part work as complete** — the verification loop above should already have produced
   the evidence; this gate is where it gets checked against the original ask, part by part.

Separately, entering a credential — a password, API key, token, or secret — into any field (including a GitHub
Actions secret) is outside an agent's authority regardless of explicit authorization. State the rule, give exact
manual steps, and let a human do it.

### Feedback loop

This file is only as good as its update discipline, which is the same discipline it demands of implementation
work. When verification catches a defect in real work:

1. Log it in the OriginTrace appendix's "Log" section below, with what the claim was, why it was wrong, and what
   verification would have caught it earlier.
2. If the defect represents a new bug class (not a one-off), add it to the appendix's known-bug-classes list.

---

## Part 2 — OriginTrace appendix

Stack: Next.js 16 App Router, TypeScript, Supabase (Postgres + RLS), ~178 API routes, RBAC (9 roles), payments
(Paystack, Grey, Blockradar, OPay, PalmPay, MTN MoMo), webhooks (22 event types), compliance scoring modules.

### Known bug classes — OriginTrace specifics

- **Migration committed, never applied to production.** Code and Zod schemas get written against a migration
  file that exists in `supabase/migrations/` and compiles/typechecks cleanly, but the migration itself was never
  run against the live database. `npm run check` does not catch this — TypeScript's excess-property checking
  does not reliably fire on Supabase `.insert({...})` object literals. Verify via `information_schema.columns`
  (or the `db-schema-local-check` / `db-schema-check` CI jobs) before trusting any code path that references a
  recently-added column.
- **Orphaned "shared" schema files.** A file explicitly commented as the shared source of truth
  (e.g. `lib/api/validation.ts`) can exist, be correctly named, and still not actually be imported by the route
  it's meant to govern — the real endpoint quietly maintains its own local, diverging copy. Grep for actual
  importers of a "shared" schema before trusting that it governs anything.
- **UUID-vs-integer/number typing on org-scoped location or foreign-key fields.** Recurred at least twice
  (`state_id`/`lga_id` on `farms`, in both a July 2026 sprint fix and independently in the orphaned
  `lib/api/validation.ts` copy). Any new field referencing `locations`/`states`/`lgas` or another UUID-keyed
  table needs its Zod type checked against `lib/supabase/database.types.ts`, not assumed.
- **Route-name / actual-behavior mismatch.** `app/api/farmers/route.ts` is GET-only; the real farmer-registration
  POST handler is `app/api/farms/route.ts`. Before editing "the X route" for any entity, grep for
  `export async function POST` in the specific file you're about to edit — don't assume the entity-named file is
  the one that handles writes. Check for the same pattern (`{entity}s/route.ts` vs a differently-named file
  actually owning writes) whenever investigating a create/update bug for any entity.
- **CI e2e coverage disconnected from what actually gates merges.** Real Playwright specs for a feature can exist
  and pass locally while CI's required check runs a narrower or different spec. Before trusting "CI is green" as
  evidence a flow works, check which spec files the CI job in `.github/workflows/ci.yml` actually invokes.
- **Hardcoded credentials/connection strings in scripts.** `scripts/check-db.ts` had a plaintext DB password
  committed directly in the file (fixed 2026-09; now reads `SUPABASE_DB_URL`). `scripts/migrate-data.ts` still
  hardcodes the project host inline (lower severity, password itself is env-sourced) — a candidate for the same
  cleanup, not yet done.

### Evidence standards — OriginTrace specifics

- **Schema/column claims** — verified via `information_schema` (Supabase MCP `execute_sql`, or the CI
  `db-schema-local-check` job) plus an actual read-back, not by re-reading the migration file you just wrote.
- **RLS / access-control changes** — verified with POSITIVE and NEGATIVE tests: prove an authorized caller still
  succeeds AND an unauthorized caller is now blocked.
- **Migrations** — tested against the real database in a rollback-wrapped transaction first
  (`BEGIN; ... assertions ...; ROLLBACK;`), then applied via the Supabase MCP `apply_migration` tool (tracked),
  never a raw hand-applied statement, then independently read back.
- **Zod schema changes on tenant-write endpoints** — run `schema.safeParse()` directly (not just `npm run check`)
  with both a valid payload (positive) and a payload shaped like a previously-shipped bug, e.g. an integer where
  a UUID is required (negative). `npm run check` passing proves internal TypeScript consistency, not that the
  schema actually rejects bad data.

### Log

**2026-09-03 — farmer registration broken in production after merge to main.**
- What was wrong: `app/api/farms/route.ts` unconditionally inserted a `local_id` key into `farms.insert()`, but
  the migration adding that column (`supabase/migrations/20260526_offline_field_work.sql`, committed since May)
  was never applied to production. Every `POST /api/farms` — the real farmer-creation endpoint, despite the
  registration UI being at `/app/farmers/new` and a *different*, GET-only file existing at
  `app/api/farmers/route.ts` — failed with Postgres `42703`.
- What verification would have caught it earlier: an `information_schema` read of `public.farms` before trusting
  any code that inserts `local_id`/`state_id`/`lga_id`. None was done before this session. The
  `db-schema-local-check` and (once a human adds the `SUPABASE_DB_URL` secret) `db-schema-check` CI jobs added
  2026-09-03 exist specifically to make this automatic going forward.
- Fixes applied (commits `5910677`, `4e54cb7`, `a3ccb7e`, `ad34282` on `claude/document-summary-jd7imz`):
  applied the missing migration to production (rollback-tested first); unified the diverged Zod schema in
  `lib/api/validation.ts` and made `app/api/farms/route.ts` actually import it, deleting its local duplicate;
  added disambiguating header comments to both farmer/farm route files; removed the hardcoded DB password from
  `scripts/check-db.ts`; added `db-schema-local-check` and `e2e-authenticated` CI jobs (local Supabase, no
  secrets needed) and a still-inert `db-schema-check` stub requiring a human-provisioned secret.
- Not fixed, flagged for separate triage: `app/api/v1/farms/route.ts` (separate public API contract, own local
  schema, not checked for the same drift); `scripts/migrate-data.ts`'s hardcoded project host.

Append new entries above this line as real incidents happen. Don't invent entries from general knowledge of the
stack — that violates the prime directive this file exists to enforce.
