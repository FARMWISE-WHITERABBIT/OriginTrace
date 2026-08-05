# ADR-002: Tier Default Policy (Fail-Open vs Fail-Closed)

**Status:** Accepted  
**Date:** 2026-04-10  
**Author:** Engineering  
**Deciders:** Engineering Lead, Product

---

## Context

When `hasTierAccess()` or `enforceTier()` is called and the organisation's `subscription_tier` is:

- `null` — org exists but has no tier assigned (new org, migration gap)  
- `undefined` — value not fetched (query error, missing join)  
- An unknown string — tier name not in our enum (migration artifact, future tier)

Two audit findings drove this decision:

1. `lib/api-auth.ts:56` defines its own `tierLevels` map with different null-handling semantics than `lib/config/tier-gating.ts:hasTierAccess()`.
2. `lib/api/tier-guard.ts:checkTierAccess()` silently returns `false` (block) when the org row is not found, whereas `hasTierAccess()` in tier-gating returns `true` (allow) when tier is nullish.

This inconsistency means the same feature request can return different access decisions depending on which code path ran it.

## Decision

### Null / undefined tier → **Fail-Open (full access)**

**Rationale:**  
- OriginTrace is a B2B platform. Org admins set up access; if a tier is missing it is an ops error, not a user error. Blocking them from their own data creates a support incident.  
- This was the implicit rule in `lib/config/tier-gating.ts` (line 219: `if (!orgTier) return true`). We make it explicit and universal.  
- Sales during onboarding — new orgs that haven't had a tier assigned yet should get full access, not a wall.

### Unknown string tier → **Treat as `'starter'` (most restrictive paid tier)**

**Rationale:**  
- An unknown tier name is most likely a migration artifact or future tier from a newer deployment. Treating it as `'starter'` is safe-conservative: the org is paying for something, so we don't lock them out, but we don't grant unlimited access either.

### Org not found → **Fail-Closed (block, 403)**

**Rationale:**  
- If the org row cannot be found at all, that's a genuine authorization error. The caller should not receive data.

### Single source of truth

All tier access logic **must** route through `modules/identity-access/domain/tier-policy.ts` (created in PR-02). No other file may contain tier level maps or tier comparison logic.

## Implementation contract

```typescript
// modules/identity-access/domain/tier-policy.ts

hasTierAccess(orgTier: string | null | undefined, feature: TierFeature): boolean
//  null | undefined → true  (fail-open)
//  unknown string   → hasTierAccess('starter', feature)
//  valid string     → existing hierarchy comparison

canAccessOrg(orgRow: OrgRow | null): boolean
//  null → false (fail-closed, org not found)
```

## Consequences

- Removes the duplicate `tierLevels` map from `lib/api-auth.ts`.
- `lib/api/tier-guard.ts:checkTierAccess()` is refactored to delegate to the canonical function.
- Existing tests must be updated to assert on the canonical semantics (not the old divergent ones).
- Any future tier names are automatically treated as `'starter'` — no code change required.
