import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import HeroBackground from '@/components/marketing/hero-background';
import { FadeIn } from '@/components/marketing/motion';
import { FaqSection } from '@/components/marketing/faq-section';
import { CapabilitySlider } from '@/components/marketing/capability-slider';
import { ChevronRight, Globe, Factory, Package } from 'lucide-react';

export const metadata: Metadata = {
  title: 'China GACC Compliance',
  description:
    'China GACC registration requires farm-level origin traceability before your vessel departs. OriginTrace builds the record GACC requires for overseas food and agricultural exporters.',
};

const stats = [
  { label: 'GACC-registered commodity categories', value: '18+' },
  { label: 'Clearance without registration', value: 'Impossible' },
  { label: 'Farm-to-port traceability', value: '100%' },
];

const capabilities = [
  {
    number: '01',
    title: 'Register Every Source Farm',
    description:
      'Every contributing farm plot is GPS-mapped and every farmer registered with verified identity. Your GACC traceability record starts at the point of harvest — not at the processing gate.',
    iconName: 'MapPin',
  },
  {
    number: '02',
    title: 'Track Every Collection Event',
    description:
      'Field agents log every collection in real time, linking each batch back to its registered farm of origin. Offline capture ensures no gap in the traceability chain.',
    iconName: 'Package',
  },
  {
    number: '03',
    title: 'Log Processing and Transformation',
    description:
      'Every processing step — drying, sorting, grading — is logged with input weights and output records. Your farm-to-export traceability chain is unbroken.',
    iconName: 'Factory',
  },
  {
    number: '04',
    title: 'Score Against GACC Requirements',
    description:
      'OriginTrace checks your shipment against GACC registration traceability requirements before you book freight. Gaps are identified and resolved before loading.',
    iconName: 'ShieldCheck',
  },
  {
    number: '05',
    title: 'Generate GACC-Ready Documentation',
    description:
      'Produce your traceability report, origin declaration, and farm-level support documentation in the format GACC-registered exporters require for submission.',
    iconName: 'FileText',
  },
];

const timeline = [
  { date: '2021', event: 'GACC Decree 248/249 enacted', active: false },
  { date: 'Jan 2022', event: 'Decree 248/249 took effect', active: false },
  { date: '2022–23', event: 'Enforcement tightening, rejected shipments increase', active: false },
  { date: '2024+', event: 'Full traceability documentation expected', active: true },
  { date: 'Ongoing', event: 'Annual registration renewal required', active: false },
];

export default function ChinaCompliancePage() {
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
                        China Compliance
                      </span>
                    </FadeIn>
                    <FadeIn delay={0.15}>
                      <h1
                        className="text-display-2xl margin-bottom margin-large"
                        style={{ color: '#ffffff', fontFamily: 'var(--font-display)', maxWidth: '16ch' }}
                      >
                        GACC registration and origin compliance — before your vessel departs.
                      </h1>
                    </FadeIn>
                    <FadeIn delay={0.2}>
                      <p
                        className="margin-bottom margin-xlarge"
                        style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1.0625rem)', lineHeight: 1.75, maxWidth: '40ch', color: 'rgba(255,255,255,0.62)' }}
                      >
                        China&apos;s General Administration of Customs requires overseas food and agricultural exporters to be registered on the GACC system before their goods can clear Chinese customs. Origin traceability is a registration prerequisite. OriginTrace builds the farm-level record GACC requires.
                      </p>
                    </FadeIn>
                    <FadeIn delay={0.3}>
                      <Link href="/demo" className="btn-mk-primary btn-mk-lg">
                        See China compliance in action <ChevronRight className="h-5 w-5" />
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
                  <h2 className="text-display-lg">Three types of operator with GACC obligations.</h2>
                </div>
              </FadeIn>

              <FadeIn delay={0.1}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }} className="eudr-who-grid">
                  <div className="mk-card" style={{ padding: '2rem' }}>
                    <div className="mk-card__icon" style={{ marginBottom: '1rem' }}>
                      <Globe className="h-6 w-6" style={{ color: 'var(--mk-green)' }} />
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--mk-text-primary)', marginBottom: '0.5rem' }}>Agricultural Exporters to China</h3>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--mk-text-secondary)', lineHeight: 1.7 }}>
                      Any exporter shipping food or agricultural commodities to China — including cocoa, coffee, sesame, cashew, and other processed agricultural goods — must hold valid GACC registration.
                    </p>
                  </div>

                  <div className="mk-card" style={{ padding: '2rem' }}>
                    <div className="mk-card__icon" style={{ marginBottom: '1rem' }}>
                      <Factory className="h-6 w-6" style={{ color: 'var(--mk-green)' }} />
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--mk-text-primary)', marginBottom: '0.5rem' }}>Processing Facilities</h3>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--mk-text-secondary)', lineHeight: 1.7 }}>
                      Processing and packaging facilities handling goods destined for the Chinese market must maintain documented traceability from raw material receipt to finished goods dispatch.
                    </p>
                  </div>

                  <div className="mk-card" style={{ padding: '2rem' }}>
                    <div className="mk-card__icon" style={{ marginBottom: '1rem' }}>
                      <Package className="h-6 w-6" style={{ color: 'var(--mk-green)' }} />
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--mk-text-primary)', marginBottom: '0.5rem' }}>Cooperatives and Aggregators</h3>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--mk-text-secondary)', lineHeight: 1.7 }}>
                      Cooperatives and aggregation intermediaries that supply to GACC-registered exporters need origin traceability documentation that satisfies the upstream registration requirement.
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
                  <h2 className="text-display-lg" style={{ color: '#ffffff' }}>Built for every step of GACC compliance.</h2>
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
                  <h2 className="text-display-lg">The GACC compliance timeline.</h2>
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
                    GACC compliance starts with the farmer, not the freight forwarder.
                  </h2>
                  <p className="margin-bottom margin-xlarge-2" style={{ color: 'var(--mk-text-on-dark-2)', lineHeight: 1.7, fontSize: '1.0625rem' }}>
                    We&apos;ll show you how OriginTrace builds the farm-level traceability record that GACC registration requires — before your vessel is booked.
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
