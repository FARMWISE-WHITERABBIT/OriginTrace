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
  title: 'Textiles | OriginTrace',
  description: 'Fibre origin traceability for forced labour compliance. UFLPA, EU CSRD, and UK Modern Slavery Act documentation for cotton and natural fibre exporters.',
};

const heroStats = [
  { label: 'Forced labour frameworks covered', value: '3' },
  { label: 'Field-to-fibre traceability', value: '100%' },
  { label: 'Markets supported', value: 'US + EU + UK' },
];

const capabilities = [
  { number: '01', title: 'Register Every Growing Area', description: 'GPS-map every cotton field or natural fibre growing area with farmer identity verification. Prove the growing region before the fibre moves to the gin.', iconName: 'MapPin' },
  { number: '02', title: 'Track Through Ginning and Processing', description: 'Log every transformation from raw fibre through ginning, spinning, and processing. Mass balance is maintained at each stage. The origin chain is never broken.', iconName: 'Factory' },
  { number: '03', title: 'Verify Against Forced Labour Requirements', description: 'Cross-reference growing region data against UFLPA-flagged regions and forced labour risk databases. Surface issues before the bale ships.', iconName: 'ShieldCheck' },
  { number: '04', title: 'Generate Your Origin Documentation', description: 'Verified growing region records, chain-of-custody documentation, and forced labour due diligence evidence — from one verified record for all three markets.', iconName: 'FileText' },
];

const roles = [
  {
    id: 'textile-exporter',
    label: 'Textile Exporter',
    image: '/images/pexels-seunadeniyi-14371700.jpg',
    imageLeft: true,
    headline: "Give your US and EU buyers the verified origin evidence they need to clear imports.",
    body: 'You source raw fibre, process it through ginning or spinning, and export to brands or manufacturers in the US, EU, or UK. OriginTrace builds the verified origin record your buyers need to rebut the UFLPA presumption and satisfy EU CSRD requirements.',
    features: [
      'GPS growing region registration with farmer KYC',
      'Field-to-fibre tracking through ginning and processing',
      'UFLPA rebuttal evidence package',
      'EU CSRD and UK Modern Slavery Act documentation',
    ],
    stats: [
      { label: 'Frameworks covered', value: '3' },
      { label: 'Field-to-fibre traceability', value: '100%' },
      { label: 'Evidence package', value: 'On demand' },
    ],
  },
  {
    id: 'brand-importer',
    label: 'Brand / Importer',
    image: '/images/pexels-stephanefabricebass-10319259.jpg',
    imageLeft: false,
    headline: "Verify your supplier's growing region before the shipment reaches customs.",
    body: "You source textile inputs from Africa and are required to demonstrate that your supply chain is free from forced labour. OriginTrace gives you access to your supplier's verified growing region records before the goods arrive — so customs clearance isn't a surprise.",
    features: [
      'Supplier growing region verification via QR',
      'Forced labour risk status per region',
      'Chain-of-custody from field to finished bale',
      'Evidence package ready for US CBP submission',
    ],
    stats: [
      { label: 'Supplier record access', value: '24hr' },
      { label: 'GPS-verified growing areas', value: '100%' },
      { label: 'Rebuttal evidence ready', value: 'UFLPA' },
    ],
  },
];

export default function TextilesPage() {
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
                  <FadeIn delay={0.1}><span className="pre-title margin-bottom margin-medium" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.7)' }}>Textiles</span></FadeIn>
                  <FadeIn delay={0.15}><h1 className="text-display-2xl margin-bottom margin-large" style={{ color: '#ffffff', fontFamily: 'var(--font-display)', maxWidth: '16ch' }}>Fibre origin traceability for forced labour compliance.</h1></FadeIn>
                  <FadeIn delay={0.2}><p className="margin-bottom margin-xlarge" style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1.0625rem)', lineHeight: 1.75, maxWidth: '40ch', color: 'rgba(255,255,255,0.62)' }}>Cotton and natural fibres face growing forced labour due diligence requirements — US UFLPA, EU CSRD, UK Modern Slavery Act. OriginTrace traces fibre origin from the growing region through ginning and processing, giving buyers the verified sourcing data they need to clear imports.</p></FadeIn>
                  <FadeIn delay={0.3}><Link href="/demo" className="btn-mk-primary btn-mk-lg">See how it works for textiles <ChevronRight className="h-5 w-5" /></Link></FadeIn>
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
                <h2 className="text-display-lg section-header__title">The problem isn&apos;t the fabric. It&apos;s proving where the fibre came from.</h2>
                <p className="section-header__body">The US Uyghur Forced Labor Prevention Act creates a rebuttable presumption that goods from certain regions were made with forced labour. Proving otherwise requires verified origin traceability back to the growing region — not a supplier declaration.</p>
              </div>
            </FadeIn>

            <div className="hidden md:grid" style={{ gridTemplateColumns: '1fr 1.15fr 1fr', gap: '1rem', alignItems: 'center', marginBottom: '3rem' }}>
              <FadeIn delay={0.1} direction="up"><div style={{ height: '480px', borderRadius: '1.25rem', overflow: 'hidden', backgroundImage: "url('/images/pexels-stephanefabricebass-10319259.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} /></FadeIn>
              <FadeIn delay={0.22} direction="up"><div style={{ height: '640px', borderRadius: '1.25rem', overflow: 'hidden', backgroundImage: "url('/images/pexels-seunadeniyi-14371700.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} /></FadeIn>
              <FadeIn delay={0.34} direction="up"><div style={{ height: '480px', borderRadius: '1.25rem', overflow: 'hidden', backgroundImage: "url('/images/pexels-andromeda99-36192545.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} /></FadeIn>
            </div>

            <FadeIn>
              <div className="solutions-twin-cols">
                <p style={{ fontSize: '1rem', color: 'var(--mk-text-secondary)', lineHeight: 1.8, textAlign: 'center' }}>Cotton growing regions are concentrated in areas flagged under forced labour due diligence requirements. Without GPS-verified growing region data and verified farmer identity records, your buyers cannot clear the shipment under UFLPA — regardless of what the certificate says.</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="36" height="36" viewBox="0 0 28 28" fill="none" aria-hidden style={{ color: 'var(--mk-text-muted)' }}>
                    <line x1="14" y1="2" x2="14" y2="26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="3.6" y1="8" x2="24.4" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="3.6" y1="20" x2="24.4" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <p style={{ fontSize: '1rem', color: 'var(--mk-text-secondary)', lineHeight: 1.8, textAlign: 'center' }}>EU CSRD and the UK Modern Slavery Act add layers of supply chain transparency requirements beyond UFLPA. OriginTrace builds the verified origin record that satisfies all three from a single data collection process — so your buyers have what they need for every market.</p>
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
                <h2 className="text-display-lg" style={{ color: '#ffffff', marginTop: '0.75rem' }}>Built for textile exporters and their compliance-sensitive buyers.</h2>
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
                <h2 className="text-display-lg text-mk-on-dark margin-bottom margin-medium">Fibre origin traceability that satisfies US customs.</h2>
                <p className="margin-bottom margin-xlarge-2" style={{ color: 'var(--mk-text-on-dark-2)', lineHeight: 1.7, fontSize: '1.0625rem' }}>UFLPA compliance requires verified origin data that no supplier declaration can provide. Let us show you how OriginTrace builds the evidence package your buyers need — for your fibre, your suppliers, your markets.</p>
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
