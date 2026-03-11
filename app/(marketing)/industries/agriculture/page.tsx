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
  Smartphone,
  Wifi,
  Users,
  Sprout,
  Scale,
  AlertTriangle,
  Download,
  Target,
  ArrowRight,
} from 'lucide-react';

const challenges = [
  {
    icon: MapPin,
    title: 'Fragmented Smallholder Networks',
    description: 'Agricultural commodities are sourced from thousands of smallholder farmers across remote regions — making traceability to individual plots extremely difficult.',
  },
  {
    icon: AlertTriangle,
    title: 'Border Rejections & Revenue Loss',
    description: 'Incomplete documentation and traceability gaps lead to costly shipment rejections at destination ports, destroying margins and buyer relationships.',
  },
  {
    icon: FileText,
    title: 'Multi-Regulatory Complexity',
    description: 'Exporters must simultaneously satisfy EUDR, FSMA 204, UK Environment Act, and buyer-specific sustainability requirements — each with different data standards.',
  },
  {
    icon: Wifi,
    title: 'Low-Connectivity Environments',
    description: 'Farm-level data collection happens in areas with limited or no internet access, requiring offline-capable tools that sync when connectivity returns.',
  },
];

const platformFeatures = [
  {
    number: '01',
    title: 'GPS Farm Mapping',
    description: 'Capture precise GPS polygon boundaries for every farm plot using any smartphone. Works fully offline and syncs automatically when connectivity returns.',
    icon: MapPin,
  },
  {
    number: '02',
    title: 'Batch Collection & Tracking',
    description: 'Record every purchase at the farm gate with weight, grade, and farmer attribution. Track batches through aggregation, processing, and blending.',
    icon: Scale,
  },
  {
    number: '03',
    title: 'Processing Chain-of-Custody',
    description: 'Maintain traceability through crushing, fermentation, drying, and transformation. Link finished goods to their exact source farms with mass balance reconciliation.',
    icon: Target,
  },
  {
    number: '04',
    title: 'Compliance Scoring & Export',
    description: 'Real-time readiness scores across every shipment. Generate export-ready documentation for EUDR, FSMA 204, UK Environment Act, and buyer requirements.',
    icon: BarChart3,
  },
];

const commodities = [
  { name: 'Cocoa', regions: 'West Africa, Latin America' },
  { name: 'Coffee', regions: 'East Africa, Southeast Asia' },
  { name: 'Soy', regions: 'Latin America, Sub-Saharan Africa' },
  { name: 'Palm Oil', regions: 'Southeast Asia, West Africa' },
  { name: 'Rubber', regions: 'Southeast Asia, West Africa' },
  { name: 'Cashew', regions: 'West Africa, Southeast Asia' },
];

const complianceFrameworks = [
  {
    regulation: 'EU Deforestation Regulation',
    abbrev: 'EUDR',
    coverage: 'GPS polygon mapping, deforestation-free verification, DDS generation',
    href: '/compliance/eudr',
  },
  {
    regulation: 'US Food Safety Modernization Act',
    abbrev: 'FSMA 204',
    coverage: 'Key data elements, critical tracking events, lot-level traceability',
    href: '/compliance/usa',
  },
  {
    regulation: 'UK Environment Act',
    abbrev: 'UK Env Act',
    coverage: 'Due diligence for forest-risk commodities, legal compliance verification',
    href: '/compliance/uk',
  },
  {
    regulation: 'China GACC Registration',
    abbrev: 'GACC',
    coverage: 'Facility registration, product safety documentation, export certification',
    href: '/compliance/china',
  },
  {
    regulation: 'UAE ESMA Standards',
    abbrev: 'ESMA',
    coverage: 'Halal compliance, product traceability, quality certification',
    href: '/compliance/uae',
  },
];

