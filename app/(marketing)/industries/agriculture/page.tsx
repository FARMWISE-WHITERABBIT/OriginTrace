import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import React from 'react';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import HeroBackground from '@/components/marketing/hero-background';
import { FadeIn } from '@/components/marketing/motion';
import { CapabilitySlider } from '@/components/marketing/capability-slider';
import { ChevronRight, ArrowRight, Check } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Agriculture Traceability & Compliance',
  description: 'GPS-verified farm origin, offline field collection, and multi-market compliance scoring for agricultural commodity exporters.',
};

const heroStats = [
  { label: 'EUDR commodity groups covered', value: '7' },
  { label: 'Compliance frameworks per shipment', value: '5' },
  { label: 'Traceability from plot to pedigree', value: '100%' },
];

const capabilities = [
  { number: '01', title: 'Register Every Plot', description: 'GPS-map each contributing farm with farmer identity verification. Every plot in your supply base becomes a verified source — not a declaration.', iconName: 'MapPin' },
  { number: '02', title: 'Capture at the Collection Point', description: 'Field agents log each bag or batch at collection — variety, weight, GPS point, contributing farmers. Works fully offline. Syncs automatically.', iconName: 'Package' },
  { number: '03', title: 'Check Compliance Before Loading', description: 'Run your consolidated batch against EUDR, FSMA, UK, GACC, and UAE requirements. See your clearance status and resolve any gaps before you book freight.', iconName: 'ShieldCheck' },
  { number: '04', title: 'Generate Your Export Pack', description: 'Pedigree certificate, phytosanitary waybill, due diligence statement, and farm-level traceability report — from one record, in one step.', iconName: 'FileText' },
  { number: '05', title: 'Settle with Confidence', description: 'Buyers pay into escrow. Funds release when the shipment is delivered and compliance is confirmed. Contributors are disbursed directly from the platform.', iconName: 'Banknote' },
];

const roles = [
  {
    id: 'exporter',
    label: 'Exporter',
    image: '/images/pexels-pedrofurtadoo-28903100.jpg',
    imageLeft: true,
    headline: 'Know your compliance status before you book freight.',
    body: 'You coordinate the collection, aggregation, and export of agricultural commodities from multiple cooperatives or buying agents. OriginTrace gives you a compliance score before loading, a full documentation pack when you ship, and escrow settlement when you deliver.',
    features: [
      'Pre-shipment compliance score across 5 markets',
      'One-click documentation — pedigree, waybill, DDS',
      'Buyer escrow with automatic release on delivery',
      'Contributor disbursement direct from the platform',
    ],
    stats: [
      { label: 'Markets checked simultaneously', value: '5' },
      { label: 'Documents from one record', value: '6+' },
      { label: 'Escrow settlement rate', value: '100%' },
    ],
  },
  {
    id: 'cooperative',
    label: 'Cooperative / Aggregator',
    image: '/images/pexels-jose-carlos-alexandre-2433751-17797257.jpg',
    imageLeft: false,
    headline: 'Hundreds of contributors. One verified traceability record.',
    body: 'You register smallholder farmers, run collection routes, and manage the flow of produce from hundreds of plots into a consolidated batch. OriginTrace handles farmer registration, GPS plot mapping, and unit-level collection tracking — even where there is no internet.',
    features: [
      'GPS farm registration with farmer KYC',
      'Offline-first collection logging with auto-sync',
      'Unit-level traceability from plot to warehouse',
      'Anti-fraud yield validation per collection point',
    ],
    stats: [
      { label: 'Sources registered per org', value: '400+' },
      { label: 'Offline sync success rate', value: '99.9%' },
      { label: 'Unit-level traceability', value: '100%' },
    ],
  },
  {
    id: 'compliance',
    label: 'Compliance Officer',
    image: '/images/pexels-mikhail-nilov-8332326.jpg',
    imageLeft: true,
    headline: 'Stop assembling compliance packs the night before loading.',
    body: 'You are responsible for ensuring every shipment satisfies destination market requirements. OriginTrace runs your batch against all applicable frameworks and surfaces gaps before loading — not at the border.',
    features: [
      'EUDR, FSMA 204, UK, GACC, UAE — simultaneous check',
      'Automated gap detection with resolution guidance',
      'Audit-ready dossiers on demand',
      'Document vault with expiry tracking',
    ],
    stats: [
      { label: 'Frameworks covered', value: '5' },
      { label: 'Gap detection', value: 'Real-time' },
      { label: 'Audit dossiers', value: 'On demand' },
    ],
  },
];

