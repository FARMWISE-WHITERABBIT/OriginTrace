'use client';

import { CheckCircle, MapPin, Users, TreePine, Package, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { STEPS } from './types';

const STEP_ICONS = {
  MapPin, Users, TreePine, Package, ShieldCheck, CheckCircle,
} as const;

interface CollectionStepperProps {
  step: number;
  setStep: (s: number) => void;
}

export function CollectionStepper({ step, setStep }: CollectionStepperProps) {
  return (
    <>
      <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:hidden">
        {STEPS.map((s) => {
          const Icon = STEP_ICONS[s.icon];
          const isActive = step === s.id;
          const isDone = step > s.id;
          return (
            <button
              key={s.id}
              onClick={() => { if (isDone) setStep(s.id); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                isActive ? 'bg-primary text-primary-foreground' :
                isDone ? 'bg-primary/10 text-primary cursor-pointer' :
                'bg-muted text-muted-foreground'
              }`}
              data-testid={`step-${s.id}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {s.label}
            </button>
          );
        })}
      </div>

      <Card className="hidden lg:block">
        <CardContent className="py-4 px-6">
          <div className="flex items-start gap-1">
            {STEPS.map((s, index) => {
              const Icon = STEP_ICONS[s.icon];
              const isActive = step === s.id;
              const isDone = step > s.id;
              return (
                <div key={s.id} className="flex items-center flex-1 last:flex-initial">
                  <button
                    onClick={() => { if (isDone) setStep(s.id); }}
                    className={`flex flex-col items-center gap-1 min-w-[60px] ${isDone ? 'cursor-pointer' : 'cursor-default'}`}
                    data-testid={`step-desktop-${s.id}`}
                  >
                    <div className={`flex items-center justify-center rounded-full p-2 transition-colors ${
                      isActive ? 'bg-primary text-primary-foreground shadow-sm' :
                      isDone ? 'bg-primary/15 text-primary' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {isDone ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    <span className={`text-[11px] font-medium whitespace-nowrap ${
                      isActive ? 'text-foreground' :
                      isDone ? 'text-primary' :
                      'text-muted-foreground'
                    }`}>
                      {s.label}
                    </span>
                  </button>
                  {index < STEPS.length - 1 && (
                    <div className={`flex-1 h-px mx-1 mt-[18px] transition-colors ${
                      step > s.id ? 'bg-primary' : 'bg-border'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
