'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const ORIGIN_TRACE_COLORS = [
  '#2E7D6B',
  '#1F5F52',
  '#6FB8A8',
  '#3A9B8A',
  '#8ECDC0',
  '#164A40',
];

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

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '6px',
  color: 'hsl(var(--foreground))',
};

export function HorizontalBarChart({
  data,
  dataKey,
  categoryKey,
  height = 300,
  color,
  colors = ORIGIN_TRACE_COLORS,
  showGrid = true,
  barLabel,
  valueFormatter,
}: HorizontalBarChartProps) {
  const dynamicHeight = Math.max(height, data.length * 40 + 40);

  return (
    <ResponsiveContainer width="100%" height={dynamicHeight}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
      >
        {showGrid && (
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-border"
            horizontal={false}
          />
        )}
        <XAxis type="number" tick={{ fontSize: 12 }} className="text-muted-foreground" />
        <YAxis
          type="category"
          dataKey={categoryKey}
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
          width={100}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: unknown) => [
            valueFormatter ? valueFormatter(Number(value)) : Number(value).toLocaleString(),
            barLabel || dataKey,
          ]}
        />
        <Bar
          dataKey={dataKey}
          name={barLabel || dataKey}
          fill={color || colors[0]}
          radius={[0, 4, 4, 0]}
          maxBarSize={30}
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
