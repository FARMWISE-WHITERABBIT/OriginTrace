'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { VIZ_COLORS, TOOLTIP_STYLE } from '@/lib/chart-colors';

interface PieDonutChartProps {
  data: Array<{ name: string; value: number; color?: string }>;
  donut?: boolean;
  showLabels?: boolean;
  showLegend?: boolean;
  height?: number;
  colors?: string[];
  labelFormatter?: (name: string, value: number) => string;
}

export function PieDonutChart({
  data,
  donut = false,
  showLabels = true,
  showLegend = true,
  height = 300,
  colors = VIZ_COLORS,
  labelFormatter,
}: PieDonutChartProps) {
  const renderLabel = showLabels
    ? (props: any) => {
        const name = String(props.name || '');
        const percent = Number(props.percent || 0);
        return `${name} ${(percent * 100).toFixed(0)}%`;
      }
    : undefined;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={donut ? '55%' : 0}
          outerRadius="80%"
          dataKey="value"
          nameKey="name"
          label={renderLabel}
          labelLine={showLabels}
          strokeWidth={2}
          stroke="hsl(var(--card))"
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color || colors[index % colors.length]}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value: unknown, name: unknown) => [
            labelFormatter
              ? labelFormatter(String(name), Number(value))
              : Number(value).toLocaleString(),
            String(name),
          ]}
        />
        {showLegend && (
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
          />
        )}
      </PieChart>
    </ResponsiveContainer>
  );
}
