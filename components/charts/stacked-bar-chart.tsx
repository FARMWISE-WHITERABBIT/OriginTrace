'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { VIZ_COLORS, TOOLTIP_STYLE } from '@/lib/chart-colors';

interface StackedBarChartProps {
  data: Array<Record<string, string | number>>;
  categoryKey: string;
  series: Array<{ dataKey: string; label: string; color?: string }>;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  valueFormatter?: (value: number) => string;
}

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
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        {showGrid && (
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        )}
        <XAxis
          dataKey={categoryKey}
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
        />
        <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value: unknown, name: unknown) => [
            valueFormatter ? valueFormatter(Number(value)) : Number(value).toLocaleString(),
            String(name),
          ]}
        />
        {showLegend && (
          <Legend
            verticalAlign="bottom"
            iconType="rect"
            iconSize={10}
            wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
          />
        )}
        {series.map((s, index) => (
          <Bar
            key={s.dataKey}
            dataKey={s.dataKey}
            name={s.label}
            stackId="stack"
            fill={s.color || VIZ_COLORS[index % VIZ_COLORS.length]}
            radius={index === series.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
            maxBarSize={60}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
