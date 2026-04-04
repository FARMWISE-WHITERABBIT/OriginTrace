'use client';

import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import { VIZ_COLORS, TOOLTIP_STYLE } from '@/lib/chart-colors';

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
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        {series.map((s, index) => {
          const color = s.color || VIZ_COLORS[index % VIZ_COLORS.length];
          return (
            <Radar
              key={s.dataKey}
              name={s.label}
              dataKey={s.dataKey}
              stroke={color}
              fill={color}
              fillOpacity={0.15}
              strokeWidth={2}
            />
          );
        })}
        {showLegend && (
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
          />
        )}
      </RadarChart>
    </ResponsiveContainer>
  );
}
