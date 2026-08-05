'use client';

import { useState } from 'react';
import { ChevronRight, Check } from 'lucide-react';
import { StaggerContainer, StaggerItem } from '@/components/marketing/motion';

interface Capability {
  number: string;
  title: string;
  description: string;
  points: string[];
}

export function HomeCapabilityAccordion({ capabilities }: { capabilities: Capability[] }) {
  const [openCapability, setOpenCapability] = useState(0);

  return (
    <div className="max-w-3xl mx-auto mt-14">
      <StaggerContainer className="space-y-0">
        {capabilities.map((cap, i) => (
          <StaggerItem key={i}>
            <div className="border-b border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setOpenCapability(openCapability === i ? -1 : i)}
                className="w-full flex items-center gap-4 py-5 text-left group"
                data-testid={`button-capability-${i}`}
              >
                <span className="text-xs font-mono text-slate-400 dark:text-slate-500 shrink-0">({cap.number})</span>
                <span
                  className={`text-base font-semibold flex-1 transition-colors ${
                    openCapability === i
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white'
                  }`}
                >
                  {cap.title}
                </span>
                <ChevronRight
                  className={`h-4 w-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                    openCapability === i ? 'rotate-90' : ''
                  }`}
                />
              </button>
              {openCapability === i && (
                <div className="pb-6 pl-10 pr-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">{cap.description}</p>
                  <ul className="space-y-2">
                    {cap.points.map((point, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-slate-600 dark:text-slate-400">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </div>
  );
}
