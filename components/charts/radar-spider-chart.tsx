'use client';

import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import { VIZ_COLORS } from '@/lib/chart-colors';
import { ChartTooltip } from './chart-tooltip';

interface RadarSpiderChartProps {
  data: Array<Record<string, string | number>>;
  angleKey: string;
  series: Array<{ dataKey: string; label: string; color?: string }>;
  height?: number;
  showLegend?: boolean;
  maxValue?: number;
}

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
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
        <PolarGrid
          stroke="hsl(var(--border))"
          strokeOpacity={0.7}
        />
        <PolarAngleAxis
          dataKey={angleKey}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          tickLine={false}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, maxValue || 'auto']}
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          tickLine={false}
          axisLine={false}
          tickCount={4}
        />
        <Tooltip content={<ChartTooltip />} />
        {series.map((s, index) => {
          const color = s.color || VIZ_COLORS[index % VIZ_COLORS.length];
          return (
            <Radar
              key={s.dataKey}
              name={s.label}
              dataKey={s.dataKey}
              stroke={color}
              strokeWidth={2}
              fill={color}
              fillOpacity={0.18}
              dot={{ r: 3, fill: color, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--card))' }}
            />
          );
        })}
        {showLegend && (
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={7}
            wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: 'hsl(var(--muted-foreground))' }}
          />
        )}
      </RadarChart>
    </ResponsiveContainer>
  );
}
