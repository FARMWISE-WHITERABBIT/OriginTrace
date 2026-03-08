'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import HeroBackground from '@/components/marketing/hero-background';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/marketing/motion';
import {
  MapPin,
  FileText,
  Shield,
  ChevronRight,
  TreePine,
  Scale,
  Search,
  Globe,
  BarChart3,
  Download,
  CheckCircle,
  ChevronDown,
  Target,
  Clock,
  Users,
  Coffee,
  Bean,
  TreePalm,
  Wheat,
  Droplets,
  Beef,
} from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const commodities = [
  { name: 'Cocoa', icon: Bean },
  { name: 'Coffee', icon: Coffee },
  { name: 'Soy', icon: Wheat },
  { name: 'Palm Oil', icon: TreePalm },
  { name: 'Rubber', icon: Droplets },
  { name: 'Cattle / Leather', icon: Beef },
  { name: 'Wood / Timber', icon: TreePine },
];

const coreRequirements = [
  {
    icon: TreePine,
    title: 'Deforestation-Free',
    description: 'Products must be produced on land that has not been subject to deforestation after December 31, 2020. Operators must prove no forest degradation occurred.',
  },
  {
    icon: Scale,
    title: 'Legally Produced',
    description: 'All production must comply with the laws of the country of origin — including land use, environmental protection, labor rights, and tax obligations.',
  },
  {
    icon: Search,
    title: 'Due Diligence Statement',
    description: 'Operators must submit a due diligence statement to the EU Information System before placing products on the EU market or exporting from it.',
  },
];

const howOriginTraceHelps = [
  {
    icon: MapPin,
    title: 'GPS Polygon Mapping',
    description: 'Capture precise farm boundary coordinates using mobile devices. Each plot is mapped with GPS polygons that satisfy EUDR geolocation requirements — down to the individual farm level.',
  },
  {
    icon: Download,
    title: 'DDS Export Generation',
    description: 'Automatically generate Due Diligence Statements with all required data fields. Export-ready documentation formatted for the EU Information System submission.',
  },
  {
    icon: BarChart3,
    title: 'Compliance Scoring',
    description: 'Real-time readiness scores across every shipment — covering traceability depth, documentation completeness, geolocation coverage, and risk indicators.',
  },
  {
    icon: Globe,
    title: 'Full Supply Chain Traceability',
    description: 'Trace every batch from farm gate through processing and export. Maintain chain-of-custody records that link finished goods to their exact source plots.',
  },
  {
    icon: Shield,
    title: 'Risk Assessment Engine',
    description: 'Automated risk classification based on country risk levels, supplier history, satellite deforestation alerts, and documentation gaps.',
  },
  {
    icon: FileText,
    title: 'Audit-Ready Data Vault',
    description: 'Centralized, tamper-evident storage of all compliance evidence — farm registrations, GPS data, transaction records, and processing logs — retrievable in seconds.',
  },
];

const timeline = [
  { date: 'June 2023', event: 'EUDR entered into force (Regulation 2023/1115)', status: 'complete' },
  { date: 'December 2024', event: 'Original compliance deadline (postponed)', status: 'complete' },
  { date: 'December 30, 2025', event: 'Compliance deadline for large operators', status: 'upcoming' },
  { date: 'June 30, 2026', event: 'Compliance deadline for SMEs (small/micro enterprises)', status: 'upcoming' },
  { date: 'December 30, 2026', event: 'Full enforcement — all operators and traders must comply', status: 'upcoming' },
];

