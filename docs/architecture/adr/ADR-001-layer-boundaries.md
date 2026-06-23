# ADR-001: Layer Boundaries and Dependency Direction

**Status:** Accepted  
**Date:** 2026-04-10  
**Author:** Engineering  
**Deciders:** Engineering Lead

---

## Context

The codebase has accumulated route handlers that contain business logic, duplicated policy checks across layers, and UI components that reach directly into infrastructure concerns. As the platform grows toward an exporter operating system, these boundary violations compound into high change-failure rates and regression risk.

## Decision

We adopt a strict four-layer architecture enforced by lint and CI:

```
api / ui
    ↓  (may call)
application   (use-cases, orchestration)
    ↓
domain        (entities, rules, ports — zero external dependencies)
    ↓
infra         (Supabase repos, HTTP gateways, caches)
```

### Rules — non-negotiable

| Rule | Rationale |
|------|-----------|
| **No business logic in route handlers.** Routes orchestrate request → use-case → response only. | Prevents test-hostile logic hidden behind HTTP |
| **No infra imports in domain layer.** Domain contains only pure TypeScript. | Keeps domain testable with zero mocking |
| **No domain layer importing application layer.** | Prevents circular dependencies |
| **No `app/api/` importing from `app/app/` (UI pages).** | Prevents server/client boundary violations |
| **Cross-module imports only through published module `api/` barrel.** | Enforces explicit contracts between modules |

### Folder convention

```
modules/<domain>/
  api/          dto.ts, mappers.ts — the public surface
  application/  use-cases/
  domain/       entities.ts, rules.ts, ports.ts
  infra/        *.supabase.ts, *.gateway.ts
  tests/        unit/, integration/
```

### Enforcement

1. **ESLint `no-restricted-imports`** on each layer sub-path.
2. **`scripts/check-architecture.ts`** run in CI — fails on violation.
3. **PRs touching a module boundary require the module owner on the review.**

## Consequences

- Route handlers become thin and uniform (easier onboarding, safer refactors).
- Domain logic is fully unit-testable without Supabase mocks.
- Module extraction can proceed independently per vertical slice.
- Short-term: existing code will fail the new lint rules. Migration is tracked per PR-03 through PR-12.

## Alternatives considered

- **No explicit layers** — rejected: current ad-hoc approach is what produced the drift.
- **Hexagonal / ports-and-adapters only** — too heavyweight for the team size; the four-layer approach achieves the same benefits with less ceremony.
