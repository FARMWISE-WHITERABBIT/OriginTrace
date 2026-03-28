---
name: ui-components
description: >
  Use this skill when adding new UI components, modifying the component
  library, implementing white-label branding/theming, working with shadcn/ui,
  or creating new Tailwind-styled elements. Triggers for any mention of
  "add a component", "shadcn", "UI component", "Tailwind class", "white-label",
  "brand colours", "theming", "component library", "design system", or
  "responsive layout". Always use this skill before creating a new component
  to follow the naming conventions, file structure, and theming patterns.
---

# UI Components Skill

## 1. Overview

**Mission:** OriginTrace uses a premium, modern design system based on `shadcn/ui` and Tailwind CSS. We prioritize consistency, accessibility, and high visual fidelity.

---

## 2. Component Library (`components/ui/`)

We use standard shadcn components as the foundation:
- **Navigation**: `sidebar.tsx`, `tabs.tsx`, `dropdown-menu.tsx`.
- **Forms**: `input.tsx`, `select.tsx`, `checkbox.tsx`, `textarea.tsx`.
- **Feedback**: `toast.tsx`, `alert.tsx`, `progress.tsx`.
- **Layout**: `card.tsx`, `scroll-area.tsx`, `separator.tsx`.

---

## 3. Design Tokens (`tailwind.config.js`)

Our theme uses semantic tokens for branding:
- **Primary**: Green-based for agricultural focus.
- **Accents**: Modern golds and deep slate.
- **Radius**: Standard 0.5 rem for a modern, slightly rounded look.

---

## 4. Best Practices

- **Utility First**: Use Tailwind classes for ad-hoc styling.
- **Composition**: Prefer small, reusable components over large monolithic ones.
- **Typography**: Use the `Outfit` or `Inter` font families for a clean, professional feel.
- **Conditional Styles**: Use the `cn()` helper from `lib/utils.ts` for clean conditional class merging.

---

## 5. Gotchas

- **Dark Mode**: Every component **must** support dark mode using `dark:` classes or the `next-themes` provider.
- **Mobile First**: All dashboards and forms must be responsive. Test specifically for tablet-sized screens (field agent use case).
- **Z-Index**: Be careful with `Dialog`, `Popover`, and `Select` overlays. Use Radix primitives correctly to manage portal rendering.
or `components/features/` with project-specific
   props and styles

---

## 4. Creating a New Feature Component

```typescript
// components/features/shipments/RiskScoreBar.tsx
import { cn } from '@/lib/utils'
import type { RiskTier } from '@/lib/services/shipment-scoring'

interface RiskScoreBarProps {
  score:     number      // 0-100
  tier:      RiskTier
  showLabel?: boolean
  className?: string
}

const TIER_STYLES: Record<RiskTier, string> = {
  low:      'bg-green-500',
  medium:   'bg-yellow-500',
  high:     'bg-orange-500',
  critical: 'bg-red-600',
}

const TIER_LABELS: Record<RiskTier, string> = {
  low:      'Low Risk',
  medium:   'Medium Risk',
  high:     'High Risk',
  critical: 'Critical Risk',
}

export function RiskScoreBar({ score, tier, showLabel = true, className }: RiskScoreBarProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {showLabel && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{TIER_LABELS[tier]}</span>
          <span className="font-medium">{score}/100</span>
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', TIER_STYLES[tier])}
          style={{ width: `${score}%` }}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  )
}
```

```typescript
// components/features/shipments/index.ts
export { RiskScoreBar } from './RiskScoreBar'
export { ShipmentCard }  from './ShipmentCard'
export { ShipmentForm }  from './ShipmentForm'
```

---

## 5. Theming & White-Label Branding

The app supports white-label theming via CSS custom properties. Tenant
brand colours are applied at the organisation level.

### CSS variables (defined in `app/globals.css`)
```css
:root {
  --background:    0 0% 100%;
  --foreground:    222.2 84% 4.9%;
  --primary:       221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  --secondary:     210 40% 96.1%;
  --muted:         210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --border:        214.3 31.8% 91.4%;
  --radius:        0.5rem;
  /* Brand accent (overrideable per tenant) */
  --brand-primary: 221.2 83.2% 53.3%;
  --brand-accent:  142.1 76.2% 36.3%;
}

.dark {
  --background:  222.2 84% 4.9%;
  --foreground:  210 40% 98%;
  /* ... dark mode overrides */
}
```

### Applying tenant branding
```typescript
// components/layouts/DashboardLayout.tsx
export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { org } = useOrganisation()

  // Apply org brand colours as CSS variables on mount
  useEffect(() => {
    if (org?.brand_primary_hsl) {
      document.documentElement.style.setProperty('--brand-primary', org.brand_primary_hsl)
    }
    if (org?.brand_accent_hsl) {
      document.documentElement.style.setProperty('--brand-accent', org.brand_accent_hsl)
    }
  }, [org])

  return <div className="min-h-screen bg-background">{children}</div>
}
```

### Tailwind colour tokens
Use semantic tokens, not raw colours:
```typescript
// ✅ Correct — uses CSS variable-backed token
<Button className="bg-primary text-primary-foreground" />

// ❌ Wrong — hardcoded colour breaks theming
<Button className="bg-blue-600 text-white" />
```

---

## 6. Component Patterns

### Loading states
```typescript
// Use Skeleton components, not spinners, for content that has a known shape
import { Skeleton } from '@/components/ui/skeleton'

function ShipmentCardSkeleton() {
  return (
    <div className="space-y-3 p-4 border rounded-lg">
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  )
}
```

### Empty states
```typescript
function EmptyShipments() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Package className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold">No shipments yet</h3>
      <p className="text-muted-foreground mt-1">Create your first shipment to get started.</p>
      <Button className="mt-4">Create Shipment</Button>
    </div>
  )
}
```

### Data table (shadcn)
```typescript
// Use the shadcn DataTable pattern with TanStack Table
// See components/ui/data-table.tsx for the base
// Wrap with feature-specific columns:
export const shipmentColumns: ColumnDef<Shipment>[] = [
  { accessorKey: 'id', header: 'ID', cell: ({ row }) => row.original.id.slice(0,8) },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  // ...
]
```

---

## 7. Accessibility Checklist

Every new component must:
- [ ] Use semantic HTML (`button` not `div onClick`)
- [ ] Include `aria-label` on icon-only buttons
- [ ] Support keyboard navigation (tab order, Enter/Space activation)
- [ ] Have sufficient colour contrast (WCAG AA — 4.5:1 for normal text)
- [ ] Include `role` and `aria-*` attributes on custom interactive elements
- [ ] Not rely solely on colour to convey meaning (use icons or text labels too)

---

## 8. Gotchas

- **Never edit `components/ui/` directly.** These are shadcn-managed files. Run `npx shadcn-ui@latest add component-name` to update them.
- **`cn()` utility is required for conditional classes.** Using string concatenation with Tailwind breaks the purge/tree-shaking. Always use `cn(baseClasses, conditionalClass && 'class')`.
- **Radix UI portals render outside the React tree.** Dialogs, tooltips, and dropdowns from shadcn/ui use Radix portals — they won't inherit CSS variables set on a parent component. Set variables on `:root` or `body`, not on layout wrappers.
- **Tailwind dark mode is class-based.** Add `class="dark"` to `<html>` to activate dark mode. Use `next-themes` for the toggle.
