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
  Search,
  Download,
  ArrowRight,
  Layers,
  ScanLine,
  Factory,
  Scissors,
  Eye,
} from 'lucide-react';

const challenges = [
  {
    icon: Layers,
    title: 'Multi-Tier Supply Chains',
    description: 'Textiles pass through farms, ginning mills, spinning facilities, weaving plants, dye houses, and garment factories — each tier adding complexity to traceability.',
  },
  {
    icon: Globe,
    title: 'Cross-Border Sourcing',
    description: 'Raw fibers are often grown in one country, processed in another, and assembled in a third — making origin verification exceptionally challenging.',
  },
  {
    icon: AlertTriangle,
    title: 'Forced Labor & Ethical Sourcing',
    description: 'Regulatory frameworks like the Uyghur Forced Labor Prevention Act (UFLPA) require proof that raw materials were not produced with forced labor in specific regions.',
  },
  {
    icon: Eye,
    title: 'Consumer Transparency Demands',
    description: 'Brands face growing pressure from consumers and regulators to provide verifiable sustainability claims about the origin and production of their products.',
  },
];

const supplyChainSteps = [
  {
    step: 'Raw Material',
    title: 'Fiber Sourcing & Farm Mapping',
    description: 'GPS-verified farm boundaries for cotton, rubber, and other natural fiber origins. Capture farmer data, plot coordinates, and harvesting records at the source.',
    icon: MapPin,
  },
  {
    step: 'Processing',
    title: 'Ginning, Spinning & Weaving',
    description: 'Track fiber through every processing stage with input-output reconciliation. Maintain identity preservation or mass balance through transformation.',
    icon: Factory,
  },
  {
    step: 'Manufacturing',
    title: 'Cut, Make & Trim',
    description: 'Link finished garments to source materials with batch-level traceability. Document manufacturing facilities, labor standards, and quality certifications.',
    icon: Scissors,
  },
  {
    step: 'Verification',
    title: 'Compliance & Export',
    description: 'Generate regulatory documentation, verify compliance with destination market requirements, and produce Digital Product Passports for end-consumer verification.',
    icon: Shield,
  },
];

const features = [
  { icon: MapPin, title: 'Origin Mapping', desc: 'GPS polygon boundaries for every farm plot and facility in the supply chain' },
  { icon: ScanLine, title: 'Batch Tracking', desc: 'Unique identifiers for every lot from raw fiber through finished goods' },
  { icon: Scale, title: 'Mass Balance', desc: 'Input-output reconciliation at every processing stage with automatic discrepancy detection' },
  { icon: FileText, title: 'Digital Product Passports', desc: 'QR-verifiable provenance records for every finished product' },
  { icon: BarChart3, title: 'Compliance Scoring', desc: 'Real-time readiness scores across traceability, documentation, and regulatory alignment' },
  { icon: Download, title: 'Export Documentation', desc: 'Auto-generated compliance dossiers for EU, US, UK, and other destination markets' },
  { icon: Search, title: 'Risk Assessment', desc: 'Automated risk classification based on sourcing regions, supplier history, and documentation gaps' },
  { icon: Shield, title: 'Audit-Ready Vault', desc: 'Centralized, tamper-evident storage of all compliance evidence with instant retrieval' },
];

const complianceFrameworks = [
  { regulation: 'EUDR', desc: 'Deforestation-free verification for rubber and other covered commodities used in textiles', href: '/compliance/eudr' },
  { regulation: 'FSMA 204', desc: 'Traceability for food-contact textile materials and packaging', href: '/compliance/usa' },
  { regulation: 'UK Environment Act', desc: 'Due diligence for forest-risk commodities in textile supply chains', href: '/compliance/uk' },
  { regulation: 'China GACC', desc: 'Product registration and safety documentation for textile imports', href: '/compliance/china' },
  { regulation: 'UAE ESMA', desc: 'Quality standards and origin certification for textile products', href: '/compliance/uae' },
];

const stats = [
  { value: '6+', label: 'Supply Chain Tiers', desc: 'Full traceability from farm through every processing stage' },
  { value: '95%', label: 'Fiber Traceability', desc: 'Of raw materials traced to verified origin points' },
  { value: '50%', label: 'Audit Time Reduction', desc: 'Faster regulatory audit resolution with centralized data' },
  { value: '100%', label: 'DPP Coverage', desc: 'Digital Product Passports for every finished product' },
];

