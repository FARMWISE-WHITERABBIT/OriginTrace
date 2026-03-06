'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import { ComplianceCalculator } from '@/components/marketing/compliance-calculator';
import { CommodityBar } from '@/components/marketing/ui-mockups';
import { RiskAccordion } from '@/components/marketing/accordion';
import { FadeIn, StaggerContainer, StaggerItem, ScaleIn } from '@/components/marketing/motion';
import HeroBackground from '@/components/marketing/hero-background';
import { 
  Shield, 
  ChevronRight,
  Check,
  AlertTriangle,
  FileText,
  MapPin,
  Package,
  Factory,
  Truck,
  ClipboardCheck,
  Sprout,
  Droplets,
  Globe,
  Thermometer,
  FolderOpen,
  Users,
  ArrowRight,
  CircleAlert,
  Search,
  FlaskConical,
  BarChart3,
  Scale,
  Leaf
} from 'lucide-react';

const problemCards = [
  { icon: FlaskConical, title: 'Hazardous pesticide residues', description: 'MRL violations trigger automatic border rejections across EU and US markets.' },
  { icon: AlertTriangle, title: 'Aflatoxin contamination', description: 'Mycotoxin levels above threshold result in destroyed shipments and lost revenue.' },
  { icon: MapPin, title: 'Missing geospatial origin data', description: 'Regulators require plot-level GPS proof of origin, not warehouse addresses.' },
  { icon: FileText, title: 'Incomplete documentation', description: 'Missing phytosanitary certificates, lab reports, or due diligence statements halt clearance.' },
  { icon: Thermometer, title: 'Cold chain breakdowns', description: 'Temperature excursions during transit invalidate perishable commodity compliance.' },
  { icon: FolderOpen, title: 'Fragmented supplier records', description: 'Scattered data across WhatsApp, spreadsheets, and paper makes audit response impossible.' },
];

const solutionPoints = [
  { icon: Sprout, text: 'Digitally capture first-mile traceability from farm to aggregation point' },
  { icon: FlaskConical, text: 'Track pesticide application, processing inputs, and contamination test results' },
  { icon: Package, text: 'Link every batch and lot to verified origin with GPS polygon evidence' },
  { icon: Search, text: 'Identify compliance gaps and flag risk factors before shipment leaves port' },
  { icon: FileText, text: 'Generate standardized export compliance dossiers for any destination market' },
];

const readinessCategories = [
  { label: 'Traceability Integrity', weight: '25%', score: 92, color: 'bg-emerald-500' },
  { label: 'Chemical & Contamination Risk', weight: '25%', score: 78, color: 'bg-amber-500' },
  { label: 'Documentation Completeness', weight: '20%', score: 85, color: 'bg-emerald-500' },
  { label: 'Storage & Handling Controls', weight: '15%', score: 70, color: 'bg-amber-500' },
  { label: 'Regulatory Alignment', weight: '15%', score: 88, color: 'bg-emerald-500' },
];

const flaggedIssues = [
  { severity: 'warning', text: 'Pesticide residue report missing for Batch BT-2847' },
  { severity: 'warning', text: 'Cold chain temperature log gap detected (4h window)' },
  { severity: 'critical', text: 'Supplier KYC documentation expired for 2 sources' },
];

const recommendedActions = [
  'Upload lab analysis for Batch BT-2847 before port cutoff',
  'Request updated supplier KYC from Okonkwo Holdings',
  'Verify cold chain logger calibration for Container CN-4421',
];

const regulatoryData = [
  {
    region: 'European Union',
    icon: Globe,
    regulations: ['EUDR (Deforestation Regulation)', 'General Food Law (EC 178/2002)', 'Organic Regulation (EU 2018/848)', 'CS3D (Corporate Sustainability Due Diligence)'],
  },
  {
    region: 'United Kingdom',
    icon: Scale,
    regulations: ['Environment Act (Forest Risk Commodities)', 'UK Food Safety Regulations'],
  },
  {
    region: 'United States',
    icon: ClipboardCheck,
    regulations: ['FSMA 204 (Food Traceability Rule)', 'Lacey Act (Timber & Plant Products)'],
  },
  {
    region: 'Buyer & Voluntary Standards',
    icon: Leaf,
    regulations: ['Rainforest Alliance', 'Fairtrade International', 'Private sourcing policies & retailer codes'],
  },
];

