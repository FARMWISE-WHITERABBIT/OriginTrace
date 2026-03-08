'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import HeroBackground from '@/components/marketing/hero-background';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/marketing/motion';
import { FAQSchema } from '@/components/marketing/faq-schema';
import {
  Shield,
  FileText,
  MapPin,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Building2,
  Scale,
  TreePine,
  Globe,
  Search,
  ClipboardCheck,
  BarChart3,
  ShieldCheck,
  Clock,
  Users,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { useState } from 'react';

const coveredCommodities = [
  { name: 'Cocoa', desc: 'Beans and derived products including butter, powder, and chocolate' },
  { name: 'Palm Oil', desc: 'Crude and refined palm oil, kernel oil, and derivatives' },
  { name: 'Soy', desc: 'Soybeans, soy meal, soy oil, and processed soy products' },
  { name: 'Beef & Leather', desc: 'Cattle products including hides and processed leather goods' },
  { name: 'Rubber', desc: 'Natural rubber and rubber-derived products' },
  { name: 'Coffee', desc: 'Green and roasted coffee beans and extracts' },
  { name: 'Wood & Paper', desc: 'Timber products, pulp, paper, and wood-based materials' },
];

const dueDiligenceRequirements = [
  {
    icon: Search,
    title: 'Risk Assessment',
    desc: 'Businesses must assess the risk that forest risk commodities in their supply chain were produced on illegally occupied or deforested land.',
  },
  {
    icon: ClipboardCheck,
    title: 'Due Diligence System',
    desc: 'Establish and maintain a due diligence system to identify, assess, and mitigate the risk of forest risk commodities linked to illegal deforestation.',
  },
  {
    icon: FileText,
    title: 'Annual Reporting',
    desc: 'Regulated businesses must publish an annual report detailing their due diligence activities, risk findings, and mitigation steps taken.',
  },
  {
    icon: BarChart3,
    title: 'Record Keeping',
    desc: 'Maintain comprehensive records of supply chain mapping, risk assessments, and remediation actions for regulatory inspection.',
  },
];

const howOriginTraceHelps = [
  {
    icon: MapPin,
    title: 'GPS Farm-Level Mapping',
    desc: 'Capture and verify GPS polygon boundaries for every farm in your supply chain, providing geospatial evidence of origin for all forest risk commodities.',
  },
  {
    icon: TreePine,
    title: 'Deforestation Monitoring',
    desc: 'Satellite-based deforestation alerts overlaid on farm polygons to detect land-use change and identify high-risk supply chain nodes before they become compliance issues.',
  },
  {
    icon: Shield,
    title: 'Automated Risk Scoring',
    desc: 'Real-time compliance scoring across traceability depth, documentation completeness, and deforestation risk for every batch and shipment.',
  },
  {
    icon: FileText,
    title: 'Due Diligence Reporting',
    desc: 'Generate audit-ready annual reports with full supply chain mapping, risk assessment summaries, and documented mitigation actions.',
  },
  {
    icon: Globe,
    title: 'Full Chain Traceability',
    desc: 'End-to-end traceability from farm to export, maintaining chain-of-custody through aggregation, processing, and transformation.',
  },
  {
    icon: Building2,
    title: 'Multi-Regulation Alignment',
    desc: 'Single traceability infrastructure that satisfies UK Environment Act, EUDR, and buyer-driven sustainability standards simultaneously.',
  },
];

const timelineEvents = [
  {
    date: 'November 2021',
    title: 'Environment Act Enacted',
    desc: 'The UK Environment Act 2021 received Royal Assent, introducing Schedule 17 on forest risk commodities.',
  },
  {
    date: '2022-2023',
    title: 'Consultation Period',
    desc: 'Defra consulted on secondary legislation to define regulated commodities, thresholds, and enforcement mechanisms.',
  },
  {
    date: '2024-2025',
    title: 'Secondary Legislation Development',
    desc: 'Drafting of statutory instruments to set the scope, reporting requirements, and penalties for non-compliance.',
  },
  {
    date: 'Expected 2025-2026',
    title: 'Secondary Legislation Enacted',
    desc: 'Final regulations expected to come into force, establishing mandatory due diligence obligations for businesses above the turnover threshold.',
  },
];

const faqItems = [
  {
    question: 'What is the UK Environment Act and how does it relate to forest risk commodities?',
    answer: 'The UK Environment Act 2021 (Schedule 17) introduces mandatory due diligence requirements for businesses using forest risk commodities. It aims to prevent the use of commodities linked to illegal deforestation in UK supply chains. Businesses above the turnover threshold must establish due diligence systems, conduct risk assessments, and publish annual compliance reports.',
  },
  {
    question: 'Who must comply with the UK Environment Act forest risk commodity provisions?',
    answer: 'Businesses operating in the UK with an annual turnover of £50 million or more that use forest risk commodities (including cocoa, palm oil, soy, beef, rubber, coffee, and wood products) in their commercial activities must comply. This applies to both UK-based businesses and overseas businesses operating in the UK market.',
  },
  {
    question: 'What is the £50M turnover threshold?',
    answer: 'The Environment Act sets a turnover threshold of £50 million per year. Businesses at or above this level that use regulated forest risk commodities are classified as "regulated persons" and must comply with due diligence, risk assessment, and annual reporting obligations. Smaller businesses are currently exempt but may be brought into scope in future.',
  },
  {
    question: 'What commodities are covered?',
    answer: 'The Act covers forest risk commodities most associated with deforestation: cocoa, palm oil, soy, beef and leather, rubber, coffee, and wood/paper products. The Secretary of State can add additional commodities through secondary legislation based on evidence of deforestation impact.',
  },
  {
    question: 'When does the UK Environment Act come into effect for forest risk commodities?',
    answer: 'While the Environment Act received Royal Assent in November 2021, the forest risk commodity provisions (Schedule 17) require secondary legislation to come into force. This secondary legislation is still being developed. Businesses should prepare now, as requirements are expected to take effect once the statutory instruments are finalized, potentially in 2025-2026.',
  },
  {
    question: 'How is the UK Environment Act different from the EUDR?',
    answer: 'While both regulations target deforestation-linked commodities, there are key differences. The UK Act focuses on "illegal" deforestation (per local laws), while the EUDR covers all deforestation after December 2020 regardless of legality. The UK Act also uses a turnover-based threshold (£50M+), while the EUDR applies to all operators placing regulated commodities on the EU market. OriginTrace helps businesses comply with both simultaneously.',
  },
  {
    question: 'What are the penalties for non-compliance?',
    answer: 'The Environment Act provides for civil penalties including fines for businesses that fail to establish due diligence systems, fail to report, or knowingly use commodities linked to illegal deforestation. Specific penalty amounts will be defined in secondary legislation, but enforcement powers are granted to a designated authority to investigate and penalize non-compliant businesses.',
  },
  {
    question: 'How does OriginTrace help with UK Environment Act compliance?',
    answer: 'OriginTrace provides GPS farm-level mapping, satellite deforestation monitoring, automated risk scoring, and audit-ready reporting tools. Our platform maps your entire supply chain to the farm level, monitors for deforestation risk, generates annual due diligence reports, and maintains a tamper-evident data vault for regulatory inspection — all from a single platform that also covers EUDR and other global regulations.',
  },
];

export default function UKCompliancePage() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  return (
    <>
      <MarketingNav />

      <FAQSchema faqs={faqItems} />
      <main className="min-h-screen">
        <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden" data-testid="section-hero">
          <HeroBackground />
          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <FadeIn>
              <div className="text-center max-w-4xl mx-auto">
                <span className="inline-block text-xs font-semibold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase mb-4" data-testid="text-section-label-hero">
                  [ UK Environment Act ]
                </span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6" data-testid="text-hero-title">
                  UK Environment Act — Forest Risk Commodities
                </h1>
                <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 leading-relaxed mb-8 max-w-3xl mx-auto" data-testid="text-hero-description">
                  The UK Environment Act 2021 introduces mandatory due diligence for businesses using commodities linked to illegal deforestation. Businesses with £50M+ annual turnover must map supply chains, assess risk, and report annually.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Link href="/demo">
                    <Button className="bg-emerald-600 text-white" data-testid="button-hero-demo">
                      Request Demo
                      <ChevronRight className="ml-1 w-4 h-4" />
                    </Button>
                  </Link>
                  <Link href="/compliance">
                    <Button variant="outline" data-testid="button-hero-compliance">
                      View All Regulations
                    </Button>
                  </Link>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        <section className="py-8 md:py-10 border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn>
              <div className="flex items-start gap-4 p-6 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800" data-testid="banner-pending-status">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bold text-slate-900 dark:text-white">Status: Secondary Legislation Pending</h3>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-xs font-semibold text-amber-700 dark:text-amber-300">
                      <Clock className="w-3 h-3" />
                      Pending
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    The Environment Act received Royal Assent in November 2021, but Schedule 17 (forest risk commodities) requires secondary legislation to take effect. This is expected in 2025-2026. Smart businesses are building compliance infrastructure now to avoid last-minute scrambles.
                  </p>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        <section className="py-16 md:py-20 border-t border-slate-200 dark:border-slate-800" data-testid="section-who-must-comply">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn>
              <div className="text-center mb-16">
                <span className="inline-block text-xs font-semibold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase mb-4">
                  [ Who Must Comply ]
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
                  £50M+ Turnover Threshold
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
                  The UK Environment Act applies to businesses with annual turnover of £50 million or more that use forest risk commodities in their UK commercial activities.
                </p>
              </div>
            </FadeIn>

            <StaggerContainer className="grid md:grid-cols-3 gap-6">
              <StaggerItem>
                <Card className="h-full">
                  <CardContent className="p-6">
                    <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center mb-4">
                      <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2" data-testid="text-comply-large-businesses">Large Businesses</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      UK-based companies with £50M+ annual turnover that use regulated forest risk commodities in their operations, manufacturing, or retail activities.
                    </p>
                  </CardContent>
                </Card>
              </StaggerItem>
              <StaggerItem>
                <Card className="h-full">
                  <CardContent className="p-6">
                    <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center mb-4">
                      <Globe className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2" data-testid="text-comply-overseas">Overseas Businesses</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      International companies operating in the UK market that meet the turnover threshold and use forest risk commodities in products sold in the UK.
                    </p>
                  </CardContent>
                </Card>
              </StaggerItem>
              <StaggerItem>
                <Card className="h-full">
                  <CardContent className="p-6">
                    <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center mb-4">
                      <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2" data-testid="text-comply-supply-chain">Supply Chain Partners</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      Exporters, processors, and traders supplying forest risk commodities to regulated UK businesses will need to provide traceability evidence and documentation.
                    </p>
                  </CardContent>
                </Card>
              </StaggerItem>
            </StaggerContainer>
          </div>
        </section>

        <section className="py-16 md:py-20 bg-slate-50 dark:bg-slate-900/20 border-t border-slate-200 dark:border-slate-800" data-testid="section-covered-commodities">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn>
              <div className="text-center mb-16">
                <span className="inline-block text-xs font-semibold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase mb-4">
                  [ Covered Commodities ]
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
                  Forest Risk Commodities
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
                  The Act targets commodities most associated with global deforestation. The Secretary of State can expand this list through secondary legislation.
                </p>
              </div>
            </FadeIn>

            <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {coveredCommodities.map((commodity) => (
                <StaggerItem key={commodity.name}>
                  <Card className="h-full">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                          <TreePine className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-white mb-1" data-testid={`text-commodity-${commodity.name.toLowerCase().replace(/\s+/g, '-')}`}>
                            {commodity.name}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            {commodity.desc}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        <section className="py-16 md:py-20 border-t border-slate-200 dark:border-slate-800" data-testid="section-due-diligence">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn>
              <div className="mb-12">
                <span className="inline-block text-xs font-semibold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase mb-4">
                  [ Due Diligence Requirements ]
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
                  What Regulated Businesses Must Do
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
                  Schedule 17 of the Environment Act establishes four core obligations for businesses using forest risk commodities.
                </p>
              </div>
            </FadeIn>

            <StaggerContainer className="max-w-3xl space-y-0">
              {dueDiligenceRequirements.map((req, index) => (
                <StaggerItem key={req.title}>
                  <div className="flex gap-5 pb-8 last:pb-0" data-testid={`text-requirement-${req.title.toLowerCase().replace(/\s+/g, '-')}`}>
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                        {index + 1}
                      </div>
                      {index < dueDiligenceRequirements.length - 1 && (
                        <div className="w-px flex-1 bg-emerald-200 dark:bg-emerald-800 mt-3" />
                      )}
                    </div>
                    <div className="pt-1">
                      <div className="flex items-center gap-2 mb-2">
                        <req.icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                          {req.title}
                        </h3>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        {req.desc}
                      </p>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        <section className="py-16 md:py-20 bg-slate-50 dark:bg-slate-900/20 border-t border-slate-200 dark:border-slate-800" data-testid="section-how-origintrace-helps">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn>
              <div className="text-center mb-16">
                <span className="inline-block text-xs font-semibold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase mb-4">
                  [ How OriginTrace Helps ]
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
                  Compliance Infrastructure for the UK Environment Act
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
                  OriginTrace provides the traceability, monitoring, and reporting tools needed to meet due diligence obligations under Schedule 17.
                </p>
              </div>
            </FadeIn>

            <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {howOriginTraceHelps.map((feature) => (
                <StaggerItem key={feature.title}>
                  <Card className="h-full">
                    <CardContent className="p-6">
                      <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center mb-4">
                        <feature.icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2" data-testid={`text-feature-${feature.title.toLowerCase().replace(/\s+/g, '-')}`}>
                        {feature.title}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        {feature.desc}
                      </p>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>

            <FadeIn delay={0.3}>
              <div className="text-center mt-12">
                <Link href="/demo">
                  <Button className="bg-emerald-600 text-white" data-testid="button-helps-demo">
                    See How It Works
                    <ArrowRight className="ml-1 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>

        <section className="py-16 md:py-20 border-t border-slate-200 dark:border-slate-800" data-testid="section-timeline">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn>
              <div className="text-center mb-16">
                <span className="inline-block text-xs font-semibold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase mb-4">
                  [ Current Status ]
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
                  Legislative Timeline
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
                  Secondary legislation is pending. Smart businesses are preparing now to avoid last-minute compliance scrambles.
                </p>
              </div>
            </FadeIn>

            <div className="max-w-3xl mx-auto">
              <StaggerContainer className="space-y-0">
                {timelineEvents.map((event, index) => (
                  <StaggerItem key={event.date}>
                    <div className="relative flex gap-6 pb-10 last:pb-0">
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          index === timelineEvents.length - 1
                            ? 'bg-amber-500/20 border-2 border-amber-500'
                            : 'bg-emerald-500/20 border-2 border-emerald-500'
                        }`}>
                          {index === timelineEvents.length - 1 ? (
                            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          )}
                        </div>
                        {index < timelineEvents.length - 1 && (
                          <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700 mt-2" />
                        )}
                      </div>
                      <div className="pb-2">
                        <span className={`text-xs font-semibold uppercase tracking-wide ${
                          index === timelineEvents.length - 1
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`} data-testid={`text-timeline-date-${index}`}>
                          {event.date}
                        </span>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-1 mb-2" data-testid={`text-timeline-title-${index}`}>
                          {event.title}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                          {event.desc}
                        </p>
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20 bg-slate-50 dark:bg-slate-900/20 border-t border-slate-200 dark:border-slate-800" data-testid="section-faq">
          <div className="max-w-4xl mx-auto px-6">
            <FadeIn>
              <div className="text-center mb-16">
                <span className="inline-block text-xs font-semibold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase mb-4">
                  [ FAQ ]
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
                  Frequently Asked Questions
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
                  Everything you need to know about the UK Environment Act and forest risk commodity compliance.
                </p>
              </div>
            </FadeIn>

            <div className="space-y-3">
              {faqItems.map((faq, index) => (
                <FadeIn key={index} delay={index * 0.05}>
                  <Card>
                    <CardContent className="p-0">
                      <button
                        onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                        className="w-full flex items-start justify-between gap-4 p-5 text-left"
                        aria-expanded={openFaqIndex === index}
                        data-testid={`button-faq-${index}`}
                      >
                        <span className="text-sm font-medium text-slate-900 dark:text-white leading-relaxed">
                          {faq.question}
                        </span>
                        <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 mt-0.5 transition-transform duration-200 ${
                          openFaqIndex === index ? 'rotate-180' : ''
                        }`} />
                      </button>
                      {openFaqIndex === index && (
                        <div className="px-5 pb-5 -mt-1">
                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed" data-testid={`text-faq-answer-${index}`}>
                            {faq.answer}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20 border-t border-slate-200 dark:border-slate-800" data-testid="section-cta">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn>
              <Card>
                <CardContent className="p-10 md:p-16 text-center">
                  <span className="inline-block text-xs font-semibold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase mb-4">
                    [ Get Started ]
                  </span>
                  <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
                    Prepare for the UK Environment Act Today
                  </h2>
                  <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed mb-8">
                    Secondary legislation is coming. Build your compliance infrastructure now with OriginTrace — the platform trusted by exporters across Africa, Asia, and Latin America.
                  </p>
                  <div className="flex flex-wrap justify-center gap-4">
                    <Link href="/demo">
                      <Button className="bg-emerald-600 text-white" data-testid="button-cta-demo">
                        Request a Demo
                        <ChevronRight className="ml-1 w-4 h-4" />
                      </Button>
                    </Link>
                    <Link href="/solutions">
                      <Button variant="outline" data-testid="button-cta-solutions">
                        Explore Solutions
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </>
  );
}
