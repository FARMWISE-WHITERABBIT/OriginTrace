'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';

interface ComplianceGaugeProps {
  approvedCount: number;
  totalCount: number;
}

// Semicircle arc gauge — spans the bottom half of a circle (left → top → right)
// viewBox 0 0 200 110  cx=100 cy=100 r=80
// Arc starts at 180° (left) and sweeps clockwise to 0° (right)
// Full arc length = π × r
const CX = 100;
const CY = 100;
const R  = 80;
const FULL_ARC = Math.PI * R; // ≈ 251.3  (semicircle only)
// The strokeDasharray describes the filled portion vs the gap on the remaining full circle
// We use dasharray = [filledLength, remaining + full circle to close the path]

function getArcColor(pct: number) {
  if (pct >= 80) return { arc: '#16a34a', text: '#16a34a' }; // green-600
  if (pct >= 50) return { arc: '#d97706', text: '#d97706' }; // amber-600
  return { arc: '#dc2626', text: '#dc2626' };                 // red-600
}

export function ComplianceGauge({ approvedCount, totalCount }: ComplianceGaugeProps) {
  const [animPct, setAnimPct] = useState(0);
  const pct = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;

  useEffect(() => {
    const id = setTimeout(() => setAnimPct(pct), 120);
    return () => clearTimeout(id);
  }, [pct]);

  const { arc: arcColor, text: textColor } = getArcColor(pct);

  // How far along the semicircle to fill
  const filled  = (animPct / 100) * FULL_ARC;
  // The remainder of the full circle (ensures the dash doesn't wrap back)
  const gap     = 2 * Math.PI * R - filled;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Compliance Rate
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          {/* SVG gauge — semicircle arc */}
          <div style={{ position: 'relative', width: 180, height: 100 }}>
            <svg
              viewBox="0 0 200 110"
              width={180}
              height={100}
              style={{ overflow: 'visible' }}
            >
              {/* Track (background arc) */}
              <path
                d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth={12}
                strokeLinecap="round"
              />
              {/* Filled arc — rotated so stroke starts at the left end */}
              <circle
                cx={CX}
                cy={CY}
                r={R}
                fill="none"
                stroke={arcColor}
                strokeWidth={12}
                strokeLinecap="round"
                strokeDasharray={`${filled} ${gap}`}
                /* rotate -180° so the arc starts from the left (180°) not the top (−90°) */
                transform={`rotate(-180 ${CX} ${CY})`}
                style={{ transition: 'stroke-dasharray 900ms cubic-bezier(0.34, 1.56, 0.64, 1), stroke 400ms ease' }}
              />
            </svg>

            {/* Center label — sits within the arc opening */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                textAlign: 'center',
                lineHeight: 1,
              }}
            >
              <span
                style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  color: textColor,
                  letterSpacing: '-0.03em',
                  transition: 'color 400ms ease',
                }}
              >
                {animPct}%
              </span>
            </div>
          </div>

          {/* Subtitle */}
          <p className="text-xs text-muted-foreground mt-3 text-center">
            {approvedCount.toLocaleString()} of {totalCount.toLocaleString()} farms approved
          </p>

          {/* Tick labels */}
          <div className="flex justify-between w-full mt-1 px-1" style={{ maxWidth: 180 }}>
            <span className="text-[10px] text-muted-foreground">0%</span>
            <span className="text-[10px] text-muted-foreground">50%</span>
            <span className="text-[10px] text-muted-foreground">100%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
