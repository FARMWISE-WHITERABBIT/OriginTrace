'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Sector } from 'recharts';
import { VIZ_COLORS } from '@/lib/chart-colors';
import { ChartTooltip } from './chart-tooltip';

// Recharts omits activeIndex/activeShape from its TS types in some versions;
// cast to any to allow them while keeping the rest of the file typed.
const PieWithActive = Pie as any;

// Expands the hovered slice outward for a clear interactive signal
function ActiveShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius + 6}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
      stroke="hsl(var(--card))"
      strokeWidth={2}
    />
  );
}

// Custom legend: colored dot · name · percentage
function DonutLegend({
  payload,
  data,
}: {
  payload?: Array<{ value: string; color: string }>;
  data: Array<{ name: string; value: number }>;
}) {
  if (!payload?.length) return null;
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '6px 14px',
        paddingTop: '12px',
        fontSize: '11px',
      }}
    >
      {payload.map((entry, i) => {
        const numeric = data[i]?.value ?? 0;
        const pct = total > 0 ? Math.round((numeric / total) * 100) : 0;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: entry.color,
                flexShrink: 0,
                display: 'inline-block',
              }}
            />
            <span style={{ color: 'hsl(var(--muted-foreground))' }}>{entry.value}</span>
            <span style={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}>{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

interface PieDonutChartProps {
  data: Array<{ name: string; value: number; color?: string }>;
  donut?: boolean;
  showLabels?: boolean;
  showLegend?: boolean;
  height?: number;
  colors?: string[];
  labelFormatter?: (name: string, value: number) => string;
  /** Text rendered below the total in the donut center. Defaults to 'Total'. */
  centerLabel?: string;
}

export function PieDonutChart({
  data,
  donut = false,
  showLabels = true,
  showLegend = true,
  height = 300,
  colors = VIZ_COLORS,
  labelFormatter,
  centerLabel = 'Total',
}: PieDonutChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>();

  const total = data.reduce((s, d) => s + d.value, 0);

  if (!data.length || total === 0) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'hsl(var(--muted-foreground))',
          fontSize: '13px',
        }}
      >
        No data available
      </div>
    );
  }

  // Pie center shifts up slightly when legend is shown to keep the visual center balanced
  const pieCy = showLegend ? '44%' : '50%';

  const renderLabel =
    showLabels
      ? (props: any) => {
          const pct = Number(props.percent || 0);
          if (pct < 0.05) return null; // skip tiny slivers
          return `${String(props.name || '')} ${(pct * 100).toFixed(0)}%`;
        }
      : undefined;

  return (
    <div style={{ position: 'relative', height }}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <PieWithActive
            data={data}
            cx="50%"
            cy={pieCy}
            innerRadius={donut ? '52%' : 0}
            outerRadius="76%"
            dataKey="value"
            nameKey="name"
            paddingAngle={donut ? 2 : 0}
            label={renderLabel}
            labelLine={showLabels}
            strokeWidth={2}
            stroke="hsl(var(--card))"
            activeIndex={activeIndex}
            activeShape={ActiveShape}
            onMouseEnter={(_: unknown, index: number) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(undefined)}
            style={{ cursor: 'pointer', outline: 'none' }}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || colors[index % colors.length]}
                opacity={activeIndex !== undefined && activeIndex !== index ? 0.65 : 1}
                style={{ transition: 'opacity 150ms ease' }}
              />
            ))}
          </PieWithActive>
          <Tooltip
            content={
              <ChartTooltip
                valueFormatter={
                  labelFormatter ? (value, name) => labelFormatter(name, value) : undefined
                }
              />
            }
          />
          {showLegend && (
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              content={<DonutLegend data={data} />}
            />
          )}
        </PieChart>
      </ResponsiveContainer>

      {/* Donut center: shows total (or active slice value) + label */}
      {donut && (
        <div
          style={{
            position: 'absolute',
            top: pieCy,
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontSize: '20px',
              fontWeight: 700,
              lineHeight: 1.15,
              color: 'hsl(var(--foreground))',
              letterSpacing: '-0.02em',
            }}
          >
            {activeIndex !== undefined
              ? data[activeIndex].value.toLocaleString()
              : total.toLocaleString()}
          </div>
          <div
            style={{
              fontSize: '10px',
              color: 'hsl(var(--muted-foreground))',
              marginTop: '2px',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {activeIndex !== undefined ? data[activeIndex].name : centerLabel}
          </div>
        </div>
      )}
    </div>
  );
}
