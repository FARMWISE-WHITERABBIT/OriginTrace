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
  title: 'Timber & Wood | OriginTrace',
  description: 'Deforestation-free proof for every timber shipment. EUDR and UK Timber Regulation compliance from concession to export.',
};

const heroStats = [
  { label: 'Major regulations covered (EUDR + UK)', value: '2' },
  { label: 'EUDR large operator deadline', value: 'Dec 2025' },
  { label: 'Concession-to-shipment traceability', value: '100%' },
];

const capabilities = [
  { number: '01', title: 'Register Every Concession', description: 'GPS-map every forest concession with legal boundary verification. Link each concession to its harvesting permits and land tenure documentation.', iconName: 'MapPin' },
  { number: '02', title: 'Log Every Harvest Event', description: 'Field teams record every felling or extraction event against the registered concession. Species, volume, and GPS coordinates are captured and linked to the harvest record.', iconName: 'Package' },
  { number: '03', title: 'Verify Legal Compliance', description: 'Cross-reference harvest records against legal harvesting permits and post-2020 deforestation satellite data. Flag any gap before the timber enters the transport chain.', iconName: 'ShieldCheck' },
  { number: '04', title: 'Generate Your Due Diligence Statement', description: 'Produce EUDR-compliant and UK-compliant due diligence statements from one verified record. No separate documentation processes.', iconName: 'FileText' },
];

const roles = [
  {
    id: 'timber-exporter',
    label: 'Timber Exporter',
    image: '/images/pexels-seunadeniyi-14371700.jpg',
    imageLeft: true,
    headline: 'Give your EU buyers the due diligence documentation they&apos;re legally required to hold.',
    headline_plain: "Give your EU buyers the due diligence documentation they're legally required to hold.",
    body: 'You operate or source from forest concessions and export timber or wood products to EU or UK buyers. OriginTrace registers your concessions, records your harvest events, and generates the DDS your buyers need to clear the shipment.',
    features: [
      'GPS concession registration with legal boundary mapping',
      'Harvest event logging with permit linkage',
      'EUDR + UK Timber Regulation DDS generation',
      'Species and volume traceability to concession level',
    ],
    stats: [
      { label: 'Regulations covered', value: '2' },
      { label: 'Concession-to-shipment traceability', value: '100%' },
      { label: 'DDS generation', value: 'On demand' },
    ],
  },
  {
    id: 'eu-importer',
    label: 'EU / UK Importer',
    image: '/images/pexels-andromeda99-36192545.jpg',
    imageLeft: false,
    headline: 'Verify your supplier&apos;s due diligence before the shipment arrives.',
    headline_plain: "Verify your supplier's due diligence before the shipment arrives.",
    body: 'You place timber or wood products on the EU or UK market and are legally required to conduct due diligence and hold records. OriginTrace gives you direct access to your supplier\'s verified concession and harvest records before the shipment arrives.',
    features: [
      'Supplier concession verification via QR',
      'Deforestation risk status per concession',
      'Harvest permit and legal compliance records',
      'DDS documentation ready for EU customs submission',
    ],
    stats: [
      { label: 'Supplier record access', value: '24hr' },
      { label: 'GPS-verified concessions', value: '100%' },
      { label: 'Compliance frameworks covered', value: '5' },
    ],
  },
];

