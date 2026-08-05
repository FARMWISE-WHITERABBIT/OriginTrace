'use client';

/**
 * Shared custom tooltip for all Recharts components.
 * Usage: <Tooltip content={<ChartTooltip valueFormatter={fn} />} />
 * Recharts clones the element and injects active/payload/label via React.cloneElement.
 */

interface PayloadItem {
  name: string;
  value: number;
  color?: string;
  fill?: string;
  stroke?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: PayloadItem[];
  label?: string | number;
  valueFormatter?: (value: number, name: string) => string;
  labelFormatter?: (label: string) => string;
}

const WRAPPER: React.CSSProperties = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.06)',
  padding: '10px 14px',
  fontSize: '12px',
  minWidth: '130px',
  pointerEvents: 'none',
};

const LABEL: React.CSSProperties = {
  fontWeight: 600,
  color: 'hsl(var(--foreground))',
  marginBottom: '8px',
  paddingBottom: '6px',
  borderBottom: '1px solid hsl(var(--border))',
  letterSpacing: '-0.01em',
};

const ROW: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '14px',
};

const DOT: React.CSSProperties = {
  width: '7px',
  height: '7px',
  borderRadius: '50%',
  flexShrink: 0,
  display: 'inline-block',
};

export function ChartTooltip({ active, payload, label, valueFormatter, labelFormatter }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const displayLabel = label != null
    ? (labelFormatter ? labelFormatter(String(label)) : String(label))
    : null;

  return (
    <div style={WRAPPER}>
      {displayLabel && <p style={LABEL}>{displayLabel}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {payload.map((entry, i) => {
          const dotColor = entry.color || entry.fill || entry.stroke || '#64748b';
          const formatted = valueFormatter
            ? valueFormatter(entry.value, entry.name)
            : entry.value.toLocaleString();
          return (
            <div key={i} style={ROW}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ ...DOT, backgroundColor: dotColor }} />
                <span style={{ color: 'hsl(var(--muted-foreground))' }}>{entry.name}</span>
              </div>
              <span style={{ fontWeight: 600, color: 'hsl(var(--foreground))', fontVariantNumeric: 'tabular-nums' }}>
                {formatted}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
