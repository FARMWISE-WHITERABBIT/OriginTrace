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
  title: 'Minerals Traceability & Compliance',
  description: 'Chain-of-custody documentation for mineral exporters. OECD Due Diligence, LBMA, RMI, and EU CSRD alignment from mine to smelter.',
};

const heroStats = [
  { label: 'Framework alignment built in', value: 'OECD 5-Step' },
  { label: 'Mineral categories covered', value: '3TG+' },
  { label: 'Mine-to-smelter chain-of-custody', value: '100%' },
];

const capabilities = [
  { number: '01', title: 'Map Every Extraction Site', description: 'GPS-register every mine, pit, or artisanal extraction point with operator identity verification. Your chain-of-custody starts at the source, not the smelter gate.', iconName: 'MapPin' },
  { number: '02', title: 'Tag and Track Every Unit', description: 'Field agents tag each bag, drum, or batch at the point of extraction. Weight, mineral type, origin coordinates, and collector identity are captured — even without internet.', iconName: 'Package' },
  { number: '03', title: 'Follow the Chain Through Processing', description: 'Log every transformation: washing, sorting, concentration, and smelting. Mass balance is maintained at each stage. The chain-of-custody record is never broken.', iconName: 'Factory' },
  { number: '04', title: 'Generate Your Responsible Sourcing Pack', description: 'OECD-aligned chain-of-custody report, origin declaration, and smelter input records — from one verified record.', iconName: 'FileText' },
  { number: '05', title: 'Settle with Verified Proof', description: 'Buyers pay into escrow. Funds release when the shipment is received and chain-of-custody is confirmed. No disputes. No trust-based risk.', iconName: 'Banknote' },
];

const roles = [
  {
    id: 'asm-aggregator',
    label: 'Mining Cooperative / ASM Aggregator',
    image: '/images/pexels-kltdinusha-7450070.jpg',
    imageLeft: true,
    headline: 'Hundreds of contributors. One chain-of-custody record.',
    body: 'You aggregate production from artisanal miners across multiple sites and sell into the formal trading chain. OriginTrace registers every contributing miner and site, tags every unit at source, and generates the chain-of-custody record that formal buyers require.',
    features: [
      'GPS extraction site registration with miner KYC',
      'Unit-level tagging at point of extraction',
      'Chain-of-custody across aggregation and processing',
      'Anti-fraud weight validation per collection',
    ],
    stats: [
      { label: 'Sites registered per org', value: '400+' },
      { label: 'Offline sync success rate', value: '99.9%' },
      { label: 'Unit-level traceability', value: '100%' },
    ],
  },
  {
    id: 'mineral-exporter',
    label: 'Mineral Exporter',
    image: '/images/pexels-jan-van-der-wolf-11680885-15780139.jpg',
    imageLeft: false,
    headline: 'Responsible sourcing documentation your buyers can independently verify.',
    body: 'You purchase aggregated mineral production and export to smelters or trading houses in Europe, Asia, or the Gulf. OriginTrace gives you a responsible sourcing score, a complete chain-of-custody pack, and escrow payment settlement when the shipment is confirmed.',
    features: [
      'OECD 5-step due diligence alignment',
      'Chain-of-custody from mine to smelter',
      'Buyer escrow with automatic release on delivery',
      'Compliant with LBMA, RMI, and EU CSRD requirements',
    ],
    stats: [
      { label: 'OECD alignment', value: '5-Step' },
      { label: 'Documents from one record', value: '6+' },
      { label: 'Escrow settlement rate', value: '100%' },
    ],
  },
];

