import Link from 'next/link';
import Image from 'next/image';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import { FadeIn } from '@/components/marketing/motion';
import HeroBackground from '@/components/marketing/hero-background';
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
    body: 'You source produce, arrange logistics, and manage buyers across multiple markets. OriginTrace gives you a compliance score before loading, documentation when you ship, and payment settlement when you deliver.',
    features: [
      'Pre-shipment compliance score across 5 markets simultaneously',
      'One-click export documentation — no manual assembly',
      'Milestone escrow: payment releases when shipment clears',
      'Farmer disbursement direct from the platform',
    ],
  },
  {
    id: 'cooperatives',
    label: 'Cooperative / Aggregator',
    icon: Users,
    headline: 'Hundreds of contributors. One verified traceability record.',
    body: 'You work with smallholder farmers or community collectors across multiple sites. OriginTrace helps you register every plot or site, log every collection, and generate a single verified batch record — even without internet.',
    features: [
      'GPS registration for every contributing farm plot or extraction site',
      'Offline-first batch collection — syncs when connectivity returns',
      'Bag-level traceability from source to export warehouse',
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
      'Waybill and pedigree certificate generation',
      'Shipment pipeline with 9-stage tracking',
      'Container and port manifest linkage',
      'Shared document access for buyers and inspectors',
    ],
  },
];

