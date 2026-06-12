import Link from 'next/link';
import Image from 'next/image';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import { FadeIn } from '@/components/marketing/motion';
import HeroBackground from '@/components/marketing/hero-background';
import { CapabilitySlider } from '@/components/marketing/capability-slider';
import {
  Globe,
  MapPin,
  FileText,
  ShieldCheck,
  Factory,
  Shield,
  ClipboardCheck,
  Smartphone,
  Wifi,
  Users,
  ArrowRight,
  Check,
  ChevronRight,
  Banknote,
} from 'lucide-react';

/* ─── DATA ─────────────────────────────────────────────────────────── */

const stats = [
  { label: 'Compliance frameworks checked per shipment', value: '5' },
  { label: 'Countries with active compliance requirements', value: '40+' },
  { label: 'Traceability — from plot to payment', value: '100%' },
];

const roles = [
  {
    id: 'exporters',
    label: 'Exporter',
    icon: Globe,
    headline: 'Know your compliance status before you book freight.',
    body: 'You source agricultural commodities or mineral goods, arrange logistics, and manage buyers across multiple markets. OriginTrace gives you a compliance score before loading, documentation when you ship, and payment settlement when you deliver.',
    features: [
      'Pre-shipment compliance score across 5 markets simultaneously',
      'One-click export documentation — no manual assembly',
      'Milestone escrow: payment releases when shipment clears',
      'Contributor disbursement direct from the platform',
    ],
  },
  {
    id: 'cooperatives',
    label: 'Cooperative / Aggregator',
    icon: Users,
    headline: 'Hundreds of contributors. One verified traceability record.',
    body: 'You work with smallholder farmers, artisanal mining cooperatives, or community collectors across multiple sites. OriginTrace helps you register every plot or extraction site, log every collection, and generate a single verified batch record — even without internet.',
    features: [
      'GPS registration for every contributing farm plot or extraction site',
      'Offline-first batch collection — syncs when connectivity returns',
      'Unit-level traceability from source to export warehouse',
      'Anti-fraud yield validation to protect your data integrity',
    ],
  },
  {
    id: 'compliance',
    label: 'Compliance Officer',
    icon: ClipboardCheck,
    headline: 'Stop assembling compliance packs the night before loading.',
    body: 'You are responsible for ensuring every shipment meets destination market requirements. OriginTrace runs your shipment against all five major frameworks simultaneously and flags gaps before loading.',
    features: [
      'EUDR, FSMA 204, UK Environment Act, GACC, ESMA — one check',
      'Automated gap detection with resolution guidance',
      'Audit-ready dossiers generated on demand',
      'Document vault with expiry tracking and alerts',
    ],
  },
  {
    id: 'logistics',
    label: 'Logistics Coordinator',
    icon: FileText,
    headline: 'All your export documents from one source of truth.',
    body: 'You manage dispatch, freight booking, and waybill documentation. OriginTrace generates every export document from the same traceability record — no duplicate data entry across five different systems.',
    features: [
      'Waybill, pedigree certificate, and mineralogy certificate generation',
      'Shipment pipeline with 9-stage tracking',
      'Container, bonded warehouse, and port manifest linkage',
      'Shared document access for buyers and inspectors',
    ],
  },
];

const workflowSteps = [
  {
    number: '01',
    title: 'Register Your Sources',
    description: 'GPS-map every farm plot, forest concession, or extraction site and register every contributor with verified identity. Your supply chain starts with verified origin — not declarations.',
    icon: MapPin,
  },
  {
    number: '02',
    title: 'Capture & Aggregate',
    description: 'Field agents log collection in real time — even without internet. Every unit is traceable to the exact source it came from. Data syncs automatically when connectivity returns.',
    icon: Factory,
  },
  {
    number: '03',
    title: 'Run a Compliance Check',
    description: 'Score your shipment against EU, UK, US, China, and UAE requirements simultaneously. Know your clearance status and resolve gaps before you book freight — not at the border.',
    icon: ShieldCheck,
  },
  {
    number: '04',
    title: 'Generate Your Documents',
    description: 'Produce your pedigree certificate, waybill, and full compliance pack from a single verified record. No more assembling files from multiple sources the night before loading.',
    icon: FileText,
  },
  {
    number: '05',
    title: 'Settle Payment',
    description: 'Your buyers pay into escrow. Funds release when the shipment is confirmed and compliance is verified. No chasing. No trust-based risk.',
    icon: Banknote,
  },
];

