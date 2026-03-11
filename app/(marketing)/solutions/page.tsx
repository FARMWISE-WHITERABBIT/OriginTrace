import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/marketing/motion';
import { 
  MapPin, 
  Users,
  AlertTriangle,
  FileText,
  Scale,
  Factory,
  Shield,
  ChevronRight,
  Smartphone,
  Wifi,
  ClipboardCheck,
  BarChart3,
  Globe,
  Building2,
  Landmark,
  ShieldCheck,
  Search,
  TrendingDown,
  Ban,
  ArrowRight,
  CheckCircle2,
  Quote
} from 'lucide-react';

const exporterFeatures = [
  { icon: Search, title: 'Pre-Shipment Risk Detection', desc: 'Identify documentation gaps, contamination risks, and traceability holes before goods leave your warehouse' },
  { icon: MapPin, title: 'Origin Verification', desc: 'GPS-verified farm boundaries with geospatial evidence for EU, UK, and US regulatory requirements' },
  { icon: FileText, title: 'Export Dossier Generation', desc: 'One-click generation of audit-ready compliance documentation for multiple regulatory frameworks' },
  { icon: ShieldCheck, title: 'Multi-Regulatory Alignment', desc: 'Single traceability foundation covers EUDR, FSMA 204, Environment Act, and buyer-driven standards' },
];

const processorSteps = [
  { number: '01', icon: Scale, title: 'Mass Balance Enforcement', desc: 'Input-output reconciliation with commodity-specific recovery rates and automatic discrepancy detection' },
  { number: '02', icon: Factory, title: 'Transformation Audit Trail', desc: 'Complete processing run records linking input batches to output products with timestamped logs' },
  { number: '03', icon: Shield, title: 'Identity Preservation', desc: 'Maintain source segregation through the entire processing chain with verifiable batch linkage' },
  { number: '04', icon: AlertTriangle, title: 'Contamination Prevention', desc: 'Instant alerts when non-compliant or flagged batches are about to enter the production line' },
];

const complianceFeatures = [
  { icon: FileText, title: 'Standardized Export Dossiers', desc: 'Generate regulatory-specific documentation packages for EU TRACES, FSMA, and buyer compliance programs' },
  { icon: BarChart3, title: 'Shipment Readiness Scoring', desc: 'Real-time compliance scores across traceability, contamination risk, documentation, and regulatory alignment' },
  { icon: Search, title: 'Gap Analysis & Remediation', desc: 'Automated identification of compliance gaps with prioritized action plans and remediation tracking' },
  { icon: Shield, title: 'Audit-Ready Data Vault', desc: 'Centralized, tamper-evident storage of all compliance evidence with instant retrieval for inspectors' },
];

const associationStats = [
  { value: '40%', label: 'Fewer Border Rejections', desc: 'Average reduction in shipment rejections for member exporters within 6 months' },
  { value: '3x', label: 'Faster Audit Resolution', desc: 'Speed improvement in responding to regulatory inquiries with centralized data' },
  { value: '95%', label: 'Traceability Coverage', desc: 'Of supply chain touchpoints captured from farm to port of export' },
  { value: '12', label: 'Countries Served', desc: 'Active deployments across West Africa, East Africa, and Southeast Asia' },
];

const associationCapabilities = [
  { icon: BarChart3, title: 'Sector-Wide Analytics', desc: 'Aggregated compliance metrics across member organizations to identify systemic weaknesses' },
  { icon: TrendingDown, title: 'Rejection Rate Reduction', desc: 'Track and measure improvement in border inspection pass rates across commodity exports' },
  { icon: Building2, title: 'Multi-Tenant Oversight', desc: 'Monitor compliance posture across multiple exporters and processors from a single dashboard' },
  { icon: Ban, title: 'Contamination Early Warning', desc: 'Sector-level alerts for emerging contamination patterns, pesticide residue trends, and documentation gaps' },
];

