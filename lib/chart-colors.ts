/**
 * OriginTrace Data Visualisation Color System
 *
 * 10 perceptually-distinct, WCAG-AA accessible colors that work in both
 * light and dark mode.  Use these everywhere charts, badges, and status
 * indicators need categorical color variety.
 *
 * Naming convention:
 *   VIZ_COLORS      – ordered array, great for Recharts Cell / color props
 *   VIZ             – named object, great for semantic access (e.g. VIZ.blue)
 *   STATUS_COLORS   – semantic traffic-light set
 *   DECISION_COLORS – shipment Go / Conditional / No-Go palette
 */

// ─── Categorical palette (10 colors) ─────────────────────────────────────────
export const VIZ_COLORS: string[] = [
  '#2E7D6B', // 0  teal       – brand primary
  '#3B82F6', // 1  blue
  '#F59E0B', // 2  amber
  '#8B5CF6', // 3  violet
  '#EF4444', // 4  red
  '#06B6D4', // 5  cyan
  '#F97316', // 6  orange
  '#10B981', // 7  emerald
  '#EC4899', // 8  pink
  '#6366F1', // 9  indigo
];

export const VIZ = {
  teal:    VIZ_COLORS[0],
  blue:    VIZ_COLORS[1],
  amber:   VIZ_COLORS[2],
  violet:  VIZ_COLORS[3],
  red:     VIZ_COLORS[4],
  cyan:    VIZ_COLORS[5],
  orange:  VIZ_COLORS[6],
  emerald: VIZ_COLORS[7],
  pink:    VIZ_COLORS[8],
  indigo:  VIZ_COLORS[9],
} as const;

// ─── Status / compliance ───────────────────────────────────────────────────────
export const STATUS_COLORS: Record<string, string> = {
  // Farm / batch compliance
  Approved:      '#16A34A', // green-600
  Pending:       '#D97706', // amber-600
  Rejected:      '#DC2626', // red-600
  'Not Reviewed':'#6B7280', // gray-500
  // Generic
  success:       '#16A34A',
  warning:       '#D97706',
  danger:        '#DC2626',
  info:          '#2563EB', // blue-600
  neutral:       '#6B7280',
};

// ─── Shipment readiness ────────────────────────────────────────────────────────
export const DECISION_COLORS: Record<string, string> = {
  Go:          '#16A34A',
  Conditional: '#D97706',
  'No Go':     '#DC2626',
  Pending:     '#6B7280',
};

// ─── Document health ───────────────────────────────────────────────────────────
export const DOC_HEALTH_COLORS: Record<string, string> = {
  Valid:          '#16A34A',
  'Expiring Soon':'#D97706',
  Expired:        '#DC2626',
};

// ─── Grade palette ─────────────────────────────────────────────────────────────
export const GRADE_COLORS: Record<string, string> = {
  A:     '#16A34A',
  B:     '#3B82F6',
  C:     '#D97706',
  D:     '#F97316',
  E:     '#EF4444',
  Rejet: '#DC2626',
};

// ─── Commodity palette (deterministic by index) ────────────────────────────────
export const COMMODITY_COLORS = VIZ_COLORS;

// ─── Tooltip style (re-usable across all Recharts components) ─────────────────
export const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border:          '1px solid hsl(var(--border))',
  borderRadius:    '6px',
  color:           'hsl(var(--foreground))',
  fontSize:        '12px',
};