const roleImages = [
  '/images/pexels-josiah-matthew-145486517-10697911.jpg',
  '/images/pexels-zeal-creative-studios-58866141-31283913.jpg',
  '/images/pexels-mikhail-nilov-8332326.jpg',
  '/images/pexels-jan-van-der-wolf-11680885-15780139.jpg',
];

const roleStats: Record<string, { label: string; value: string }[]> = {
  exporters: [
    { label: 'Markets checked simultaneously', value: '5' },
    { label: 'Documents from one verified record', value: '6+' },
    { label: 'Escrow settlement rate', value: '100%' },
  ],
  cooperatives: [
    { label: 'Sources registered per org (avg)', value: '400+' },
    { label: 'Offline sync success rate', value: '99.9%' },
    { label: 'Unit-level traceability', value: '100%' },
  ],
  compliance: [
    { label: 'Compliance frameworks covered', value: '5' },
    { label: 'Gap detection before loading', value: 'Real-time' },
    { label: 'Audit dossiers on demand', value: 'Yes' },
  ],
  logistics: [
    { label: 'Shipment pipeline stages', value: '9' },
    { label: 'Document types generated', value: '6+' },
    { label: 'Manual data re-entry required', value: '0' },
  ],
};

/* ─── PAGE ─────────────────────────────────────────────────────────── */

