import Link from 'next/link';
import Image from 'next/image';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import { ComplianceCalculator } from '@/components/marketing/compliance-calculator';
import { IndustryTicker } from '@/components/marketing/industry-ticker';
import { getRecentPosts } from '@/lib/blog';
import { FadeIn, StaggerContainer, StaggerItem, ScaleIn } from '@/components/marketing/motion';
import YouTubeHeroBg from '@/components/marketing/youtube-hero-bg';
import { HomeCapabilityAccordion } from '@/components/marketing/home-capability-accordion';
import { WhyChooseSection } from '@/components/marketing/why-choose-section';
import { TestimonialCarousel } from '@/components/marketing/testimonial-carousel';
import { IndustriesTabsClient } from '@/components/marketing/industries-tabs';
import {
  Shield,
  ChevronRight,
  Check,
  AlertTriangle,
  FileText,
  MapPin,
  Package,
  ClipboardCheck,
  Sprout,
  Globe,
  ArrowRight,
  CircleAlert,
  Search,
  BarChart3,
  Scale,
  Leaf,
  Mail,
  Phone,
  Wifi,
  QrCode,
  BookOpen,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────
   DATA CONSTANTS — unchanged from original
   ───────────────────────────────────────────────────────────────── */

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
   INDUSTRIES / COMMODITIES TABS SECTION
   ───────────────────────────────────────────────────────────────── */

function IndustriesTabSection() {
  return (
    <section
      className="section-spacing"
      style={{
        background: 'var(--color--gray-8, #f5f5f5)',
        borderTopLeftRadius: '1.25rem',
        borderTopRightRadius: '1.25rem',
      }}
    >
      <div className="mk-container-lg">
        <FadeIn>
          <div style={{ marginBottom: '2.5rem' }}>
            <span className="pre-title margin-bottom margin-medium">Commodities We Serve</span>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.875rem, 3vw, 2.625rem)',
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                color: 'var(--mk-text-primary)',
                maxWidth: '24ch',
                margin: '0.75rem 0 0',
              }}
            >
              Building smarter, cleaner supply chains{' '}
              <span style={{ color: 'var(--mk-text-muted)' }}>
                across Africa&apos;s key export commodities
              </span>
            </h2>
          </div>
        </FadeIn>

        <IndustriesTabsClient />
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   COUNTER SECTION (Mivora counter-section)
   ───────────────────────────────────────────────────────────────── */

const counterItems = [
  { label: 'Shipment clearance rate', value: '99%', icon: '↗' },
  { label: 'Reduction in compliance prep time', value: '85%', icon: '↗' },
  { label: 'Farms verified and GPS-mapped', value: '500+', icon: '↗' },
  { label: 'Regulatory frameworks covered', value: '12+', icon: '↗' },
];

