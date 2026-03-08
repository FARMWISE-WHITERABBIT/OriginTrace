'use client';

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
  ArrowRight
} from 'lucide-react';

const segments = [
  {
    id: 'exporters',
    label: 'Exporters',
    tagline: 'Revenue Protection & Rejection Reduction',
    icon: Globe,
    headline: 'Protect Export Revenue Before Shipments Leave Port',
    description: 'Border rejections destroy margins and reputation. OriginTrace provides pre-shipment compliance intelligence so your goods clear inspection the first time.',
    features: [
      { icon: Search, title: 'Pre-Shipment Risk Detection', desc: 'Identify documentation gaps, contamination risks, and traceability holes before goods leave your warehouse' },
      { icon: MapPin, title: 'Origin Verification', desc: 'GPS-verified farm boundaries with geospatial evidence for EU, UK, and US regulatory requirements' },
      { icon: FileText, title: 'Export Dossier Generation', desc: 'One-click generation of audit-ready compliance documentation for multiple regulatory frameworks' },
      { icon: ShieldCheck, title: 'Multi-Regulatory Alignment', desc: 'Single traceability foundation covers EUDR, FSMA 204, Environment Act, and buyer-driven standards' },
    ],
  },
  {
    id: 'processors',
    label: 'Processors',
    tagline: 'Chain-of-Custody & Audit Readiness',
    icon: Factory,
    headline: 'Maintain Traceability Through Every Transformation',
    description: 'Processing breaks traceability. OriginTrace maintains chain-of-custody through crushing, fermentation, and transformation — linking every finished good to its source farms.',
    features: [
      { icon: Scale, title: 'Mass Balance Enforcement', desc: 'Input-output reconciliation with commodity-specific recovery rates and automatic discrepancy detection' },
      { icon: Factory, title: 'Transformation Audit Trail', desc: 'Complete processing run records linking input batches to output products with timestamped logs' },
      { icon: Shield, title: 'Identity Preservation', desc: 'Maintain source segregation through the entire processing chain with verifiable batch linkage' },
      { icon: AlertTriangle, title: 'Contamination Prevention', desc: 'Instant alerts when non-compliant or flagged batches are about to enter the production line' },
    ],
  },
  {
    id: 'compliance',
    label: 'Compliance Teams',
    tagline: 'Documentation Control & Reporting',
    icon: ClipboardCheck,
    headline: 'Replace Spreadsheets with Standardized Compliance Infrastructure',
    description: 'Stop scrambling before audits. OriginTrace centralizes compliance documentation, automates reporting, and provides real-time visibility into your supply chain risk posture.',
    features: [
      { icon: FileText, title: 'Standardized Export Dossiers', desc: 'Generate regulatory-specific documentation packages for EU TRACES, FSMA, and buyer compliance programs' },
      { icon: BarChart3, title: 'Shipment Readiness Scoring', desc: 'Real-time compliance scores across traceability, contamination risk, documentation, and regulatory alignment' },
      { icon: Search, title: 'Gap Analysis & Remediation', desc: 'Automated identification of compliance gaps with prioritized action plans and remediation tracking' },
      { icon: Shield, title: 'Audit-Ready Data Vault', desc: 'Centralized, tamper-evident storage of all compliance evidence with instant retrieval for inspectors' },
    ],
  },
  {
    id: 'associations',
    label: 'Associations & Regulators',
    tagline: 'Reducing National Rejection Rates',
    icon: Landmark,
    headline: 'Institutional Infrastructure for Trade Compliance',
    description: 'National rejection rates damage entire commodity sectors. OriginTrace provides institutional dashboards and aggregated compliance intelligence to improve sector-wide export readiness.',
    features: [
      { icon: BarChart3, title: 'Sector-Wide Analytics', desc: 'Aggregated compliance metrics across member organizations to identify systemic weaknesses' },
      { icon: TrendingDown, title: 'Rejection Rate Reduction', desc: 'Track and measure improvement in border inspection pass rates across commodity exports' },
      { icon: Building2, title: 'Multi-Tenant Oversight', desc: 'Monitor compliance posture across multiple exporters and processors from a single dashboard' },
      { icon: Ban, title: 'Contamination Early Warning', desc: 'Sector-level alerts for emerging contamination patterns, pesticide residue trends, and documentation gaps' },
    ],
  },
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

          {segments.map((segment, segIdx) => (
            <section 
              key={segment.id} 
              id={segment.id}
              className={`py-20 md:py-28 border-t border-slate-200 dark:border-slate-800 ${
                segIdx % 2 === 1 
                  ? 'bg-slate-50 dark:bg-slate-900/30' 
                  : 'bg-background'
              }`}
              data-testid={`section-${segment.id}`}
            >
              <div className="max-w-6xl mx-auto px-6">
                <FadeIn>
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-4 tracking-widest uppercase" data-testid={`text-section-label-${segment.id}`}>
                    [ {segment.label} ]
                  </p>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-9 w-9 rounded-md bg-emerald-600/10 dark:bg-emerald-500/10 flex items-center justify-center">
                      <segment.icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      {segment.tagline}
                    </p>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-slate-900 dark:text-slate-50" data-testid={`text-heading-${segment.id}`}>
                    {segment.headline}
                  </h2>
                  <p className="text-muted-foreground mb-10 max-w-2xl leading-relaxed text-base" data-testid={`text-description-${segment.id}`}>
                    {segment.description}
                  </p>
                </FadeIn>

                <StaggerContainer className="grid md:grid-cols-2 gap-6 mb-10">
                  {segment.features.map((feature, i) => (
                    <StaggerItem key={i}>
                      <Card className="h-full hover-elevate" data-testid={`card-feature-${segment.id}-${i}`}>
                        <CardContent className="p-6">
                          <div className="flex gap-4">
                            <div className="h-10 w-10 shrink-0 rounded-md bg-emerald-600/10 dark:bg-emerald-500/10 flex items-center justify-center">
                              <feature.icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                              <h3 className="font-semibold mb-1 text-slate-900 dark:text-slate-50" data-testid={`text-feature-title-${segment.id}-${i}`}>{feature.title}</h3>
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
                  <div className="flex items-center gap-4">
                    <Link href="/demo">
                      <Button className="gap-2 bg-emerald-600 text-white" data-testid={`button-demo-${segment.id}`}>
                        See How It Works
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href="/compliance/eudr" className="text-sm text-emerald-600 dark:text-emerald-400 font-medium hover:underline" data-testid={`link-compliance-${segment.id}`}>
                      View compliance coverage
                    </Link>
                  </div>
                </FadeIn>
              </div>
            </section>
          ))}

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