const workflowSteps = [
  {
    number: '01',
    title: 'Register Your Sources',
    body: 'GPS-map every farm plot, forest concession, or extraction site and register every contributor with verified identity. Your supply chain starts with verified origin — not declarations.',
    icon: MapPin,
  },
  {
    number: '02',
    title: 'Capture & Aggregate',
    body: 'Field agents log collection in real time — even without internet. Every unit is traceable to the exact source it came from. Data syncs automatically when connectivity returns.',
    icon: Factory,
  },
  {
    number: '03',
    title: 'Run a Compliance Check',
    body: 'Score your shipment against EU, UK, US, China, and UAE requirements simultaneously. Know your clearance status and resolve gaps before you book freight — not at the border.',
    icon: ShieldCheck,
  },
  {
    number: '04',
    title: 'Generate Your Documents',
    body: 'Produce your pedigree certificate, waybill, and full compliance pack from a single verified record. No more assembling files from multiple sources the night before loading.',
    icon: FileText,
  },
  {
    number: '05',
    title: 'Settle Payment',
    body: 'Your buyers pay into escrow. Funds release when the shipment is confirmed and compliance is verified. No chasing. No trust-based risk.',
    icon: Banknote,
  },
];

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
                      The Platform
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
                      We are the trust infrastructure for origin-sensitive exports —
                      connecting verified sources, compliance scoring, export documentation,
                      and payment settlement in one system built for African supply chains.
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
                  Smart{' '}
                  <span className="text-mk-muted">origin verification</span>
                  {' '}for modern{' '}
                  <span className="text-mk-muted">export chains</span>
                </h2>
                <p className="section-header__body" style={{ marginTop: '1.5rem' }}>
                  At OriginTrace, we believe proof should travel with the product. Born from the
                  compliance wave reshaping global trade — EUDR, FSMA 204, GACC — we set out
                  to replace declarations with verified data, from the first GPS point to the
                  final payment.
                </p>
              </div>
            </FadeIn>
          </div>

          {/* 3-image staggered row */}
          <div className="mk-container-lg" style={{ marginBottom: '3.5rem' }}>
            {/* Desktop */}
            <div
              className="hidden md:grid"
              style={{ gridTemplateColumns: '1fr 1.15fr 1fr', gap: '1rem', alignItems: 'center' }}
            >
              <FadeIn delay={0.1} direction="up">
                <div style={{ height: '480px', borderRadius: '1.25rem', overflow: 'hidden', backgroundImage: "url('/images/pexels-pixabay-50707.jpg')", backgroundSize: 'cover', backgroundPosition: 'left center' }} />
              </FadeIn>
              <FadeIn delay={0.2} direction="up">
                <div style={{ height: '580px', borderRadius: '1.25rem', overflow: 'hidden', backgroundImage: "url('/images/pexels-zeal-creative-studios-58866141-31283908.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
              </FadeIn>
              <FadeIn delay={0.3} direction="up">
                <div style={{ height: '480px', borderRadius: '1.25rem', overflow: 'hidden', backgroundImage: "url('/images/lagos-apapa-port.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
              </FadeIn>
            </div>

            {/* Mobile — 3-in-a-row staggered */}
            <div className="block md:hidden">
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ flex: 1, height: '160px', borderRadius: '1rem', overflow: 'hidden', backgroundImage: "url('/images/pexels-pixabay-50707.jpg')", backgroundSize: 'cover', backgroundPosition: 'left center' }} />
                <div style={{ flex: 1, height: '220px', borderRadius: '1rem', overflow: 'hidden', backgroundImage: "url('/images/pexels-zeal-creative-studios-58866141-31283908.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <div style={{ flex: 1, height: '160px', borderRadius: '1rem', overflow: 'hidden', backgroundImage: "url('/images/lagos-apapa-port.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
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
                  identity-checked, before a single bag leaves the ground.
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
            3. WHO IT'S FOR — role cards
            ══════════════════════════════════════════════════════════ */}
        <section className="section-spacing section-gray">
          <div className="mk-container-lg">
            <FadeIn>
              <div className="section-header">
                <span className="pre-title margin-bottom margin-medium">Who It&apos;s For</span>
                <h2 className="text-display-lg section-header__title">
                  Built for every role{' '}
                  <span className="text-mk-muted">in the export chain</span>
                </h2>
                <p className="section-header__body">
                  Whether you source it, aggregate it, clear it, or ship it — there is a
                  workflow built for your seat at the table.
                </p>
              </div>
            </FadeIn>

            <div className="mk-grid-2" style={{ gap: '1.5rem' }}>
              {roles.map((role, i) => (
                <FadeIn key={role.id} delay={i * 0.07}>
                  <div
                    className="mk-card h-full flex flex-col"
                    data-testid={`card-role-${role.id}`}
                    style={{ padding: '2rem' }}
                  >
                    <div className="flex items-center gap-3 margin-bottom margin-large">
                      <div className="mk-card__icon" style={{ marginBottom: 0, flexShrink: 0 }}>
                        <role.icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--mk-green)' }}>
                        {role.label}
                      </span>
                    </div>
                    <h3 className="font-bold margin-bottom margin-small" style={{ fontSize: '1.125rem', color: 'var(--mk-text-primary)', lineHeight: 1.35 }}>
                      {role.headline}
                    </h3>
                    <p className="margin-bottom margin-large" style={{ color: 'var(--mk-text-secondary)', fontSize: '0.9375rem', lineHeight: 1.7, flex: 1 }}>
                      {role.body}
                    </p>
                    <ul className="flex flex-col gap-2.5">
                      {role.features.map((f, j) => (
                        <li key={j} className="mk-list-item">
                          <span className="mk-list-item__icon">
                            <Check className="w-3 h-3" />
                          </span>
                          <span style={{ fontSize: '0.875rem', color: 'var(--mk-text-secondary)' }}>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>


        {/* ══════════════════════════════════════════════════════════
            4. HOW IT WORKS — 5-step workflow
            ══════════════════════════════════════════════════════════ */}
        <section id="how-it-works" className="section-spacing section-white">
          <div className="mk-container-lg">
            <FadeIn>
              <div className="section-header section-header--left margin-bottom margin-xlarge">
                <span
                  className="pre-title margin-bottom margin-medium"
                  style={{ background: 'transparent', border: '1px solid var(--mk-green)', color: 'var(--mk-green)' }}
                >
                  The Workflow
                </span>
                <h2 className="text-display-lg section-header__title">
                  From source to payment —{' '}
                  <span className="text-mk-muted">every step connected</span>
                </h2>
                <p className="section-header__body" style={{ textAlign: 'left', marginInline: 0 }}>
                  OriginTrace is the only platform that follows your produce all the way from
                  the source to the moment you get paid. No missing links. No compliance gaps.
                </p>
              </div>
            </FadeIn>

            <div className="relative">
              {/* Vertical connector line — desktop only */}
              <div
                className="hidden lg:block absolute"
                style={{ left: '27px', top: '28px', bottom: '28px', width: '1px', background: 'var(--mk-border)' }}
              />
              <div className="flex flex-col gap-6">
                {workflowSteps.map((step, i) => (
                  <FadeIn key={i} delay={i * 0.08}>
                    <div className="flex gap-6 lg:gap-8 items-start">
                      {/* Step number circle */}
                      <div
                        className="flex-shrink-0 flex items-center justify-center rounded-full font-bold text-sm z-10"
                        style={{
                          width: '56px',
                          height: '56px',
                          background: i === 4 ? 'var(--mk-green)' : 'var(--mk-surface-white)',
                          border: `2px solid ${i === 4 ? 'var(--mk-green)' : 'var(--mk-border)'}`,
                          color: i === 4 ? '#fff' : 'var(--mk-text-primary)',
                          fontFamily: 'var(--font-display)',
                        }}
                      >
                        {step.number}
                      </div>
                      <div
                        className="mk-card flex-1"
                        style={{ padding: '1.5rem', borderLeft: i === 4 ? '3px solid var(--mk-green)' : undefined }}
                      >
                        <div className="flex items-center gap-3 margin-bottom margin-small">
                          <step.icon className="w-4 h-4" style={{ color: 'var(--mk-green)', flexShrink: 0 }} />
                          <h3 className="font-bold" style={{ fontSize: '1rem', color: 'var(--mk-text-primary)' }}>
                            {step.title}
                            {i === 4 && (
                              <span
                                className="ml-2 text-xs font-semibold"
                                style={{ background: 'var(--mk-green-light)', color: 'var(--mk-green)', padding: '0.15rem 0.5rem', borderRadius: '9999px' }}
                              >
                                Only on OriginTrace
                              </span>
                            )}
                          </h3>
                        </div>
                        <p style={{ color: 'var(--mk-text-secondary)', fontSize: '0.9375rem', lineHeight: 1.7 }}>
                          {step.body}
                        </p>
                      </div>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>
          </div>
        </section>


        {/* ══════════════════════════════════════════════════════════
            5. FIELD OPERATIONS — offline split section
            ══════════════════════════════════════════════════════════ */}
        <section className="section-spacing section-gray">
          <div className="mk-container-lg">
            <div className="mk-technology-grid">
              <FadeIn direction="right">
                <div className="mk-technology-title-wrap">
                  <span className="pre-title margin-bottom margin-large" style={{ display: 'inline-flex' }}>
                    Field Operations
                  </span>
                  <h2 className="text-display-lg" style={{ color: 'var(--mk-text-primary)' }}>
                    Built for places where{' '}
                    <span className="text-mk-muted">the internet isn&apos;t reliable.</span>
                  </h2>
                  <p style={{ color: 'var(--mk-text-secondary)', lineHeight: 1.7, marginTop: '1.25rem', marginBottom: '2rem' }}>
                    Field agents at rural collection points can log batches, register farmers,
                    and record GPS coordinates without a live connection. Data syncs automatically
                    when connectivity is restored — no gaps in your traceability record because
                    of network coverage.
                  </p>
                  <div className="flex flex-col gap-3">
                    {[
                      { icon: Smartphone, text: 'Works on any smartphone — no app store download required' },
                      { icon: Wifi, text: 'Full offline data capture via PWA with automatic background sync' },
                      { icon: Shield, text: 'Anti-fraud protections: GPS verification and yield validation' },
                    ].map((item, i) => (
                      <div key={i} className="mk-list-item">
                        <span className="mk-list-item__icon">
                          <item.icon className="w-3.5 h-3.5" />
                        </span>
                        <span style={{ fontSize: '0.9375rem', color: 'var(--mk-text-secondary)' }}>{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>

              <FadeIn direction="left" delay={0.1}>
                <div className="mk-technology-info-wrap">
                  <div
                    className="mk-technology-image-wrap"
                    style={{
                      borderRadius: '1.25rem',
                      overflow: 'hidden',
                      aspectRatio: '4/3',
                      backgroundImage: "url('/images/farmer in field.jpg')",
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                </div>
              </FadeIn>
            </div>
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
                  <Link href="/compliance" className="btn-mk-ghost btn-mk-lg">
                    View compliance coverage
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
