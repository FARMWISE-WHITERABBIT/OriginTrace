import Link from 'next/link';
import Image from 'next/image';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import { IndustryTicker } from '@/components/marketing/industry-ticker';
import { getAllPosts } from '@/lib/blog';
import { BlogCarousel } from '@/components/marketing/blog-carousel';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/marketing/motion';
import HeroBackground from '@/components/marketing/hero-background';
import { CapabilitySlider } from '@/components/marketing/capability-slider';
import { WhyChooseSection } from '@/components/marketing/why-choose-section';
import { IndustriesTabsClient } from '@/components/marketing/industries-tabs';
import {
  Shield,
  ChevronRight,
  Check,
  MapPin,
  ArrowRight,
  Mail,
  Phone,
  Wifi,
  QrCode,
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
    <section className="section-spacing section-white" style={{ background: 'var(--mk-surface-white)' }}>
      <div className="mk-container-lg">
        <FadeIn>
          <div className="section-header">
            <span className="pre-title margin-bottom margin-medium">Commodities We Serve</span>
            <h2 className="text-display-lg section-header__title">
              Building <span className="text-mk-muted">smarter, compliant supply chains</span>{' '}
              across Africa&apos;s key export commodities
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


/* ─────────────────────────────────────────────────────────────────
   TESTIMONIALS SECTION (Mivora testimonial-section — dark)
   ───────────────────────────────────────────────────────────────── */


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
  const allPosts = getAllPosts();
  const featuredPost = allPosts[0];

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
        <section className="mk-hero">
          <HeroBackground videoSrc="https://sjpnqhlohgyyndxyfgvh.supabase.co/storage/v1/object/public/media/0607%20(2)(1).mp4" />
          <div className="mk-hero__overlay" />

          <div className="mk-hero__content">
            <div className="mk-container-lg">
              {/* Two-col on desktop, single-col on mobile (card stacks below text) */}
              <div
                className="grid lg:grid-cols-[55fr_45fr] gap-8 lg:gap-12"
                style={{ alignItems: 'stretch', minHeight: '65vh' }}
              >
                {/* LEFT — headline, subtitle, CTA — vertically centered */}
                <div className="flex flex-col justify-center py-8">
                  <FadeIn delay={0.1}>
                    <h1
                      className="text-display-2xl margin-bottom margin-large"
                      data-testid="text-hero-headline"
                      style={{ color: '#ffffff', maxWidth: '14ch', fontFamily: 'var(--font-display)' }}
                    >
                      The operating system for African agricultural exporters.
                    </h1>
                  </FadeIn>

                  <FadeIn delay={0.2}>
                    <p
                      className="margin-bottom margin-xlarge"
                      style={{ fontSize: '1.0625rem', lineHeight: 1.75, maxWidth: '40ch', color: 'rgba(255,255,255,0.62)' }}
                    >
                      From farm record to payment receipt — OriginTrace handles compliance
                      documentation, shipment tracking, and payment settlement in one platform.
                    </p>
                  </FadeIn>

                  <FadeIn delay={0.3}>
                    <div className="flex flex-wrap gap-3">
                      <Link href="#eudr-assessment" className="btn-mk-primary btn-mk-lg" data-testid="button-check-readiness">
                        Assess Your Export Readiness
                      </Link>
                      <Link href="#how-it-works" className="btn-mk-ghost btn-mk-lg">
                        See How It Works
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
                      {/* ── 1. IMAGE ── */}
                      <Link href={`/blog/${featuredPost.slug}`} style={{ display: 'block', textDecoration: 'none' }}>
                        <div
                          style={{
                            height: '180px',
                            position: 'relative',
                            overflow: 'hidden',
                            borderRadius: '0.5rem',
                          }}
                        >
                          {featuredPost.coverImage ? (
                            <img
                              src={featuredPost.coverImage}
                              alt={featuredPost.coverImageAlt || featuredPost.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                          ) : (
                            <div className={`w-full h-full bg-gradient-to-br ${featuredPost.coverGradient}`} />
                          )}
                          {/* Category + date chips */}
                          <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', display: 'flex', gap: '0.4rem' }}>
                            <span style={{ background: 'var(--mk-green)', color: '#fff', fontSize: '0.625rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '9999px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              {featuredPost.category}
                            </span>
                            <span style={{ background: 'rgba(20,20,20,0.72)', color: '#fff', fontSize: '0.625rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '9999px', backdropFilter: 'blur(4px)' }}>
                              {featuredPost.date}
                            </span>
                          </div>
                        </div>
                      </Link>

                      {/* ── 2. TITLE ── */}
                      <div style={{ padding: '0.75rem 0 0.5rem' }}>
                        <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--mk-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.375rem' }}>
                          Latest Insight
                        </p>
                        <Link href={`/blog/${featuredPost.slug}`} style={{ textDecoration: 'none' }}>
                          <p
                            className="font-semibold leading-snug"
                            style={{ fontSize: '0.9375rem', color: 'var(--mk-text-primary)', letterSpacing: '-0.01em', maxWidth: '30ch', lineHeight: 1.45 }}
                          >
                            {featuredPost.title}
                          </p>
                        </Link>
                      </div>

                      {/* ── 3. META ROW ── */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--mk-text-muted)' }}>{featuredPost.readingTime}</span>
                        <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--mk-text-muted)' }} aria-hidden />
                        <Link href="/blog" style={{ fontSize: '0.75rem', color: 'var(--mk-green)', fontWeight: 600, textDecoration: 'none' }}>
                          View all insights →
                        </Link>
                      </div>

                      {/* Decorative corner elements */}
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
        <section className="section-white" style={{ paddingTop: 'calc(var(--section-md) + 8.3rem)', paddingBottom: 'var(--section-md)' }}>
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

                <span className="pre-title margin-bottom margin-medium">The Problem We Solve</span>

                <h2 className="text-display-lg section-header__title" style={{ maxWidth: '26ch' }}>
                  The problem is not{' '}
                  <span className="text-mk-muted">production.</span>{' '}
                  It is{' '}
                  <span className="text-mk-brand">proof.</span>
                </h2>

                <p className="section-header__body">
                  Nigeria and West Africa produce commodities the world demands — sesame, cocoa,
                  cashew, ginger, timber. The challenge is not supply. It is that exporters cannot
                  prove their supply chain to the standard that buyers and regulators now require.
                  OriginTrace was built to close that gap — not for the buyer, not for the
                  certification body, but for the exporter.
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
                  See the platform
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
            4. CAPABILITIES (sliding cards)
            ═══════════════════════════════════════════════════════ */}
        <section id="how-it-works" className="section-spacing section-dark">
          <div className="mk-container-lg">
            <CapabilitySlider capabilities={capabilities} />
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
                  Built for exporters.{' '}
                  <span className="text-mk-muted">Not just buyers.</span>
                </h2>
              </div>
            </FadeIn>

            <WhyChooseSection features={whyChooseFeatures} />
          </div>
        </section>


        {/* ═══════════════════════════════════════════════════════
            11b. CERTIFICATION MARQUEE
            ═══════════════════════════════════════════════════════ */}
        <CertificationMarquee />


        {/* ═══════════════════════════════════════════════════════
            12. BLOG — 2-up carousel
            ═══════════════════════════════════════════════════════ */}
        <section className="section-spacing section-white">
          <div className="mk-container-lg">
            <BlogCarousel posts={allPosts} />
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
                  The pilot is open. Places are limited.
                </h2>

                <p
                  className="margin-bottom margin-xlarge-2"
                  style={{ color: 'var(--mk-text-on-dark-2)', lineHeight: 1.7, fontSize: '1.0625rem' }}
                >
                  OriginTrace is working with a select group of exporters in Nigeria and
                  West Africa. Apply now to get your supply chain compliance-ready before
                  your next export season.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 margin-bottom margin-large-2">
                  <Link
                    href="/demo"
                    className="btn-mk-primary btn-mk-lg"
                    data-testid="button-get-started"
                  >
                    Apply for Early Access
                    <ChevronRight className="h-5 w-5" />
                  </Link>
                  <Link
                    href="/demo"
                    className="btn-mk-ghost btn-mk-lg"
                    data-testid="button-schedule-call"
                  >
                    <Phone className="h-4 w-4" />
                    Book a 30-min Walkthrough
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
