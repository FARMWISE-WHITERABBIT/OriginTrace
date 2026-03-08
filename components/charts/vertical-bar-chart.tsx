'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
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

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '6px',
  color: 'hsl(var(--foreground))',
};

export function VerticalBarChart({
  data,
  dataKey,
  categoryKey,
  height = 300,
  color,
  colors = ORIGIN_TRACE_COLORS,
  showGrid = true,
  showLegend = false,
  barLabel,
  valueFormatter,
}: VerticalBarChartProps) {
  const useMultiColor = !color && colors.length > 0;

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
          interval={0}
          angle={data.length > 6 ? -45 : 0}
          textAnchor={data.length > 6 ? 'end' : 'middle'}
          height={data.length > 6 ? 60 : 30}
        />
        <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: unknown) => [
            valueFormatter ? valueFormatter(Number(value)) : Number(value).toLocaleString(),
            barLabel || dataKey,
          ]}
        />
        {showLegend && <Legend wrapperStyle={{ fontSize: '12px' }} />}
        <Bar
          dataKey={dataKey}
          name={barLabel || dataKey}
          fill={color || colors[0]}
          radius={[4, 4, 0, 0]}
          maxBarSize={60}
        >
          {useMultiColor &&
            data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colors[index % colors.length]}
              />
            ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
