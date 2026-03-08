'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import HeroBackground from '@/components/marketing/hero-background';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/marketing/motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ShieldCheck,
  Database,
  ClipboardList,
  Truck,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  AlertTriangle,
  Calendar,
  MapPin,
  BarChart3,
  FileCheck,
  Package,
} from 'lucide-react';

const foodTraceabilityList = [
  { category: 'Seafood', items: ['Finfish (fresh/frozen)', 'Smoked finfish', 'Crustaceans (fresh/frozen)'] },
  { category: 'Produce', items: ['Cucumbers (fresh)', 'Herbs (fresh)', 'Leafy greens (fresh/fresh-cut)', 'Peppers (fresh)', 'Sprouts (fresh)', 'Tomatoes (fresh)'] },
  { category: 'Fruits', items: ['Tropical tree fruits (fresh)', 'Fruits (fresh-cut)'] },
  { category: 'Other', items: ['Shell eggs', 'Nut butters', 'Vegetables (fresh-cut)', 'Ready-to-eat deli salads', 'Soft cheeses (certain)'] },
];

const kdeCategories = [
  {
    title: 'Growing / Harvesting',
    icon: MapPin,
    items: [
      'Growing area coordinates',
      'Harvest date',
      'Cooling location',
      'Quantity and unit of measure',
    ],
  },
  {
    title: 'Receiving / Shipping',
    icon: Truck,
    items: [
      'Traceability lot code',
      'Entry / ship date and time',
      'Origin and destination locations',
      'Reference document (PO, BOL)',
    ],
  },
  {
    title: 'Transformation',
    icon: Package,
    items: [
      'Input and output traceability lot codes',
      'New quantity and unit of measure',
      'Transformation date',
      'Location of transformation',
    ],
  },
];

const criticalTrackingEvents = [
  { event: 'Growing', description: 'Where and when food was grown or raised' },
  { event: 'Receiving', description: 'Receipt of food at a facility' },
  { event: 'Transformation', description: 'When food changes form (processing, packing)' },
  { event: 'Shipping', description: 'Dispatch of food from a facility' },
];

const howOriginTraceHelps = [
  {
    icon: Database,
    title: 'Lot-Level Traceability',
    description: 'Track every lot from farm origin through each critical tracking event with unique traceability lot codes linked across your entire supply chain.',
  },
  {
    icon: ClipboardList,
    title: 'KDE Capture & Storage',
    description: 'Structured data capture for all required Key Data Elements at each Critical Tracking Event, ensuring no gaps in your recordkeeping.',
  },
  {
    icon: FileCheck,
    title: 'Sortable, Searchable Records',
    description: 'Maintain electronic records in the format FDA requires — sortable and searchable within 24 hours of a request, with 2-year retention built in.',
  },
  {
    icon: Truck,
    title: 'Supply Chain Link Mapping',
    description: 'Map every supplier, receiver, and processor in your supply chain with their FTL food assignments and traceability protocols.',
  },
  {
    icon: BarChart3,
    title: 'Compliance Scoring',
    description: 'Real-time compliance scoring highlights gaps in your traceability data before FDA inspectors find them, reducing your audit risk.',
  },
  {
    icon: ShieldCheck,
    title: 'Audit-Ready Reports',
    description: 'Generate FDA-ready traceability reports in seconds — complete with lot genealogy, CTE timelines, and KDE verification for rapid response to recalls.',
  },
];

const timelineMilestones = [
  { date: 'September 2020', label: 'Proposed Rule published by FDA' },
  { date: 'November 2022', label: 'Final Rule published in Federal Register' },
  { date: 'January 2023', label: 'Final Rule effective date' },
  { date: 'January 2026', label: 'Compliance date for large businesses' },
  { date: 'July 2028', label: 'Full enforcement deadline for all covered entities', highlight: true },
];

