# OriginTrace CVE Red-Team Report

Date: 2026-05-25T23:34+01:00

## Summary

OriginTrace is installed with `next@16.2.6`, which is outside the affected ranges for the reviewed Next.js 16.x advisories, including the May 2026 16.2.6 follow-up advisory found during `npm audit`.

The Playwright CVE regression suite passed:

```powershell
$env:E2E_BASE_URL="http://localhost:5000"; $env:E2E_ADMIN_EMAIL="admin@demo.test"; $env:E2E_ADMIN_PASSWORD="Demo1234!"; npx playwright test tests/e2e/security-cve-regression.spec.ts --project=chromium --reporter=line
```

Result: **7 passed**.

## Findings

| ID | Package / installed version | Affected range | Risk | Probe result | Mitigation |
|---|---|---|---|---|---|
| CVE-2026-44574 / GHSA-492v-c6pp-mqqv | `next@16.2.6` | `>=16.0.0 <16.2.5` | High middleware/proxy bypass through dynamic route parameter injection. | PASS: unauthenticated crafted route/query variants redirect to `/auth/login`; buyer/agent dynamic route variants remain constrained to authorized areas. | Patched by Next upgrade; route-level RBAC remains in app logic for protected resources. |
| CVE-2026-44578 / GHSA-c4j6-fc7j-m34r | `next@16.2.6` | `>=16.0.0 <16.2.5` | High SSRF risk in self-hosted Node server WebSocket upgrade handling. | PASS: non-destructive config posture check only; no unsafe rewrites found. No destructive SSRF probes were run. | Patched by Next upgrade; keep origin behind trusted reverse proxy and restrict origin egress in production. |
| CVE-2026-27977 / GHSA-jcc7-9wpm-mj36 | `next@16.2.6` | `>=16.0.1 <16.1.7` per NVD; GitHub advisory lists patched `16.1.7`. | Dev-only `Origin: null` bypass for internal dev endpoints when `allowedDevOrigins` is configured. | PASS: config posture check confirms `allowedDevOrigins` is not configured. | Patched by Next upgrade; keep `next dev` off untrusted networks. |
| CVE-2026-45109 / GHSA-26hh-7cqf-hhc6 | `next@16.2.6` | `>=16.0.0 <16.2.6` | High middleware/proxy bypass follow-up for App Router segment-prefetch routes. | PASS: middleware spoof header and protected route variant probes remain denied. | Patched by Next upgrade to 16.2.6. |
| npm audit residual: SheetJS `xlsx` advisories | `xlsx@0.18.5` | npm reports `*`; no fix available. | High prototype pollution and ReDoS risk when parsing attacker-controlled spreadsheets. | Not part of destructive CVE probes. Code review found `xlsx` is used for authenticated imports/exports. | Kept dependency because product uses XLSX import/export; added upload-path mitigations: 2 MB cap, 5,000-row cap during parse, and prototype-key filtering. |

## Dependency Actions

- Upgraded `next` to `16.2.6` and refreshed `package-lock.json`.
- Upgraded same-major production dependencies surfaced by audit: `axios`, `jspdf`, `next-intl`, `postcss`, and `@sentry/nextjs`.
- Added npm overrides for patched transitive `postcss` and `serialize-javascript`.
- Added `@next/swc-win32-x64-msvc@16.2.5` as an optional dependency because the 16.2.6 Windows SWC native package failed to load on this host; `npm run build` now succeeds with `next@16.2.6`.

## Sources

- [GitHub advisory: CVE-2026-44574 / GHSA-492v-c6pp-mqqv](https://github.com/vercel/next.js/security/advisories/GHSA-492v-c6pp-mqqv)
- [GitHub advisory: CVE-2026-44578 / GHSA-c4j6-fc7j-m34r](https://github.com/vercel/next.js/security/advisories/GHSA-c4j6-fc7j-m34r)
- [GitHub advisory: CVE-2026-27977 / GHSA-jcc7-9wpm-mj36](https://github.com/vercel/next.js/security/advisories/GHSA-jcc7-9wpm-mj36)
- [GitHub Advisory Database: CVE-2026-45109 / GHSA-26hh-7cqf-hhc6](https://github.com/advisories/GHSA-26hh-7cqf-hhc6)
- [NVD: CVE-2026-44574](https://nvd.nist.gov/vuln/detail/CVE-2026-44574)
- [NVD: CVE-2026-27977](https://nvd.nist.gov/vuln/detail/CVE-2026-27977)
- [Next.js security update, 2025-12-11](https://nextjs.org/blog/security-update-2025-12-11)
