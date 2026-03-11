'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { FadeIn } from '@/components/marketing/motion';

export interface FAQItem {
  question: string;
  answer: string;
}

function FAQRow({ question, answer, index }: FAQItem & { index: number }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b last:border-b-0" data-testid={`faq-item-${index}`}>
      <button
        className="w-full flex items-center justify-between gap-4 py-5 text-left hover-elevate rounded-md px-2"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        data-testid={`button-faq-toggle-${index}`}
      >
        <span className="font-medium text-sm md:text-base">{question}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p
              className="px-2 pb-5 text-sm text-muted-foreground leading-relaxed"
              data-testid={`text-faq-answer-${index}`}
            >
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MarketingFAQAccordion({ faqs }: { faqs: FAQItem[] }) {
  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        {faqs.map((faq, i) => (
          <FAQRow key={i} question={faq.question} answer={faq.answer} index={i} />
        ))}
      </CardContent>
    </Card>
  );
}


// ── SimpleFAQList ─────────────────────────────────────────────────────────────
// Used by USA, UK, UAE compliance pages (border/bg styled variant)
interface SimpleFAQItem {
  question: string;
  answer: string;
}

function SimpleFAQRow({
  faq,
  index,
  testIdPrefix = 'faq',
}: {
  faq: SimpleFAQItem;
  index: number;
  testIdPrefix?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <FadeIn delay={index * 0.05}>
      <div
        className="border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800/50 overflow-hidden"
        data-testid={`faq-item-${index}`}
      >
        <button
          className="w-full flex items-center justify-between gap-4 p-5 text-left"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          data-testid={`button-${testIdPrefix}-${index}`}
        >
          <span className="font-semibold text-slate-900 dark:text-white text-sm md:text-base">
            {faq.question}
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
        {isOpen && (
          <div className="px-5 pb-5">
            <p
              className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed"
              data-testid={`text-faq-answer-${index}`}
            >
              {faq.answer}
            </p>
          </div>
        )}
      </div>
    </FadeIn>
  );
}

export function SimpleFAQList({
  items,
  testIdPrefix = 'faq',
}: {
  items: SimpleFAQItem[];
  testIdPrefix?: string;
}) {
  return (
    <div className="space-y-3">
      {items.map((faq, i) => (
        <SimpleFAQRow key={i} faq={faq} index={i} testIdPrefix={testIdPrefix} />
      ))}
    </div>
  );
}


// ── CardFAQList ───────────────────────────────────────────────────────────────
// Used by UK and UAE pages (Card-wrapped variant)
function CardFAQRow({ faq, index }: { faq: SimpleFAQItem; index: number }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <FadeIn delay={index * 0.05}>
      <Card data-testid={`faq-item-${index}`}>
        <CardContent className="p-0">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-start justify-between gap-4 p-5 text-left"
            aria-expanded={isOpen}
            data-testid={`button-faq-${index}`}
          >
            <span className="text-sm font-medium text-slate-900 dark:text-white leading-relaxed">
              {faq.question}
            </span>
            <ChevronDown
              className={`w-5 h-5 text-slate-400 shrink-0 mt-0.5 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
          {isOpen && (
            <div className="px-5 pb-5 -mt-1">
              <p
                className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed"
                data-testid={`text-faq-answer-${index}`}
              >
                {faq.answer}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </FadeIn>
  );
}

export function CardFAQList({ items }: { items: SimpleFAQItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((faq, i) => (
        <CardFAQRow key={i} faq={faq} index={i} />
      ))}
    </div>
  );
}
