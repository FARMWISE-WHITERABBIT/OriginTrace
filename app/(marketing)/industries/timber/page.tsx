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
  TreePine,
  Scale,
  AlertTriangle,
  Download,
  ArrowRight,
  Layers,
  ScanLine,
  Warehouse,
} from 'lucide-react';

const challenges = [
  {
    icon: TreePine,
    title: 'Deforestation Verification',
    description: 'Proving timber was harvested from land that was not deforested after regulatory cut-off dates requires precise geospatial evidence and satellite cross-referencing.',
  },
  {
    icon: Layers,
    title: 'Complex Chain of Custody',
    description: 'Wood passes through multiple hands — harvesters, sawmills, processing plants, and distributors — each introducing the risk of traceability breaks.',
  },
  {
    icon: Scale,
    title: 'Legal Compliance Across Jurisdictions',
    description: 'Timber exports must comply with the laws of the country of origin and the importing market — covering land use rights, harvesting permits, and environmental protections.',
  },
  {
    icon: FileText,
    title: 'Due Diligence Documentation',
    description: 'EUDR requires operators to submit due diligence statements with geolocation data, species identification, and supply chain records before placing products on the EU market.',
  },
];

const features = [
  {
    icon: MapPin,
    title: 'Concession & Plot Mapping',
    description: 'Capture GPS polygon boundaries for forestry concessions and individual harvest plots. Overlay with satellite deforestation data to verify compliance with cut-off dates.',
  },
  {
    icon: ScanLine,
    title: 'Log-Level Tracking',
    description: 'Assign unique identifiers to individual logs and track them through every stage — from felling to sawmill to finished product. Full chain-of-custody at the unit level.',
  },
  {
    icon: Warehouse,
    title: 'Sawmill & Processing Records',
    description: 'Document every transformation step with input-output reconciliation. Link sawn timber, veneer, and finished products back to their source concessions.',
  },
  {
    icon: BarChart3,
    title: 'Compliance Scoring',
    description: 'Real-time readiness scores covering geolocation coverage, documentation completeness, species verification, and regulatory alignment for every shipment.',
  },
  {
    icon: Download,
    title: 'DDS & Export Documentation',
    description: 'Automatically generate Due Diligence Statements and export dossiers formatted for the EU Information System, FLEGT licensing, and destination-market requirements.',
  },
  {
    icon: Shield,
    title: 'Risk Assessment Engine',
    description: 'Automated risk classification based on country risk levels, concession history, species vulnerability, and documentation gaps with actionable remediation guidance.',
  },
];

const timeline = [
  { step: 'Source', desc: 'Map concession boundaries, verify harvesting permits, capture species data at the forest level' },
  { step: 'Harvest', desc: 'Tag individual logs with unique identifiers, record GPS coordinates of felling locations' },
  { step: 'Process', desc: 'Track logs through sawmills and processing facilities with input-output mass balance' },
  { step: 'Export', desc: 'Generate compliance documentation, verify regulatory alignment, submit DDS to EU system' },
  { step: 'Verify', desc: 'Buyers and regulators verify origin, legality, and deforestation-free status via digital passport' },
];

const complianceFrameworks = [
  { regulation: 'EUDR', desc: 'Deforestation-free verification, GPS polygon mapping, due diligence statement generation', href: '/compliance/eudr' },
  { regulation: 'UK Environment Act', desc: 'Forest-risk commodity due diligence, legal compliance verification', href: '/compliance/uk' },
  { regulation: 'FSMA 204', desc: 'Key data elements and critical tracking events for wood-derived food contact materials', href: '/compliance/usa' },
  { regulation: 'China GACC', desc: 'Facility registration, product safety documentation for wood product imports', href: '/compliance/china' },
  { regulation: 'UAE ESMA', desc: 'Product quality and origin certification for timber imports', href: '/compliance/uae' },
];

const stats = [
  { value: '100%', label: 'Plot Coverage', desc: 'Every harvest plot GPS-mapped with polygon boundaries' },
  { value: '3x', label: 'Faster Audits', desc: 'Speed improvement in regulatory audit resolution' },
  { value: '0', label: 'Traceability Gaps', desc: 'Full chain-of-custody from forest to finished product' },
  { value: 'Dec 2020', label: 'Cut-Off Verified', desc: 'Deforestation cut-off date compliance verified via satellite' },
];