const faqs = [
  {
    question: 'What is the EUDR and when does it take effect?',
    answer: 'The EU Deforestation Regulation (EUDR, Regulation 2023/1115) requires that certain commodities and derived products placed on or exported from the EU market are deforestation-free, legally produced, and covered by a due diligence statement. Large operators must comply by December 30, 2025, with full enforcement for all operators by December 30, 2026.',
  },
  {
    question: 'Which commodities are covered by the EUDR?',
    answer: 'The EUDR covers seven commodity groups: cocoa, coffee, soy, palm oil, rubber, cattle (including leather), and wood (including timber and paper products). It also covers a wide range of derived products — for example, chocolate, furniture, tires, and printed paper.',
  },
  {
    question: 'Who needs to comply with the EUDR?',
    answer: 'Any operator or trader placing covered commodities on the EU market — or exporting them from the EU — must comply. This includes EU-based importers, distributors, and retailers, as well as non-EU exporters whose products enter the EU market. The regulation applies regardless of where the commodities were produced.',
  },
  {
    question: 'What geolocation data is required under the EUDR?',
    answer: 'Operators must provide the geolocation coordinates of all plots of land where the commodity was produced. For plots larger than 4 hectares, polygon boundary coordinates are required (not just a single GPS point). This data must be included in the due diligence statement submitted to the EU Information System.',
  },
  {
    question: 'How does OriginTrace help with EUDR compliance?',
    answer: 'OriginTrace provides end-to-end infrastructure for EUDR compliance: GPS polygon farm mapping, full supply chain traceability from farm to export, automated due diligence statement generation, compliance scoring, risk assessment, and an audit-ready data vault. The platform is designed for real-world conditions in producing countries — working offline, on any smartphone, and in low-connectivity environments.',
  },
  {
    question: 'What happens if an operator fails to comply with the EUDR?',
    answer: 'Non-compliance can result in fines of up to 4% of the operator\'s annual EU-wide turnover, confiscation of products, exclusion from public procurement, and a temporary ban on placing products on the EU market. Competent authorities in each EU member state are responsible for enforcement and inspections.',
  },
  {
    question: 'Does the EUDR apply to smallholder farmers?',
    answer: 'The EUDR applies to operators and traders, not directly to smallholder farmers. However, smallholders are significantly affected because operators must trace commodities back to the farm level and verify deforestation-free status. OriginTrace is specifically designed to make this farm-level data collection practical — even in remote, low-infrastructure regions.',
  },
  {
    question: 'How is the December 31, 2020 cut-off date applied?',
    answer: 'The EUDR uses December 31, 2020 as the deforestation cut-off date. Any land that was forested before this date and subsequently cleared is considered non-compliant. Satellite imagery and geospatial analysis are used to verify that production land was not subject to deforestation after this date.',
  },
];

