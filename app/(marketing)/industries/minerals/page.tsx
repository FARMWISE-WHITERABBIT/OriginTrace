import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import HeroBackground from '@/components/marketing/hero-background';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/marketing/motion';
import {
  ChevronRight,
  MapPin,
  FileText,
  Shield,
  BarChart3,
  Globe,
  Scale,
  AlertTriangle,
  Download,
  ArrowRight,
  Layers,
  ScanLine,
  Factory,
  Gem,
  Lock,
} from 'lucide-react';

const challenges = [
  {
    icon: AlertTriangle,
    title: 'Conflict Mineral Risk',
    description: 'Minerals sourced from conflict-affected and high-risk areas (CAHRAs) face intense regulatory scrutiny. Proving responsible sourcing requires verifiable chain-of-custody from mine to smelter.',
  },
  {
    icon: Layers,
    title: 'Opaque Multi-Tier Chains',
    description: 'Minerals pass through artisanal miners, cooperatives, traders, smelters, and refiners — each handoff creating a potential traceability gap that regulators will flag.',
  },
  {
    icon: Globe,
    title: 'International Regulatory Overlap',
    description: 'EU Conflict Minerals Regulation, US Dodd-Frank Section 1502, OECD Due Diligence Guidance — each with different reporting requirements and scope definitions.',
  },
  {
    icon: Lock,
    title: 'Artisanal Mining Complexity',
    description: 'Artisanal and small-scale mining (ASM) operations are difficult to formalize and monitor. Data collection requires tools that work in remote, low-infrastructure environments.',
  },
];

const features = [
  {
    icon: MapPin,
    title: 'Mine Site Mapping',
    description: 'Capture GPS polygon boundaries for mine sites, concessions, and wash plants. Overlay with conflict zone data and environmental risk layers for comprehensive risk assessment.',
  },
  {
    icon: Scale,
    title: 'Bag-Level Tracking',
    description: 'Assign unique identifiers to every bag of mineral at the mine site. Track weight, grade, and miner attribution from extraction through the entire trading chain.',
  },
  {
    icon: Factory,
    title: 'Smelter & Refiner Records',
    description: 'Document every transformation with input-output reconciliation. Link refined minerals back to their source mines with verifiable mass balance evidence.',
  },
  {
    icon: ScanLine,
    title: 'Chain-of-Custody Verification',
    description: 'Unbroken traceability from mine to market. Every handoff — miner to cooperative, trader to smelter, refiner to manufacturer — is captured and timestamped.',
  },
  {
    icon: BarChart3,
    title: 'Risk-Based Due Diligence',
    description: 'Automated risk classification aligned with OECD five-step framework. Real-time scoring based on sourcing region, supplier history, and documentation completeness.',
  },
  {
    icon: Download,
    title: 'Regulatory Reporting',
    description: 'Generate compliance reports for EU Conflict Minerals Regulation, OECD Due Diligence, and destination-market requirements. Export-ready documentation for auditors.',
  },
];

const dueDiligenceSteps = [
  {
    number: '01',
    title: 'Establish Management Systems',
    description: 'Set up internal governance, assign compliance responsibilities, and establish grievance mechanisms for the mineral supply chain.',
  },
  {
    number: '02',
    title: 'Identify & Assess Risks',
    description: 'Map supply chain actors, assess risks of conflict financing, human rights abuses, and environmental harm at every tier.',
  },
  {
    number: '03',
    title: 'Design Risk Mitigation Strategy',
    description: 'Develop and implement measurable risk mitigation plans. Engage with suppliers to address identified risks and improve practices.',
  },
  {
    number: '04',
    title: 'Independent Third-Party Audit',
    description: 'Facilitate independent verification of due diligence practices and supply chain management systems by qualified auditors.',
  },
  {
    number: '05',
    title: 'Report on Due Diligence',
    description: 'Publicly report on due diligence policies, identified risks, and steps taken to mitigate adverse impacts in the mineral supply chain.',
  },
];

const complianceFrameworks = [
  { regulation: 'EU Conflict Minerals Regulation', desc: 'Due diligence for tin, tantalum, tungsten, and gold (3TG) imports', href: '/compliance/eudr' },
  { regulation: 'EUDR', desc: 'Deforestation-free verification for mining-adjacent land use', href: '/compliance/eudr' },
  { regulation: 'UK Environment Act', desc: 'Due diligence for forest-risk activities in mineral extraction zones', href: '/compliance/uk' },
  { regulation: 'China GACC', desc: 'Registration and safety documentation for mineral imports', href: '/compliance/china' },
  { regulation: 'UAE ESMA', desc: 'Quality standards and origin certification for mineral products', href: '/compliance/uae' },
];

