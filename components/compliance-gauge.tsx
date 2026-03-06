'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';

interface ComplianceGaugeProps {
  approvedCount: number;
  totalCount: number;
}

export function ComplianceGauge({ approvedCount, totalCount }: ComplianceGaugeProps) {
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const percent = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercent(percent);
    }, 100);
    return () => clearTimeout(timer);
  }, [percent]);

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (animatedPercent / 100) * circumference;

  const getColor = () => {
    if (percent >= 80) return { stroke: '#16a34a', text: 'text-green-600' };
    if (percent >= 50) return { stroke: '#f59e0b', text: 'text-amber-600' };
    return { stroke: '#dc2626', text: 'text-red-600' };
  };

  const color = getColor();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Compliance Gauge
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted/20"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={color.stroke}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold ${color.text}`}>{animatedPercent}%</span>
              <span className="text-xs text-muted-foreground">Audit-Ready</span>
            </div>
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              {approvedCount} of {totalCount} farms approved
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
