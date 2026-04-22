'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { VIZ_COLORS } from '@/lib/chart-colors';
import { ChartTooltip } from './chart-tooltip';

interface TrendLineChartProps {
  data: Array<Record<string, string | number>>;
  xKey: string;
  series: Array<{ dataKey: string; label: string; color?: string }>;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  gradientFill?: boolean;
  xTickFormatter?: (value: string) => string;
  valueFormatter?: (value: number) => string;
}

const TICK_STYLE = {
  fontSize: 11,
  fill: 'hsl(var(--muted-foreground))',
  fontWeight: 400,
};

export function TrendLineChart({
  data,
  xKey,
  series,
  height = 300,
  showGrid = true,
  showLegend = true,
  gradientFill = true,
  xTickFormatter,
  valueFormatter,
}: TrendLineChartProps) {
  // Show individual data point dots only on sparse datasets
  const showDots = data.length > 0 && data.length <= 20;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
        {gradientFill && (
          <defs>
            {series.map((s, index) => {
              const color = s.color || VIZ_COLORS[index % VIZ_COLORS.length];
              return (
                <linearGradient
                  key={`gradient-${s.dataKey}`}
                  id={`gradient-${s.dataKey}`}
                  x1="0" y1="0" x2="0" y2="1"
                >
                  <stop offset="0%"   stopColor={color} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.01} />
                </linearGradient>
              );
            })}
          </defs>
        )}

        {showGrid && (
          <CartesianGrid
            strokeDasharray="4 4"
            stroke="hsl(var(--border))"
            strokeOpacity={0.7}
            vertical={false}
          />
        )}

        <XAxis
          dataKey={xKey}
          tick={TICK_STYLE}
          tickLine={false}
          axisLine={{ stroke: 'hsl(var(--border))', strokeOpacity: 0.6 }}
          tickFormatter={xTickFormatter}
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
              labelFormatter={xTickFormatter}
              valueFormatter={valueFormatter ? (v) => valueFormatter(v) : undefined}
            />
          }
          cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '4 2' }}
        />

        {showLegend && series.length > 1 && (
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={7}
            wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: 'hsl(var(--muted-foreground))' }}
          />
        )}

        {series.map((s, index) => {
          const color = s.color || VIZ_COLORS[index % VIZ_COLORS.length];
          return (
            <Area
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.label}
              stroke={color}
              strokeWidth={2.5}
              fill={gradientFill ? `url(#gradient-${s.dataKey})` : 'none'}
              dot={showDots ? { r: 3, fill: color, strokeWidth: 0 } : false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--card))', fill: color }}
            />
          );
        })}
      </AreaChart>
    </ResponsiveContainer>
  );
}
