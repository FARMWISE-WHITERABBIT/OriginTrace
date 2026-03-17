import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import { ComplianceCalculator } from '@/components/marketing/compliance-calculator';
import { IndustryTicker } from '@/components/marketing/industry-ticker';
import { LogoMarquee } from '@/components/marketing/logo-marquee';
import { TestimonialCarousel } from '@/components/marketing/testimonial-carousel';
import { StatCounter } from '@/components/marketing/stat-counter';
import { getRecentPosts } from '@/lib/blog';
import { FadeIn, StaggerContainer, StaggerItem, ScaleIn } from '@/components/marketing/motion';
import HeroBackground from '@/components/marketing/hero-background';
import { HomeCapabilityAccordion } from '@/components/marketing/home-capability-accordion';
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
  Leaf,
  Mail,
  Phone,
  Wifi,
  QrCode,
  BookOpen,
  Calendar,
  Target,
  Eye,
} from 'lucide-react';

const problemCards = [
  { icon: FlaskConical, title: 'Hazardous pesticide residues', description: 'MRL violations trigger automatic border rejections across EU and US markets.' },
  { icon: AlertTriangle, title: 'Aflatoxin contamination', description: 'Mycotoxin levels above threshold result in destroyed shipments and lost revenue.' },
  { icon: MapPin, title: 'Missing geospatial origin data', description: 'Regulators require plot-level GPS proof of origin, not warehouse addresses.' },
  { icon: FileText, title: 'Incomplete documentation', description: 'Missing phytosanitary certificates, lab reports, or due diligence statements halt clearance.' },
  { icon: Thermometer, title: 'Cold chain breakdowns', description: 'Temperature excursions during transit invalidate perishable commodity compliance.' },
  { icon: FolderOpen, title: 'Fragmented supplier records', description: 'Scattered data across WhatsApp, spreadsheets, and paper makes audit response impossible.' },
];

const capabilities = [
  {
    number: '01',
    title: 'Pre-Shipment Compliance Scoring',
    description: 'Every shipment is scored across five compliance dimensions before cargo reaches port. Identify risks, resolve issues, and clear shipments with confidence.',
    points: ['5-dimension risk scoring (traceability, contamination, documentation, storage, regulatory)', 'Automated issue flagging with recommended resolution actions', 'Real-time clearance probability estimation'],
  },
  {
    number: '02',
    title: 'Farm-Level Traceability & GPS Mapping',
    description: 'Capture verified origin data at the plot level with GPS polygon mapping. Every bag links back to its exact source — down to the coordinates.',
    points: ['GPS polygon farm boundary mapping with anti-spoofing', 'Hybrid bag-batch traceability from farm to export', 'Deforestation and boundary conflict detection'],
  },
  {
    number: '03',
    title: 'Offline-First Field Operations',
    description: 'Purpose-built for remote areas with zero connectivity. Field agents collect, grade, and sync data automatically when back in range.',
    points: ['Full data capture in offline mode via PWA', 'Automatic sync with conflict resolution', 'Anti-fraud protections (yield validation, GPS verification)'],
  },
  {
    number: '04',
    title: 'Buyer Portal & Supply Chain Visibility',
    description: 'Give your buyers direct access to traceability data, shipment status, and compliance evidence — building trust and accelerating procurement decisions.',
    points: ['Buyer-invites-exporter connection flow', 'Contract management and shipment tracking', 'Shared document access with audit trails'],
  },
  {
    number: '05',
    title: 'Digital Product Passport (DPP)',
    description: 'Generate JSON-LD Digital Product Passports that link finished goods to their full chain of custody. One QR code proves everything.',
    points: ['JSON-LD output meeting EU DPP specifications', 'QR code linking to public verification page', 'Sustainability claims and certification evidence'],
  },
  {
    number: '06',
    title: 'Document Vault & Regulatory Exports',
    description: 'Store, track, and manage all compliance documents in one vault. Auto-alerts for expiring certificates. Export audit-ready dossiers on demand.',
    points: ['Centralized document storage with expiry tracking', 'GeoJSON export for EUDR due diligence statements', 'Entity-linked documents (batch, shipment, contract)'],
  },
];