const faqItems = [
  {
    question: 'Who must comply with FSMA 204?',
    answer: 'Any entity that manufactures, processes, packs, or holds foods on the Food Traceability List (FTL) is subject to the rule. This includes growers, receivers, processors, packers, and distributors. Restaurants and retail food establishments that do not manufacture or process FTL foods are generally exempt.',
  },
  {
    question: 'What is the Food Traceability List (FTL)?',
    answer: 'The FTL is an FDA-designated list of high-risk foods requiring enhanced traceability records. It includes fresh leafy greens, fresh herbs, fresh-cut fruits and vegetables, shell eggs, nut butters, certain soft cheeses, finfish, crustaceans, smoked finfish, and other foods identified through risk-ranking methodology.',
  },
  {
    question: 'What are Key Data Elements (KDEs) and Critical Tracking Events (CTEs)?',
    answer: 'KDEs are specific pieces of information that must be recorded at each Critical Tracking Event. CTEs are the key points in the supply chain — growing, receiving, transformation (processing), and shipping — where KDE data must be captured and linked to traceability lot codes.',
  },
  {
    question: 'How quickly must records be produced during an inspection?',
    answer: 'Covered entities must be able to provide traceability records to the FDA within 24 hours of a request, or within a "reasonable time" agreed upon with the FDA. Records must be maintained for at least 2 years and be sortable and searchable electronically.',
  },
  {
    question: 'Does FSMA 204 apply to imported foods?',
    answer: 'Yes. Any food on the FTL that is imported into the United States is subject to the traceability requirements. Importers must ensure they receive the required KDEs from foreign suppliers and maintain those records in accordance with the rule.',
  },
  {
    question: 'What happens if my business is not compliant?',
    answer: 'Non-compliance can result in FDA warning letters, import alerts, product detention, and potential enforcement actions. During a foodborne illness outbreak, inability to rapidly trace the source through your supply chain can lead to broader recalls, increased liability, and reputational damage.',
  },
  {
    question: 'Are there exemptions for small businesses?',
    answer: 'There is no blanket small business exemption. However, certain farm-level activities may qualify for modified requirements, and businesses that only perform retail activities without manufacturing or processing FTL foods may be exempt. The rule also provides partial exemptions for certain produce operations subject to the Produce Safety Rule.',
  },
  {
    question: 'How does OriginTrace help with FSMA 204 compliance?',
    answer: 'OriginTrace provides end-to-end lot-level traceability with structured KDE capture at every CTE. Our platform generates audit-ready reports, maintains searchable electronic records, maps supply chain links, and provides real-time compliance scoring — ensuring you can respond to FDA requests within the 24-hour window.',
  },
];

