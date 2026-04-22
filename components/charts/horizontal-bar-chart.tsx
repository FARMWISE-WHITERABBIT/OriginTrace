'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { VIZ_COLORS } from '@/lib/chart-colors';
import { ChartTooltip } from './chart-tooltip';

interface HorizontalBarChartProps {
  data: Array<Record<string, string | number>>;
  dataKey: string;
  categoryKey: string;
  height?: number;
  color?: string;
  colors?: string[];
  showGrid?: boolean;
  barLabel?: string;
  valueFormatter?: (value: number) => string;
}

const TICK_STYLE = {
  fontSize: 11,
  fill: 'hsl(var(--muted-foreground))',
};

export function HorizontalBarChart({
  data,
  dataKey,
  categoryKey,
  height = 300,
  color,
  colors = VIZ_COLORS,
  showGrid = true,
  barLabel,
  valueFormatter,
}: HorizontalBarChartProps) {
  // Give each row 36px, with at least the requested height
  const dynamicHeight = Math.max(height, data.length * 36 + 48);

  // Compute Y-axis label width dynamically so long names don't clip
  const maxLabelLen = Math.max(...data.map(d => String(d[categoryKey] ?? '').length));
  const labelWidth = Math.min(Math.max(maxLabelLen * 6.5, 80), 160);

  if (!data.length) {
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

  return (
    <ResponsiveContainer width="100%" height={dynamicHeight}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
      >
        {showGrid && (
          <CartesianGrid
            strokeDasharray="4 4"
            stroke="hsl(var(--border))"
            strokeOpacity={0.7}
            horizontal={false}
          />
        )}
        <XAxis
          type="number"
          tick={TICK_STYLE}
          tickLine={false}
          axisLine={{ stroke: 'hsl(var(--border))', strokeOpacity: 0.6 }}
        />
        <YAxis
          type="category"
          dataKey={categoryKey}
          tick={TICK_STYLE}
          tickLine={false}
          axisLine={false}
          width={labelWidth}
        />
        <Tooltip
          content={
            <ChartTooltip
              valueFormatter={valueFormatter ? (v) => valueFormatter(v) : undefined}
            />
          }
          cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }}
        />
        <Bar
          dataKey={dataKey}
          name={barLabel || dataKey}
          fill={color || colors[0]}
          radius={[0, 4, 4, 0]}
          maxBarSize={24}
          isAnimationActive
          animationDuration={500}
          animationEasing="ease-out"
          style={{ cursor: 'pointer' }}
          background={{ fill: 'hsl(var(--muted))', opacity: 0.35, radius: [0, 4, 4, 0] } as any}
        >
          {data.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={color || colors[index % colors.length]}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
