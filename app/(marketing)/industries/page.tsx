import Link from 'next/link';
import type { Metadata } from 'next';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import { FadeIn } from '@/components/marketing/motion';
import HeroBackground from '@/components/marketing/hero-background';
import { CapabilitySlider } from '@/components/marketing/capability-slider';
import { ArrowRight, Mail } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Industries — Supply Chain Traceability by Sector',
  description:
    'OriginTrace serves exporters and processors across agriculture, timber, minerals, and textiles. See how supply chain traceability and compliance works for your industry.',
  alternates: { canonical: 'https://origintrace.trade/industries' },
};

/* ─── DATA ─────────────────────────────────────────────────────────── */

const stats = [
  { label: 'Commodity sectors covered', value: '4' },
  { label: 'Compliance markets checked simultaneously', value: '5' },
  { label: 'Countries with active requirements', value: '40+' },
];

const industryPanels = [
  {
    href: '/industries/agriculture',
    title: 'Agriculture',
    gradient: 'linear-gradient(135deg, #1F5F52, #2E7D6B)',
    description:
      'Agricultural exporters face the most sweeping compliance wave in a generation. EUDR alone covers seven commodity groups. OriginTrace gives you GPS-verified origin, offline field collection, and multi-market compliance scoring.',
    tags: ['EUDR', 'FSMA 204', 'GACC', 'GPS Traceability'],
  },
  {
    href: '/industries/minerals',
    title: 'Minerals',
    gradient: 'linear-gradient(135deg, #1a2f2f, #2d4a4a)',
    description:
      'Responsible sourcing obligations have made chain-of-custody documentation a market access requirement. OriginTrace maps every extraction site, tracks every unit through processing, and generates the documentation responsible buyers require.',
    tags: ['OECD Due Diligence', 'EU CSRD', '3TG+', 'Chain of Custody'],
  },
  {
    href: '/industries/timber',
    title: 'Timber & Wood',
    gradient: 'linear-gradient(135deg, #3d2b1f, #5c4033)',
    description:
      'EUDR covers timber alongside agricultural commodities, and the UK Timber Regulation runs in parallel. OriginTrace registers every forest concession and produces the due diligence statement your EU and UK importers are legally required to hold.',
    tags: ['EUDR', 'FLEGT', 'UK Timber Regulation', 'CoC'],
  },
  {
    href: '/industries/textiles',
    title: 'Textiles',
    gradient: 'linear-gradient(135deg, #2a2040, #3d3060)',
    description:
      'Cotton and natural fibres face growing forced labour due diligence requirements. OriginTrace traces fibre origin from growing region through ginning and processing, giving buyers the verified sourcing data they need.',
    tags: ['UFLPA', 'EU CSRD', 'UK Modern Slavery Act', 'Origin Verification'],
  },
];

const steps = [
  {
    number: '01',
    title: 'Map Your Sources',
    description:
      'GPS-register every contributing farm, concession, or extraction site before collection begins. Origin starts here, not at the warehouse.',
    iconName: 'MapPin' as const,
  },
  {
    number: '02',
    title: 'Log Collection in the Field',
    description:
      'Field agents capture every batch in real time, even without internet. Each unit is linked to its verified source automatically.',
    iconName: 'Package' as const,
  },
  {
    number: '03',
    title: 'Score Against Your Markets',
    description:
      'Run your shipment against all relevant frameworks before you book freight. One check. Five markets. No surprises at the border.',
    iconName: 'ShieldCheck' as const,
  },
  {
    number: '04',
    title: 'Generate Your Documents',
    description:
      'Pedigree certificate, waybill, DDS, chain-of-custody report — all from one verified record. No assembly required.',
    iconName: 'FileText' as const,
  },
];

/* ─── PAGE ─────────────────────────────────────────────────────────── */