function CounterSection() {
  return (
    <section className="section-spacing section-white section-bordered">
      <div className="mk-container-lg">
        <FadeIn>
          <div className="section-header margin-bottom margin-xlarge">
            <span className="pre-title margin-bottom margin-medium">Compliance in Numbers</span>
            <h2 className="text-display-lg section-header__title no-margin-bottom">
              Driving measurable results{' '}
              <span className="text-mk-muted">across every shipment, farm, and partnership.</span>
            </h2>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="mk-counter-grid">
            {counterItems.map((item, i) => (
              <div key={i} className="mk-counter-item">
                <p className="mk-counter-title">{item.label}</p>
                <div className="mk-counter-wrap">
                  <span className="mk-counter-arrow" aria-hidden>↗</span>
                  <h2 className="mk-counter-number">{item.value}</h2>
                </div>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   TECHNOLOGY SPLIT SECTION (Mivora technology-section)
   ───────────────────────────────────────────────────────────────── */

function TechnologySection() {
  return (
    <section className="section-spacing section-gray">
      <div className="mk-container-lg">
        <div className="mk-technology-grid">
          {/* LEFT — title + CTA */}
          <FadeIn direction="right">
            <div className="mk-technology-title-wrap">
              <h2 className="text-display-lg" style={{ color: 'var(--mk-text-primary)' }}>
                <span className="text-mk-muted">Offline-first</span> field technology{' '}
                powered by <span className="text-mk-muted">real compliance intelligence</span>
              </h2>
              <Link href="/solutions" className="btn-mk-primary" style={{ marginTop: '2rem', display: 'inline-flex' }}>
                Explore Platform
              </Link>
            </div>
          </FadeIn>

          {/* RIGHT — image + feature list */}
          <div className="mk-technology-info-wrap">
            <FadeIn delay={0.1}>
              <div
                className="mk-technology-image-wrap"
                style={{
                  borderRadius: '1.25rem',
                  overflow: 'hidden',
                  aspectRatio: '4/3',
                  backgroundImage: "url('/images/baged product in wareouse.jpg')",
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
            </FadeIn>

            <FadeIn delay={0.2}>
              <div className="mk-technology-info">
                <p style={{ color: 'var(--mk-text-secondary)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                  At OriginTrace, our field tools and compliance engine go hand-in-hand to deliver
                  smart, verifiable, and future-ready traceability from the first mile to the final port.
                </p>
                <div className="flex flex-col gap-3">
                  {[
                    'GPS polygon farm mapping with anti-spoofing',
                    'Offline-first PWA with automatic sync',
                    'Pre-shipment 5-dimension compliance scoring',
                    'EUDR & FSMA deforestation-risk detection',
                    'Digital Product Passport with QR verification',
                  ].map((item) => (
                    <div key={item} className="mk-list-item">
                      <span className="mk-list-item__icon">
                        <Check className="w-3 h-3" />
                      </span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   TESTIMONIALS SECTION (Mivora testimonial-section — dark)
   ───────────────────────────────────────────────────────────────── */

const testimonialData = [
  {
    name: 'Adebayo Ogundimu',
    title: 'Export Director',
    company: 'West Africa Cocoa Cooperative',
    quote: 'OriginTrace reduced our shipment rejection rate from 12% to under 1%. The pre-shipment compliance scoring caught issues we would have missed — saving hundreds of thousands in lost cargo.',
    initials: 'AO',
  },
  {
    name: 'Marie-Claire Dupont',
    title: 'Compliance Manager',
    company: 'Sahel Commodities S.A.',
    quote: 'Before OriginTrace, we spent weeks assembling compliance dossiers. Now our EUDR documentation is generated automatically with GPS-verified farm polygons. Our buyers trust us completely.',
    initials: 'MD',
  },
  {
    name: 'Henrik Johansson',
    title: 'Head of Procurement',
    company: 'Nordic Foods Group',
    quote: 'The buyer portal gives us real-time visibility into our suppliers\' traceability data. We can verify origin claims before shipments even leave port. It\'s transformed how we source.',
    initials: 'HJ',
  },
  {
    name: 'Fatima Bello',
    title: 'Operations Manager',
    company: 'Green Harvest Nigeria',
    quote: 'Our field agents collect data offline in remote areas, and everything syncs when they\'re back in range. The system just works — even in areas with zero connectivity.',
    initials: 'FB',
  },
  {
    name: 'James Kariuki',
    title: 'CEO',
    company: 'East African Timber Exports',
    quote: 'The Digital Product Passport feature has been a game-changer. Buyers scan one QR code and see the full chain of custody back to the farm. Audit time went from days to minutes.',
    initials: 'JK',
  },
];

function TestimonialsSection() {
  return (
    <section
      className="section-spacing"
      style={{
        /* Mivora: background-image over a cover photo, with a dark overlay div on top */
        backgroundImage: "url('/images/lagos apapa port.jpg')",
        backgroundPosition: '50%',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        color: 'var(--mk-text-on-dark)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Mivora .testimonial-overlay — dark cover over the background image */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(33,33,33,0.82)',
          pointerEvents: 'none',
        }}
      />

      <div className="mk-container-lg" style={{ position: 'relative' }}>
        <FadeIn>
          <div className="section-header section-header--center">
            <h2 className="text-display-lg text-mk-on-dark margin-bottom margin-medium">
              What our clients <span className="text-mk-brand">say</span>
            </h2>
            <p style={{ color: 'var(--mk-text-on-dark-2)', fontSize: '1.0625rem', maxWidth: '44ch', textAlign: 'center', marginInline: 'auto' }}>
              Trusted by exporters, cooperatives, and commodity buyers across Africa and Europe.
            </p>
          </div>
        </FadeIn>

        <div className="mk-testimonial-grid">
          {testimonialData.map((t, i) => (
            <FadeIn key={i} delay={i * 0.07}>
              <div className="mk-testimonial-item">
                <div className="mk-testimonial-member-wrap">
                  <div className="mk-testimonial-avatar">
                    <span>{t.initials}</span>
                  </div>
                  <div>
                    <h3 className="mk-testimonial-name">{t.name}</h3>
                    <p className="mk-testimonial-position">{t.title}, {t.company}</p>
                  </div>
                </div>
                <p className="mk-testimonial-desc">&ldquo;{t.quote}&rdquo;</p>
                <img
                  src="/images/6835561dd6d805810e0f5ed2_b66967c74a5d313b1ff8ca2989cd1a26_shape.svg"
                  alt=""
                  aria-hidden
                  className="mk-testimonial-shape"
                  width={30}
                  height={57}
                />
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   CERTIFICATION MARQUEE
   ───────────────────────────────────────────────────────────────── */

const certifications = [
  'EUDR Compliant',
  'FSMA 204 Ready',
  'Rainforest Alliance',
  'Fairtrade Certified',
  'ISO 22000',
  'GlobalG.A.P.',
  'UK Environment Act',
  'CS3D Ready',
  'GACC Registered',
  'USDA Organic',
];

function CertificationMarquee() {
  const doubled = [...certifications, ...certifications];
  return (
    <section
      className="section-bordered"
      style={{ paddingBlock: '2.5rem', background: 'var(--mk-surface-gray)' }}
    >
      <div className="mk-marquee-wrap">
        <div className="mk-marquee-track">
          {doubled.map((cert, i) => (
            <div
              key={i}
              className="mk-cert-item"
              aria-hidden={i >= certifications.length}
            >
              <span className="mk-cert-dot" aria-hidden />
              {cert}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

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
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--color--gray-8)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
      <MarketingNav />

      <main>

        {/* ═══════════════════════════════════════════════════════
            1. HERO
            ═══════════════════════════════════════════════════════ */}
        <section className="mk-hero" style={{ backgroundColor: '#0d3520', minHeight: '88vh' }}>
          <YouTubeHeroBg videoId="Ifr4moOLxDI" />
          <div className="mk-hero__overlay" />

          <div className="mk-hero__content">
            <div className="mk-container-lg">
              {/* Two-col on desktop, single-col on mobile (card stacks below text) */}
              <div
                className="grid lg:grid-cols-[55fr_45fr] gap-8 lg:gap-12"
                style={{ alignItems: 'end', width: '100%' }}
              >
                {/* LEFT — sits at bottom because mk-hero__content is flex-end */}
                <div style={{ paddingBottom: '0' }}>
                  <FadeIn delay={0.1}>
                    <h1
                      className="margin-bottom margin-large"
                      data-testid="text-hero-headline"
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 'clamp(1.875rem, 2.8vw, 2.625rem)',
                        fontWeight: 800,
                        lineHeight: 1.05,
                        letterSpacing: '-0.03em',
                        color: '#ffffff',
                        maxWidth: '16ch',
                      }}
                    >
                      Compliance infrastructure<br />for Agriculture
                    </h1>
                  </FadeIn>

                  <FadeIn delay={0.2}>
                    <p
                      className="margin-bottom margin-xlarge"
                      style={{ fontSize: '1.0625rem', lineHeight: 1.75, maxWidth: '40ch', color: '#ffffff' }}
                    >
                      OriginTrace helps exporters and processors prove origin, manage compliance risk,
                      and generate audit-ready documentation before shipments leave port.
                    </p>
                  </FadeIn>

                  <FadeIn delay={0.3}>
                    <div className="flex flex-wrap gap-3">
                      <Link href="#eudr-assessment" className="btn-mk-primary btn-mk-lg" data-testid="button-check-readiness">
                        Assess Your Export Readiness
                      </Link>
                      <Link href="/demo" className="btn-mk-ghost btn-mk-lg" data-testid="button-request-demo">
                        Request a Demo
                      </Link>
                    </div>
                  </FadeIn>
                </div>

                {/* RIGHT — card bleeds below hero via margin-bottom: -8.3rem */}
                <div className="flex flex-col justify-end">
                  <FadeIn delay={0.5} direction="up">
                    <div
                      className="hero-detail-wrap w-full mx-auto lg:ml-auto lg:mr-0"
                      style={{
                        maxWidth: '360px',
                      }}
                    >
                      {/* ── 1. TITLE ── */}
                      <div className="pb-4">
                        <p
                          className="font-semibold leading-snug"
                          style={{ fontSize: '1.0625rem', color: 'var(--mk-text-primary)', letterSpacing: '-0.015em', maxWidth: '28ch' }}
                        >
                          How Nigerian cocoa exporters cleared EU borders on the first attempt
                        </p>
                      </div>

                      {/* ── 2. IMAGE ── */}
                      <div
                        style={{
                          height: '160px',
                          background: 'linear-gradient(135deg, #bbf7d0 0%, #6ee7b7 40%, #34d399 100%)',
                          position: 'relative',
                          overflow: 'hidden',
                          borderRadius: '0.375rem',
                        }}
                      >
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ background: 'rgba(255,255,255,0.7)', color: 'var(--mk-green)', fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.75rem', borderRadius: '9999px' }}>
                            Add your image here
                          </span>
                        </div>
                      </div>

                      {/* ── 3. STAT ROW ── */}
                      <div style={{ display: 'flex', alignItems: 'stretch', padding: '0.75rem 0' }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '0.75rem', color: 'var(--mk-text-muted)', marginBottom: '0.375rem', maxWidth: '16ch', lineHeight: 1.4 }}>
                            Farms verified to clear cargo
                          </p>
                          <p style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--mk-text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.04em', lineHeight: 1 }}>
                            500+
                          </p>
                        </div>
                        <div style={{ width: '1px', background: 'var(--mk-border)', margin: '0 1rem', alignSelf: 'stretch' }} />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '0.75rem', color: 'var(--mk-text-muted)', marginBottom: '0.375rem', maxWidth: '16ch', lineHeight: 1.4 }}>
                            Reduction in customs delays
                          </p>
                          <p style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--mk-text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.04em', lineHeight: 1 }}>
                            200+
                          </p>
                        </div>
                      </div>

                      {/* Decorative corner elements */}
                      {/* Mivora concave quarter-circle corner fills */}
                      <img
                        src="/images/6836fc56a91aed0e5c1c5871_hero-left-shape.svg"
                        alt=""
                        aria-hidden
                        className="hero-left-decorative"
                        width={25}
                        height={25}
                      />
                      <img
                        src="/images/6836fc56293581224cd8c720_hero-right-shape.svg"
                        alt=""
                        aria-hidden
                        className="hero-right-decorative"
                        width={25}
                        height={25}
                      />
                    </div>
                  </FadeIn>
                </div>

              </div>
            </div>
          </div>
        </section>


        {/* ═══════════════════════════════════════════════════════
            2. ABOUT / MISSION
            ═══════════════════════════════════════════════════════ */}
        <section className="section-white" style={{ paddingTop: 'calc(var(--section-md) + 5rem)', paddingBottom: 'var(--section-md)' }}>
          <div className="mk-container-sm">
            {/* Centered header */}
            <FadeIn>
              <div className="section-header">
                {/* Sun / starburst icon — matches Mivora */}
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 36 36"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="margin-bottom margin-medium"
                  aria-hidden
                  style={{ color: 'var(--mk-text-muted)' }}
                >
                  <circle cx="18" cy="18" r="5" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="18" y1="2"  x2="18" y2="7"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="18" y1="29" x2="18" y2="34" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="2"  y1="18" x2="7"  y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="29" y1="18" x2="34" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="6.34"  y1="6.34"  x2="9.87"  y2="9.87"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="26.13" y1="26.13" x2="29.66" y2="29.66" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="29.66" y1="6.34"  x2="26.13" y2="9.87"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="9.87"  y1="26.13" x2="6.34"  y2="29.66" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>

                <span className="pre-title margin-bottom margin-medium">Driving Change</span>

                <h2 className="text-display-lg section-header__title" style={{ maxWidth: '26ch' }}>
                  At OriginTrace, we are{' '}
                  <span className="text-mk-muted">redefining</span> supply chain compliance
                  by verifying{' '}
                  <span className="text-mk-brand">every origin.</span>
                </h2>

                <p className="section-header__body">
                  We are trust infrastructure purpose-built for origin-sensitive supply chains.
                  From first-mile field operations to port clearance, OriginTrace captures
                  verifiable compliance data at every step — so shipments clear borders,
                  not get rejected at them.
                </p>
              </div>
            </FadeIn>

            {/* 3-column image grid — bottom-aligned, center protrudes up */}
            <FadeIn delay={0.12}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '1rem',
                  alignItems: 'center',
                  marginBottom: '3rem',
                }}
              >

                {/* LEFT — Farmer in field */}
                <div
                  style={{
                    height: '500px',
                    borderRadius: '1.25rem',
                    overflow: 'hidden',
                    backgroundImage: "url('/images/farmer in field.jpg')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center center',
                  }}
                />

                {/* CENTER — Bagged product in warehouse (tallest, protrudes symmetrically) */}
                <div
                  style={{
                    height: '660px',
                    borderRadius: '1.25rem',
                    overflow: 'hidden',
                    backgroundImage: "url('/images/baged product in wareouse.jpg')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />

                {/* RIGHT — Lagos Apapa port */}
                <div
                  style={{
                    height: '500px',
                    borderRadius: '1.25rem',
                    overflow: 'hidden',
                    backgroundImage: "url('/images/lagos apapa port.jpg')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />

              </div>
            </FadeIn>

            {/* CTA — centered pill button */}
            <FadeIn delay={0.22}>
              <div className="flex justify-center">
                <Link href="/solutions" className="btn-mk-primary" data-testid="button-learn-more">
                  More about us
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>


        {/* ═══════════════════════════════════════════════════════
            3b. COMMODITIES / INDUSTRIES TABS
            ═══════════════════════════════════════════════════════ */}
        <IndustriesTabSection />


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
            6b. TESTIMONIALS (dark grid — Mivora testimonial-section)
            ═══════════════════════════════════════════════════════ */}
        <TestimonialsSection />


        {/* ═══════════════════════════════════════════════════════
            7. COUNTER SECTION (Mivora counter-section pattern)
            ═══════════════════════════════════════════════════════ */}
        <CounterSection />


        {/* ═══════════════════════════════════════════════════════
            7b. TECHNOLOGY SPLIT SECTION
            ═══════════════════════════════════════════════════════ */}
        <TechnologySection />


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
            11b. CERTIFICATION MARQUEE
            ═══════════════════════════════════════════════════════ */}
        <CertificationMarquee />


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
                  className="mk-contact-link flex items-center gap-2 text-sm"
                  style={{ textDecoration: 'none' }}
                  data-testid="link-contact-email"
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
