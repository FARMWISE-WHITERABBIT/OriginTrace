import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import HeroBackground from '@/components/marketing/hero-background';
import { FadeIn } from '@/components/marketing/motion';
import { FaqSection } from '@/components/marketing/faq-section';
import { CapabilitySlider } from '@/components/marketing/capability-slider';
import { ChevronRight, Globe, Package, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'UAE Import Compliance',
  description:
    'UAE ESMA standards and origin-of-goods requirements apply to all agricultural imports. OriginTrace builds the verified origin record UAE authorities require before Jebel Ali arrival.',
};

const stats = [
  { label: 'UAE port clearance risk without origin docs', value: 'High' },
  { label: 'ESMA food safety standard alignment', value: '100%' },
  { label: 'Origin verification depth', value: 'Farm level' },
];

const capabilities = [
  {
    number: '01',
    title: 'Establish Verified Farm Origin',
    description:
      'Every contributing farm is GPS-registered with verified farmer identity before any collection begins. Your UAE origin declaration starts with independently verified farm-level data.',
    iconName: 'MapPin',
  },
  {
    number: '02',
    title: 'Capture Collection with Traceability',
    description:
      'Every collection event is logged in real time, linking each batch back to its registered origin. The evidence chain is built as collection happens — not assembled at the export stage.',
    iconName: 'Package',
  },
  {
    number: '03',
    title: 'Score Against UAE Import Requirements',
    description:
      'OriginTrace checks your shipment against UAE customs and ESMA food safety documentation requirements before you finalise your shipping plan.',
    iconName: 'ShieldCheck',
  },
  {
    number: '04',
    title: 'Generate UAE-Compliant Documents',
    description:
      'Produce your origin certificate, phytosanitary documentation, and ESMA-aligned food safety records from one verified shipment record.',
    iconName: 'FileText',
  },
  {
    number: '05',
    title: 'Settle with Confidence',
    description:
      'Buyers in Dubai pay into escrow. Funds release when the shipment clears UAE customs and is confirmed received. No payment disputes on documentation grounds.',
    iconName: 'Factory',
  },
];

const timeline = [
  { date: 'ESMA', event: 'UAE food safety standards authority', active: false },
  { date: 'Jebel Ali', event: 'Primary port of entry, strict documentation checks', active: true },
  { date: 'GCC', event: 'Re-export requirements mirror UAE origin standards', active: false },
  { date: '2024+', event: 'Increasing ESMA enforcement on undocumented origin', active: false },
  { date: 'Now', event: 'Origin documentation required before vessel departure', active: false },
];

