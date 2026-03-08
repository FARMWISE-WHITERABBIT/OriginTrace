'use client';

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
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
];

interface RadarSpiderChartProps {
  data: Array<Record<string, string | number>>;
  angleKey: string;
  series: Array<{ dataKey: string; label: string; color?: string }>;
  height?: number;
  showLegend?: boolean;
  maxValue?: number;
}

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '6px',
  color: 'hsl(var(--foreground))',
};

export function RadarSpiderChart({
  data,
  angleKey,
  series,
  height = 300,
  showLegend = true,
  maxValue,
}: RadarSpiderChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
        <PolarGrid className="stroke-border" />
        <PolarAngleAxis
          dataKey={angleKey}
          tick={{ fontSize: 11 }}
          className="text-muted-foreground"
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, maxValue || 'auto']}
          tick={{ fontSize: 10 }}
          className="text-muted-foreground"
        />
        <Tooltip contentStyle={tooltipStyle} />
        {series.map((s, index) => (
          <Radar
            key={s.dataKey}
            name={s.label}
            dataKey={s.dataKey}
            stroke={s.color || ORIGIN_TRACE_COLORS[index % ORIGIN_TRACE_COLORS.length]}
            fill={s.color || ORIGIN_TRACE_COLORS[index % ORIGIN_TRACE_COLORS.length]}
            fillOpacity={0.15}
            strokeWidth={2}
          />
        ))}
        {showLegend && (
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '12px' }}
          />
        )}
      </RadarChart>
    </ResponsiveContainer>
  );
}