export default function MineralsPage() {
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
                  <FadeIn delay={0.1}><span className="pre-title margin-bottom margin-medium" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.7)' }}>Minerals</span></FadeIn>
                  <FadeIn delay={0.15}><h1 className="text-display-2xl margin-bottom margin-large" style={{ color: '#ffffff', fontFamily: 'var(--font-display)', maxWidth: '16ch' }}>From the mine to the smelter — with proof.</h1></FadeIn>
                  <FadeIn delay={0.2}><p className="margin-bottom margin-xlarge" style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1.0625rem)', lineHeight: 1.75, maxWidth: '40ch', color: 'rgba(255,255,255,0.62)' }}>Responsible sourcing obligations — OECD Due Diligence, EU CSRD, LBMA, RMI — have made chain-of-custody documentation a market access requirement for mineral exporters. OriginTrace maps every extraction site, tracks every unit through processing, and generates the documentation responsible buyers require.</p></FadeIn>
                  <FadeIn delay={0.3}><Link href="/demo" className="btn-mk-primary btn-mk-lg">See how it works for minerals <ChevronRight className="h-5 w-5" /></Link></FadeIn>
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
                <h2 className="text-display-lg section-header__title">The challenge isn&apos;t extraction. It&apos;s what happens between the mine and the market.</h2>
                <p className="section-header__body">Tin, tantalum, tungsten, gold, cobalt, and lithium face a growing wall of responsible sourcing requirements. Buyers in electronics, automotive, and battery supply chains now require independently verifiable chain-of-custody documentation before they&apos;ll accept delivery.</p>
              </div>
            </FadeIn>

            <div className="hidden md:grid" style={{ gridTemplateColumns: '1fr 1.15fr 1fr', gap: '1rem', alignItems: 'center', marginBottom: '3rem' }}>
              <FadeIn delay={0.1} direction="up"><div style={{ height: '480px', borderRadius: '1.25rem', overflow: 'hidden', backgroundImage: "url('/images/pexels-tomfisk-2101135.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} /></FadeIn>
              <FadeIn delay={0.22} direction="up"><div style={{ height: '640px', borderRadius: '1.25rem', overflow: 'hidden', backgroundImage: "url('/images/pexels-safi-erneste-165511538-35082155.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} /></FadeIn>
              <FadeIn delay={0.34} direction="up"><div style={{ height: '480px', borderRadius: '1.25rem', overflow: 'hidden', backgroundImage: "url('/images/pexels-castorlystock-5139206.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} /></FadeIn>
            </div>

            <FadeIn>
              <div className="solutions-twin-cols">
                <p style={{ fontSize: '1rem', color: 'var(--mk-text-secondary)', lineHeight: 1.8, textAlign: 'center' }}>Artisanal and small-scale mining is where the sourcing risk is highest and the documentation infrastructure is thinnest. OriginTrace registers every extraction site by GPS, verifies every contributing collector&apos;s identity, and links every tagged unit back to its verified origin before it enters the aggregation chain.</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="36" height="36" viewBox="0 0 28 28" fill="none" aria-hidden style={{ color: 'var(--mk-text-muted)' }}>
                    <line x1="14" y1="2" x2="14" y2="26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="3.6" y1="8" x2="24.4" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="3.6" y1="20" x2="24.4" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <p style={{ fontSize: '1rem', color: 'var(--mk-text-secondary)', lineHeight: 1.8, textAlign: 'center' }}>Responsible sourcing frameworks are multiplying. OECD Due Diligence, EU CSRD, the US Dodd-Frank Act, LBMA Good Delivery, and RMI RMAP all require origin traceability — with different audit standards. OriginTrace tracks the data each framework requires from a single collection record.</p>
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
                <h2 className="text-display-lg" style={{ color: '#ffffff', marginTop: '0.75rem' }}>Every role in the mineral export chain.</h2>
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
              <div className="flex flex-col items-center text-center" style={{ maxWidth: '40rem', marginInline: 'auto' }}>
                <span className="pre-title margin-bottom margin-large">Get Started</span>
                <h2 className="text-display-lg text-mk-on-dark margin-bottom margin-medium">Responsible sourcing documentation starts at the mine, not the desk.</h2>
                <p className="margin-bottom margin-xlarge-2" style={{ color: 'var(--mk-text-on-dark-2)', lineHeight: 1.7, fontSize: '1.0625rem' }}>We&apos;ll show you how OriginTrace builds the chain-of-custody record from first extraction to final export — for your mineral, your buyers, and your markets.</p>
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