export default function IndustriesPage() {
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
              <div
                className="hero-content-grid grid lg:grid-cols-[55fr_45fr] gap-6 lg:gap-12"
                style={{ alignItems: 'stretch', height: '100%', minHeight: '40vh' }}
              >
                {/* LEFT */}
                <div className="hero-left-col flex flex-col justify-center py-16 lg:py-8">
                  <FadeIn direction="right">
                    <span className="pre-title margin-bottom margin-medium">Industries</span>
                    <h1
                      className="text-display-xl margin-bottom margin-medium"
                      style={{ color: 'var(--mk-text-on-dark)' }}
                    >
                      Traceability built for what Africa exports.
                    </h1>
                    <p
                      className="margin-bottom margin-xlarge"
                      style={{ color: 'var(--mk-text-on-dark-2)', fontSize: '1.0625rem', lineHeight: 1.7 }}
                    >
                      From cocoa farms in Côte d&apos;Ivoire to gold mines in Ghana — OriginTrace was
                      built for the commodities African exporters actually trade, and the markets
                      their buyers actually require proof for.
                    </p>
                    <Link href="/solutions" className="btn-mk-primary btn-mk-lg">
                      Explore your sector
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </FadeIn>
                </div>

                {/* RIGHT — stats card pinned to bottom */}
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
                            <p style={{ fontSize: '1.75rem', color: 'var(--mk-text-primary)', fontFamily: 'var(--font-display)', fontWeight: 800, lineHeight: 1 }}>
                              {stat.value}
                            </p>
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
            2. INDUSTRY PANELS
            ══════════════════════════════════════════════════════════ */}
        <section className="section-spacing" style={{ background: 'var(--mk-surface-white)' }}>
          <div className="mk-container-lg">
            <FadeIn>
              <div className="section-header">
                <span className="pre-title margin-bottom margin-medium">Sectors</span>
                <h2 className="text-display-lg" style={{ color: 'var(--mk-text-primary)' }}>
                  Built for the commodities that matter.
                </h2>
              </div>
            </FadeIn>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '3rem' }}>
              {industryPanels.map((panel, i) => (
                <FadeIn key={panel.href} delay={i * 0.08} direction="up">
                  <Link href={panel.href} style={{ textDecoration: 'none' }}>
                    <div
                      style={{
                        border: '1px solid var(--mk-border)',
                        borderRadius: '1rem',
                        overflow: 'hidden',
                        display: 'flex',
                        height: '220px',
                        transition: 'box-shadow 0.2s ease',
                      }}
                      className="group"
                    >
                      {/* Image area — gradient placeholder */}
                      <div
                        style={{
                          width: '40%',
                          background: panel.gradient,
                          flexShrink: 0,
                        }}
                      />
                      {/* Text area */}
                      <div
                        style={{
                          width: '60%',
                          padding: '2rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          background: 'var(--mk-surface-white)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                          <h3
                            style={{
                              fontSize: '1.125rem',
                              fontWeight: 700,
                              color: 'var(--mk-text-primary)',
                              fontFamily: 'var(--font-display)',
                            }}
                          >
                            {panel.title}
                          </h3>
                          <span
                            style={{
                              fontSize: '1.125rem',
                              color: 'var(--mk-text-muted)',
                              transition: 'transform 0.2s ease',
                            }}
                          >
                            →
                          </span>
                        </div>
                        <p
                          style={{
                            fontSize: '0.9rem',
                            color: 'var(--mk-text-secondary)',
                            lineHeight: 1.65,
                            marginBottom: '1rem',
                          }}
                        >
                          {panel.description}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                          {panel.tags.map((tag) => (
                            <span
                              key={tag}
                              style={{
                                border: '1px solid var(--mk-border)',
                                borderRadius: '9999px',
                                padding: '0.2rem 0.6rem',
                                fontSize: '0.625rem',
                                fontWeight: 600,
                                color: 'var(--mk-text-muted)',
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Link>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            3. CAPABILITY SLIDER
            ══════════════════════════════════════════════════════════ */}
        <section className="section-spacing section-dark">
          <div className="mk-container-lg">
            <CapabilitySlider capabilities={steps} />
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            4. FINAL CTA
            ══════════════════════════════════════════════════════════ */}
        <section className="section-spacing section-dark">
          <div className="mk-container-sm">
            <FadeIn>
              <div className="flex flex-col items-center text-center mk-cta-block">
                <span className="pre-title margin-bottom margin-medium">Get Started</span>
                <h2
                  className="text-display-lg text-mk-on-dark margin-bottom margin-medium"
                >
                  Don&apos;t see your exact commodity?
                </h2>
                <p
                  className="margin-bottom margin-xlarge-2"
                  style={{ color: 'var(--mk-text-on-dark-2)', lineHeight: 1.7, fontSize: '1.0625rem' }}
                >
                  OriginTrace is built on a flexible source-registration and batch-tracking engine.
                  If you export it from Africa and someone at the other end requires proof, we can
                  likely support it. Talk to us.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/demo" className="btn-mk-primary btn-mk-lg">
                    Book a walkthrough
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <a href="mailto:hello@origintrace.trade" className="btn-mk-ghost btn-mk-lg">
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