const useCases = [
  { vertical: 'Cocoa', route: 'West Africa → EU', gradient: 'from-amber-800/20 to-amber-600/10', iconColor: 'text-amber-600 dark:text-amber-400', description: 'Full traceability from smallholder farms through cooperatives to European chocolate manufacturers. EUDR-ready with GPS polygon evidence.' },
  { vertical: 'Cashew', route: 'Nigeria → Global', gradient: 'from-emerald-800/20 to-emerald-600/10', iconColor: 'text-emerald-600 dark:text-emerald-400', description: 'Bag-to-bush traceability across hundreds of collection agents. Compliance scoring for EU, US, and voluntary buyer standards.' },
  { vertical: 'Timber', route: 'Forest Concession → UK', gradient: 'from-green-900/20 to-green-700/10', iconColor: 'text-green-700 dark:text-green-400', description: 'Concession-level GPS mapping with chain-of-custody tracking. UK Environment Act and Lacey Act compliance built in.' },
  { vertical: 'Shea Butter', route: 'Processing → Export', gradient: 'from-yellow-700/20 to-yellow-500/10', iconColor: 'text-yellow-700 dark:text-yellow-400', description: 'Processing run tracking from raw nuts through pressing and filtering. Finished goods pedigree with mass balance verification.' },
  { vertical: 'Seafood', route: 'Vessel → Market', gradient: 'from-cyan-700/20 to-cyan-500/10', iconColor: 'text-cyan-600 dark:text-cyan-400', description: 'Vessel-to-market traceability for artisanal and industrial fisheries. Cold chain monitoring and FSMA 204 compliance.' },
  { vertical: 'Minerals', route: 'Artisanal Mine → Refinery', gradient: 'from-slate-700/20 to-slate-500/10', iconColor: 'text-slate-600 dark:text-slate-400', description: 'Source-level verification for artisanal mining operations. Conflict-free certification evidence and due diligence documentation.' },
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
    link: '/compliance/eudr',
  },
  {
    region: 'United States',
    icon: ClipboardCheck,
    regulations: ['FSMA 204 (Food Traceability Rule)', 'Lacey Act (Timber & Plant Products)', 'COOL (Country of Origin Labeling)'],
    link: '/compliance/usa',
  },
  {
    region: 'United Kingdom',
    icon: Scale,
    regulations: ['Environment Act (Forest Risk Commodities)', 'UK Timber Regulation', 'UK Food Safety Regulations'],
    link: '/compliance/uk',
  },
  {
    region: 'China',
    icon: Package,
    regulations: ['GACC (General Administration of Customs)', 'Import Food Safety Standards', 'Registration of Overseas Producers'],
    link: '/compliance/china',
  },
  {
    region: 'United Arab Emirates',
    icon: Shield,
    regulations: ['ESMA (Emirates Authority for Standardization)', 'Halal Certification Requirements', 'Food Import Re-export Controls'],
    link: '/compliance/uae',
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
  const recentPosts = getRecentPosts(3);
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'OriginTrace',
    url: 'https://origintrace.trade',
    logo: 'https://origintrace.trade/images/logo-green.png',
    description: 'Trust infrastructure for origin-sensitive supply chains. Supply chain traceability, compliance verification, and export readiness platform.',
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'hello@origintrace.trade',
      contactType: 'sales',
    },
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'OriginTrace',
    url: 'https://origintrace.trade',
    description: 'Trust infrastructure for origin-sensitive supply chains.',
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
      <MarketingNav />

      <main>
        {/* ===== HERO SECTION ===== */}
        <section className="relative pt-28 pb-20 md:pt-40 md:pb-32 overflow-hidden min-h-[90vh] flex items-center">
          <HeroBackground />
          
          <div className="max-w-6xl mx-auto px-6 relative z-10 w-full">
            <div className="max-w-3xl mx-auto text-center">
              <FadeIn delay={0.1}>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] mb-8 text-slate-900 dark:text-white" data-testid="text-hero-headline">
                  Compliance Infrastructure
                  <br />
                  for <IndustryTicker />
                </h1>
              </FadeIn>

              <FadeIn delay={0.2}>
                <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 leading-relaxed mb-10 max-w-2xl mx-auto">
                  OriginTrace is the all-in-one platform for supply chain traceability, 
                  compliance verification, and export readiness — helping exporters prevent 
                  shipment rejections before cargo reaches port.
                </p>
              </FadeIn>

              <FadeIn delay={0.3}>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="#eudr-assessment">
                    <Button size="lg" className="gap-2 w-full sm:w-auto bg-emerald-600 text-white px-8 h-12 text-base" data-testid="button-check-readiness">
                      Assess Your Export Readiness
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/demo">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto border-slate-300 dark:border-slate-600 px-8 h-12 text-base" data-testid="button-request-demo">
                      Request a Demo
                    </Button>
                  </Link>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ===== LOGO MARQUEE ===== */}
        <section className="border-y border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="max-w-6xl mx-auto px-6">
            <p className="text-center text-xs font-medium text-slate-400 dark:text-slate-500 pt-6 uppercase tracking-widest">Aligned with global compliance standards</p>
            <LogoMarquee />
          </div>
        </section>

        {/* ===== WHO WE ARE + STATS ===== */}
        <section className="py-20 md:py-28">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="text-center mb-16">
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">[ About OriginTrace ]</span>
            </FadeIn>

            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-20">
              <FadeIn direction="right">
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center p-8">
                      <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                        <Shield className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Trust Infrastructure</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Origin-Sensitive Supply Chains</p>
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg p-3 border border-slate-200/50 dark:border-slate-600/50">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Active Compliance Score</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">98.4%</span>
                    </div>
                    <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '98.4%' }} />
                    </div>
                  </div>
                </div>
              </FadeIn>

              <FadeIn direction="left">
                <h2 className="text-3xl md:text-4xl font-extrabold mb-6 text-slate-900 dark:text-white">
                  Whether you're an exporter, processor, or buyer — we help you ship with confidence.
                </h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
                  OriginTrace is trust infrastructure purpose-built for origin-sensitive supply chains. 
                  We help organizations capture verifiable compliance data at every step — from first-mile 
                  field operations to port clearance — so shipments clear borders, not get rejected at them.
                </p>
                <div className="grid sm:grid-cols-2 gap-6 mb-8">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2">Our Mission</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      To eliminate shipment rejections by making pre-shipment compliance verification the standard — not the exception.
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2">Our Approach</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Offline-first, field-ready tools that capture trust data at origin — then score, verify, and surface compliance gaps before shipment.
                    </p>
                  </div>
                </div>
                <Link href="/solutions">
                  <Button variant="outline" className="gap-2" data-testid="button-learn-more">
                    Learn More
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </FadeIn>
            </div>

            <FadeIn>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-10 border-t border-slate-200 dark:border-slate-700">
                <StatCounter value={500} suffix="+" label="Farms Mapped" />
                <StatCounter value={99.2} suffix="%" label="Clearance Rate" decimals={1} />
                <StatCounter value={12} label="Countries" />
                <StatCounter value={50} suffix="+" label="Exporters" />
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ===== WHY SHIPMENTS GET REJECTED ===== */}
        <section className="py-20 md:py-28 bg-slate-50/80 dark:bg-slate-900/30">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="text-center mb-4">
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">[ The Problem ]</span>
            </FadeIn>
            <FadeIn className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-slate-900 dark:text-white" data-testid="text-problem-headline">
                Why Shipments Get Rejected
              </h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
                Shipment rejections cost origin-sensitive supply chains millions annually. 
                The root causes are structural, not accidental.
              </p>
            </FadeIn>

            <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {problemCards.map((card, i) => (
                <StaggerItem key={i}>
                  <Card className="h-full border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                    <CardContent className="p-6">
                      <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4">
                        <card.icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <h3 className="font-semibold text-sm mb-2 text-slate-900 dark:text-white">{card.title}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{card.description}</p>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>

            <FadeIn className="text-center mt-12">
              <p className="text-sm font-medium text-slate-400 dark:text-slate-500 max-w-xl mx-auto">
                Rejections are not random — they are trust infrastructure failures.
              </p>
            </FadeIn>
          </div>
        </section>

        {/* ===== PLATFORM CAPABILITIES (ACCORDION) ===== */}
        <section className="py-20 md:py-28">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="text-center mb-4">
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">[ Platform Capabilities ]</span>
            </FadeIn>
            <FadeIn className="text-center mb-6">
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-slate-900 dark:text-white" data-testid="text-capabilities-headline">
                Everything You Need to Ship with Confidence
              </h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-6">
                A complete compliance infrastructure — from first-mile field capture to pre-shipment scoring 
                and buyer-facing transparency.
              </p>
              <Link href="/demo">
                <Button variant="outline" className="gap-2" data-testid="button-capabilities-cta">
                  Request a Demo
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </FadeIn>

            <HomeCapabilityAccordion capabilities={capabilities} />
          </div>
        </section>

        {/* ===== SHIPMENT READINESS SCORE ===== */}
        <section id="shipment-readiness" className="py-20 md:py-28 bg-slate-50/80 dark:bg-slate-900/30">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="text-center mb-4">
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">[ Shipment Readiness Score ]</span>
            </FadeIn>
            <FadeIn className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-slate-900 dark:text-white" data-testid="text-readiness-headline">
                Know Before You Ship
              </h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
                Every shipment is scored across five compliance dimensions. 
                Flag issues and resolve them before cargo reaches the port.
              </p>
            </FadeIn>

            <ScaleIn>
              <div className="max-w-4xl mx-auto">
                <Card className="overflow-hidden border-0 shadow-2xl">
                  <div className="bg-slate-900 text-white">
                    <div className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 border-b border-slate-700">
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

        {/* ===== USE CASES ===== */}
        <section id="use-cases" className="py-20 md:py-28">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="text-center mb-4">
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">[ Use Cases ]</span>
            </FadeIn>
            <FadeIn className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-slate-900 dark:text-white" data-testid="text-usecases-headline">
                How OriginTrace Works Across Verticals
              </h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
                One platform, multiple origin-sensitive commodities. Tailored compliance workflows 
                for every vertical — from farm to final destination.
              </p>
            </FadeIn>

            <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {useCases.map((uc, i) => (
                <StaggerItem key={i}>
                  <Card className="h-full overflow-hidden border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-lg transition-all group">
                    <div className={`h-32 bg-gradient-to-br ${uc.gradient} flex items-center justify-center relative`}>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-slate-700/30 dark:text-white/20">{uc.vertical}</p>
                      </div>
                      <div className="absolute top-3 right-3">
                        <span className="text-[10px] font-mono bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm px-2 py-1 rounded text-slate-600 dark:text-slate-300">{uc.route}</span>
                      </div>
                    </div>
                    <CardContent className="p-5">
                      <h3 className="font-semibold text-sm mb-2 text-slate-900 dark:text-white">{uc.vertical} Supply Chain</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{uc.description}</p>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>

            <FadeIn className="text-center mt-12">
              <Link href="/solutions">
                <Button variant="outline" className="gap-2" data-testid="button-explore-solutions">
                  Explore All Solutions
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </FadeIn>
          </div>
        </section>

        {/* ===== COMPLIANCE COVERAGE GRID ===== */}
        <section className="py-20 md:py-28 bg-slate-50/80 dark:bg-slate-900/30">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="text-center mb-4">
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">[ Regulatory Coverage ]</span>
            </FadeIn>
            <FadeIn className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-slate-900 dark:text-white" data-testid="text-compliance-headline">
                Multi-Regulatory Compliance Coverage
              </h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
                One trust infrastructure serving multiple regulatory frameworks, verticals, and buyer requirements.
              </p>
            </FadeIn>

            <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {regulatoryData.map((group, i) => (
                <StaggerItem key={i}>
                  <Link href={group.link}>
                    <Card className="h-full border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors" data-testid={`card-regulation-${i}`}>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-9 w-9 rounded-md bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
                            <group.icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <h3 className="font-semibold text-sm text-slate-900 dark:text-white">{group.region}</h3>
                        </div>
                        <ul className="space-y-2">
                          {group.regulations.map((reg, j) => (
                            <li key={j} className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                              <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                              {reg}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        {/* ===== SUPPLY CHAIN FLOW ===== */}
        <section className="py-20 md:py-28">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="text-center mb-4">
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">[ End-to-End Visibility ]</span>
            </FadeIn>
            <FadeIn className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-slate-900 dark:text-white" data-testid="text-flow-headline">
                Origin-to-Destination Visibility
              </h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
                OriginTrace captures compliance data at every handoff point — from farm, forest, mine, or vessel to final destination.
              </p>
            </FadeIn>

            <div className="max-w-4xl mx-auto">
              <StaggerContainer className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
                {supplyChainSteps.map((step, i) => (
                  <StaggerItem key={i} className="flex items-center gap-4 md:gap-0 md:flex-col">
                    <div className="flex items-center md:flex-col gap-4 md:gap-2">
                      <div className="h-14 w-14 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                        <step.icon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="text-left md:text-center">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{step.label}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{step.detail}</p>
                      </div>
                    </div>
                    {i < supplyChainSteps.length - 1 && (
                      <ArrowRight className="h-5 w-5 text-slate-300 dark:text-slate-600 hidden md:block mt-0 md:absolute md:relative md:mx-2" />
                    )}
                  </StaggerItem>
                ))}
              </StaggerContainer>

              <div className="hidden md:flex items-center justify-between max-w-3xl mx-auto mt-4 px-7">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex-1 flex items-center">
                    <div className="flex-1 h-px bg-gradient-to-r from-emerald-500/30 to-emerald-500/10" />
                    <ArrowRight className="h-3 w-3 text-emerald-500/30 -ml-1" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ===== TESTIMONIALS ===== */}
        <section className="py-20 md:py-28 bg-slate-50/80 dark:bg-slate-900/30">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="text-center mb-4">
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">[ What Our Clients Say ]</span>
            </FadeIn>
            <FadeIn className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-slate-900 dark:text-white" data-testid="text-testimonials-headline">
                Trusted by Exporters Worldwide
              </h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
                Hear from the exporters, processors, and buyers who rely on OriginTrace 
                to clear shipments and build trust with their partners.
              </p>
            </FadeIn>

            <TestimonialCarousel />
          </div>
        </section>

        {/* ===== REGULATORY READINESS ASSESSMENT ===== */}
        <section id="eudr-assessment" className="py-20 md:py-28">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="text-center mb-4">
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">[ Readiness Assessment ]</span>
            </FadeIn>

            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start mt-10">
              <FadeIn direction="right">
                <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-slate-900 dark:text-white">
                  Regulatory Readiness Assessment
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                  Whether you are preparing for EUDR, FSMA 204, or buyer-mandated traceability requirements, 
                  OriginTrace helps you identify gaps and build a compliance roadmap before deadlines hit.
                </p>
                <div className="space-y-5 mb-8">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Globe className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-slate-900 dark:text-white">Multi-Regulation Coverage</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Assess readiness across EU, UK, US, and voluntary certification standards.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-slate-900 dark:text-white">Farm-Level GPS Evidence</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Every plot is geolocated with polygon coordinates and verified against deforestation datasets.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-slate-900 dark:text-white">Audit-Ready Data Exports</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Generate compliance dossiers, GeoJSON files, and due diligence statements on demand.</p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 border-l-2 border-emerald-500/30 pl-4">
                  Non-compliance can result in shipment seizure, market bans, and significant financial penalties across multiple jurisdictions.
                </p>
              </FadeIn>

              <FadeIn direction="left">
                <ComplianceCalculator />
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ===== PEDIGREE CTA BANNER ===== */}
        <section className="py-20 md:py-28 bg-slate-50/80 dark:bg-slate-900/30">
          <div className="max-w-6xl mx-auto px-6">
            <ScaleIn>
              <Card className="border-0 bg-gradient-to-br from-emerald-700 to-emerald-900 text-white overflow-hidden shadow-2xl">
                <CardContent className="p-8 md:p-12">
                  <div className="grid md:grid-cols-2 gap-8 items-center">
                    <div>
                      <span className="text-xs font-medium text-emerald-300 uppercase tracking-[0.2em] mb-4 block">[ Product Pedigree ]</span>
                      <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
                        The Non-Falsifiable Pedigree
                      </h2>
                      <p className="text-emerald-100/80 mb-6 leading-relaxed">
                        A single QR code on your finished good links back to the exact GPS coordinates 
                        of every contributing farm. Auditors verify in seconds.
                      </p>
                      <div className="flex flex-wrap gap-4 mb-6">
                        <div className="flex items-center gap-2 text-sm text-emerald-200">
                          <Check className="h-4 w-4" />
                          <span>GPS-verified</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-emerald-200">
                          <Check className="h-4 w-4" />
                          <span>Mass balance verified</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-emerald-200">
                          <Check className="h-4 w-4" />
                          <span>Instant audit access</span>
                        </div>
                      </div>
                      <Link href="/pedigree">
                        <Button variant="secondary" className="gap-2 bg-white text-emerald-800" data-testid="button-learn-pedigree">
                          Learn About Pedigree
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                    <div className="hidden md:flex justify-center">
                      <div className="w-44 h-44 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
                        <div className="w-36 h-36 bg-white rounded-xl flex items-center justify-center shadow-lg">
                          <div className="grid grid-cols-5 gap-1 p-3">
                            {Array.from({ length: 25 }).map((_, i) => (
                              <div 
                                key={i} 
                                className={`w-4 h-4 rounded-sm ${
                                  [0,1,2,4,5,6,10,14,18,19,20,22,23,24].includes(i) 
                                    ? 'bg-emerald-700' 
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

        {/* ===== BLOG / INSIGHTS ===== */}
        <section className="py-20 md:py-28">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="text-center mb-4">
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">[ Insights ]</span>
            </FadeIn>
            <FadeIn className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-slate-900 dark:text-white" data-testid="text-blog-headline">
                Expert Insights & Compliance Updates
              </h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
                Stay ahead of regulatory changes and learn best practices for origin-sensitive supply chain compliance.
              </p>
            </FadeIn>

            <StaggerContainer className="grid md:grid-cols-3 gap-6">
              {recentPosts.map((post) => (
                <StaggerItem key={post.slug}>
                  <Link href={`/blog/${post.slug}`} className="group block h-full">
                    <Card className="h-full overflow-hidden border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-lg transition-all">
                      <div className={`h-40 relative overflow-hidden bg-gradient-to-br ${post.coverGradient} flex items-center justify-center`}>
                        {post.coverImage ? (
                          <Image src={post.coverImage} alt={post.coverImageAlt || post.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
                        ) : (
                          <BookOpen className="h-8 w-8 text-white/10" />
                        )}
                      </div>
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">{post.category}</span>
                          <span className="text-[10px] text-slate-400">{post.date}</span>
                        </div>
                        <h3 className="font-semibold text-sm mb-2 text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-snug">{post.title}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4 line-clamp-3">{post.description}</p>
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 group-hover:underline">Read More →</span>
                      </CardContent>
                    </Card>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerContainer>

            <FadeIn className="text-center mt-10">
              <Link href="/blog">
                <Button variant="outline" className="gap-2">
                  View All Insights
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </FadeIn>
          </div>
        </section>

        {/* ===== FINAL CTA ===== */}
        <section className="py-20 md:py-28 bg-slate-50/80 dark:bg-slate-900/30">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn>
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-slate-900 dark:text-white" data-testid="text-final-cta-headline">
                  Ready to build trust into your supply chain?
                </h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto mb-10">
                  Join exporters and processors across agriculture, timber, minerals, and seafood 
                  who trust OriginTrace for supply chain compliance.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                  <Link href="/demo">
                    <Button size="lg" className="gap-2 bg-emerald-600 text-white px-8 h-12 text-base w-full sm:w-auto" data-testid="button-get-started">
                      Get Started
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/demo">
                    <Button size="lg" variant="outline" className="px-8 h-12 text-base w-full sm:w-auto gap-2" data-testid="button-schedule-call">
                      <Phone className="h-4 w-4" />
                      Schedule a Call
                    </Button>
                  </Link>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-slate-500 dark:text-slate-400">
                  <a href="mailto:hello@origintrace.trade" className="flex items-center gap-2 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors" data-testid="link-contact-email">
                    <Mail className="h-4 w-4" />
                    hello@origintrace.trade
                  </a>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