export default function AgriculturePage() {
  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--color--gray-8)' }}>
      <MarketingNav />

      <main>
        {/* ══════════════════════════════════════════════════════════
            1. HERO
            ══════════════════════════════════════════════════════════ */}
        <section className="mk-hero mk-hero--solutions">
          <HeroBackground videoSrc="https://sjpnqhlohgyyndxyfgvh.supabase.co/storage/v1/object/public/media/0607%20(2)(1).mp4" />
          <div className="mk-hero__overlay mk-hero__overlay--solutions" />
          <div className="mk-hero__content mk-hero__content--solutions">
            <div className="mk-container-lg" style={{ width: '100%' }}>
              <div className="hero-content-grid grid lg:grid-cols-[55fr_45fr] gap-6 lg:gap-12"
                   style={{ alignItems: 'stretch', height: '100%', minHeight: '40vh' }}>
                <div className="hero-left-col flex flex-col justify-center py-16 lg:py-8">
                  <FadeIn delay={0.1}><span className="pre-title margin-bottom margin-medium" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.7)' }}>Agriculture</span></FadeIn>
                  <FadeIn delay={0.15}><h1 className="text-display-2xl margin-bottom margin-large" style={{ color: '#ffffff', fontFamily: 'var(--font-display)', maxWidth: '16ch' }}>From farm gate to foreign market — verified.</h1></FadeIn>
                  <FadeIn delay={0.2}><p className="margin-bottom margin-xlarge" style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1.0625rem)', lineHeight: 1.75, maxWidth: '40ch', color: 'rgba(255,255,255,0.62)' }}>Agricultural exporters face the most sweeping compliance wave in a generation. EUDR alone covers seven commodity groups. OriginTrace gives you GPS-verified origin, offline field collection, and multi-market compliance scoring — before you load, not after you&apos;re rejected.</p></FadeIn>
                  <FadeIn delay={0.3}><Link href="/demo" className="btn-mk-primary btn-mk-lg">See how it works for agriculture <ChevronRight className="h-5 w-5" /></Link></FadeIn>
                </div>
                <div className="hero-right-col flex flex-col justify-end pb-0">
                  <FadeIn delay={0.5} direction="up">
                    <div className="hero-detail-wrap w-full mx-auto lg:ml-auto lg:mr-0">
                      <div className="solutions-stats-row">
                        {heroStats.map((stat, i) => (
                          <div key={i} className="solutions-stats-col" style={i < heroStats.length - 1 ? { borderRight: '1px solid var(--mk-border)' } : {}}>
                            <p style={{ fontSize: '0.6875rem', color: 'var(--mk-text-muted)', lineHeight: 1.45, marginBottom: '1rem' }}>{stat.label}</p>
                            <p style={{ fontSize: '1.75rem', color: 'var(--mk-text-primary)', fontFamily: 'var(--font-display)', fontWeight: 800, lineHeight: 1 }}>{stat.value}</p>
                          </div>
                        ))}
                      </div>
                      <img src="/images/6836fc56a91aed0e5c1c5871_hero-left-shape.svg" alt="" aria-hidden className="hero-left-decorative" width={25} height={25} />
                      <img src="/images/6836fc56293581224cd8c720_hero-right-shape.svg" alt="" aria-hidden className="hero-right-decorative" width={25} height={25} />
                    </div>
                  </FadeIn>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            2. THE CHALLENGE
            ══════════════════════════════════════════════════════════ */}
        <section className="section-spacing section-white">
          <div className="mk-container-lg">
            <FadeIn>
              <div className="section-header">
                <span className="pre-title margin-bottom margin-medium">The Challenge</span>
                <h2 className="text-display-lg section-header__title">The problem isn&apos;t growing it. It&apos;s proving where it came from.</h2>
                <p className="section-header__body">Buyers across the EU, UK, and US now require more than a certificate of origin. They need GPS coordinates, deforestation checks, farmer identity verification, and a due diligence statement before they&apos;ll clear the shipment. Most African exporters are still assembling this evidence manually — or not assembling it at all.</p>
              </div>
            </FadeIn>

            <div className="hidden md:grid" style={{ gridTemplateColumns: '1fr 1.15fr 1fr', gap: '1rem', alignItems: 'center', marginBottom: '3rem' }}>
              <FadeIn delay={0.1} direction="up"><div style={{ height: '480px', borderRadius: '1.25rem', overflow: 'hidden', backgroundImage: "url('/images/pexels-josiah-matthew-145486517-10697911.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} /></FadeIn>
              <FadeIn delay={0.22} direction="up"><div style={{ height: '640px', borderRadius: '1.25rem', overflow: 'hidden', backgroundImage: "url('/images/pexels-mikhail-nilov-8332326.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} /></FadeIn>
              <FadeIn delay={0.34} direction="up"><div style={{ height: '480px', borderRadius: '1.25rem', overflow: 'hidden', backgroundImage: "url('/images/pexels-zeal-creative-studios-58866141-31283908.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} /></FadeIn>
            </div>

            <FadeIn>
              <div className="solutions-twin-cols">
                <p style={{ fontSize: '1rem', color: 'var(--mk-text-secondary)', lineHeight: 1.8, textAlign: 'center' }}>Smallholder fragmentation is the core challenge. A single export consignment may draw from hundreds of farms across multiple collection points. Without a system that registers every plot and links every bag to its source, you cannot produce the evidence regulators require.</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="36" height="36" viewBox="0 0 28 28" fill="none" aria-hidden style={{ color: 'var(--mk-text-muted)' }}>
                    <line x1="14" y1="2" x2="14" y2="26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="3.6" y1="8" x2="24.4" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="3.6" y1="20" x2="24.4" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <p style={{ fontSize: '1rem', color: 'var(--mk-text-secondary)', lineHeight: 1.8, textAlign: 'center' }}>The compliance frameworks are converging. EUDR, FSMA 204, UK Environment Act, and China GACC all require origin traceability — but with different data requirements. OriginTrace checks against all of them simultaneously so you don&apos;t manage four separate compliance processes.</p>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            3. HOW IT WORKS — capability slider
            ══════════════════════════════════════════════════════════ */}
        <section className="section-spacing section-dark">
          <div className="mk-container-lg">
            <CapabilitySlider capabilities={capabilities} />
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            4. WHO USES IT — role panels
            ══════════════════════════════════════════════════════════ */}
        <section className="section-spacing" style={{ background: 'var(--color--gray-1)', paddingBottom: 0 }}>
          <div className="mk-container-lg">
            <FadeIn>
              <div className="section-header--left margin-bottom margin-xlarge">
                <span className="pre-title margin-bottom margin-medium" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)' }}>Who It&apos;s For</span>
                <h2 className="text-display-lg" style={{ color: '#ffffff', marginTop: '0.75rem' }}>Every role in the agricultural export chain.</h2>
              </div>
            </FadeIn>
          </div>

          {roles.map((role, i) => (
            <FadeIn key={role.id} delay={0.05}>
              <div
                style={{
                  background: i % 2 === 0 ? 'var(--color--gray-1)' : 'rgba(255,255,255,0.04)',
                  borderTop: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <div className="mk-container-lg mk-role-grid">
                  <div className="mk-role-image" style={{ order: role.imageLeft ? 0 : 1 }}>
                    <Image src={role.image} alt={role.headline} fill className="object-cover" sizes="50vw" />
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.18)' }} />
                  </div>
                  <div className="mk-role-content" style={{ order: role.imageLeft ? 1 : 0 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--mk-green-mid)' }}>{role.label}</span>
                      </div>
                      <h3 style={{ fontSize: 'clamp(1.125rem, 2vw, 1.375rem)', fontWeight: 700, color: '#ffffff', lineHeight: 1.35, marginBottom: '1rem', maxWidth: '28ch' }}>{role.headline}</h3>
                      <p style={{ fontSize: '0.9375rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.75, marginBottom: '1.75rem', maxWidth: '44ch' }}>{role.body}</p>
                      <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '2rem' }}>
                        {role.features.map((f, j) => (
                          <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                            <span style={{ marginTop: '0.2rem', width: '1rem', height: '1rem', borderRadius: '50%', background: 'rgba(46,125,107,0.2)', border: '1px solid var(--mk-green-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Check className="w-2.5 h-2.5" style={{ color: 'var(--mk-green-mid)' }} />
                            </span>
                            <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.55 }}>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mk-role-stats">
                      {role.stats.map((s, j) => (
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
          ))}
        </section>

        {/* ══════════════════════════════════════════════════════════
            5. FINAL CTA
            ══════════════════════════════════════════════════════════ */}
        <section className="section-spacing section-dark">
          <div className="mk-container-sm">
            <FadeIn>
              <div className="flex flex-col items-center text-center mk-cta-block">
                <span className="pre-title margin-bottom margin-large">Get Started</span>
                <h2 className="text-display-lg text-mk-on-dark margin-bottom margin-medium">Ready to run your first compliant shipment?</h2>
                <p className="margin-bottom margin-xlarge-2" style={{ color: 'var(--mk-text-on-dark-2)', lineHeight: 1.7, fontSize: '1.0625rem' }}>Tell us your commodity, your target markets, and your current collection setup. We&apos;ll show you exactly how OriginTrace fits your operation — in 30 minutes.</p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/demo" className="btn-mk-primary btn-mk-lg">Book a walkthrough <ChevronRight className="h-5 w-5" /></Link>
                  <Link href="/solutions" className="btn-mk-ghost btn-mk-lg">See the platform <ArrowRight className="h-4 w-4" /></Link>
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
