'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, CheckCircle2, Landmark, Scale, ShieldCheck } from 'lucide-react';
import { FadeIn } from '@/components/marketing/motion';
import type { LucideIcon } from 'lucide-react';

interface RegulatoryBody {
  name: string;
  fullName: string;
  icon: LucideIcon;
  description: string;
  responsibilities: string[];
}

const regulatoryBodies: RegulatoryBody[] = [
  {
    name: 'GACC',
    fullName: 'General Administration of Customs of China',
    icon: Landmark,
    description: 'Oversees all import/export customs operations, enforces food safety at borders, and manages the registration of overseas food production facilities.',
    responsibilities: [
      'Facility registration for overseas producers',
      'Border inspection and quarantine',
      'Import/export documentation review',
      'Risk assessment and monitoring',
    ],
  },
  {
    name: 'SAMR',
    fullName: 'State Administration for Market Regulation',
    icon: Scale,
    description: 'Responsible for domestic market supervision, food safety standards enforcement, and product quality certification within China.',
    responsibilities: [
      'Food safety standards enforcement',
      'Product certification and labeling',
      'Market access licensing',
      'Quality inspection protocols',
    ],
  },
  {
    name: 'NHC',
    fullName: 'National Health Commission',
    icon: ShieldCheck,
    description: 'Sets food safety risk assessment standards, manages national food safety standards (GB standards), and oversees public health aspects of imported food.',
    responsibilities: [
      'National food safety standards (GB)',
      'Risk assessment frameworks',
      'Maximum residue limits (MRLs)',
      'Contaminant thresholds',
    ],
  },
];

export function ChinaRegulatoryTabs() {
  const [activeTab, setActiveTab] = useState(0);
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex border-b border-slate-200 dark:border-slate-700 mb-0">
        {regulatoryBodies.map((body, index) => (
          <button
            key={body.name}
            onClick={() => setActiveTab(index)}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              activeTab === index
                ? 'text-emerald-600 dark:text-emerald-400 border-emerald-600 dark:border-emerald-400'
                : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-300'
            }`}
            data-testid={`button-tab-${body.name.toLowerCase()}`}
          >
            <div className="flex items-center justify-center gap-2">
              <body.icon className="w-4 h-4" />
              <span>{body.name}</span>
            </div>
          </button>
        ))}
      </div>
      <Card className="rounded-t-none border-t-0">
        <CardContent
          className="p-6 md:p-8"
          data-testid={`card-regulatory-${regulatoryBodies[activeTab].name.toLowerCase()}`}
        >
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{regulatoryBodies[activeTab].name}</h3>
          </div>
          <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mb-4">{regulatoryBodies[activeTab].fullName}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">{regulatoryBodies[activeTab].description}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {regulatoryBodies[activeTab].responsibilities.map((resp, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <span>{resp}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface FAQItem {
  question: string;
  answer: string;
}

export function ChinaFAQList({ items }: { items: FAQItem[] }) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <FadeIn key={index} delay={index * 0.05}>
          <Card data-testid={`faq-item-${index}`}>
            <CardContent className="p-0">
              <button
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className="w-full flex items-center justify-between gap-4 p-5 text-left"
                aria-expanded={openFaq === index}
                data-testid={`button-faq-toggle-${index}`}
              >
                <span className="text-sm font-semibold text-slate-900 dark:text-white">{item.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                    openFaq === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaq === index && (
                <div className="px-5 pb-5">
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed" data-testid={`text-faq-answer-${index}`}>
                    {item.answer}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      ))}
    </div>
  );
}