function FAQItem({ question, answer, index }: { question: string; answer: string; index: number }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b last:border-b-0" data-testid={`faq-item-${index}`}>
      <button
        className="w-full flex items-center justify-between gap-4 py-5 text-left hover-elevate rounded-md px-2"
        onClick={() => setIsOpen(!isOpen)}
        data-testid={`button-faq-toggle-${index}`}
      >
        <span className="font-medium text-sm md:text-base">{question}</span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
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
            <p className="px-2 pb-5 text-sm text-muted-foreground leading-relaxed" data-testid={`text-faq-answer-${index}`}>
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function EUDRCompliancePage() {
  return (
    <>
      <MarketingNav />

      <main className="min-h-screen">
        <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden" data-testid="section-hero">
          <HeroBackground />
          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <FadeIn>
              <div className="max-w-3xl mx-auto text-center">
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-4 tracking-wide uppercase">
                  [ EUDR Compliance ]
                </p>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mb-6 text-slate-900 dark:text-white" data-testid="heading-eudr-title">
                  EU Deforestation Regulation — Full Compliance Infrastructure
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto mb-4" data-testid="text-eudr-subtitle">
                  The EUDR (Regulation 2023/1115) requires operators to prove that commodities entering the EU market are deforestation-free, legally produced, and backed by a due diligence statement. Full enforcement begins December 30, 2026.
                </p>
                <p className="text-base text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto mb-8">
                  OriginTrace provides the end-to-end platform to meet every EUDR requirement — from GPS polygon farm mapping to automated DDS generation and real-time compliance scoring.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link href="/demo">
                    <Button size="lg" className="gap-2 bg-emerald-600 text-white" data-testid="button-eudr-demo">
                      Request Demo
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="#how-origintrace-helps">
                    <Button size="lg" variant="outline" className="gap-2" data-testid="button-eudr-learn-more">
                      See How It Works
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        <section className="py-16 md:py-20 border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              <FadeIn direction="left">
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-3 tracking-wide uppercase">
                  [ Who It Affects ]
                </p>
                <h2 className="text-2xl md:text-3xl font-extrabold mb-3 text-slate-900 dark:text-white" data-testid="heading-who-affected">
                  Who Must Comply with the EUDR?
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                  The regulation applies to any operator or trader placing covered commodities on the EU market — or exporting them from the EU. This includes importers, manufacturers, retailers, and non-EU exporters.
                </p>

                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 rounded-md bg-slate-50 dark:bg-slate-900/30">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                      <Globe className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900 dark:text-white mb-1">EU Importers & Distributors</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Any company placing covered products on the EU market must verify deforestation-free status and submit a due diligence statement.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-md bg-slate-50 dark:bg-slate-900/30">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                      <Target className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900 dark:text-white mb-1">Non-EU Exporters</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Exporters in producing countries must provide the geolocation, traceability, and compliance data that EU operators require for their due diligence.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-md bg-slate-50 dark:bg-slate-900/30">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                      <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900 dark:text-white mb-1">SME Traders</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Small and micro enterprises have a later deadline (June 2026) and simplified requirements — but must still demonstrate due diligence.
                      </p>
                    </div>
                  </div>
                </div>
              </FadeIn>

              <FadeIn direction="right">
                <div className="relative p-8 rounded-md bg-slate-900 dark:bg-slate-800 text-white">
                  <div className="absolute top-4 right-4">
                    <Globe className="h-24 w-24 text-emerald-500/10" />
                  </div>
                  <p className="text-xs font-semibold tracking-widest uppercase text-emerald-400 mb-6">
                    Global Reach
                  </p>
                  <div className="space-y-6 relative z-10">
                    <div>
                      <p className="text-4xl font-extrabold text-emerald-400">27</p>
                      <p className="text-sm text-slate-300 mt-1">EU member states enforcing the regulation</p>
                    </div>
                    <div className="border-t border-slate-700 pt-6">
                      <p className="text-4xl font-extrabold text-emerald-400">7</p>
                      <p className="text-sm text-slate-300 mt-1">Commodity groups covered by the EUDR</p>
                    </div>
                    <div className="border-t border-slate-700 pt-6">
                      <p className="text-4xl font-extrabold text-amber-400">4%</p>
                      <p className="text-sm text-slate-300 mt-1">Maximum fine as percentage of annual EU turnover</p>
                    </div>
                    <div className="border-t border-slate-700 pt-6">
                      <p className="text-4xl font-extrabold text-emerald-400">Dec 2020</p>
                      <p className="text-sm text-slate-300 mt-1">Deforestation cut-off date for compliance</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20 bg-slate-50 dark:bg-slate-900/20 border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="text-center mb-10">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-3 tracking-wide uppercase">
                [ Covered Commodities ]
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold mb-4 text-slate-900 dark:text-white" data-testid="heading-commodities">
                7 Commodity Groups Under the EUDR
              </h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
                The regulation covers these commodities and their derived products — from raw materials to processed goods like chocolate, furniture, and tires.
              </p>
            </FadeIn>

            <FadeIn delay={0.2}>
              <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
                {commodities.map((commodity, i) => (
                  <div
                    key={i}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50"
                    data-testid={`text-commodity-${i}`}
                  >
                    <commodity.icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{commodity.name}</span>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </section>

        <section className="py-16 md:py-20 border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="mb-12">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-3 tracking-wide uppercase">
                [ Core Requirements ]
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold mb-4 text-slate-900 dark:text-white" data-testid="heading-requirements">
                3 Pillars of EUDR Compliance
              </h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-xl">
                Every covered product must satisfy all three requirements before entering the EU market.
              </p>
            </FadeIn>

            <div className="grid lg:grid-cols-2 gap-10 items-start">
              <StaggerContainer className="space-y-6">
                {coreRequirements.map((req, i) => (
                  <StaggerItem key={i}>
                    <div className="flex gap-5" data-testid={`text-requirement-title-${i}`}>
                      <div className="flex flex-col items-center">
                        <div className="h-12 w-12 shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                          <req.icon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        {i < coreRequirements.length - 1 && (
                          <div className="w-px flex-1 bg-emerald-200 dark:bg-emerald-800 mt-3" />
                        )}
                      </div>
                      <div className="pb-6">
                        <h3 className="font-semibold text-lg mb-2 text-slate-900 dark:text-white">{req.title}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{req.description}</p>
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>

              <FadeIn direction="right">
                <div className="rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <h4 className="font-semibold text-slate-900 dark:text-white">Compliance Flow</h4>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">1</div>
                      <span className="text-slate-700 dark:text-slate-300">Map farm GPS polygons and verify land-use history</span>
                    </div>
                    <div className="w-px h-4 bg-emerald-300 dark:bg-emerald-700 ml-3" />
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">2</div>
                      <span className="text-slate-700 dark:text-slate-300">Confirm legal compliance with country-of-origin laws</span>
                    </div>
                    <div className="w-px h-4 bg-emerald-300 dark:bg-emerald-700 ml-3" />
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">3</div>
                      <span className="text-slate-700 dark:text-slate-300">Trace commodities through entire supply chain</span>
                    </div>
                    <div className="w-px h-4 bg-emerald-300 dark:bg-emerald-700 ml-3" />
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">4</div>
                      <span className="text-slate-700 dark:text-slate-300">Generate and submit Due Diligence Statement</span>
                    </div>
                    <div className="w-px h-4 bg-emerald-300 dark:bg-emerald-700 ml-3" />
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">5</div>
                      <span className="text-slate-700 dark:text-slate-300">Place product on the EU market with full audit trail</span>
                    </div>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        <section id="how-origintrace-helps" className="py-16 md:py-20 bg-slate-50 dark:bg-slate-900/20 border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn>
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-3 tracking-wide uppercase">
                [ How OriginTrace Helps ]
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold mb-3 text-slate-900 dark:text-white" data-testid="heading-how-helps">
                Purpose-Built for EUDR Compliance
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-2xl leading-relaxed">
                OriginTrace provides the complete infrastructure to satisfy every EUDR requirement — from farm-level geolocation capture to export-ready due diligence documentation.
              </p>
            </FadeIn>

            <div className="space-y-8">
              {howOriginTraceHelps.map((feature, i) => (
                <FadeIn key={i} direction={i % 2 === 0 ? 'left' : 'right'} delay={i * 0.1}>
                  <div className={`flex flex-col md:flex-row gap-6 items-center ${i % 2 !== 0 ? 'md:flex-row-reverse' : ''}`} data-testid={`text-feature-title-${i}`}>
                    <div className="flex-shrink-0 h-20 w-20 rounded-md bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <feature.icon className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className={`flex-1 ${i % 2 !== 0 ? 'md:text-right' : ''}`}>
                      <div className={`flex items-center gap-2 mb-2 flex-wrap ${i % 2 !== 0 ? 'md:justify-end' : ''}`}>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">0{i + 1}</span>
                        <h3 className="font-semibold text-lg text-slate-900 dark:text-white">{feature.title}</h3>
                      </div>
                      <p className={`text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-lg ${i % 2 !== 0 ? 'md:ml-auto' : ''}`}>{feature.description}</p>
                    </div>
                  </div>
                  {i < howOriginTraceHelps.length - 1 && (
                    <div className="border-b border-slate-200 dark:border-slate-700 mt-8" />
                  )}
                </FadeIn>
              ))}
            </div>

            <FadeIn className="mt-10 text-center">
              <Link href="/demo">
                <Button size="lg" className="gap-2 bg-emerald-600 text-white" data-testid="button-eudr-demo-mid">
                  See OriginTrace in Action
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </FadeIn>
          </div>
        </section>

        <section className="py-16 md:py-20 border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="mb-12 text-center">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-3 tracking-wide uppercase">
                [ Timeline & Milestones ]
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold mb-4 text-slate-900 dark:text-white" data-testid="heading-timeline">
                EUDR Implementation Timeline
              </h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
                Key dates for operators and traders to prepare for compliance.
              </p>
            </FadeIn>

            <div className="max-w-2xl mx-auto">
              {timeline.map((item, i) => (
                <FadeIn key={i} delay={i * 0.1}>
                  <div className="flex gap-4 mb-6 last:mb-0" data-testid={`timeline-item-${i}`}>
                    <div className="flex flex-col items-center">
                      <div className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center ${
                        item.status === 'complete' 
                          ? 'bg-emerald-100 dark:bg-emerald-900/40' 
                          : 'bg-amber-500/10'
                      }`}>
                        {item.status === 'complete' ? (
                          <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        )}
                      </div>
                      {i < timeline.length - 1 && (
                        <div className="w-px flex-1 bg-border mt-2" />
                      )}
                    </div>
                    <div className="pb-6">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">{item.date}</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{item.event}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20 bg-slate-50 dark:bg-slate-900/20 border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="mb-8 text-center">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-3 tracking-wide uppercase">
                [ Frequently Asked Questions ]
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold mb-4 text-slate-900 dark:text-white" data-testid="heading-faq">
                EUDR Compliance FAQ
              </h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
                Common questions about the EU Deforestation Regulation and how to prepare.
              </p>
            </FadeIn>

            <div className="max-w-3xl mx-auto">
              <Card>
                <CardContent className="p-4 md:p-6">
                  {faqs.map((faq, i) => (
                    <FAQItem key={i} question={faq.question} answer={faq.answer} index={i} />
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-20 border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-6 text-center">
            <FadeIn>
              <h2 className="text-2xl md:text-3xl font-extrabold mb-4 text-slate-900 dark:text-white" data-testid="heading-cta">
                Start Your EUDR Compliance Journey
              </h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-lg mx-auto mb-8">
                Schedule a consultation to see how OriginTrace can help you meet every EUDR requirement — before enforcement begins.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link href="/demo">
                  <Button size="lg" className="gap-2 bg-emerald-600 text-white" data-testid="button-eudr-demo-bottom">
                    Request Demo
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/compliance">
                  <Button size="lg" variant="outline" className="gap-2" data-testid="button-all-regulations">
                    View All Regulations
                    <ChevronRight className="h-4 w-4" />
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
