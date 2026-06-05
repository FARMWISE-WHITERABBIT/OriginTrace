import Link from 'next/link';
import Image from 'next/image';
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
import { WhyChooseSection } from '@/components/marketing/why-choose-section';
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

/* ─────────────────────────────────────────────────────────────────
   DATA CONSTANTS — unchanged from original
   ───────────────────────────────────────────────────────────────── */

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

const whyChooseFeatures = [
  {
    title: 'Pre-Shipment Compliance Scoring',
    body: 'Score every shipment across five dimensions before cargo reaches port. Identify risks, resolve issues, and clear with confidence.',
    icon: <Shield className="w-4 h-4" />,
  },
  {
    title: 'Farm-Level GPS Traceability',
    body: 'GPS polygon mapping links every shipment back to its exact farm source — meeting EUDR, FSMA, and buyer standards.',
    icon: <MapPin className="w-4 h-4" />,
  },
  {
    title: 'Offline-First Field Operations',
    body: 'Purpose-built for remote areas. Field agents capture data with zero connectivity, syncing automatically when back in range.',
    icon: <Wifi className="w-4 h-4" />,
  },
  {
    title: 'Buyer Portal & DPP',
    body: 'Give buyers direct traceability access. Generate QR-linked Digital Product Passports that prove full chain of custody.',
    icon: <QrCode className="w-4 h-4" />,
  },
];

/* ─────────────────────────────────────────────────────────────────
   PAGE COMPONENT
   ───────────────────────────────────────────────────────────────── */

