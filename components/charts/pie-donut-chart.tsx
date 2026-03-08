'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

const ORIGIN_TRACE_COLORS = [
  '#2E7D6B',
  '#1F5F52',
  '#6FB8A8',
  '#3A9B8A',
  '#8ECDC0',
  '#164A40',
  '#A8DDD3',
  '#4EAFA0',
  '#0D3B33',
  '#B5E4DB',
];

interface PieDonutChartProps {
  data: Array<{ name: string; value: number; color?: string }>;
  donut?: boolean;
  showLabels?: boolean;
  showLegend?: boolean;
  height?: number;
  colors?: string[];
  labelFormatter?: (name: string, value: number) => string;
}

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '6px',
  color: 'hsl(var(--foreground))',
};

export function PieDonutChart({
  data,
  donut = false,
  showLabels = true,
  showLegend = true,
  height = 300,
  colors = ORIGIN_TRACE_COLORS,
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
          contentStyle={tooltipStyle}
          formatter={(value: unknown, name: unknown) => [
            labelFormatter ? labelFormatter(String(name), Number(value)) : Number(value).toLocaleString(),
            String(name),
          ]}
        />
        {showLegend && (
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '12px' }}
          />
        )}
      </PieChart>
    </ResponsiveContainer>
  );
}
