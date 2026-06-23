'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';
import { VIZ_COLORS } from '@/lib/chart-colors';
import { ChartTooltip } from './chart-tooltip';

interface VerticalBarChartProps {
  data: Array<Record<string, string | number>>;
  dataKey: string;
  categoryKey: string;
  height?: number;
  color?: string;
  colors?: string[];
  showGrid?: boolean;
  showLegend?: boolean;
  barLabel?: string;
  valueFormatter?: (value: number) => string;
}

const TICK_STYLE = {
  fontSize: 11,
  fill: 'hsl(var(--muted-foreground))',
};

export function VerticalBarChart({
  data,
  dataKey,
  categoryKey,
  height = 300,
  color,
  colors = VIZ_COLORS,
  showGrid = true,
  showLegend = false,
  barLabel,
  valueFormatter,
}: VerticalBarChartProps) {
  const useMultiColor = !color;

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
          interval={0}
          angle={data.length > 6 ? -40 : 0}
          textAnchor={data.length > 6 ? 'end' : 'middle'}
          height={data.length > 6 ? 56 : 28}
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
              valueFormatter={valueFormatter ? (v) => valueFormatter(v) : undefined}
            />
          }
          cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }}
        />
        {showLegend && (
          <Legend
            wrapperStyle={{ fontSize: '11px', paddingTop: '8px', color: 'hsl(var(--muted-foreground))' }}
          />
        )}
        <Bar
          dataKey={dataKey}
          name={barLabel || dataKey}
          fill={color || colors[0]}
          radius={[4, 4, 0, 0]}
          maxBarSize={52}
          isAnimationActive
          animationDuration={500}
          animationEasing="ease-out"
          style={{ cursor: 'pointer' }}
        >
          {useMultiColor &&
            data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
