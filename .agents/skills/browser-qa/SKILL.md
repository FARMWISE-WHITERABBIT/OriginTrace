---
name: browser-qa
description: >
  Legacy/fallback browser QA registry skill for OriginTrace. Use this skill only
  when the user explicitly says "use browser-qa", asks to "run the browser
  agent", or specifically requests an Operations_ai.md registry update or
  reconciliation after QA results. Otherwise use the playwright-tester skill for
  browser QA.
---

# Browser QA Legacy Registry Skill - OriginTrace

## Purpose

This skill no longer owns default browser QA. OriginTrace's default browser QA
workflow is `playwright-tester`, which writes persistent Playwright specs and
runs them with:

```bash
npx playwright test --reporter=line
```

Use this legacy skill only to reconcile QA results with `Operations_ai.md`, or
when the user explicitly asks for the old browser-agent workflow.

## Default Path

For any request like `smoke test`, `verify UI`, `regression test`, `find bugs`,
`full sweep`, `check the app in a browser`, or `does this page work`:

1. Read `.agents/skills/playwright-tester/SKILL.md`.
2. Read `.agents/skills/testing/SKILL.md` for OriginTrace Playwright
   conventions.
3. Add or update persistent specs under `tests/e2e/` when coverage is missing.
4. Run Playwright natively with `npx playwright test --reporter=line`.
5. Report pass/fail results from the Playwright output.

## Registry Reconciliation

When `Operations_ai.md` must be updated, use Playwright output as the evidence.
Do not launch a browser agent unless the user explicitly requests it.

1. Read `Operations_ai.md` and identify the operation IDs being verified.
2. Run or inspect the relevant Playwright specs for those operations.
3. Map each result to one of:
   - `PASS`: the expected behavior completed successfully.
   - `FAIL`: the page, action, assertion, network request, or user outcome broke.
   - `FLAKY`: the same test gives inconsistent outcomes across retries.
4. Update the matching `Operations_ai.md` row with status, timestamp, and a
   concise evidence note.
5. Append a changelog row summarizing the run.

Example registry note:

```markdown
| 7.1 | View shipments list with filters | `/app/shipments` | admin, logistics_coordinator | PASS | 2026-05-22T14:48Z | Playwright chromium: table loaded, search filtered results, no assertion failures |
```

## Legacy Browser-Agent Use

Only if the user explicitly asks to use `browser-qa` or the browser agent:

1. Confirm the dev or staging server URL.
2. Confirm the role and credentials to test with.
3. Test only the requested operations.
4. Capture the final state, console errors, and network failures.
5. Reconcile results back to `Operations_ai.md`.

## Result Reporting

When reporting QA findings, include:

- Command or workflow used.
- Total tests or operations checked.
- Passed, failed, flaky, and skipped counts.
- For each failure: operation ID when available, route, expected behavior,
  actual behavior, and whether it appears to be a test bug or app bug.
- Any `Operations_ai.md` updates made.

## Reference Files

- `.agents/skills/playwright-tester/SKILL.md` - default browser QA workflow.
- `.agents/skills/testing/SKILL.md` - Playwright test layout and conventions.
- `.agents/skills/seed-data/SKILL.md` - QA/demo data setup.
- `Operations_ai.md` - operations registry.