export default function SolutionsPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color--gray-8)', overflowX: 'clip' }}>
      <MarketingNav />

      <main>

        {/* ══════════════════════════════════════════════════════════
            1. HERO — full-bleed background, headline left, stats card
            ══════════════════════════════════════════════════════════ */}
        <section className="mk-hero mk-hero--solutions">
          <HeroBackground videoSrc="https://sjpnqhlohgyyndxyfgvh.supabase.co/storage/v1/object/public/media/0607%20(2)(1).mp4" />
          <div className="mk-hero__overlay mk-hero__overlay--solutions" />

          <div className="mk-hero__content mk-hero__content--solutions">
            <div className="mk-container-lg" style={{ width: '100%' }}>
              {/* Same grid structure as homepage: 55fr left col, 45fr right col with card at bottom */}
              <div
                className="hero-content-grid grid lg:grid-cols-[55fr_45fr] gap-6 lg:gap-12"
                style={{ alignItems: 'stretch', height: '100%', minHeight: '40vh' }}
              >

                {/* LEFT — headline + subtitle + CTA, vertically centered */}
                <div className="hero-left-col flex flex-col justify-center py-16 lg:py-8">
                  <FadeIn delay={0.1}>
                    <h1
                      className="text-display-2xl margin-bottom margin-large"
                      style={{
                        color: '#ffffff',
                        fontFamily: 'var(--font-display)',
                        maxWidth: '12ch',
                      }}
                    >
                      From field and mine to foreign market.
                    </h1>
                  </FadeIn>
                  <FadeIn delay={0.2}>
                    <p
                      className="margin-bottom margin-xlarge"
                      style={{
                        fontSize: 'clamp(0.9rem, 2.5vw, 1.0625rem)',
                        lineHeight: 1.75,
                        maxWidth: '40ch',
                        color: 'rgba(255,255,255,0.62)',
                      }}
                    >
                      OriginTrace is the traceability and compliance infrastructure for
                      African agricultural and mineral exports — verified origin, multi-market
                      compliance scoring, export documentation, and payment settlement
                      in one system.
                    </p>
                  </FadeIn>
                  <FadeIn delay={0.3}>
                    <Link href="/demo" className="btn-mk-primary btn-mk-lg">
                      Get your compliance score
                      <ChevronRight className="h-5 w-5" />
                    </Link>
                  </FadeIn>
                </div>

                {/* RIGHT — stats card, pinned to bottom of column */}
                <div className="hero-right-col flex flex-col justify-end pb-0">
                  <FadeIn delay={0.5} direction="up">
                    <div className="hero-detail-wrap w-full mx-auto lg:ml-auto lg:mr-0">
                      <div className="solutions-stats-row">
                        {stats.map((stat, i) => (
                          <div
                            key={i}
                            className="solutions-stats-col"
                            style={i < stats.length - 1 ? { borderRight: '1px solid var(--mk-border)' } : {}}
                          >
                            <p style={{ fontSize: '0.6875rem', color: 'var(--mk-text-muted)', lineHeight: 1.45, marginBottom: '1rem' }}>
                              {stat.label}
                            </p>
                            <p
                              style={{
                                fontSize: '1.75rem',
                                color: 'var(--mk-text-primary)',
                                fontFamily: 'var(--font-display)',
                                fontWeight: 800,
                                lineHeight: 1,
                              }}
                            >
                              {stat.value}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Decorative corner elements — same as homepage */}
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


        {/* ══════════════════════════════════════════════════════════
            2. INTRO — centered headline, 3 images, twin columns
            ══════════════════════════════════════════════════════════ */}
        <section className="section-spacing section-white">
          <div className="mk-container-sm">
            <FadeIn>
              <div className="section-header" style={{ marginBottom: '3.5rem' }}>
                <h2
                  className="text-display-lg section-header__title"
                  style={{ maxWidth: '22ch' }}
                >
                  Proof should travel{' '}
                  <span className="text-mk-muted">with the product.</span>
                </h2>
                <p className="section-header__body" style={{ marginTop: '1.5rem' }}>
                  EUDR, FSMA 204, GACC, and the UK Environment Act are reshaping what it means
                  to export from Africa. Declarations are no longer enough. OriginTrace replaces
                  them with verified data — GPS-mapped sources, real-time collection records,
                  and compliance evidence that travels with every shipment, from the first
                  collection to the final payment.
                </p>
              </div>
            </FadeIn>
          </div>

          {/* 3-image row — equal heights, varying widths (per reference) */}
          <div className="mk-container-lg" style={{ marginBottom: '3.5rem' }}>
            {/* Desktop */}
            <div
              className="hidden md:grid"
              style={{ gridTemplateColumns: '1.5fr 1fr 1.8fr', gap: '1rem', alignItems: 'stretch' }}
            >
              <FadeIn delay={0.1} direction="up">
                <div style={{ height: '400px', borderRadius: '1.25rem', overflow: 'hidden', backgroundImage: "url('/images/pexels-andromeda99-36192545.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
              </FadeIn>
              <FadeIn delay={0.2} direction="up">
                <div style={{ height: '400px', borderRadius: '1.25rem', overflow: 'hidden', backgroundImage: "url('/images/pexels-1500mcoffee-28314458.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
              </FadeIn>
              <FadeIn delay={0.3} direction="up">
                <div style={{ height: '400px', borderRadius: '1.25rem', overflow: 'hidden', backgroundImage: "url('/images/pexels-tomfisk-2231744.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
              </FadeIn>
            </div>

            {/* Mobile — same equal-height row, scaled down */}
            <div className="block md:hidden">
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
                <div style={{ flex: 1.5, height: '150px', borderRadius: '1rem', overflow: 'hidden', backgroundImage: "url('/images/pexels-andromeda99-36192545.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <div style={{ flex: 1, height: '150px', borderRadius: '1rem', overflow: 'hidden', backgroundImage: "url('/images/pexels-1500mcoffee-28314458.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <div style={{ flex: 1.8, height: '150px', borderRadius: '1rem', overflow: 'hidden', backgroundImage: "url('/images/pexels-tomfisk-2231744.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
              </div>
            </div>
          </div>

          {/* Twin text columns + asterisk divider */}
          <div className="mk-container-lg">
            <FadeIn delay={0.2}>
              <div className="solutions-twin-cols">
                <p style={{ fontSize: '1rem', color: 'var(--mk-text-secondary)', lineHeight: 1.8, textAlign: 'center' }}>
                  Across West and East Africa, we've built a network of verified sources — every
                  farm plot, forest concession, and extraction site GPS-mapped and
                  identity-checked before a single unit leaves the source.
                </p>

                {/* Asterisk divider */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="36" height="36" viewBox="0 0 28 28" fill="none" aria-hidden style={{ color: 'var(--mk-text-muted)' }}>
                    <line x1="14" y1="2" x2="14" y2="26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="3.6" y1="8" x2="24.4" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="3.6" y1="20" x2="24.4" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>

                <p style={{ fontSize: '1rem', color: 'var(--mk-text-secondary)', lineHeight: 1.8, textAlign: 'center' }}>
                  From offline field capture to escrow settlement, every feature closes one gap:
                  the distance between what exporters claim and what buyers and regulators
                  can independently verify.
                </p>
              </div>
            </FadeIn>
          </div>
        </section>


        {/* ══════════════════════════════════════════════════════════
            3. WHO IT'S FOR — alternating dark case study panels
            ══════════════════════════════════════════════════════════ */}
        <section className="section-spacing" style={{ background: 'var(--color--gray-1)', paddingBottom: 0 }}>
          <div className="mk-container-lg">
            <FadeIn>
              <div className="section-header--left margin-bottom margin-xlarge">
                <span
                  className="pre-title margin-bottom margin-medium"
                  style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)' }}
                >
                  Who It&apos;s For
                </span>
                <h2 className="text-display-lg" style={{ color: '#ffffff', marginTop: '0.75rem' }}>
                  Built for every role{' '}
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>in the export chain</span>
                </h2>
              </div>
            </FadeIn>
          </div>

          {roles.map((role, i) => {
            const imgSrc = roleImages[i];
            const stats = roleStats[role.id];
            const imageLeft = i % 2 === 0;
            return (
              <FadeIn key={role.id} delay={0.05}>
                <div
                  data-testid={`card-role-${role.id}`}
                  style={{
                    background: i % 2 === 0 ? 'var(--color--gray-1)' : 'rgba(255,255,255,0.04)',
                    borderTop: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <div
                    className="mk-container-lg"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      minHeight: '480px',
                    }}
                  >
                    {/* Image panel */}
                    <div
                      style={{
                        order: imageLeft ? 0 : 1,
                        position: 'relative',
                        minHeight: '420px',
                        overflow: 'hidden',
                      }}
                    >
                      <Image
                        src={imgSrc}
                        alt={role.headline}
                        fill
                        className="object-cover"
                        sizes="50vw"
                      />
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.18)' }} />
                    </div>

                    {/* Text panel */}
                    <div
                      style={{
                        order: imageLeft ? 1 : 0,
                        padding: '3rem 3rem 2.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                          <div style={{
                            width: '2.25rem', height: '2.25rem', borderRadius: '0.5rem',
                            background: 'rgba(46,125,107,0.2)', border: '1px solid rgba(46,125,107,0.4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--mk-green-mid)', flexShrink: 0,
                          }}>
                            <role.icon className="w-4 h-4" />
                          </div>
                          <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--mk-green-mid)' }}>
                            {role.label}
                          </span>
                        </div>

                        <h3 style={{ fontSize: 'clamp(1.125rem, 2vw, 1.375rem)', fontWeight: 700, color: '#ffffff', lineHeight: 1.35, marginBottom: '1rem', maxWidth: '28ch' }}>
                          {role.headline}
                        </h3>

                        <p style={{ fontSize: '0.9375rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.75, marginBottom: '1.75rem', maxWidth: '44ch' }}>
                          {role.body}
                        </p>

                        <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '2rem' }}>
                          {role.features.map((f, j) => (
                            <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                              <span style={{
                                marginTop: '0.2rem', width: '1rem', height: '1rem', borderRadius: '50%',
                                background: 'rgba(46,125,107,0.2)', border: '1px solid var(--mk-green-mid)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                              }}>
                                <Check className="w-2.5 h-2.5" style={{ color: 'var(--mk-green-mid)' }} />
                              </span>
                              <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.55 }}>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Stat row */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderTop: '1px dashed rgba(255,255,255,0.12)', paddingTop: '1.5rem', gap: '1rem' }}>
                        {stats.map((s, j) => (
                          <div key={j}>
                            <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.45, marginBottom: '0.5rem' }}>{s.label}</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--font-display)', lineHeight: 1 }}>{s.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            );
          })}
        </section>


        {/* ══════════════════════════════════════════════════════════
            4. HOW IT WORKS — capability slider (reused from homepage)
            ══════════════════════════════════════════════════════════ */}
        <section id="how-it-works" className="section-spacing section-dark">
          <div className="mk-container-lg">
            <CapabilitySlider capabilities={workflowSteps} />
          </div>
        </section>


        {/* ══════════════════════════════════════════════════════════
            5. FIELD OPERATIONS — header strip + full-width image
            ══════════════════════════════════════════════════════════ */}
        <section className="section-spacing section-gray">
          <div className="mk-container-lg">
            {/* Two-column header strip */}
            <FadeIn>
              <div
                className="solutions-field-header"
                style={{ marginBottom: '2.5rem' }}
              >
                <div>
                  <span className="pre-title margin-bottom margin-medium" style={{ display: 'inline-flex' }}>
                    Field Operations
                  </span>
                  <h2 className="text-display-lg" style={{ color: 'var(--mk-text-primary)', marginTop: '0.75rem' }}>
                    Built for places where{' '}
                    <span className="text-mk-muted">the internet isn&apos;t reliable.</span>
                  </h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <p style={{ fontSize: '1rem', color: 'var(--mk-text-secondary)', lineHeight: 1.75, maxWidth: '44ch' }}>
                    Field agents at rural collection points — whether at a farm gate or a
                    mineral aggregation site — can log batches, register contributors, and
                    record GPS coordinates without a live connection. Data syncs automatically
                    when connectivity is restored. No gaps in your traceability record because
                    of where the source is.
                  </p>
                </div>
              </div>
            </FadeIn>

            {/* Full-width image */}
            <FadeIn delay={0.15} direction="up">
              <div style={{ borderRadius: '1.25rem', overflow: 'hidden', height: '480px', position: 'relative' }}>
                <Image
                  src="/images/farmer in field.jpg"
                  alt="Field agent registering a farm plot using the OriginTrace mobile app"
                  fill
                  className="object-cover"
                  sizes="100vw"
                />
              </div>
            </FadeIn>

            {/* Feature pills row below image */}
            <FadeIn delay={0.25}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1.75rem' }}>
                {[
                  { icon: Smartphone, text: 'Works on any smartphone' },
                  { icon: Wifi, text: 'Full offline capture, auto-sync' },
                  { icon: Shield, text: 'GPS verification & anti-fraud' },
                ].map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.5rem 1rem', borderRadius: '9999px',
                    border: '1px solid var(--mk-border)',
                    background: 'var(--mk-surface-white)',
                    fontSize: '0.875rem', color: 'var(--mk-text-secondary)',
                  }}>
                    <item.icon className="w-3.5 h-3.5" style={{ color: 'var(--mk-green)', flexShrink: 0 }} />
                    {item.text}
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </section>


        {/* ══════════════════════════════════════════════════════════
            6. FINAL CTA
            ══════════════════════════════════════════════════════════ */}
        <section className="section-spacing section-dark">
          <div className="mk-container-sm">
            <FadeIn>
              <div className="flex flex-col items-center text-center" style={{ maxWidth: '40rem', marginInline: 'auto' }}>
                <span className="pre-title margin-bottom margin-large">Get Started</span>
                <h2
                  className="text-display-lg text-mk-on-dark margin-bottom margin-medium"
                  data-testid="text-solutions-cta-headline"
                >
                  See it working against your actual export operation.
                </h2>
                <p
                  className="margin-bottom margin-xlarge-2"
                  style={{ color: 'var(--mk-text-on-dark-2)', lineHeight: 1.7, fontSize: '1.0625rem' }}
                >
                  Request a 30-minute walkthrough. We will map your current workflow and show
                  you exactly where OriginTrace fits — for your commodity, your markets,
                  your team.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/demo" className="btn-mk-primary btn-mk-lg" data-testid="button-solutions-demo">
                    Request a Demo
                    <ChevronRight className="h-5 w-5" />
                  </Link>
                  <Link href="/demo" className="btn-mk-ghost btn-mk-lg">
                    Book a 30-min walkthrough
                    <ArrowRight className="h-4 w-4" />
                  </Link>
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