export default function TimberPage() {
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
                  <FadeIn delay={0.1}><span className="pre-title margin-bottom margin-medium" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.7)' }}>Timber &amp; Wood</span></FadeIn>
                  <FadeIn delay={0.15}><h1 className="text-display-2xl margin-bottom margin-large" style={{ color: '#ffffff', fontFamily: 'var(--font-display)', maxWidth: '16ch' }}>Deforestation-free proof for every timber shipment.</h1></FadeIn>
                  <FadeIn delay={0.2}><p className="margin-bottom margin-xlarge" style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1.0625rem)', lineHeight: 1.75, maxWidth: '40ch', color: 'rgba(255,255,255,0.62)' }}>EUDR covers timber alongside agricultural commodities, and the UK Timber Regulation runs in parallel. OriginTrace registers every forest concession, validates harvesting against legal boundaries, and produces the due diligence statement your EU and UK importers are legally required to hold.</p></FadeIn>
                  <FadeIn delay={0.3}><Link href="/demo" className="btn-mk-primary btn-mk-lg">See how it works for timber <ChevronRight className="h-5 w-5" /></Link></FadeIn>
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
                <h2 className="text-display-lg section-header__title">The problem isn&apos;t the timber. It&apos;s proving it&apos;s legal and deforestation-free.</h2>
                <p className="section-header__body">EU and UK importers face legal liability if they cannot prove the timber they place on the market was legally harvested and not linked to deforestation. The burden of proof sits with the importer — but the evidence has to come from you.</p>
              </div>
            </FadeIn>

            <div className="hidden md:grid" style={{ gridTemplateColumns: '1fr 1.15fr 1fr', gap: '1rem', alignItems: 'center', marginBottom: '3rem' }}>
              <FadeIn delay={0.1} direction="up"><div style={{ height: '480px', borderRadius: '1.25rem', overflow: 'hidden', backgroundImage: "url('/images/pexels-seunadeniyi-14371700.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} /></FadeIn>
              <FadeIn delay={0.22} direction="up"><div style={{ height: '640px', borderRadius: '1.25rem', overflow: 'hidden', backgroundImage: "url('/images/pexels-mikhail-nilov-8332326.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} /></FadeIn>
              <FadeIn delay={0.34} direction="up"><div style={{ height: '480px', borderRadius: '1.25rem', overflow: 'hidden', backgroundImage: "url('/images/pexels-josiah-matthew-145486517-10697911.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} /></FadeIn>
            </div>

            <FadeIn>
              <div className="solutions-twin-cols">
                <p style={{ fontSize: '1rem', color: 'var(--mk-text-secondary)', lineHeight: 1.8, textAlign: 'center' }}>Forest concessions vary enormously in size, legal status, and documentation quality. OriginTrace registers every concession by GPS boundary, links each harvest event to its legal harvesting permit, and maintains a chain of custody from felling site to export port.</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="36" height="36" viewBox="0 0 28 28" fill="none" aria-hidden style={{ color: 'var(--mk-text-muted)' }}>
                    <line x1="14" y1="2" x2="14" y2="26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="3.6" y1="8" x2="24.4" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="3.6" y1="20" x2="24.4" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <p style={{ fontSize: '1rem', color: 'var(--mk-text-secondary)', lineHeight: 1.8, textAlign: 'center' }}>EUDR and the UK Timber Regulation both require due diligence — but with different submission processes and legal bases. OriginTrace generates documentation that satisfies both simultaneously from one source record, so you don&apos;t maintain two separate compliance processes.</p>
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
                <h2 className="text-display-lg" style={{ color: '#ffffff', marginTop: '0.75rem' }}>Built for timber exporters and their EU buyers.</h2>
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
                <div
                  className="mk-container-lg"
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '480px' }}
                >
                  <div style={{ order: role.imageLeft ? 0 : 1, position: 'relative', minHeight: '420px', overflow: 'hidden' }}>
                    <Image src={role.image} alt={role.headline_plain} fill className="object-cover" sizes="50vw" />
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.18)' }} />
                  </div>
                  <div style={{ order: role.imageLeft ? 1 : 0, padding: '3rem 3rem 2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--mk-green-mid)' }}>{role.label}</span>
                      </div>
                      <h3 style={{ fontSize: 'clamp(1.125rem, 2vw, 1.375rem)', fontWeight: 700, color: '#ffffff', lineHeight: 1.35, marginBottom: '1rem', maxWidth: '28ch' }}>{role.headline_plain}</h3>
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderTop: '1px dashed rgba(255,255,255,0.12)', paddingTop: '1.5rem', gap: '1rem' }}>
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
              <div className="flex flex-col items-center text-center" style={{ maxWidth: '40rem', marginInline: 'auto' }}>
                <span className="pre-title margin-bottom margin-large">Get Started</span>
                <h2 className="text-display-lg text-mk-on-dark margin-bottom margin-medium">Timber compliance that starts at the concession.</h2>
                <p className="margin-bottom margin-xlarge-2" style={{ color: 'var(--mk-text-on-dark-2)', lineHeight: 1.7, fontSize: '1.0625rem' }}>The due diligence statement your EU or UK buyer needs to submit starts with verified origin evidence from you. Let us show you how to build it in time for your next shipment.</p>
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