export default function HomePage() {
  const recentPosts = getRecentPosts(3);

  /* Schema markup */
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

        {/* ═══════════════════════════════════════════════════════
            1. HERO — full-bleed dark, left-aligned, floating card
            ═══════════════════════════════════════════════════════ */}
        <section className="mk-hero">
          <HeroBackground />
          <div className="mk-hero__overlay" />

          <div className="mk-hero__content">
            <div className="mk-container-lg">
              <div className="grid lg:grid-cols-[3fr_2fr] gap-12 lg:gap-16 items-center">

                {/* Left — headline + CTAs */}
                <div>
                  <FadeIn delay={0.05}>
                    <span className="pre-title margin-bottom margin-large" style={{ display: 'inline-flex' }}>
                      Trust Infrastructure
                    </span>
                  </FadeIn>

                  <FadeIn delay={0.15}>
                    <h1
                      className="text-display-xl text-mk-on-dark margin-bottom margin-large"
                      data-testid="text-hero-headline"
                      style={{ maxWidth: '20ch' }}
                    >
                      Compliance Infrastructure
                      <br />
                      for <IndustryTicker />
                    </h1>
                  </FadeIn>

                  <FadeIn delay={0.25}>
                    <p
                      className="text-mk-faded margin-bottom margin-xlarge"
                      style={{ fontSize: '1.0625rem', lineHeight: 1.7, maxWidth: '46ch' }}
                    >
                      OriginTrace is the all-in-one platform for supply chain traceability,
                      compliance verification, and export readiness — helping exporters prevent
                      shipment rejections before cargo reaches port.
                    </p>
                  </FadeIn>

                  <FadeIn delay={0.35}>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Link
                        href="#eudr-assessment"
                        className="btn-mk-primary btn-mk-lg"
                        data-testid="button-check-readiness"
                      >
                        Assess Your Export Readiness
                        <ChevronRight className="h-5 w-5" />
                      </Link>
                      <Link
                        href="/demo"
                        className="btn-mk-ghost btn-mk-lg"
                        data-testid="button-request-demo"
                      >
                        Request a Demo
                      </Link>
                    </div>
                  </FadeIn>
                </div>

                {/* Right — floating compliance card */}
                <FadeIn delay={0.4} direction="left">
                  <div className="hidden lg:block">
                    <div className="bg-white rounded-2xl shadow-xl p-5 max-w-sm ml-auto">
                      {/* Card header */}
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p
                            className="text-xs font-semibold uppercase tracking-widest mb-0.5"
                            style={{ color: 'var(--mk-green)' }}
                          >
                            Example Shipment
                          </p>
                          <p className="text-sm font-bold" style={{ color: 'var(--mk-text-primary)', letterSpacing: '-0.01em' }}>
                            Cocoa Export · Nigeria → EU
                          </p>
                        </div>
                        <div
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{ background: 'var(--mk-green-light)', color: 'var(--mk-green)' }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                          Live
                        </div>
                      </div>

                      {/* Compliance score bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs" style={{ color: 'var(--mk-text-muted)' }}>
                            Compliance Score
                          </span>
                          <span
                            className="text-sm font-extrabold"
                            style={{ color: 'var(--mk-green)', fontFamily: 'var(--font-display)' }}
                          >
                            99.2%
                          </span>
                        </div>
                        <div
                          className="h-2 w-full rounded-full overflow-hidden"
                          style={{ background: 'var(--mk-surface-gray)' }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{ width: '99.2%', background: 'var(--mk-green)' }}
                          />
                        </div>
                      </div>

                      {/* Stat row with divider */}
                      <div
                        className="pt-4 flex items-stretch gap-4"
                        style={{ borderTop: '1px solid var(--mk-border)' }}
                      >
                        <div className="flex-1 text-center">
                          <p
                            className="text-xl font-extrabold leading-none"
                            style={{
                              color: 'var(--mk-green)',
                              fontFamily: 'var(--font-display)',
                              letterSpacing: '-0.035em',
                            }}
                          >
                            99.2%
                          </p>
                          <p className="text-[11px] mt-1" style={{ color: 'var(--mk-text-muted)' }}>
                            Clearance Rate
                          </p>
                        </div>
                        <div className="mk-stat-row__divider" />
                        <div className="flex-1 text-center">
                          <p
                            className="text-xl font-extrabold leading-none"
                            style={{
                              color: 'var(--mk-green)',
                              fontFamily: 'var(--font-display)',
                              letterSpacing: '-0.035em',
                            }}
                          >
                            500+
                          </p>
                          <p className="text-[11px] mt-1" style={{ color: 'var(--mk-text-muted)' }}>
                            Farms Verified
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </FadeIn>
              </div>
            </div>
          </div>
        </section>


        {/* ═══════════════════════════════════════════════════════
            2. MARQUEE STRIP
            ═══════════════════════════════════════════════════════ */}
        <section className="section-bordered section-gray" style={{ paddingBlock: '1.5rem' }}>
          <div className="mk-container-lg">
            <p
              className="text-center text-xs font-semibold uppercase tracking-[0.18em] margin-bottom margin-medium"
              style={{ color: 'var(--mk-text-muted)' }}
            >
              Aligned with global compliance standards
            </p>
            <LogoMarquee />
          </div>
        </section>


        {/* ═══════════════════════════════════════════════════════
            3. ABOUT / MISSION
            ═══════════════════════════════════════════════════════ */}
        <section className="section-spacing section-white">
          <div className="mk-container-sm">
            {/* Centered header */}
            <FadeIn>
              <div className="section-header">
                <div
                  className="mk-icon-badge mk-icon-badge--lg margin-bottom margin-medium"
                  aria-hidden
                >
                  <Leaf className="w-6 h-6" />
                </div>
                <span className="pre-title margin-bottom margin-medium">About OriginTrace</span>
                <h2 className="text-display-lg section-header__title">
                  OriginTrace is{' '}
                  <span className="text-mk-muted">redefining</span> supply chain
                  compliance{' '}
                  <span className="text-mk-brand">across Africa.</span>
                </h2>
                <p className="section-header__body">
                  We are trust infrastructure purpose-built for origin-sensitive supply chains.
                  From first-mile field operations to port clearance, OriginTrace helps exporters
                  capture verifiable compliance data at every step — so shipments clear borders,
                  not get rejected at them.
                </p>
              </div>
            </FadeIn>

            {/* 3-column image grid — center image taller */}
            <FadeIn delay={0.1}>
              <div className="grid grid-cols-3 gap-4 items-end margin-bottom margin-xlarge-2">
                {/* Left image */}
                <div
                  className="rounded-2xl overflow-hidden flex items-center justify-center"
                  style={{
                    aspectRatio: '4/3',
                    background: 'linear-gradient(135deg, #065f46 0%, #2E7D6B 100%)',
                  }}
                >
                  <Sprout className="w-10 h-10" style={{ color: 'rgba(255,255,255,0.25)' }} />
                </div>

                {/* Center image — taller (square aspect) */}
                <div
                  className="rounded-2xl overflow-hidden flex flex-col items-center justify-center gap-2 relative"
                  style={{
                    aspectRatio: '1/1',
                    background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
                  }}
                >
                  <Shield className="w-12 h-12" style={{ color: 'rgba(255,255,255,0.3)' }} />
                  <span
                    className="text-[11px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)' }}
                  >
                    Platform Screenshot
                  </span>
                </div>

                {/* Right image */}
                <div
                  className="rounded-2xl overflow-hidden flex items-center justify-center"
                  style={{
                    aspectRatio: '4/3',
                    background: 'linear-gradient(135deg, #064e3b 0%, #1e293b 100%)',
                  }}
                >
                  <Globe className="w-10 h-10" style={{ color: 'rgba(255,255,255,0.25)' }} />
                </div>
              </div>
            </FadeIn>

            {/* CTA */}
            <FadeIn delay={0.2}>
              <div className="flex justify-center">
                <Link href="/solutions" className="btn-mk-primary" data-testid="button-learn-more">
                  Explore the Platform
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>


        {/* ═══════════════════════════════════════════════════════
            4. CAPABILITIES (accordion)
            ═══════════════════════════════════════════════════════ */}
        <section className="section-spacing section-gray">
          <div className="mk-container-lg">
            <FadeIn>
              <div className="section-header section-header--left margin-bottom margin-xlarge">
                <span
                  className="pre-title margin-bottom margin-medium"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--mk-green)',
                    color: 'var(--mk-green)',
                  }}
                >
                  Platform Capabilities
                </span>
                <h2
                  className="text-display-lg section-header__title"
                  data-testid="text-capabilities-headline"
                >
                  Everything you need{' '}
                  <span className="text-mk-muted">to ship with confidence</span>
                </h2>
                <p className="section-header__body" style={{ textAlign: 'left', marginInline: 0 }}>
                  A complete compliance infrastructure — from first-mile field capture to
                  pre-shipment scoring and buyer-facing transparency.
                </p>
                <div className="flex gap-3 mt-4">
                  <Link
                    href="/demo"
                    className="btn-mk-primary btn-mk-sm"
                    data-testid="button-capabilities-cta"
                  >
                    Request a Demo
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </FadeIn>

            <HomeCapabilityAccordion capabilities={capabilities} />
          </div>
        </section>


        {/* ═══════════════════════════════════════════════════════
            5. DARK SERVICES — 3-col card grid
            ═══════════════════════════════════════════════════════ */}
        <section className="section-spacing section-dark">
          <div className="mk-container-lg">
            <FadeIn>
              <div className="section-header section-header--left margin-bottom margin-xlarge">
                <span className="pre-title margin-bottom margin-medium">Our Capabilities</span>
                <h2 className="text-display-lg section-header__title">
                  Six capabilities.{' '}
                  <span className="text-mk-brand">One platform.</span>
                </h2>
              </div>
            </FadeIn>

            <StaggerContainer className="mk-grid-3">
              {/* Card 1 — Compliance Scoring */}
              <StaggerItem>
                <div className="mk-card h-full flex flex-col">
                  <div className="mk-card__icon">
                    <Shield className="w-6 h-6" />
                  </div>
                  <h3 className="mk-card__title">Pre-Shipment Compliance Scoring</h3>
                  <p className="mk-card__body flex-1">
                    Score every shipment across five compliance dimensions before cargo reaches port.
                    Identify risks early and clear shipments with confidence.
                  </p>
                  <Link href="/solutions" className="mk-card__arrow">
                    Learn more <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  {/* Bottom illustration */}
                  <div
                    className="h-32 rounded-lg mt-4 overflow-hidden flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, rgba(46,125,107,0.3) 0%, rgba(31,95,82,0.5) 100%)' }}
                  >
                    <Shield className="w-16 h-16" style={{ color: 'rgba(255,255,255,0.15)' }} />
                  </div>
                </div>
              </StaggerItem>

              {/* Card 2 — Farm Traceability */}
              <StaggerItem>
                <div className="mk-card h-full flex flex-col">
                  <div className="mk-card__icon">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <h3 className="mk-card__title">Farm-Level GPS Traceability</h3>
                  <p className="mk-card__body flex-1">
                    GPS polygon mapping links every shipment back to its exact farm source —
                    meeting EUDR, FSMA, and buyer traceability standards from day one.
                  </p>
                  <Link href="/solutions" className="mk-card__arrow">
                    Learn more <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <div
                    className="h-32 rounded-lg mt-4 overflow-hidden flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, rgba(46,125,107,0.3) 0%, rgba(5,95,70,0.5) 100%)' }}
                  >
                    <MapPin className="w-16 h-16" style={{ color: 'rgba(255,255,255,0.15)' }} />
                  </div>
                </div>
              </StaggerItem>

              {/* Card 3 — Offline-First */}
              <StaggerItem>
                <div className="mk-card h-full flex flex-col">
                  <div className="mk-card__icon">
                    <Wifi className="w-6 h-6" />
                  </div>
                  <h3 className="mk-card__title">Offline-First Field Operations</h3>
                  <p className="mk-card__body flex-1">
                    Purpose-built for remote areas. Field agents capture data with zero
                    connectivity, syncing automatically when back in range — no data loss.
                  </p>
                  <Link href="/solutions" className="mk-card__arrow">
                    Learn more <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <div
                    className="h-32 rounded-lg mt-4 overflow-hidden flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, rgba(46,125,107,0.3) 0%, rgba(20,80,65,0.5) 100%)' }}
                  >
                    <Wifi className="w-16 h-16" style={{ color: 'rgba(255,255,255,0.15)' }} />
                  </div>
                </div>
              </StaggerItem>
            </StaggerContainer>
          </div>
        </section>


        {/* ═══════════════════════════════════════════════════════
            6. WHY CHOOSE — accordion + image
            ═══════════════════════════════════════════════════════ */}
        <section className="section-spacing section-gray">
          <div className="mk-container-lg">
            <FadeIn>
              <div className="section-header section-header--left margin-bottom margin-xlarge">
                <span
                  className="pre-title margin-bottom margin-medium"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--mk-green)',
                    color: 'var(--mk-green)',
                  }}
                >
                  Why OriginTrace
                </span>
                <h2 className="text-display-lg section-header__title">
                  Built for Africa.{' '}
                  <span className="text-mk-muted">Trusted globally.</span>
                </h2>
              </div>
            </FadeIn>

            <WhyChooseSection features={whyChooseFeatures} />
          </div>
        </section>


        {/* ═══════════════════════════════════════════════════════
            7. STAT ROW
            ═══════════════════════════════════════════════════════ */}
        <section className="section-spacing-sm section-white">
          <div className="mk-container-sm">
            <FadeIn>
              <div className="mk-stat-row justify-center">
                <div className="mk-stat-row__item text-center" style={{ alignItems: 'center' }}>
                  <span className="mk-stat-row__value">500+</span>
                  <span className="mk-stat-row__label">Farms Mapped</span>
                </div>
                <div className="mk-stat-row__divider" />
                <div className="mk-stat-row__item text-center" style={{ alignItems: 'center' }}>
                  <span className="mk-stat-row__value">99.2%</span>
                  <span className="mk-stat-row__label">Clearance Rate</span>
                </div>
                <div className="mk-stat-row__divider" />
                <div className="mk-stat-row__item text-center" style={{ alignItems: 'center' }}>
                  <span className="mk-stat-row__value">12</span>
                  <span className="mk-stat-row__label">Countries</span>
                </div>
                <div className="mk-stat-row__divider" />
                <div className="mk-stat-row__item text-center" style={{ alignItems: 'center' }}>
                  <span className="mk-stat-row__value">50+</span>
                  <span className="mk-stat-row__label">Exporters</span>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>


        {/* ═══════════════════════════════════════════════════════
            8. COMPLIANCE COVERAGE GRID
            ═══════════════════════════════════════════════════════ */}
        <section className="section-spacing section-gray">
          <div className="mk-container-lg">
            <FadeIn>
              <div className="section-header">
                <span className="pre-title margin-bottom margin-medium">Regulatory Coverage</span>
                <h2
                  className="text-display-md section-header__title"
                  data-testid="text-compliance-headline"
                >
                  Multi-Regulatory Compliance Coverage
                </h2>
                <p className="section-header__body">
                  One trust infrastructure serving multiple regulatory frameworks, verticals,
                  and buyer requirements.
                </p>
              </div>
            </FadeIn>

            <div style={{ maxWidth: '75rem', marginInline: 'auto' }}>
            <StaggerContainer className="mk-grid-3">
              {regulatoryData.map((group, i) => (
                <StaggerItem key={i}>
                  <Link href={group.link} style={{ textDecoration: 'none' }}>
                    <div
                      className="mk-card h-full"
                      data-testid={`card-regulation-${i}`}
                    >
                      <div className="flex items-center gap-3 margin-bottom margin-large">
                        <div className="mk-card__icon" style={{ marginBottom: 0, flexShrink: 0 }}>
                          <group.icon className="w-5 h-5" />
                        </div>
                        <h3 className="mk-card__title" style={{ marginBottom: 0 }}>
                          {group.region}
                        </h3>
                      </div>
                      <ul className="flex flex-col gap-2.5">
                        {group.regulations.map((reg, j) => (
                          <li key={j} className="mk-list-item">
                            <span className="mk-list-item__icon">
                              <Check className="w-3 h-3" />
                            </span>
                            {reg}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerContainer>
            </div>
          </div>
        </section>


        {/* ═══════════════════════════════════════════════════════
            9. READINESS ASSESSMENT — 2-col
            ═══════════════════════════════════════════════════════ */}
        <section id="eudr-assessment" className="section-spacing section-white">
          <div className="mk-container-lg">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">

              {/* Left — feature list */}
              <FadeIn direction="right">
                <span className="pre-title margin-bottom margin-large" style={{ display: 'inline-flex' }}>
                  Readiness Assessment
                </span>
                <h2
                  className="text-display-md margin-bottom margin-medium"
                  style={{ color: 'var(--mk-text-primary)' }}
                >
                  Regulatory Readiness Assessment
                </h2>
                <p
                  className="margin-bottom margin-xlarge"
                  style={{ color: 'var(--mk-text-secondary)', fontSize: '1.0625rem', lineHeight: 1.7 }}
                >
                  Whether you are preparing for EUDR, FSMA 204, or buyer-mandated traceability
                  requirements, OriginTrace helps you identify gaps and build a compliance roadmap
                  before deadlines hit.
                </p>

                <div className="flex flex-col gap-5 margin-bottom margin-xlarge">
                  <div className="mk-list-item">
                    <span className="mk-list-item__icon" style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.75rem', flexShrink: 0 }}>
                      <Globe className="w-4 h-4" />
                    </span>
                    <div>
                      <p className="font-semibold text-sm margin-bottom margin-xsmall" style={{ color: 'var(--mk-text-primary)' }}>
                        Multi-Regulation Coverage
                      </p>
                      <p className="text-sm" style={{ color: 'var(--mk-text-secondary)' }}>
                        Assess readiness across EU, UK, US, and voluntary certification standards.
                      </p>
                    </div>
                  </div>
                  <div className="mk-list-item">
                    <span className="mk-list-item__icon" style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.75rem', flexShrink: 0 }}>
                      <MapPin className="w-4 h-4" />
                    </span>
                    <div>
                      <p className="font-semibold text-sm margin-bottom margin-xsmall" style={{ color: 'var(--mk-text-primary)' }}>
                        Farm-Level GPS Evidence
                      </p>
                      <p className="text-sm" style={{ color: 'var(--mk-text-secondary)' }}>
                        Every plot is geolocated with polygon coordinates and verified against
                        deforestation datasets.
                      </p>
                    </div>
                  </div>
                  <div className="mk-list-item">
                    <span className="mk-list-item__icon" style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.75rem', flexShrink: 0 }}>
                      <FileText className="w-4 h-4" />
                    </span>
                    <div>
                      <p className="font-semibold text-sm margin-bottom margin-xsmall" style={{ color: 'var(--mk-text-primary)' }}>
                        Audit-Ready Data Exports
                      </p>
                      <p className="text-sm" style={{ color: 'var(--mk-text-secondary)' }}>
                        Generate compliance dossiers, GeoJSON files, and due diligence statements
                        on demand.
                      </p>
                    </div>
                  </div>
                </div>

                <p
                  className="text-sm"
                  style={{
                    color: 'var(--mk-text-secondary)',
                    borderLeft: '2px solid var(--mk-green)',
                    paddingLeft: '1rem',
                    lineHeight: 1.65,
                  }}
                >
                  Non-compliance can result in shipment seizure, market bans, and significant
                  financial penalties across multiple jurisdictions.
                </p>
              </FadeIn>

              {/* Right — compliance calculator */}
              <FadeIn direction="left">
                <ComplianceCalculator />
              </FadeIn>
            </div>
          </div>
        </section>


        {/* ═══════════════════════════════════════════════════════
            10. SHIPMENT SCORE MOCKUP (dark terminal)
            ═══════════════════════════════════════════════════════ */}
        <section id="shipment-readiness" className="section-spacing section-gray">
          <div className="mk-container-lg">
            <FadeIn>
              <div className="section-header">
                <span className="pre-title margin-bottom margin-medium">Shipment Readiness Score</span>
                <h2
                  className="text-display-md section-header__title"
                  data-testid="text-readiness-headline"
                >
                  Know Before You Ship
                </h2>
                <p className="section-header__body">
                  Every shipment is scored across five compliance dimensions. Flag issues and
                  resolve them before cargo reaches the port.
                </p>
              </div>
            </FadeIn>

            <ScaleIn>
              <div style={{ maxWidth: '56rem', marginInline: 'auto' }}>
                <div
                  className="overflow-hidden rounded-2xl shadow-2xl"
                  style={{ background: '#0d1f1b' }}
                >
                  {/* Terminal title bar */}
                  <div
                    className="flex items-center gap-1.5 px-4 py-2.5"
                    style={{ background: 'hsl(168 28% 9%)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(255,80,80,0.6)' }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(255,200,80,0.6)' }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(80,210,80,0.6)' }} />
                    <span
                      className="ml-3 font-mono text-[10px]"
                      style={{ color: 'rgba(255,255,255,0.35)' }}
                    >
                      origintrace.trade/shipment-readiness
                    </span>
                  </div>

                  <div className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row gap-8">
                      {/* Score panel */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between flex-wrap gap-2 margin-bottom margin-medium-2">
                          <div>
                            <p
                              className="text-xs margin-bottom margin-tiny"
                              style={{ color: 'rgba(255,255,255,0.4)' }}
                            >
                              Shipment SHP-NG-2847
                            </p>
                            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                              Lagos Port | Cocoa Beans | 22 MT
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full animate-pulse"
                              style={{ background: 'var(--mk-green)' }}
                            />
                            <span
                              className="text-xs font-medium"
                              style={{ color: 'var(--mk-green)' }}
                            >
                              Pre-Clearance
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 flex-wrap margin-bottom margin-xlarge">
                          <div>
                            <p
                              className="font-extrabold leading-none"
                              style={{
                                fontSize: '3.5rem',
                                color: 'var(--mk-green)',
                                fontFamily: 'var(--font-display)',
                                letterSpacing: '-0.05em',
                              }}
                              data-testid="text-readiness-score"
                            >
                              82
                            </p>
                            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
                              /100
                            </p>
                          </div>
                          <div>
                            <div
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
                              style={{ background: 'rgba(46,125,107,0.2)', color: 'var(--mk-green)' }}
                            >
                              <Shield className="h-4 w-4" />
                              Low Risk
                            </div>
                            <p
                              className="text-xs mt-2"
                              style={{ color: 'rgba(255,255,255,0.35)' }}
                            >
                              Estimated clearance probability: 94%
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-4">
                          {readinessCategories.map((cat, i) => (
                            <div key={i}>
                              <div className="flex items-center justify-between flex-wrap gap-1 mb-1.5">
                                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                                  {cat.label}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span
                                    className="text-[10px]"
                                    style={{ color: 'rgba(255,255,255,0.3)' }}
                                  >
                                    Weight: {cat.weight}
                                  </span>
                                  <span
                                    className="text-xs font-mono"
                                    style={{ color: 'rgba(255,255,255,0.55)' }}
                                  >
                                    {cat.score}%
                                  </span>
                                </div>
                              </div>
                              <div
                                className="h-2 rounded-full overflow-hidden"
                                style={{ background: 'rgba(255,255,255,0.08)' }}
                              >
                                <div
                                  className={`h-full rounded-full ${cat.color}`}
                                  style={{ width: `${cat.score}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Issues + actions panel */}
                      <div className="md:w-72 flex flex-col gap-6">
                        <div>
                          <p
                            className="text-xs font-medium flex items-center gap-1.5 margin-bottom margin-small"
                            style={{ color: 'rgba(251,191,36,0.9)' }}
                          >
                            <CircleAlert className="h-3.5 w-3.5" />
                            Flagged Issues
                          </p>
                          <div className="flex flex-col gap-2">
                            {flaggedIssues.map((issue, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs">
                                <AlertTriangle
                                  className="h-3.5 w-3.5 flex-shrink-0 mt-0.5"
                                  style={{
                                    color: issue.severity === 'critical'
                                      ? 'rgba(248,113,113,0.9)'
                                      : 'rgba(251,191,36,0.9)',
                                  }}
                                />
                                <span style={{ color: 'rgba(255,255,255,0.7)' }}>
                                  {issue.text}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p
                            className="text-xs font-medium flex items-center gap-1.5 margin-bottom margin-small"
                            style={{ color: 'var(--mk-green)' }}
                          >
                            <Check className="h-3.5 w-3.5" />
                            Recommended Actions
                          </p>
                          <div className="flex flex-col gap-2">
                            {recommendedActions.map((action, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs">
                                <ArrowRight
                                  className="h-3.5 w-3.5 flex-shrink-0 mt-0.5"
                                  style={{ color: 'rgba(255,255,255,0.3)' }}
                                />
                                <span style={{ color: 'rgba(255,255,255,0.45)' }}>
                                  {action}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScaleIn>
          </div>
        </section>


        {/* ═══════════════════════════════════════════════════════
            11. PEDIGREE BANNER
            ═══════════════════════════════════════════════════════ */}
        <section className="section-spacing-sm section-dark">
          <div className="mk-container-lg">
            <ScaleIn>
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #1F5F52 0%, #2E7D6B 50%, #1a4a3c 100%)',
                  boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
                }}
              >
                <div className="p-8 md:p-12">
                  <div className="grid md:grid-cols-2 gap-8 items-center">
                    <div>
                      <span
                        className="pre-title margin-bottom margin-large"
                        style={{
                          display: 'inline-flex',
                          background: 'rgba(255,255,255,0.12)',
                          color: 'rgba(255,255,255,0.85)',
                        }}
                      >
                        Product Pedigree
                      </span>
                      <h2
                        className="text-display-lg text-mk-on-dark margin-bottom margin-medium"
                      >
                        The Non-Falsifiable Pedigree
                      </h2>
                      <p
                        className="margin-bottom margin-large"
                        style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.7 }}
                      >
                        A single QR code on your finished good links back to the exact GPS
                        coordinates of every contributing farm. Auditors verify in seconds.
                      </p>
                      <div className="flex flex-wrap gap-4 margin-bottom margin-large">
                        {['GPS-verified', 'Mass balance verified', 'Instant audit access'].map((item) => (
                          <div
                            key={item}
                            className="flex items-center gap-2 text-sm"
                            style={{ color: 'rgba(255,255,255,0.8)' }}
                          >
                            <Check className="h-4 w-4" style={{ color: 'var(--mk-green-mid)' }} />
                            {item}
                          </div>
                        ))}
                      </div>
                      <Link
                        href="/pedigree"
                        className="btn-mk-primary"
                        data-testid="button-learn-pedigree"
                        style={{ background: 'white', color: 'var(--mk-green-dark)', borderColor: 'white' }}
                      >
                        Learn About Pedigree
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>

                    {/* QR code visual */}
                    <div className="hidden md:flex justify-center">
                      <div
                        className="w-44 h-44 rounded-2xl flex items-center justify-center"
                        style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}
                      >
                        <div className="w-36 h-36 bg-white rounded-xl flex items-center justify-center shadow-lg">
                          <div className="grid grid-cols-5 gap-1 p-3">
                            {Array.from({ length: 25 }).map((_, qi) => (
                              <div
                                key={qi}
                                className="w-4 h-4 rounded-sm"
                                style={{
                                  background: [0, 1, 2, 4, 5, 6, 10, 14, 18, 19, 20, 22, 23, 24].includes(qi)
                                    ? 'var(--mk-green-dark)'
                                    : 'var(--mk-surface-gray)',
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScaleIn>
          </div>
        </section>


        {/* ═══════════════════════════════════════════════════════
            12. BLOG — 3-col mk-blog-card grid
            ═══════════════════════════════════════════════════════ */}
        <section className="section-spacing section-white">
          <div className="mk-container-lg">
            <FadeIn>
              <div className="section-header">
                <span className="pre-title margin-bottom margin-medium">Insights</span>
                <h2
                  className="text-display-md section-header__title"
                  data-testid="text-blog-headline"
                >
                  Expert Insights &amp; Compliance Updates
                </h2>
                <p className="section-header__body">
                  Stay ahead of regulatory changes and learn best practices for
                  origin-sensitive supply chain compliance.
                </p>
              </div>
            </FadeIn>

            <StaggerContainer className="mk-grid-3 margin-bottom margin-xlarge-2">
              {recentPosts.map((post) => (
                <StaggerItem key={post.slug}>
                  <Link href={`/blog/${post.slug}`} className="mk-blog-card">
                    <div className="mk-blog-card__img-wrap">
                      {post.coverImage ? (
                        <Image
                          src={post.coverImage}
                          alt={post.coverImageAlt || post.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      ) : (
                        <div
                          className={`absolute inset-0 bg-gradient-to-br ${post.coverGradient} flex items-center justify-center`}
                        >
                          <BookOpen className="h-8 w-8" style={{ color: 'rgba(255,255,255,0.15)' }} />
                        </div>
                      )}
                      <div className="mk-blog-card__overlay" />
                      <div className="mk-blog-card__cat">
                        <span className="pre-title">{post.category}</span>
                      </div>
                    </div>
                    <div className="mk-blog-card__body">
                      <div className="mk-blog-card__meta">{post.date}</div>
                      <h3 className="mk-blog-card__title">{post.title}</h3>
                      <p className="mk-blog-card__desc">{post.description}</p>
                      <span className="mk-blog-card__link">
                        Read More <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerContainer>

            <FadeIn>
              <div className="flex justify-center">
                <Link href="/blog" className="btn-mk-outline">
                  View All Insights
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>


        {/* ═══════════════════════════════════════════════════════
            13. FINAL CTA
            ═══════════════════════════════════════════════════════ */}
        <section className="section-spacing section-dark">
          <div className="mk-container-sm">
            <FadeIn>
              <div
                className="flex flex-col items-center text-center"
                style={{ maxWidth: '40rem', marginInline: 'auto' }}
              >
                <span className="pre-title margin-bottom margin-large">
                  Get Started
                </span>

                <h2
                  className="text-display-lg text-mk-on-dark margin-bottom margin-medium"
                  data-testid="text-final-cta-headline"
                >
                  Ready to build trust into your supply chain?
                </h2>

                <p
                  className="margin-bottom margin-xlarge-2"
                  style={{ color: 'var(--mk-text-on-dark-2)', lineHeight: 1.7, fontSize: '1.0625rem' }}
                >
                  Join exporters and processors across agriculture, timber, minerals, and seafood
                  who trust OriginTrace for supply chain compliance.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 margin-bottom margin-large-2">
                  <Link
                    href="/demo"
                    className="btn-mk-primary btn-mk-lg"
                    data-testid="button-get-started"
                  >
                    Get Started
                    <ChevronRight className="h-5 w-5" />
                  </Link>
                  <Link
                    href="/demo"
                    className="btn-mk-ghost btn-mk-lg"
                    data-testid="button-schedule-call"
                  >
                    <Phone className="h-4 w-4" />
                    Schedule a Call
                  </Link>
                </div>

                <a
                  href="mailto:hello@origintrace.trade"
                  className="flex items-center gap-2 text-sm"
                  style={{ color: 'var(--mk-text-on-dark-2)', textDecoration: 'none', transition: 'color 0.2s' }}
                  data-testid="link-contact-email"
                  onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'var(--mk-green)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'var(--mk-text-on-dark-2)')}
                >
                  <Mail className="h-4 w-4" />
                  hello@origintrace.trade
                </a>
              </div>
            </FadeIn>
          </div>
        </section>

      </main>

      <MarketingFooter />
    </div>
  );
}
