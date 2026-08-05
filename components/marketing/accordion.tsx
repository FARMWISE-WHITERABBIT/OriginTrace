'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, AlertTriangle, Shield } from 'lucide-react';

interface AccordionItem {
  risk: string;
  riskDetail: string;
  solution: string;
  solutionDetail: string;
}

interface RiskAccordionProps {
  items: AccordionItem[];
}

export function RiskAccordion({ items }: RiskAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div 
          key={index}
          className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-card"
        >
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
            data-testid={`accordion-trigger-${index}`}
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
              <span className="font-medium text-sm">{item.risk}</span>
            </div>
            <motion.div
              animate={{ rotate: openIndex === index ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </motion.div>
          </button>
          
          <AnimatePresence>
            {openIndex === index && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="px-5 pb-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="grid md:grid-cols-2 gap-4 pt-4">
                    <div className="p-4 bg-amber-50 dark:bg-amber-500/10 rounded-lg">
                      <p className="text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2 font-medium">
                        The Risk
                      </p>
                      <p className="text-sm text-muted-foreground">{item.riskDetail}</p>
                    </div>
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <p className="text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-medium">
                          OriginTrace Solution
                        </p>
                      </div>
                      <p className="text-sm font-medium mb-1">{item.solution}</p>
                      <p className="text-sm text-muted-foreground">{item.solutionDetail}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

interface SimpleAccordionItem {
  title: string;
  content: string;
}

interface SimpleAccordionProps {
  items: SimpleAccordionItem[];
}

export function SimpleAccordion({ items }: SimpleAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div 
          key={index}
          className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
        >
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
          >
            <span className="font-medium text-sm">{item.title}</span>
            <motion.div
              animate={{ rotate: openIndex === index ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </motion.div>
          </button>
          
          <AnimatePresence>
            {openIndex === index && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="px-4 pb-4 text-sm text-muted-foreground">
                  {item.content}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
