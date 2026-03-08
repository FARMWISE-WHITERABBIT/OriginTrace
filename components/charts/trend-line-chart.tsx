'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const ORIGIN_TRACE_COLORS = [
  '#2E7D6B',
  '#1F5F52',
  '#6FB8A8',
  '#3A9B8A',
  '#8ECDC0',
];

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

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '6px',
  color: 'hsl(var(--foreground))',
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
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        {gradientFill && (
          <defs>
            {series.map((s, index) => {
              const fillColor =
                s.color || ORIGIN_TRACE_COLORS[index % ORIGIN_TRACE_COLORS.length];
              return (
                <linearGradient
                  key={`gradient-${s.dataKey}`}
                  id={`gradient-${s.dataKey}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={fillColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={fillColor} stopOpacity={0} />
                </linearGradient>
              );
            })}
          </defs>
        )}
        {showGrid && (
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        )}
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
          tickFormatter={xTickFormatter}
        />
        <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
          formatter={(value: unknown, name: unknown) => [
            valueFormatter ? valueFormatter(Number(value)) : Number(value).toLocaleString(),
            String(name),
          ]}
        />
        {showLegend && series.length > 1 && (
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '12px' }}
          />
        )}
        {series.map((s, index) => {
          const strokeColor =
            s.color || ORIGIN_TRACE_COLORS[index % ORIGIN_TRACE_COLORS.length];
          return (
            <Area
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.label}
              stroke={strokeColor}
              fill={gradientFill ? `url(#gradient-${s.dataKey})` : 'none'}
              strokeWidth={2}
            />
          );
        })}
      </AreaChart>
    </ResponsiveContainer>
  );
}