export default function TimberPage() {
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
                  [ Timber & Forestry ]
                </p>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mb-6 text-slate-900 dark:text-white" data-testid="heading-timber-title">
                  Chain-of-Custody Traceability for Timber & Wood Products
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed mb-8" data-testid="text-timber-subtitle">
                  Prove deforestation-free sourcing, maintain log-level traceability, and generate export-ready compliance documentation — from forest concession to finished product.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link href="/demo">
                    <Button size="lg" className="gap-2 bg-emerald-600 text-white" data-testid="button-timber-demo">
                      Request Demo
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="#features">
                    <Button size="lg" variant="outline" className="gap-2" data-testid="button-timber-learn">
                      Explore Features
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
                  Why Timber Traceability Demands More
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                  Timber supply chains face unique regulatory scrutiny. Proving deforestation-free sourcing requires geospatial evidence, species verification, and unbroken chain-of-custody from forest to market.
                </p>
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

        <section id="features" className="py-16 md:py-24 bg-slate-50 dark:bg-slate-900/20 border-t border-slate-200 dark:border-slate-800" data-testid="section-features">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="text-center mb-12">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-3 tracking-wide uppercase">
                [ Platform Features ]
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold mb-4 text-slate-900 dark:text-white" data-testid="heading-features">
                Purpose-Built for Timber & Forestry
              </h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
                From concession mapping to export documentation — every tool you need to maintain compliant timber supply chains.
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

        <section className="py-16 md:py-24 border-t border-slate-200 dark:border-slate-800" data-testid="section-journey">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="mb-12">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-3 tracking-wide uppercase">
                [ Traceability Journey ]
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold mb-4 text-slate-900 dark:text-white" data-testid="heading-journey">
                From Forest to Market — Every Step Verified
              </h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-xl">
                OriginTrace captures and verifies data at every critical point in the timber supply chain.
              </p>
            </FadeIn>

            <StaggerContainer className="relative">
              <div className="hidden lg:block absolute top-6 left-0 right-0 h-px bg-emerald-200 dark:bg-emerald-800" />
              <div className="grid lg:grid-cols-5 gap-6">
                {timeline.map((item, i) => (
                  <StaggerItem key={i}>
                    <div className="relative" data-testid={`card-journey-${i}`}>
                      <div className="hidden lg:flex items-center justify-center w-12 h-12 rounded-full bg-emerald-600 text-white font-bold text-sm mb-4 relative z-10">
                        {i + 1}
                      </div>
                      <div className="lg:hidden flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">{i + 1}</div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">{item.step}</h3>
                      </div>
                      <h3 className="hidden lg:block font-semibold text-slate-900 dark:text-white mb-2">{item.step}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  </StaggerItem>
                ))}
              </div>
            </StaggerContainer>
          </div>
        </section>

        <section className="py-16 md:py-24 bg-slate-50 dark:bg-slate-900/20 border-t border-slate-200 dark:border-slate-800" data-testid="section-stats">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="text-center mb-12">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-3 tracking-wide uppercase">
                [ Results ]
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white" data-testid="heading-stats">
                Timber Compliance, Quantified
              </h2>
            </FadeIn>

            <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, i) => (
                <StaggerItem key={i}>
                  <div className="text-center py-8 px-4" data-testid={`stat-timber-${i}`}>
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
            <FadeIn className="mb-12">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-3 tracking-wide uppercase">
                [ Regulatory Coverage ]
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold mb-4 text-slate-900 dark:text-white" data-testid="heading-compliance">
                Compliance Coverage for Timber Exports
              </h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-xl">
                A single traceability foundation satisfies the regulatory requirements of every major destination market.
              </p>
            </FadeIn>

            <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                Prove Deforestation-Free Sourcing with Confidence
              </h2>
              <p className="text-emerald-100 mb-8 max-w-xl mx-auto leading-relaxed">
                Build the traceability infrastructure your timber supply chain needs to satisfy EUDR, UK Environment Act, and buyer sustainability requirements.
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