const stats = [
  { value: '100%', label: 'Mine-to-Market', desc: 'Full chain-of-custody from extraction to end user' },
  { value: '5-Step', label: 'OECD Aligned', desc: 'Due diligence framework aligned with OECD guidance' },
  { value: '3TG+', label: 'Minerals Covered', desc: 'Tin, tantalum, tungsten, gold, and beyond' },
  { value: 'Real-Time', label: 'Risk Scoring', desc: 'Continuous risk assessment across every supply chain node' },
];

export default function MineralsPage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <MarketingNav />

      <main>
        <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden" data-testid="section-hero">
          <HeroBackground />
          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <FadeIn>
              <div className="text-center max-w-3xl mx-auto">
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-4 tracking-wide uppercase">
                  [ Minerals & Mining ]
                </p>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mb-6 text-slate-900 dark:text-white" data-testid="heading-minerals-title">
                  Mine-to-Market Traceability for Responsible Mineral Sourcing
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed mb-8" data-testid="text-minerals-subtitle">
                  Prove conflict-free sourcing, maintain bag-level chain-of-custody, and satisfy OECD due diligence requirements — from artisanal mines to global markets.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link href="/demo">
                    <Button size="lg" className="gap-2 bg-emerald-600 text-white" data-testid="button-minerals-demo">
                      Request Demo
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="#due-diligence">
                    <Button size="lg" variant="outline" className="gap-2" data-testid="button-minerals-learn">
                      OECD Framework
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        <section className="py-16 md:py-24 border-t border-slate-200 dark:border-slate-800" data-testid="section-challenges">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              <FadeIn direction="left">
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-3 tracking-wide uppercase">
                  [ Industry Challenges ]
                </p>
                <h2 className="text-2xl md:text-3xl font-extrabold mb-3 text-slate-900 dark:text-white" data-testid="heading-challenges">
                  Why Mineral Traceability Is Critical
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                  Mineral supply chains carry unique risks — conflict financing, human rights abuses, and environmental destruction. Regulators demand proof of responsible sourcing at every tier.
                </p>

                <div className="relative p-6 rounded-md bg-slate-900 dark:bg-slate-800 text-white">
                  <p className="text-xs font-semibold tracking-widest uppercase text-emerald-400 mb-4">Key Minerals</p>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { name: 'Tin (Sn)', use: 'Electronics, solder' },
                      { name: 'Tantalum (Ta)', use: 'Capacitors, medical' },
                      { name: 'Tungsten (W)', use: 'Tools, alloys' },
                      { name: 'Gold (Au)', use: 'Electronics, jewelry' },
                      { name: 'Cobalt (Co)', use: 'Batteries, alloys' },
                      { name: 'Lithium (Li)', use: 'EV batteries' },
                    ].map((mineral, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Gem className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">{mineral.name}</p>
                          <p className="text-xs text-slate-400">{mineral.use}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>

              <FadeIn direction="right">
                <div className="space-y-4">
                  {challenges.map((challenge, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-4 p-4 rounded-md bg-slate-50 dark:bg-slate-900/30"
                      data-testid={`card-challenge-${i}`}
                    >
                      <div className="h-10 w-10 shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                        <challenge.icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-900 dark:text-white mb-1" data-testid={`text-challenge-title-${i}`}>{challenge.title}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{challenge.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24 bg-slate-50 dark:bg-slate-900/20 border-t border-slate-200 dark:border-slate-800" data-testid="section-features">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="text-center mb-12">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-3 tracking-wide uppercase">
                [ Platform Features ]
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold mb-4 text-slate-900 dark:text-white" data-testid="heading-features">
                Purpose-Built for Mineral Supply Chains
              </h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
                From mine site mapping to regulatory reporting — every tool you need for responsible mineral sourcing.
              </p>
            </FadeIn>

            <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, i) => (
                <StaggerItem key={i}>
                  <Card className="h-full" data-testid={`card-feature-${i}`}>
                    <CardContent className="p-6">
                      <div className="h-10 w-10 rounded-md bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                        <feature.icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h3 className="font-semibold mb-2 text-slate-900 dark:text-white" data-testid={`text-feature-title-${i}`}>{feature.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        <section id="due-diligence" className="py-16 md:py-24 border-t border-slate-200 dark:border-slate-800" data-testid="section-due-diligence">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="mb-12">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-3 tracking-wide uppercase">
                [ OECD Five-Step Framework ]
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold mb-3 text-slate-900 dark:text-white" data-testid="heading-due-diligence">
                Structured Due Diligence, Digitized
              </h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                OriginTrace digitalizes the OECD five-step due diligence framework for responsible mineral supply chains — providing the tools and evidence trail for each step.
              </p>
            </FadeIn>

            <div className="relative">
              <div className="hidden md:block absolute left-[27px] top-6 bottom-6 w-px bg-emerald-200 dark:bg-emerald-800" />
              <StaggerContainer className="space-y-8 md:space-y-0 md:grid md:grid-cols-1 md:gap-0">
                {dueDiligenceSteps.map((step, i) => (
                  <StaggerItem key={i}>
                    <div className="flex gap-6 md:gap-8 relative" data-testid={`card-due-diligence-${i}`}>
                      <div className="shrink-0 flex flex-col items-center">
                        <div className="h-14 w-14 rounded-md bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center text-white font-bold text-lg z-10">
                          {step.number}
                        </div>
                        {i < dueDiligenceSteps.length - 1 && (
                          <div className="md:hidden w-px h-8 bg-emerald-200 dark:bg-emerald-800 my-1" />
                        )}
                      </div>
                      <div className="pt-2 pb-8 md:pb-10">
                        <h3 className="font-semibold text-lg mb-2 text-slate-900 dark:text-white">{step.title}</h3>
                        <p className="text-muted-foreground leading-relaxed text-base max-w-lg">{step.description}</p>
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24 bg-slate-50 dark:bg-slate-900/20 border-t border-slate-200 dark:border-slate-800" data-testid="section-stats">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="text-center mb-12">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-3 tracking-wide uppercase">
                [ Platform Impact ]
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white" data-testid="heading-stats">
                Responsible Sourcing, Verified
              </h2>
            </FadeIn>

            <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, i) => (
                <StaggerItem key={i}>
                  <div className="text-center py-8 px-4" data-testid={`stat-minerals-${i}`}>
                    <p className="text-4xl md:text-5xl font-extrabold text-emerald-600 dark:text-emerald-400 mb-2">{stat.value}</p>
                    <p className="font-semibold text-slate-900 dark:text-white mb-2">{stat.label}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{stat.desc}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        <section className="py-16 md:py-24 border-t border-slate-200 dark:border-slate-800" data-testid="section-compliance">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="text-center mb-12">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-3 tracking-wide uppercase">
                [ Compliance Coverage ]
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold mb-4 text-slate-900 dark:text-white" data-testid="heading-compliance">
                Regulatory Alignment for Mineral Exports
              </h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
                A single platform satisfies due diligence requirements across every major regulatory framework for mineral supply chains.
              </p>
            </FadeIn>

            <StaggerContainer className="space-y-4 max-w-3xl mx-auto">
              {complianceFrameworks.map((fw, i) => (
                <StaggerItem key={i}>
                  <Link href={fw.href}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover-elevate" data-testid={`card-compliance-${i}`}>
                      <div className="flex items-center gap-4">
                        <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-white">{fw.regulation}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{fw.desc}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 hidden sm:block" />
                    </div>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        <section className="py-16 md:py-24 bg-emerald-600 dark:bg-emerald-700" data-testid="section-cta">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <FadeIn>
              <h2 className="text-2xl md:text-3xl font-extrabold mb-4 text-white" data-testid="heading-cta">
                Prove Responsible Sourcing from Mine to Market
              </h2>
              <p className="text-emerald-100 mb-8 max-w-xl mx-auto leading-relaxed">
                Build the traceability infrastructure your mineral supply chain needs to satisfy regulators, buyers, and consumers demanding conflict-free sourcing.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link href="/demo">
                  <Button size="lg" className="gap-2 bg-white text-emerald-700" data-testid="button-cta-demo">
                    Request a Demo
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/solutions">
                  <Button size="lg" variant="outline" className="gap-2 border-emerald-400 text-white" data-testid="button-cta-solutions">
                    View Solutions
                  </Button>
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