export default function UAECompliancePage() {
  return (
    <>
      <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--color--gray-8)' }}>
        <MarketingNav />

        <main>

          {/* ── HERO ─────────────────────────────────────────────── */}
          <section className="mk-hero mk-hero--solutions">
            <HeroBackground videoSrc="https://sjpnqhlohgyyndxyfgvh.supabase.co/storage/v1/object/public/media/0607%20(2)(1).mp4" />
            <div className="mk-hero__overlay mk-hero__overlay--solutions" />
            <div className="mk-hero__content mk-hero__content--solutions">
              <div className="mk-container-lg" style={{ width: '100%' }}>
                <div
                  className="hero-content-grid grid lg:grid-cols-[55fr_45fr] gap-6 lg:gap-12"
                  style={{ alignItems: 'stretch', height: '100%', minHeight: '40vh' }}
                >
                  <div className="hero-left-col flex flex-col justify-center py-16 lg:py-8">
                    <FadeIn delay={0.1}>
                      <span
                        className="pre-title margin-bottom margin-medium"
                        style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.7)' }}
                      >
                        UAE Compliance
                      </span>
                    </FadeIn>
                    <FadeIn delay={0.15}>
                      <h1
                        className="text-display-2xl margin-bottom margin-large"
                        style={{ color: '#ffffff', fontFamily: 'var(--font-display)', maxWidth: '16ch' }}
                      >
                        UAE import compliance — origin verified before Dubai port arrival.
                      </h1>
                    </FadeIn>
                    <FadeIn delay={0.2}>
                      <p
                        className="margin-bottom margin-xlarge"
                        style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1.0625rem)', lineHeight: 1.75, maxWidth: '40ch', color: 'rgba(255,255,255,0.62)' }}
                      >
                        The UAE applies ESMA food safety standards and origin-of-goods requirements to agricultural imports. Shipments without documented origin traceability face delays, inspection, or rejection at Jebel Ali and other UAE ports of entry. OriginTrace builds the verified origin record UAE authorities require.
                      </p>
                    </FadeIn>
                    <FadeIn delay={0.3}>
                      <Link href="/demo" className="btn-mk-primary btn-mk-lg">
                        See UAE compliance in action <ChevronRight className="h-5 w-5" />
                      </Link>
                    </FadeIn>
                  </div>
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


          {/* ── WHO MUST COMPLY ──────────────────────────────────── */}
          <section className="section-spacing section-white">
            <div className="mk-container-lg">
              <FadeIn>
                <div className="section-header">
                  <span className="pre-title margin-bottom margin-medium">Who Must Comply</span>
                  <h2 className="text-display-lg">Three types of operator with UAE obligations.</h2>
                </div>
              </FadeIn>

              <FadeIn delay={0.1}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }} className="eudr-who-grid">
                  <div className="mk-card" style={{ padding: '2rem' }}>
                    <div className="mk-card__icon" style={{ marginBottom: '1rem' }}>
                      <Globe className="h-6 w-6" style={{ color: 'var(--mk-green)' }} />
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--mk-text-primary)', marginBottom: '0.5rem' }}>Agricultural Exporters to UAE</h3>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--mk-text-secondary)', lineHeight: 1.7 }}>
                      Exporters shipping food and agricultural commodities into the UAE — including cocoa products, coffee, sesame, cashew, and dried goods — must provide origin documentation acceptable to UAE customs and ESMA.
                    </p>
                  </div>

                  <div className="mk-card" style={{ padding: '2rem' }}>
                    <div className="mk-card__icon" style={{ marginBottom: '1rem' }}>
                      <Package className="h-6 w-6" style={{ color: 'var(--mk-green)' }} />
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--mk-text-primary)', marginBottom: '0.5rem' }}>Re-export Traders</h3>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--mk-text-secondary)', lineHeight: 1.7 }}>
                      The UAE serves as a major re-export hub for African agricultural commodities into Asia and the GCC. Re-exporters require documented chain-of-custody to satisfy both UAE and onward destination requirements.
                    </p>
                  </div>

                  <div className="mk-card" style={{ padding: '2rem' }}>
                    <div className="mk-card__icon" style={{ marginBottom: '1rem' }}>
                      <ShieldCheck className="h-6 w-6" style={{ color: 'var(--mk-green)' }} />
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--mk-text-primary)', marginBottom: '0.5rem' }}>UAE Importers and Distributors</h3>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--mk-text-secondary)', lineHeight: 1.7 }}>
                      UAE-based importers and distributors sourcing agricultural commodities from Africa face ESMA compliance obligations and increasing buyer pressure for verified farm-level origin.
                    </p>
                  </div>
                </div>
              </FadeIn>
            </div>
          </section>


          {/* ── HOW ORIGINTRACE HELPS (CapabilitySlider) ─────────── */}
          <section className="section-spacing section-dark">
            <div className="mk-container-lg">
              <FadeIn>
                <div className="section-header" style={{ marginBottom: '3rem' }}>
                  <span className="pre-title margin-bottom margin-medium" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)' }}>How OriginTrace Helps</span>
                  <h2 className="text-display-lg" style={{ color: '#ffffff' }}>Built for every step of UAE compliance.</h2>
                </div>
              </FadeIn>
            </div>
            <CapabilitySlider capabilities={capabilities} />
          </section>


          {/* ── TIMELINE ─────────────────────────────────────────── */}
          <section
            className="section-spacing"
            style={{ background: 'var(--color--gray-7)', borderRadius: '2rem 2rem 0 0', marginTop: '-2rem', position: 'relative', zIndex: 1 }}
          >
            <div className="mk-container-lg">
              <FadeIn>
                <div className="section-header">
                  <span className="pre-title margin-bottom margin-medium">Key Dates</span>
                  <h2 className="text-display-lg">UAE import compliance — what matters now.</h2>
                </div>
              </FadeIn>

              <FadeIn delay={0.1}>
                <div className="mk-timeline-strip">
                  {timeline.map((item, i) => (
                    <div
                      key={i}
                      className={`mk-timeline-item${item.active ? ' mk-timeline-item--active' : ''}`}
                      style={{ borderLeft: item.active ? '2px solid var(--mk-green)' : '1px solid var(--mk-border)' }}
                    >
                      <p className="mk-timeline-year">{item.date}</p>
                      <p className="mk-timeline-label">{item.event}</p>
                    </div>
                  ))}
                </div>
              </FadeIn>
            </div>
          </section>


          {/* ── FAQ SECTION ──────────────────────────────────────── */}
          <FaqSection />


          {/* ── FINAL CTA ────────────────────────────────────────── */}
          <section className="section-spacing section-dark">
            <div className="mk-container-sm">
              <FadeIn>
                <div className="flex flex-col items-center text-center" style={{ maxWidth: '40rem', marginInline: 'auto' }}>
                  <span className="pre-title margin-bottom margin-large">Get Started</span>
                  <h2 className="text-display-lg text-mk-on-dark margin-bottom margin-medium">
                    UAE customs won&apos;t wait for documentation that should have been built at the farm.
                  </h2>
                  <p className="margin-bottom margin-xlarge-2" style={{ color: 'var(--mk-text-on-dark-2)', lineHeight: 1.7, fontSize: '1.0625rem' }}>
                    We&apos;ll show you how OriginTrace prepares your origin documentation before you book freight — so your shipment clears Jebel Ali without delays.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link href="/demo" className="btn-mk-primary btn-mk-lg">
                      Book a walkthrough <ChevronRight className="h-5 w-5" />
                    </Link>
                    <Link href="/compliance" className="btn-mk-ghost btn-mk-lg">
                      See full compliance coverage
                    </Link>
                  </div>
                </div>
              </FadeIn>
            </div>
          </section>

        </main>

        <MarketingFooter />
      </div>
    </>
  );
}
