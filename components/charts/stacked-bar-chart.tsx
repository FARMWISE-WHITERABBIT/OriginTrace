'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { VIZ_COLORS } from '@/lib/chart-colors';
import { ChartTooltip } from './chart-tooltip';

interface StackedBarChartProps {
  data: Array<Record<string, string | number>>;
  categoryKey: string;
  series: Array<{ dataKey: string; label: string; color?: string }>;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  valueFormatter?: (value: number) => string;
}

const TICK_STYLE = {
  fontSize: 11,
  fill: 'hsl(var(--muted-foreground))',
};

export function StackedBarChart({
  data,
  categoryKey,
  series,
  height = 300,
  showGrid = true,
  showLegend = true,
  valueFormatter,
}: StackedBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
        {showGrid && (
          <CartesianGrid
            strokeDasharray="4 4"
            stroke="hsl(var(--border))"
            strokeOpacity={0.7}
            vertical={false}
          />
        )}
        <XAxis
          dataKey={categoryKey}
          tick={TICK_STYLE}
          tickLine={false}
          axisLine={{ stroke: 'hsl(var(--border))', strokeOpacity: 0.6 }}
          dy={4}
        />
        <YAxis
          tick={TICK_STYLE}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip
          content={
            <ChartTooltip
              valueFormatter={valueFormatter ? (v, n) => valueFormatter(v) : undefined}
            />
          }
          cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }}
        />
        {showLegend && (
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={7}
            wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: 'hsl(var(--muted-foreground))' }}
          />
        )}
        {series.map((s, index) => {
          const isFirst = index === 0;
          const isLast = index === series.length - 1;
          return (
            <Bar
              key={s.dataKey}
              dataKey={s.dataKey}
              name={s.label}
              stackId="stack"
              fill={s.color || VIZ_COLORS[index % VIZ_COLORS.length]}
              // Round top of full stack only
              radius={isLast ? [4, 4, 0, 0] : isFirst ? [0, 0, 0, 0] : [0, 0, 0, 0]}
              maxBarSize={52}
              isAnimationActive
              animationDuration={500}
              animationEasing="ease-out"
            />
          );
        })}
      </BarChart>
    </ResponsiveContainer>
  );
}
