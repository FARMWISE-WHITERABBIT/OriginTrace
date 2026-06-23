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

OriginTrace uses a premium, modern design system based on `shadcn/ui` and
Tailwind CSS. We prioritize consistency, accessibility, and high visual fidelity.

---

## 2. Component Structure

```
components/
├── ui/              ← shadcn-managed primitives (never edit directly)
│   ├── button.tsx, input.tsx, card.tsx, tabs.tsx, etc.
├── dashboards/      ← role-specific dashboard views
├── shipments/       ← shipment feature components
├── charts/          ← data visualization components
├── settings/        ← settings feature components
├── buyer/           ← buyer portal components
├── marketing/       ← landing page components
├── providers/       ← context providers
└── [feature].tsx    ← standalone feature components
```

---

## 3. Component Library (`components/ui/`)

Standard shadcn components as the foundation:
- **Navigation**: `sidebar.tsx`, `tabs.tsx`, `dropdown-menu.tsx`
- **Forms**: `input.tsx`, `select.tsx`, `checkbox.tsx`, `textarea.tsx`
- **Feedback**: `toast.tsx`, `alert.tsx`, `progress.tsx`
- **Layout**: `card.tsx`, `scroll-area.tsx`, `separator.tsx`

---

## 4. Creating a Feature Component

```typescript
// components/shipments/RiskScoreBar.tsx
import { cn } from '@/lib/utils'
import type { ReadinessDecision } from '@/lib/services/scoring'

interface RiskScoreBarProps {
  score: number; tier: ReadinessDecision;
  showLabel?: boolean; className?: string;
}

export function RiskScoreBar({ score, tier, showLabel = true, className }: RiskScoreBarProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {showLabel && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{tier}</span>
          <span className="font-medium">{score}/100</span>
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', TIER_STYLES[tier])}
          style={{ width: `${score}%` }}
          role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}
        />
      </div>
    </div>
  )
}
```

---

## 5. Theming & White-Label Branding

The app supports white-label theming via CSS custom properties. Tenant brand
colours are applied at the organisation level.

### CSS variables (defined in `app/globals.css`)
```css
:root {
  --background:    0 0% 100%;
  --foreground:    222.2 84% 4.9%;
  --primary:       221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  --brand-primary: 221.2 83.2% 53.3%;
  --brand-accent:  142.1 76.2% 36.3%;
  --radius:        0.5rem;
}
.dark {
  --background:  222.2 84% 4.9%;
  --foreground:  210 40% 98%;
}
```

### Applying tenant branding
The `components/tenant-theme-provider.tsx` component applies org brand
colours as CSS variables on mount using the `useOrganisation()` hook.

### Tailwind colour tokens
Use semantic tokens, not raw colours:
```typescript
// ✅ Correct
<Button className="bg-primary text-primary-foreground" />
// ❌ Wrong — hardcoded colour breaks theming
<Button className="bg-blue-600 text-white" />
```

---

## 6. Component Patterns

### Loading states — use Skeleton, not spinners
```typescript
import { Skeleton } from '@/components/ui/skeleton'
function ShipmentCardSkeleton() {
  return (
    <div className="space-y-3 p-4 border rounded-lg">
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-full" />
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
      <Button className="mt-4">Create Shipment</Button>
    </div>
  )
}
```

### Conditional styles — use `cn()` helper
```typescript
import { cn } from '@/lib/utils'
<div className={cn('base-class', isActive && 'active-class')} />
```

---

## 7. Accessibility Checklist

Every new component must:
- [ ] Use semantic HTML (`button` not `div onClick`)
- [ ] Include `aria-label` on icon-only buttons
- [ ] Support keyboard navigation
- [ ] Have sufficient colour contrast (WCAG AA — 4.5:1)
- [ ] Not rely solely on colour to convey meaning

---

## 8. Gotchas

- **Never edit `components/ui/` directly.** Run `npx shadcn-ui@latest add component-name`.
- **`cn()` utility is required for conditional classes.** String concatenation breaks purge/tree-shaking.
- **Radix UI portals render outside the React tree.** Set CSS variables on `:root`, not layout wrappers.
- **Tailwind dark mode is class-based.** Use `next-themes` for toggle.
- **Dark Mode**: Every component must support `dark:` classes.
- **Mobile First**: Test specifically for tablet-sized screens (field agent use case).
- **Typography**: Use `Outfit` or `Inter` font families.