const stats = [
  { value: '50K+', label: 'Farms Mapped', desc: 'GPS polygon boundaries captured across producing regions' },
  { value: '95%', label: 'Traceability Depth', desc: 'Of supply chain touchpoints captured farm to export' },
  { value: '40%', label: 'Fewer Rejections', desc: 'Average reduction in border rejections within 6 months' },
  { value: '12', label: 'Countries Active', desc: 'Deployments across West Africa, East Africa, and Asia' },
];

export default function AgriculturePage() {
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
                  [ Agriculture ]
                </p>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mb-6 text-slate-900 dark:text-white" data-testid="heading-agriculture-title">
                  Farm-to-Export Traceability for Agricultural Commodities
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed mb-8" data-testid="text-agriculture-subtitle">
                  OriginTrace provides the complete infrastructure to trace agricultural commodities from smallholder farms through processing and export — with built-in compliance verification for every major regulatory framework.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link href="/demo">
                    <Button size="lg" className="gap-2 bg-emerald-600 text-white" data-testid="button-agriculture-demo">
                      Request Demo
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="#how-it-works">
                    <Button size="lg" variant="outline" className="gap-2" data-testid="button-agriculture-learn">
                      How It Works
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
            <FadeIn className="mb-12">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-3 tracking-wide uppercase">
                [ Key Challenges ]
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold mb-4 text-slate-900 dark:text-white" data-testid="heading-challenges">
                Why Agricultural Traceability Is Hard
              </h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-xl">
                Agricultural supply chains are uniquely complex — fragmented sourcing, remote origins, and overlapping regulatory requirements create significant traceability gaps.
              </p>
            </FadeIn>

            <StaggerContainer className="grid md:grid-cols-2 gap-6">
              {challenges.map((challenge, i) => (
                <StaggerItem key={i}>
                  <Card className="h-full" data-testid={`card-challenge-${i}`}>
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        <div className="h-10 w-10 shrink-0 rounded-md bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                          <challenge.icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold mb-1 text-slate-900 dark:text-white" data-testid={`text-challenge-title-${i}`}>{challenge.title}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">{challenge.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        <section id="how-it-works" className="py-16 md:py-24 bg-slate-50 dark:bg-slate-900/20 border-t border-slate-200 dark:border-slate-800" data-testid="section-how-it-works">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn>
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-3 tracking-wide uppercase">
                [ How OriginTrace Works ]
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold mb-3 text-slate-900 dark:text-white" data-testid="heading-how-it-works">
                End-to-End Agricultural Traceability
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-12 max-w-2xl leading-relaxed">
                Four steps from farm mapping to export-ready compliance documentation — all within a single platform.
              </p>
            </FadeIn>

            <div className="relative">
              <div className="hidden md:block absolute left-[27px] top-6 bottom-6 w-px bg-emerald-200 dark:bg-emerald-800" />
              <StaggerContainer className="space-y-8 md:space-y-0 md:grid md:grid-cols-1 md:gap-0">
                {platformFeatures.map((feature, i) => (
                  <StaggerItem key={i}>
                    <div className="flex gap-6 md:gap-8 relative" data-testid={`card-feature-${i}`}>
                      <div className="shrink-0 flex flex-col items-center">
                        <div className="h-14 w-14 rounded-md bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center text-white font-bold text-lg z-10">
                          {feature.number}
                        </div>
                        {i < platformFeatures.length - 1 && (
                          <div className="md:hidden w-px h-8 bg-emerald-200 dark:bg-emerald-800 my-1" />
                        )}
                      </div>
                      <div className="pt-2 pb-8 md:pb-10">
                        <div className="flex items-center gap-3 mb-2">
                          <feature.icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                          <h3 className="font-semibold text-lg text-slate-900 dark:text-white" data-testid={`text-feature-title-${i}`}>{feature.title}</h3>
                        </div>
                        <p className="text-muted-foreground leading-relaxed text-base max-w-lg">{feature.description}</p>
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24 border-t border-slate-200 dark:border-slate-800" data-testid="section-commodities">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              <FadeIn direction="left">
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-3 tracking-wide uppercase">
                  [ Supported Commodities ]
                </p>
                <h2 className="text-2xl md:text-3xl font-extrabold mb-3 text-slate-900 dark:text-white" data-testid="heading-commodities">
                  Built for the Commodities That Matter Most
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                  OriginTrace supports traceability for the agricultural commodities most affected by deforestation regulations, food safety mandates, and buyer sustainability requirements.
                </p>
                <div className="space-y-3">
                  {commodities.map((commodity, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-4 p-4 rounded-md bg-slate-50 dark:bg-slate-900/30"
                      data-testid={`text-commodity-${i}`}
                    >
                      <div className="flex items-center gap-3">
                        <Sprout className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="font-medium text-slate-900 dark:text-white">{commodity.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{commodity.regions}</span>
                    </div>
                  ))}
                </div>
              </FadeIn>

              <FadeIn direction="right">
                <div className="relative p-8 rounded-md bg-slate-900 dark:bg-slate-800 text-white">
                  <div className="absolute top-4 right-4">
                    <Globe className="h-24 w-24 text-emerald-500/10" />
                  </div>
                  <p className="text-xs font-semibold tracking-widest uppercase text-emerald-400 mb-6">
                    Platform Capabilities
                  </p>
                  <div className="space-y-5 relative z-10">
                    <div className="flex items-start gap-3">
                      <Smartphone className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Mobile-First Collection</p>
                        <p className="text-sm text-slate-300 mt-1">Works on any Android device, fully offline-capable with automatic sync</p>
                      </div>
                    </div>
                    <div className="border-t border-slate-700 pt-5 flex items-start gap-3">
                      <Users className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Multi-Tier Agent Network</p>
                        <p className="text-sm text-slate-300 mt-1">Support for buying agents, aggregation centers, and processing facilities</p>
                      </div>
                    </div>
                    <div className="border-t border-slate-700 pt-5 flex items-start gap-3">
                      <Shield className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Tamper-Evident Records</p>
                        <p className="text-sm text-slate-300 mt-1">Immutable audit trail for every transaction from farm gate to export</p>
                      </div>
                    </div>
                    <div className="border-t border-slate-700 pt-5 flex items-start gap-3">
                      <Download className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Export Dossier Generation</p>
                        <p className="text-sm text-slate-300 mt-1">One-click compliance documentation for any destination market</p>
                      </div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24 bg-slate-50 dark:bg-slate-900/20 border-t border-slate-200 dark:border-slate-800" data-testid="section-stats">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="text-center mb-12">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-3 tracking-wide uppercase">
                [ Impact ]
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold mb-4 text-slate-900 dark:text-white" data-testid="heading-stats">
                Measurable Results for Agricultural Exporters
              </h2>
            </FadeIn>

            <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, i) => (
                <StaggerItem key={i}>
                  <div className="text-center py-8 px-4" data-testid={`stat-agriculture-${i}`}>
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
                One Platform, Every Regulation
              </h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
                A single traceability foundation covers every major regulatory framework affecting agricultural commodity exports.
              </p>
            </FadeIn>

            <StaggerContainer className="space-y-4 max-w-3xl mx-auto">
              {complianceFrameworks.map((fw, i) => (
                <StaggerItem key={i}>
                  <Link href={fw.href}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover-elevate" data-testid={`card-compliance-${i}`}>
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 shrink-0 rounded-md bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                          <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-slate-900 dark:text-white">{fw.regulation}</h3>
                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-md">{fw.abbrev}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{fw.coverage}</p>
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
                Ready to Trace Your Agricultural Supply Chain?
              </h2>
              <p className="text-emerald-100 mb-8 max-w-xl mx-auto leading-relaxed">
                Join exporters across West Africa, East Africa, and Southeast Asia who use OriginTrace to eliminate traceability gaps and pass border inspections.
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