export default function SolutionsPage() {
  return (
    <>
<div className="min-h-screen bg-background overflow-x-hidden">
        <MarketingNav />

        <main>
          <section className="relative pt-28 pb-20 md:pt-36 md:pb-28 overflow-hidden bg-slate-50 dark:bg-slate-900/20">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgxNDgsIDE2MywgMTg0LCAwLjA4KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-60" />
            
            <div className="max-w-6xl mx-auto px-6 relative z-10">
              <FadeIn>
                <div className="max-w-3xl">
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-4 tracking-widest uppercase" data-testid="text-section-label-hero">
                    [ Solutions by Role ]
                  </p>
                  <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mb-6 text-slate-900 dark:text-slate-50" data-testid="text-hero-heading">
                    Built for Every Role in the Export Chain
                  </h1>
                  <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl" data-testid="text-hero-description">
                    Whether you are sourcing from smallholders, processing for export, managing compliance documentation, or overseeing national trade performance — OriginTrace provides the infrastructure you need to reduce rejection risk.
                  </p>
                </div>
              </FadeIn>
            </div>
          </section>

          <section 
            id="exporters"
            className="py-20 md:py-28 border-t border-slate-200 dark:border-slate-800 bg-background"
            data-testid="section-exporters"
          >
            <div className="max-w-6xl mx-auto px-6">
              <div className="grid lg:grid-cols-5 gap-12 lg:gap-16 items-start">
                <div className="lg:col-span-3">
                  <FadeIn>
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-4 tracking-widest uppercase" data-testid="text-section-label-exporters">
                      [ Exporters ]
                    </p>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-9 w-9 rounded-md bg-emerald-600/10 dark:bg-emerald-500/10 flex items-center justify-center">
                        <Globe className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        Revenue Protection & Rejection Reduction
                      </p>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-slate-900 dark:text-slate-50" data-testid="text-heading-exporters">
                      Protect Export Revenue Before Shipments Leave Port
                    </h2>
                    <p className="text-muted-foreground mb-10 max-w-2xl leading-relaxed text-base" data-testid="text-description-exporters">
                      Border rejections destroy margins and reputation. OriginTrace provides pre-shipment compliance intelligence so your goods clear inspection the first time.
                    </p>
                  </FadeIn>

                  <StaggerContainer className="grid sm:grid-cols-2 gap-6 mb-10">
                    {exporterFeatures.map((feature, i) => (
                      <StaggerItem key={i}>
                        <Card className="h-full hover-elevate" data-testid={`card-feature-exporters-${i}`}>
                          <CardContent className="p-6">
                            <div className="flex gap-4">
                              <div className="h-10 w-10 shrink-0 rounded-md bg-emerald-600/10 dark:bg-emerald-500/10 flex items-center justify-center">
                                <feature.icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                              </div>
                              <div>
                                <h3 className="font-semibold mb-1 text-slate-900 dark:text-slate-50" data-testid={`text-feature-title-exporters-${i}`}>{feature.title}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {feature.desc}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </StaggerItem>
                    ))}
                  </StaggerContainer>

                  <FadeIn>
                    <div className="flex items-center gap-4 flex-wrap">
                      <Link href="/demo">
                        <Button className="gap-2 bg-emerald-600 text-white" data-testid="button-demo-exporters">
                          See How It Works
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href="/compliance/eudr" className="text-sm text-emerald-600 dark:text-emerald-400 font-medium hover:underline" data-testid="link-compliance-exporters">
                        View compliance coverage
                      </Link>
                    </div>
                  </FadeIn>
                </div>

                <div className="lg:col-span-2">
                  <FadeIn delay={0.2}>
                    <Card className="overflow-visible" data-testid="card-compliance-score-preview">
                      <CardContent className="p-6">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-5">Shipment Readiness Score</p>
                        <div className="flex items-end gap-3 mb-6">
                          <span className="text-5xl font-extrabold text-emerald-600 dark:text-emerald-400">87</span>
                          <span className="text-lg text-slate-400 dark:text-slate-500 mb-1">/100</span>
                        </div>
                        <div className="space-y-4">
                          {[
                            { label: 'Traceability', pct: 95 },
                            { label: 'Documentation', pct: 82 },
                            { label: 'Contamination Risk', pct: 90 },
                            { label: 'Regulatory Alignment', pct: 78 },
                          ].map((item) => (
                            <div key={item.label}>
                              <div className="flex justify-between gap-2 text-sm mb-1.5">
                                <span className="text-slate-600 dark:text-slate-300">{item.label}</span>
                                <span className="font-medium text-slate-900 dark:text-slate-50">{item.pct}%</span>
                              </div>
                              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                                <div 
                                  className="h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 transition-all duration-700"
                                  style={{ width: `${item.pct}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <span className="text-slate-600 dark:text-slate-300">EUDR compliant</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm mt-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <span className="text-slate-600 dark:text-slate-300">FSMA 204 ready</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm mt-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <span className="text-slate-600 dark:text-slate-300">UK Environment Act — 1 gap</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </FadeIn>
                </div>
              </div>
            </div>
          </section>

          <section 
            id="processors"
            className="py-20 md:py-28 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30"
            data-testid="section-processors"
          >
            <div className="max-w-6xl mx-auto px-6">
              <FadeIn>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-4 tracking-widest uppercase" data-testid="text-section-label-processors">
                  [ Processors ]
                </p>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-9 w-9 rounded-md bg-emerald-600/10 dark:bg-emerald-500/10 flex items-center justify-center">
                    <Factory className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Chain-of-Custody & Audit Readiness
                  </p>
                </div>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-slate-900 dark:text-slate-50" data-testid="text-heading-processors">
                  Maintain Traceability Through Every Transformation
                </h2>
                <p className="text-muted-foreground mb-14 max-w-2xl leading-relaxed text-base" data-testid="text-description-processors">
                  Processing breaks traceability. OriginTrace maintains chain-of-custody through crushing, fermentation, and transformation — linking every finished good to its source farms.
                </p>
              </FadeIn>

              <div className="relative mb-14">
                <div className="hidden md:block absolute left-[27px] top-6 bottom-6 w-px bg-emerald-200 dark:bg-emerald-800" />
                <StaggerContainer className="space-y-8 md:space-y-0 md:grid md:grid-cols-1 md:gap-0">
                  {processorSteps.map((step, i) => (
                    <StaggerItem key={i}>
                      <div className="flex gap-6 md:gap-8 group relative" data-testid={`card-feature-processors-${i}`}>
                        <div className="shrink-0 flex flex-col items-center">
                          <div className="h-14 w-14 rounded-md bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center text-white font-bold text-lg z-10">
                            {step.number}
                          </div>
                          {i < processorSteps.length - 1 && (
                            <div className="md:hidden w-px h-8 bg-emerald-200 dark:bg-emerald-800 my-1" />
                          )}
                        </div>
                        <div className="pt-2 pb-8 md:pb-10">
                          <div className="flex items-center gap-3 mb-2">
                            <step.icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-50" data-testid={`text-feature-title-processors-${i}`}>{step.title}</h3>
                          </div>
                          <p className="text-muted-foreground leading-relaxed text-base max-w-lg">
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </div>

              <FadeIn>
                <div className="flex items-center gap-4 flex-wrap">
                  <Link href="/demo">
                    <Button className="gap-2 bg-emerald-600 text-white" data-testid="button-demo-processors">
                      See How It Works
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/compliance/eudr" className="text-sm text-emerald-600 dark:text-emerald-400 font-medium hover:underline" data-testid="link-compliance-processors">
                    View compliance coverage
                  </Link>
                </div>
              </FadeIn>
            </div>
          </section>

          <section 
            id="compliance"
            className="py-20 md:py-28 border-t border-slate-200 dark:border-slate-800 bg-background"
            data-testid="section-compliance"
          >
            <div className="max-w-6xl mx-auto px-6">
              <FadeIn>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-4 tracking-widest uppercase" data-testid="text-section-label-compliance">
                  [ Compliance Teams ]
                </p>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-9 w-9 rounded-md bg-emerald-600/10 dark:bg-emerald-500/10 flex items-center justify-center">
                    <ClipboardCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Documentation Control & Reporting
                  </p>
                </div>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-slate-900 dark:text-slate-50" data-testid="text-heading-compliance">
                  Replace Spreadsheets with Standardized Compliance Infrastructure
                </h2>
                <p className="text-muted-foreground mb-14 max-w-2xl leading-relaxed text-base" data-testid="text-description-compliance">
                  Stop scrambling before audits. OriginTrace centralizes compliance documentation, automates reporting, and provides real-time visibility into your supply chain risk posture.
                </p>
              </FadeIn>

              <StaggerContainer className="grid sm:grid-cols-2 gap-6 mb-14">
                {complianceFeatures.map((feature, i) => (
                  <StaggerItem key={i}>
                    <Card className="h-full hover-elevate" data-testid={`card-feature-compliance-${i}`}>
                      <CardContent className="p-6">
                        <div className="flex gap-4">
                          <div className="h-10 w-10 shrink-0 rounded-md bg-emerald-600/10 dark:bg-emerald-500/10 flex items-center justify-center">
                            <feature.icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold mb-1 text-slate-900 dark:text-slate-50" data-testid={`text-feature-title-compliance-${i}`}>{feature.title}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {feature.desc}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </StaggerItem>
                ))}
              </StaggerContainer>

              <FadeIn>
                <div className="flex items-center gap-4 flex-wrap">
                  <Link href="/demo">
                    <Button className="gap-2 bg-emerald-600 text-white" data-testid="button-demo-compliance">
                      See How It Works
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/compliance/eudr" className="text-sm text-emerald-600 dark:text-emerald-400 font-medium hover:underline" data-testid="link-compliance-compliance">
                    View compliance coverage
                  </Link>
                </div>
              </FadeIn>
            </div>
          </section>

          <section 
            id="associations"
            className="py-20 md:py-28 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30"
            data-testid="section-associations"
          >
            <div className="max-w-6xl mx-auto px-6">
              <FadeIn>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-4 tracking-widest uppercase" data-testid="text-section-label-associations">
                  [ Associations & Regulators ]
                </p>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-9 w-9 rounded-md bg-emerald-600/10 dark:bg-emerald-500/10 flex items-center justify-center">
                    <Landmark className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Reducing National Rejection Rates
                  </p>
                </div>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-slate-900 dark:text-slate-50" data-testid="text-heading-associations">
                  Institutional Infrastructure for Trade Compliance
                </h2>
                <p className="text-muted-foreground mb-14 max-w-2xl leading-relaxed text-base" data-testid="text-description-associations">
                  National rejection rates damage entire commodity sectors. OriginTrace provides institutional dashboards and aggregated compliance intelligence to improve sector-wide export readiness.
                </p>
              </FadeIn>

              <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-14">
                {associationStats.map((stat, i) => (
                  <StaggerItem key={i}>
                    <div className="text-center py-8 px-4" data-testid={`stat-associations-${i}`}>
                      <p className="text-4xl md:text-5xl font-extrabold text-emerald-600 dark:text-emerald-400 mb-2">
                        {stat.value}
                      </p>
                      <p className="font-semibold text-slate-900 dark:text-slate-50 mb-2">{stat.label}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{stat.desc}</p>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>

              <FadeIn>
                <div className="grid sm:grid-cols-2 gap-4 mb-14">
                  {associationCapabilities.map((cap, i) => (
                    <div key={i} className="flex items-start gap-3 py-3" data-testid={`card-feature-associations-${i}`}>
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-50" data-testid={`text-feature-title-associations-${i}`}>{cap.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{cap.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </FadeIn>

              <FadeIn delay={0.1}>
                <Card className="overflow-visible" data-testid="card-testimonial-associations">
                  <CardContent className="p-8 md:p-10">
                    <Quote className="h-8 w-8 text-emerald-600/20 dark:text-emerald-400/20 mb-4" />
                    <blockquote className="text-lg md:text-xl leading-relaxed text-slate-700 dark:text-slate-200 mb-6">
                      With sector-wide visibility into compliance gaps, we reduced border rejections by 40% in a single season. The aggregated analytics transformed how our association supports member exporters.
                    </blockquote>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-50">Regional Trade Association</p>
                      <p className="text-sm text-muted-foreground">West Africa Commodity Export Board</p>
                    </div>
                  </CardContent>
                </Card>
              </FadeIn>

              <FadeIn delay={0.15}>
                <div className="flex items-center gap-4 mt-10 flex-wrap">
                  <Link href="/demo">
                    <Button className="gap-2 bg-emerald-600 text-white" data-testid="button-demo-associations">
                      See How It Works
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/compliance/eudr" className="text-sm text-emerald-600 dark:text-emerald-400 font-medium hover:underline" data-testid="link-compliance-associations">
                    View compliance coverage
                  </Link>
                </div>
              </FadeIn>
            </div>
          </section>

          <section className="py-20 md:py-28 bg-slate-50 dark:bg-slate-900/30 border-t border-slate-200 dark:border-slate-800">
            <div className="max-w-6xl mx-auto px-6">
              <FadeIn className="text-center mb-14">
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-4 tracking-widest uppercase" data-testid="text-section-label-field-ops">
                  [ Field Operations ]
                </p>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-slate-900 dark:text-slate-50" data-testid="text-heading-field-ops">
                  Designed for Real-World Export Operations
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto text-base">
                  Your field agents work in remote areas with limited connectivity. 
                  OriginTrace is built to capture reliable data in the most challenging conditions.
                </p>
              </FadeIn>
              
              <StaggerContainer className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                <StaggerItem className="text-center">
                  <div className="h-12 w-12 mx-auto mb-4 rounded-md bg-emerald-600/10 dark:bg-emerald-500/10 flex items-center justify-center">
                    <Smartphone className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="font-semibold mb-2 text-slate-900 dark:text-slate-50" data-testid="text-feature-pwa">Mobile-First PWA</h3>
                  <p className="text-sm text-muted-foreground">
                    Works on any smartphone without app store downloads
                  </p>
                </StaggerItem>
                
                <StaggerItem className="text-center">
                  <div className="h-12 w-12 mx-auto mb-4 rounded-md bg-emerald-600/10 dark:bg-emerald-500/10 flex items-center justify-center">
                    <Wifi className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="font-semibold mb-2 text-slate-900 dark:text-slate-50" data-testid="text-feature-offline">Offline-First Design</h3>
                  <p className="text-sm text-muted-foreground">
                    Collect data without connectivity. Auto-syncs when network returns
                  </p>
                </StaggerItem>
                
                <StaggerItem className="text-center">
                  <div className="h-12 w-12 mx-auto mb-4 rounded-md bg-emerald-600/10 dark:bg-emerald-500/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="font-semibold mb-2 text-slate-900 dark:text-slate-50" data-testid="text-feature-hc-ui">High Contrast UI</h3>
                  <p className="text-sm text-muted-foreground">
                    Large touch targets and readable text for outdoor use
                  </p>
                </StaggerItem>
              </StaggerContainer>
            </div>
          </section>

          <section className="py-20 md:py-28 border-t border-slate-200 dark:border-slate-800">
            <div className="max-w-6xl mx-auto px-6 text-center">
              <FadeIn>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-4 tracking-widest uppercase" data-testid="text-section-label-cta">
                  [ Get Started ]
                </p>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-slate-900 dark:text-slate-50" data-testid="text-heading-cta">
                  Ready to reduce shipment rejection risk?
                </h2>
                <p className="text-muted-foreground max-w-lg mx-auto mb-8 text-base">
                  Schedule a consultation to see how OriginTrace fits your export compliance workflow.
                </p>
                <Link href="/demo">
                  <Button size="lg" className="gap-2 bg-emerald-600 text-white" data-testid="button-request-demo">
                    Request Demo
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </FadeIn>
            </div>
          </section>
        </main>

        <MarketingFooter />
      </div>
    </>
  );
}
