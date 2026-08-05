---
name: page-data-fetch
description: >
  Use this skill when building or editing any client page/component under app/app/
  that reads data from an API route — lists, detail pages, dashboards, dialogs
  that load records. Triggers for "fetch data", "load the list", "useEffect
  fetch", "loading state", "new page", "data table", ".map over results",
  "useOrg". The app's biggest pages repeat the same fetch+loading+error+toast
  boilerplate dozens of times, which is where workflow bugs breed (C4). Use the
  shared useApiResource hook instead of hand-rolling fetch/useState/useEffect.
---

# Page Data Fetch Skill

## Use the shared hook

`hooks/use-api-resource.ts` centralises org-scoped reads: request, loading,
error, toast, and refetch. Prefer it over hand-rolled
`useState`+`useEffect`+`fetch`.

```tsx
import { useApiResource } from "@/hooks/use-api-resource";
import { useOrg } from "@/lib/contexts/org-context";

const { organization } = useOrg();
const { data: shipments, loading, error, refetch } =
  useApiResource<Shipment[]>("/api/shipments", {
    enabled: !!organization?.id,   // wait until org is loaded
    deps: [organization?.id],      // refetch when org changes
  });
```

It expects the standard `{ error: string }` body from `lib/api/errors.ts` and
surfaces failures through the shared `useToast`. Use `refetch()` after a mutation
instead of manually re-running a fetch.

## Conventions this preserves

- **Org scoping:** gate the request on `organization?.id` via `enabled`/`deps` so
  you never fetch before the tenant is known.
- **Money/dates:** render amounts with `toLocaleString()`, dates with
  `toLocaleDateString('en-GB', …)` (see CLAUDE.md Conventions).
- **Provider names:** never surface Paystack/Blockradar/Grey/Leatherback — it's
  all "OriginTrace" in the UI.

## When NOT to use it

Mutations (POST/PATCH/DELETE) and streaming/file responses stay as explicit
`fetch` calls — the hook is for JSON reads. For those, still surface errors with
the shared toast and refetch affected resources on success.

## Watch the page size

`shipments/[id]/page.tsx` (2,300+ lines) and `settings/page.tsx` (1,900+) are
maintenance hazards. When you touch one, prefer extracting the section you're
editing into a child component over growing the file further.