const supplyChainSteps = [
  { icon: Sprout, label: 'Farm', detail: 'GPS-verified origin' },
  { icon: Users, label: 'Aggregator', detail: 'Collection & grading' },
  { icon: Factory, label: 'Processor', detail: 'Transformation & QC' },
  { icon: Truck, label: 'Export', detail: 'Documentation & dispatch' },
  { icon: ClipboardCheck, label: 'Inspection', detail: 'Border compliance check' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <MarketingNav />

      <main>
        <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden min-h-[85vh]">
          <HeroBackground />
          
          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <div className="max-w-xl">
              <FadeIn direction="right">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                  <Shield className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-medium text-emerald-500">Export Risk & Trade Compliance</span>
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight leading-tight mt-6 mb-6 text-slate-900" data-testid="text-hero-headline">
                  Export Without Rejection Risk
                </h1>
                <p className="text-base md:text-lg text-slate-600 leading-relaxed mb-8">
                  OriginTrace helps exporters and processors prove origin, manage compliance risk, and generate audit-ready documentation before shipments leave port.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="#eudr-assessment">
                    <Button size="lg" className="gap-2 w-full sm:w-auto bg-emerald-500 text-white border-emerald-600" data-testid="button-check-readiness">
                      Assess Your Export Readiness
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/demo">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto border-emerald-600 text-emerald-700" data-testid="button-request-demo">
                      Request a Demo
                    </Button>
                  </Link>
                </div>
                <p className="text-sm text-slate-500 mt-6">
                  Built for fragmented supply chains and real-world export operations.
                </p>
              </FadeIn>
            </div>
          </div>
        </section>

        <section className="py-6 border-y border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="max-w-6xl mx-auto px-6">
            <CommodityBar />
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-semibold mb-4" data-testid="text-problem-headline">
                Why Shipments Get Rejected
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Export rejections cost African commodity exporters millions annually. 
                The root causes are structural, not accidental.
              </p>
            </FadeIn>

            <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {problemCards.map((card, i) => (
                <StaggerItem key={i}>
                  <Card className="h-full">
                    <CardContent className="p-6">
                      <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4">
                        <card.icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <h3 className="font-medium text-sm mb-2">{card.title}</h3>
                      <p className="text-sm text-muted-foreground">{card.description}</p>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>

            <FadeIn className="text-center mt-10">
              <p className="text-sm font-medium text-muted-foreground border-t border-slate-200 dark:border-slate-700 pt-8 max-w-xl mx-auto">
                Rejections are not random — they are infrastructure failures.
              </p>
            </FadeIn>
          </div>
        </section>

        <section className="py-16 md:py-20 bg-muted/30">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="text-center mb-12">
              <p className="text-xs font-medium text-primary mb-3 tracking-wide uppercase">
                Pre-Shipment Risk Control
              </p>
              <h2 className="text-2xl md:text-3xl font-semibold mb-4" data-testid="text-solution-headline">
                From Reactive Compliance to Pre-Shipment Risk Control
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                OriginTrace shifts compliance from a post-rejection scramble to a structured, pre-shipment 
                verification process embedded in your export workflow.
              </p>
            </FadeIn>

            <div className="max-w-3xl mx-auto">
              <StaggerContainer className="space-y-4">
                {solutionPoints.map((point, i) => (
                  <StaggerItem key={i}>
                    <div className="flex items-start gap-4 p-4 rounded-lg bg-card border border-border">
                      <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <point.icon className="h-4 w-4 text-primary" />
                      </div>
                      <p className="text-sm leading-relaxed pt-2">{point.text}</p>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </div>
        </section>

        <section id="shipment-readiness" className="py-16 md:py-20">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="text-center mb-12">
              <p className="text-xs font-medium text-primary mb-3 tracking-wide uppercase">
                Shipment Readiness Score
              </p>
              <h2 className="text-2xl md:text-3xl font-semibold mb-4" data-testid="text-readiness-headline">
                Know Before You Ship
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Every shipment is scored across five compliance dimensions. 
                Flag issues and resolve them before cargo reaches the port.
              </p>
            </FadeIn>

            <ScaleIn>
              <div className="max-w-4xl mx-auto">
                <Card className="overflow-hidden">
                  <div className="bg-slate-900 text-white">
                    <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 border-b border-slate-700">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                      <span className="ml-3 text-[10px] text-slate-400 font-mono">origintrace.trade/shipment-readiness</span>
                    </div>

                    <div className="p-6 md:p-8">
                      <div className="flex flex-col md:flex-row gap-8">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                            <div>
                              <p className="text-xs text-slate-400 mb-1">Shipment SHP-NG-2847</p>
                              <p className="text-sm text-slate-300">Lagos Port | Cocoa Beans | 22 MT</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
                              <span className="text-xs text-emerald-400 font-medium">Pre-Clearance</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-6 mb-8 flex-wrap">
                            <div className="text-center">
                              <p className="text-5xl font-bold text-emerald-400" data-testid="text-readiness-score">82</p>
                              <p className="text-sm text-slate-400">/100</p>
                            </div>
                            <div>
                              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-400 text-sm font-medium">
                                <Shield className="h-4 w-4" />
                                Low Risk
                              </div>
                              <p className="text-xs text-slate-400 mt-2">Estimated clearance probability: 94%</p>
                            </div>
                          </div>

                          <div className="space-y-4">
                            {readinessCategories.map((cat, i) => (
                              <div key={i}>
                                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                                  <span className="text-xs text-slate-300">{cat.label}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-500">Weight: {cat.weight}</span>
                                    <span className="text-xs text-slate-400 font-mono">{cat.score}%</span>
                                  </div>
                                </div>
                                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${cat.color}`} 
                                    style={{ width: `${cat.score}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="md:w-72 space-y-6">
                          <div>
                            <p className="text-xs font-medium text-amber-400 mb-3 flex items-center gap-1.5">
                              <CircleAlert className="h-3.5 w-3.5" />
                              Flagged Issues
                            </p>
                            <div className="space-y-2">
                              {flaggedIssues.map((issue, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs">
                                  <AlertTriangle className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${
                                    issue.severity === 'critical' ? 'text-red-400' : 'text-amber-400'
                                  }`} />
                                  <span className="text-slate-300">{issue.text}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-emerald-400 mb-3 flex items-center gap-1.5">
                              <Check className="h-3.5 w-3.5" />
                              Recommended Actions
                            </p>
                            <div className="space-y-2">
                              {recommendedActions.map((action, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs">
                                  <ArrowRight className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-500" />
                                  <span className="text-slate-400">{action}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </ScaleIn>
          </div>
        </section>

        <section className="py-16 md:py-20 bg-muted/30">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="text-center mb-12">
              <p className="text-xs font-medium text-primary mb-3 tracking-wide uppercase">
                Multi-Regulatory Coverage
              </p>
              <h2 className="text-2xl md:text-3xl font-semibold mb-4" data-testid="text-compliance-headline">
                Compliance Coverage Grid
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                One traceability infrastructure serving multiple regulatory frameworks and buyer requirements.
              </p>
            </FadeIn>

            <StaggerContainer className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {regulatoryData.map((group, i) => (
                <StaggerItem key={i}>
                  <Card className="h-full">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                          <group.icon className="h-4 w-4 text-primary" />
                        </div>
                        <h3 className="font-medium text-sm">{group.region}</h3>
                      </div>
                      <ul className="space-y-2">
                        {group.regulations.map((reg, j) => (
                          <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                            {reg}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>

            <FadeIn className="text-center mt-10">
              <p className="text-sm font-medium text-muted-foreground max-w-xl mx-auto">
                One traceability foundation. Multiple regulatory pathways.
              </p>
            </FadeIn>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="text-center mb-12">
              <p className="text-xs font-medium text-primary mb-3 tracking-wide uppercase">
                End-to-End Visibility
              </p>
              <h2 className="text-2xl md:text-3xl font-semibold mb-4" data-testid="text-flow-headline">
                Supply Chain Under Control
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                OriginTrace captures compliance data at every handoff point in the export chain.
              </p>
            </FadeIn>

            <div className="max-w-4xl mx-auto">
              <StaggerContainer className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
                {supplyChainSteps.map((step, i) => (
                  <StaggerItem key={i} className="flex items-center gap-4 md:gap-0 md:flex-col">
                    <div className="flex items-center md:flex-col gap-4 md:gap-2">
                      <div className="h-14 w-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <step.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="text-left md:text-center">
                        <p className="text-sm font-medium">{step.label}</p>
                        <p className="text-xs text-muted-foreground">{step.detail}</p>
                      </div>
                    </div>
                    {i < supplyChainSteps.length - 1 && (
                      <ArrowRight className="h-5 w-5 text-muted-foreground/40 hidden md:block mt-0 md:absolute md:relative md:mx-2" />
                    )}
                  </StaggerItem>
                ))}
              </StaggerContainer>

              <div className="hidden md:flex items-center justify-between max-w-3xl mx-auto mt-4 px-7">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex-1 flex items-center">
                    <div className="flex-1 h-px bg-gradient-to-r from-primary/30 to-primary/10" />
                    <ArrowRight className="h-3 w-3 text-primary/30 -ml-1" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="eudr-assessment" className="py-16 md:py-20 bg-muted/30">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
              <FadeIn direction="right">
                <p className="text-xs font-medium text-primary mb-3 tracking-wide uppercase">
                  Regulatory Readiness Assessment
                </p>
                <h2 className="text-2xl md:text-3xl font-semibold mb-4">
                  Regulatory Readiness Assessment
                </h2>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Whether you are preparing for EUDR, FSMA 204, or buyer-mandated traceability requirements, 
                  OriginTrace helps you identify gaps and build a compliance roadmap before deadlines hit.
                </p>
                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Globe className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Multi-Regulation Coverage</p>
                      <p className="text-sm text-muted-foreground">Assess readiness across EU, UK, US, and voluntary certification standards from a single platform.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Farm-Level GPS Evidence</p>
                      <p className="text-sm text-muted-foreground">Every plot of land is geolocated with polygon coordinates and verified against deforestation and land-use datasets.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Audit-Ready Data Exports</p>
                      <p className="text-sm text-muted-foreground">Generate compliance dossiers, GeoJSON files, and due diligence statements for any regulatory framework on demand.</p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground border-l-2 border-primary/30 pl-4">
                  Non-compliance can result in shipment seizure, market bans, and significant financial penalties across multiple jurisdictions.
                </p>
              </FadeIn>

              <FadeIn direction="left">
                <ComplianceCalculator />
              </FadeIn>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="max-w-6xl mx-auto px-6">
            <ScaleIn>
              <Card className="border-0 bg-primary text-primary-foreground overflow-hidden">
                <CardContent className="p-8 md:p-12">
                  <div className="grid md:grid-cols-2 gap-8 items-center">
                    <div>
                      <h2 className="text-2xl md:text-3xl font-semibold mb-4">
                        The Non-Falsifiable Pedigree
                      </h2>
                      <p className="text-primary-foreground/80 mb-6 leading-relaxed">
                        A single QR code on your finished good links back to the exact GPS coordinates 
                        of every contributing farm. Auditors verify in seconds.
                      </p>
                      <div className="flex flex-wrap gap-4 mb-6">
                        <div className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4" />
                          <span>GPS-verified</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4" />
                          <span>Mass balance verified</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4" />
                          <span>Instant audit access</span>
                        </div>
                      </div>
                      <Link href="/pedigree">
                        <Button variant="secondary" className="gap-2" data-testid="button-learn-pedigree">
                          Learn About Pedigree
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                    <div className="hidden md:flex justify-center">
                      <div className="w-40 h-40 rounded-2xl bg-white/10 flex items-center justify-center">
                        <div className="w-32 h-32 bg-white rounded-lg flex items-center justify-center">
                          <div className="grid grid-cols-5 gap-1 p-2">
                            {Array.from({ length: 25 }).map((_, i) => (
                              <div 
                                key={i} 
                                className={`w-4 h-4 rounded-sm ${
                                  [0,1,2,4,5,6,10,14,18,19,20,22,23,24].includes(i) 
                                    ? 'bg-primary' 
                                    : 'bg-slate-200'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ScaleIn>
          </div>
        </section>

        <section className="py-16 md:py-20 bg-muted/30">
          <div className="max-w-6xl mx-auto px-6 text-center">
            <FadeIn>
              <h2 className="text-2xl md:text-3xl font-semibold mb-4" data-testid="text-final-cta-headline">
                Ready to protect your export revenue?
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto mb-8">
                Join exporters and processors who trust OriginTrace for trade compliance.
              </p>
              <Link href="/demo">
                <Button size="lg" className="gap-2" data-testid="button-get-started">
                  Get Started
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </FadeIn>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