export default function USACompliancePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      <MarketingNav />

      <main className="min-h-screen">
        <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden" data-testid="section-hero">
          <HeroBackground />
          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <FadeIn>
              <div className="text-center max-w-4xl mx-auto">
                <span className="inline-block text-xs font-semibold tracking-widest uppercase text-emerald-600 dark:text-emerald-400 mb-4" data-testid="text-section-label">
                  [ USA Compliance ]
                </span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white mb-6 leading-tight" data-testid="text-hero-title">
                  FSMA 204 — Food Traceability Rule
                </h1>
                <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-4 max-w-3xl mx-auto leading-relaxed" data-testid="text-hero-subtitle">
                  The FDA&apos;s final rule on food traceability requires enhanced recordkeeping for high-risk foods across the entire supply chain. Full enforcement begins <strong className="text-slate-900 dark:text-white">July 2028</strong>.
                </p>
                <p className="text-base text-slate-500 dark:text-slate-500 mb-10 max-w-2xl mx-auto">
                  OriginTrace helps you capture Key Data Elements at every Critical Tracking Event — ensuring audit-ready compliance from farm to fork.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link href="/demo">
                    <Button className="bg-emerald-600 text-white px-8" data-testid="button-hero-demo">
                      Get Compliant
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/solutions">
                    <Button variant="outline" data-testid="button-hero-solutions">
                      Explore Platform
                    </Button>
                  </Link>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        <section className="py-16 md:py-20 border-t border-slate-200 dark:border-slate-800" data-testid="section-who-must-comply">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn>
              <span className="inline-block text-xs font-semibold tracking-widest uppercase text-emerald-600 dark:text-emerald-400 mb-4">
                [ Who Must Comply ]
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-6">
                Does FSMA 204 Apply to Your Business?
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-12 max-w-3xl leading-relaxed">
                The Food Traceability Rule applies to all entities that manufacture, process, pack, or hold foods on the FDA&apos;s Food Traceability List — from growers and importers to distributors and retailers.
              </p>
            </FadeIn>
            <StaggerContainer className="grid md:grid-cols-3 gap-6">
              {[
                {
                  title: 'Growers & Harvesters',
                  description: 'Farms growing FTL produce must record harvest data, growing area coordinates, and cooling information with traceability lot codes.',
                  icon: MapPin,
                },
                {
                  title: 'Manufacturers & Processors',
                  description: 'Entities that transform FTL foods must link input and output lot codes, record transformation data, and maintain supply chain references.',
                  icon: Package,
                },
                {
                  title: 'Importers & Distributors',
                  description: 'Anyone importing, shipping, or receiving FTL foods must capture receiving/shipping KDEs and maintain electronic traceability records.',
                  icon: Truck,
                },
              ].map((item) => (
                <StaggerItem key={item.title}>
                  <Card className="h-full" data-testid={`card-who-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                    <CardContent className="p-6">
                      <item.icon className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mb-4" />
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{item.title}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{item.description}</p>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        <section className="py-16 md:py-20 bg-slate-50 dark:bg-slate-900/20 border-t border-slate-200 dark:border-slate-800" data-testid="section-ftl">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn>
              <span className="inline-block text-xs font-semibold tracking-widest uppercase text-emerald-600 dark:text-emerald-400 mb-4">
                [ Food Traceability List ]
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-6">
                FDA&apos;s High-Risk Food Categories
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-12 max-w-3xl leading-relaxed">
                The FDA identified these food categories through a risk-ranking model based on foodborne illness outbreak data. If you handle any of these foods, enhanced traceability records are required.
              </p>
            </FadeIn>
            <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {foodTraceabilityList.map((group) => (
                <StaggerItem key={group.category}>
                  <div className="h-full" data-testid={`card-ftl-${group.category.toLowerCase()}`}>
                    <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-3">{group.category}</h3>
                    <ul className="space-y-2">
                      {group.items.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                          <span className="text-sm text-slate-700 dark:text-slate-300">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        <section className="py-16 md:py-20 border-t border-slate-200 dark:border-slate-800" data-testid="section-kdes-ctes">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn>
              <span className="inline-block text-xs font-semibold tracking-widest uppercase text-emerald-600 dark:text-emerald-400 mb-4">
                [ Key Data Elements & Critical Tracking Events ]
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-6">
                What You Need to Record
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-12 max-w-3xl leading-relaxed">
                FSMA 204 mandates capturing specific Key Data Elements (KDEs) at each Critical Tracking Event (CTE) in the supply chain. Every link must maintain and share this data.
              </p>
            </FadeIn>

            <FadeIn delay={0.1}>
              <div className="mb-12">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Critical Tracking Event Flow</h3>
                <div className="flex flex-col md:flex-row items-stretch gap-0">
                  {criticalTrackingEvents.map((cte, i) => (
                    <div key={cte.event} className="flex-1 flex items-stretch" data-testid={`text-cte-${cte.event.toLowerCase()}`}>
                      <div className="flex-1 p-5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 relative">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-sm mb-3">
                          {i + 1}
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white mb-1">{cte.event}</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{cte.description}</p>
                      </div>
                      {i < criticalTrackingEvents.length - 1 && (
                        <div className="flex items-center px-2 text-emerald-400">
                          <ArrowRight className="h-5 w-5 hidden md:block" />
                          <ChevronDown className="h-5 w-5 md:hidden" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>

            <div className="grid lg:grid-cols-2 gap-12">
              <FadeIn direction="left">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Key Data Elements by Stage</h3>
                <div className="space-y-6">
                  {kdeCategories.map((cat) => (
                    <Card className="h-full" key={cat.title} data-testid={`card-kde-${cat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <CardContent className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <cat.icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                          <h4 className="font-bold text-slate-900 dark:text-white">{cat.title}</h4>
                        </div>
                        <ul className="space-y-2">
                          {cat.items.map((item) => (
                            <li key={item} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </FadeIn>

              <FadeIn direction="right">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Record-Keeping Requirements</h3>
                <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800" data-testid="card-record-keeping">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3 mb-4">
                      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                      <h4 className="font-bold text-slate-900 dark:text-white">FDA Compliance Essentials</h4>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-3 rounded-md bg-white/60 dark:bg-slate-900/30">
                        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-amber-700 dark:text-amber-300">24h</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">Response Window</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Records must be provided within 24 hours of FDA request</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-md bg-white/60 dark:bg-slate-900/30">
                        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-amber-700 dark:text-amber-300">2yr</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">Retention Period</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Minimum 2-year retention period required</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-md bg-white/60 dark:bg-slate-900/30">
                        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                          <Database className="w-4 h-4 text-amber-700 dark:text-amber-300" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">Electronic Format</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Electronic records must be sortable and searchable</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-md bg-white/60 dark:bg-slate-900/30">
                        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                          <FileCheck className="w-4 h-4 text-amber-700 dark:text-amber-300" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">Traceability Plan</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Must include a traceability plan describing your procedures</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </FadeIn>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20 bg-slate-50 dark:bg-slate-900/20 border-t border-slate-200 dark:border-slate-800" data-testid="section-how-origintrace-helps">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn>
              <div className="text-center mb-16">
                <span className="inline-block text-xs font-semibold tracking-widest uppercase text-emerald-600 dark:text-emerald-400 mb-4">
                  [ How OriginTrace Helps ]
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-6">
                  FSMA 204 Compliance, Built In
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
                  OriginTrace maps directly to FSMA 204 requirements — capturing KDEs at every CTE, maintaining audit-ready records, and scoring your compliance in real time.
                </p>
              </div>
            </FadeIn>
            <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {howOriginTraceHelps.map((item) => (
                <StaggerItem key={item.title}>
                  <Card className="h-full" data-testid={`card-feature-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                    <CardContent className="p-6">
                      <item.icon className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mb-4" />
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{item.title}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{item.description}</p>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>
            <FadeIn delay={0.3}>
              <div className="text-center mt-12">
                <Link href="/demo">
                  <Button className="bg-emerald-600 text-white px-8" data-testid="button-mid-cta-demo">
                    See It in Action
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>

        <section className="py-16 md:py-20 border-t border-slate-200 dark:border-slate-800" data-testid="section-timeline">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn>
              <span className="inline-block text-xs font-semibold tracking-widest uppercase text-emerald-600 dark:text-emerald-400 mb-4">
                [ Timeline ]
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-6">
                FSMA 204 Compliance Timeline
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-12 max-w-3xl leading-relaxed">
                The FDA finalized the rule in November 2022. Full compliance for all covered entities is required by July 2028.
              </p>
            </FadeIn>
            <FadeIn delay={0.2}>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-emerald-200 dark:bg-emerald-800 md:left-1/2 md:-translate-x-px" />
                <div className="space-y-8">
                  {timelineMilestones.map((milestone, i) => (
                    <div key={milestone.date} className={`relative flex items-start gap-6 md:gap-0 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`} data-testid={`text-timeline-${i}`}>
                      <div className={`hidden md:block md:w-1/2 ${i % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12 md:text-left'}`}>
                        <span className={`text-sm font-semibold ${milestone.highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                          {milestone.date}
                        </span>
                        <p className="text-slate-700 dark:text-slate-300 mt-1">{milestone.label}</p>
                      </div>
                      <div className="absolute left-0 md:left-1/2 md:-translate-x-1/2 z-10">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          milestone.highlight
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white dark:bg-slate-800 border-2 border-emerald-300 dark:border-emerald-700'
                        }`}>
                          <Calendar className="h-3.5 w-3.5" />
                        </div>
                      </div>
                      <div className="md:hidden pl-10">
                        <span className={`text-sm font-semibold ${milestone.highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                          {milestone.date}
                        </span>
                        <p className="text-slate-700 dark:text-slate-300 mt-1">{milestone.label}</p>
                      </div>
                      <div className={`hidden md:block md:w-1/2 ${i % 2 === 0 ? 'md:pl-12' : 'md:pr-12'}`} />
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        <section className="py-16 md:py-20 bg-slate-50 dark:bg-slate-900/20 border-t border-slate-200 dark:border-slate-800" data-testid="section-faq">
          <div className="max-w-4xl mx-auto px-6">
            <FadeIn>
              <span className="inline-block text-xs font-semibold tracking-widest uppercase text-emerald-600 dark:text-emerald-400 mb-4">
                [ Frequently Asked Questions ]
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-12">
                FSMA 204 FAQ
              </h2>
            </FadeIn>
            <div className="space-y-3">
              {faqItems.map((faq, i) => (
                <FadeIn key={i} delay={i * 0.05}>
                  <div
                    className="border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800/50 overflow-hidden"
                    data-testid={`faq-item-${i}`}
                  >
                    <button
                      className="w-full flex items-center justify-between gap-4 p-5 text-left"
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      data-testid={`button-faq-${i}`}
                    >
                      <span className="font-semibold text-slate-900 dark:text-white text-sm md:text-base">{faq.question}</span>
                      <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                    </button>
                    {openFaq === i && (
                      <div className="px-5 pb-5">
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20 bg-emerald-600 dark:bg-emerald-900 border-t" data-testid="section-cta">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <FadeIn>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-6">
                Start Your FSMA 204 Compliance Journey
              </h2>
              <p className="text-lg text-emerald-100 mb-10 max-w-2xl mx-auto leading-relaxed">
                Don&apos;t wait for the enforcement deadline. OriginTrace gives you lot-level traceability, structured KDE capture, and audit-ready reports — so you&apos;re compliant before July 2028.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/demo">
                  <Button className="bg-white text-emerald-700 px-8" data-testid="button-cta-demo">
                    Request a Demo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/compliance">
                  <Button variant="outline" className="border-white/30 text-white backdrop-blur-sm bg-white/10" data-testid="button-cta-compliance">
                    View All Regulations
                  </Button>
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </>
  );
}