export default function TextilesPage() {
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
                  [ Textiles & Apparel ]
                </p>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mb-6 text-slate-900 dark:text-white" data-testid="heading-textiles-title">
                  Fiber-to-Garment Traceability for Textiles & Apparel
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed mb-8" data-testid="text-textiles-subtitle">
                  Trace raw fibers through spinning, weaving, dyeing, and manufacturing. Generate Digital Product Passports and prove ethical sourcing across every tier of your textile supply chain.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link href="/demo">
                    <Button size="lg" className="gap-2 bg-emerald-600 text-white" data-testid="button-textiles-demo">
                      Request Demo
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="#supply-chain">
                    <Button size="lg" variant="outline" className="gap-2" data-testid="button-textiles-learn">
                      See the Journey
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
            <FadeIn className="text-center mb-12">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-3 tracking-wide uppercase">
                [ Industry Challenges ]
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold mb-4 text-slate-900 dark:text-white" data-testid="heading-challenges">
                The Textile Transparency Gap
              </h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
                Fashion and textile supply chains are among the most complex and opaque in global trade. Regulators and consumers demand more.
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

        <section id="supply-chain" className="py-16 md:py-24 bg-slate-50 dark:bg-slate-900/20 border-t border-slate-200 dark:border-slate-800" data-testid="section-supply-chain">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="mb-12">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-3 tracking-wide uppercase">
                [ Supply Chain Coverage ]
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold mb-4 text-slate-900 dark:text-white" data-testid="heading-supply-chain">
                Every Tier. Every Transformation. Every Record.
              </h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-xl">
                OriginTrace captures traceability data at every critical stage of the textile supply chain.
              </p>
            </FadeIn>

            <StaggerContainer className="space-y-0">
              {supplyChainSteps.map((item, i) => (
                <StaggerItem key={i}>
                  <div
                    className={`flex flex-col md:flex-row gap-6 md:gap-10 items-start py-8 ${i > 0 ? 'border-t border-slate-200 dark:border-slate-700' : ''} ${i % 2 === 1 ? 'md:flex-row-reverse' : ''}`}
                    data-testid={`card-supply-chain-${i}`}
                  >
                    <div className="shrink-0">
                      <div className="h-16 w-16 rounded-md bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center text-white">
                        <item.icon className="h-8 w-8" />
                      </div>
                    </div>
                    <div className={`flex-1 ${i % 2 === 1 ? 'md:text-right' : ''}`}>
                      <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1 tracking-wide uppercase">{item.step}</p>
                      <h3 className="font-semibold text-lg mb-2 text-slate-900 dark:text-white">{item.title}</h3>
                      <p className="text-muted-foreground leading-relaxed text-base max-w-lg">{item.description}</p>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        <section className="py-16 md:py-24 border-t border-slate-200 dark:border-slate-800" data-testid="section-features">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="text-center mb-12">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-3 tracking-wide uppercase">
                [ Platform Capabilities ]
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold mb-4 text-slate-900 dark:text-white" data-testid="heading-features">
                Everything You Need for Textile Traceability
              </h2>
            </FadeIn>

            <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {features.map((feature, i) => (
                <StaggerItem key={i}>
                  <div className="p-5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 h-full" data-testid={`card-feature-${i}`}>
                    <feature.icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mb-3" />
                    <h3 className="font-semibold text-sm mb-1 text-slate-900 dark:text-white" data-testid={`text-feature-title-${i}`}>{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        <section className="py-16 md:py-24 bg-slate-50 dark:bg-slate-900/20 border-t border-slate-200 dark:border-slate-800" data-testid="section-stats">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="text-center mb-12">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-3 tracking-wide uppercase">
                [ Impact ]
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white" data-testid="heading-stats">
                Measurable Textile Traceability
              </h2>
            </FadeIn>

            <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, i) => (
                <StaggerItem key={i}>
                  <div className="text-center py-8 px-4" data-testid={`stat-textiles-${i}`}>
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
                Regulatory Alignment for Textile Exports
              </h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
                One traceability foundation covers every major regulatory framework affecting textile and apparel exports.
              </p>
            </FadeIn>

            <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {complianceFrameworks.map((fw, i) => (
                <StaggerItem key={i}>
                  <Link href={fw.href}>
                    <Card className="h-full hover-elevate" data-testid={`card-compliance-${i}`}>
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          <h3 className="font-semibold text-slate-900 dark:text-white">{fw.regulation}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{fw.desc}</p>
                      </CardContent>
                    </Card>
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
                Build Transparency Into Every Garment
              </h2>
              <p className="text-emerald-100 mb-8 max-w-xl mx-auto leading-relaxed">
                From raw fiber to finished product — give your buyers and regulators the verifiable traceability data they demand.
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
