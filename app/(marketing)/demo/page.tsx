import Link from 'next/link';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import { FadeIn } from '@/components/marketing/motion';
import { LiveAgentIndicator } from '@/components/marketing/trace-animation';
import { DemoFormWidget } from '@/components/marketing/demo-form';
import HeroBackground from '@/components/marketing/hero-background';
import { Shield, MapPin, FileText, Check, ArrowRight, Mail } from 'lucide-react';

/* ─── DATA ─────────────────────────────────────────────────────────── */

const stats = [
  { label: 'Average response time', value: '< 24 hrs' },
  { label: 'Focused, no fluff', value: '30 min' },
  { label: 'Active pilot region', value: 'West Africa' },
];

const demoFeatures = [
  {
    Icon: Shield,
    title: 'Compliance Assessment',
    body: 'We map your export destinations against EUDR, FSMA 204, UK, China GACC, and UAE ESMA requirements — and identify exactly what documentation you are missing.',
  },
  {
    Icon: MapPin,
    title: 'Live Platform Walkthrough',
    body: 'We walk through the platform against a real commodity and trade corridor, not a scripted demo. You see the traceability record, the compliance score, and the document output.',
  },
  {
    Icon: FileText,
    title: 'Pilot Onboarding',
    body: "If it's a fit, we scope a pilot. We'll tell you what data we need, how long registration takes, and what your first compliant shipment looks like on the platform.",
  },
];

const bullets = [
  "No sales pressure — if it's not the right fit, we'll say so",
  'We cover agriculture and mineral supply chains',
  'Pilot spots are limited to West Africa for now',
  'Sessions run Mon–Fri, 9am–6pm WAT',
];

/* ─── PAGE ─────────────────────────────────────────────────────────── */

export default function DemoPage() {
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
                    <span className="pre-title margin-bottom margin-medium">Book a Walkthrough</span>
                    <h1
                      className="text-display-xl margin-bottom margin-medium"
                      style={{ color: 'var(--mk-text-on-dark)' }}
                    >
                      See OriginTrace working against your actual export operation.
                    </h1>
                    <p
                      className="margin-bottom margin-xlarge"
                      style={{ color: 'var(--mk-text-on-dark-2)', fontSize: '1.0625rem', lineHeight: 1.7 }}
                    >
                      We don&apos;t do generic demos. In 30 minutes we map your commodity, your markets,
                      and your current workflow — then show you exactly where OriginTrace closes the gaps.
                    </p>
                    <Link href="/demo" className="btn-mk-primary btn-mk-lg">
                      Book your 30-minute walkthrough
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
            2. WHAT TO EXPECT — 3 cards
            ══════════════════════════════════════════════════════════ */}
        <section className="section-spacing" style={{ background: 'var(--mk-surface-white)' }}>
          <div className="mk-container-lg">
            <FadeIn>
              <div className="section-header">
                <span className="pre-title margin-bottom margin-medium">What to expect</span>
                <h2 className="text-display-lg" style={{ color: 'var(--mk-text-primary)' }}>
                  Three things we cover in every walkthrough
                </h2>
              </div>
            </FadeIn>

            <FadeIn delay={0.15} direction="up">
              <div className="mk-feature-grid">
                {demoFeatures.map((f, i) => (
                  <div key={i} className="mk-card" style={{ padding: '2rem' }}>
                    <div className="mk-card__icon" style={{ marginBottom: '1.25rem' }}>
                      <f.Icon className="w-4 h-4" />
                    </div>
                    <h3 className="mk-card__title" style={{ marginBottom: '0.75rem' }}>{f.title}</h3>
                    <p className="mk-card__body">{f.body}</p>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            3. FORM SECTION
            ══════════════════════════════════════════════════════════ */}
        <section
          className="section-spacing"
          style={{
            background: 'var(--color--gray-7)',
            borderRadius: '2rem 2rem 0 0',
            marginTop: '-2rem',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div className="mk-container-lg">
            <div className="mk-form-grid">
              {/* LEFT: headline + bullets + indicator */}
              <FadeIn direction="right">
                <div className="section-header--left">
                  <h2
                    className="text-display-lg margin-bottom margin-large"
                    style={{ color: 'var(--mk-text-primary)' }}
                  >
                    Ready when you are.
                  </h2>
                </div>

                <div className="flex flex-col gap-3 margin-bottom margin-xlarge">
                  {bullets.map((b, i) => (
                    <div key={i} className="mk-list-item">
                      <span className="mk-list-item__icon">
                        <Check className="w-3 h-3" />
                      </span>
                      <span>{b}</span>
                    </div>
                  ))}
                </div>

                <LiveAgentIndicator />
              </FadeIn>

              {/* RIGHT: form */}
              <FadeIn delay={0.2} direction="up">
                <DemoFormWidget />
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            4. FINAL CTA
            ══════════════════════════════════════════════════════════ */}
        <section className="section-spacing section-dark">
          <div className="mk-container-sm">
            <FadeIn>
              <div className="flex flex-col items-center text-center" style={{ maxWidth: '40rem', marginInline: 'auto' }}>
                <h2
                  className="text-display-lg text-mk-on-dark margin-bottom margin-medium"
                >
                  Not ready for a call? Start with the compliance check.
                </h2>
                <p
                  className="margin-bottom margin-xlarge-2"
                  style={{ color: 'var(--mk-text-on-dark-2)', lineHeight: 1.7, fontSize: '1.0625rem' }}
                >
                  Tell us your commodity and target market. We&apos;ll score your shipment and send you
                  a gap report within 24 hours — no call required.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/solutions" className="btn-mk-primary btn-mk-lg">
                    Check your compliance status
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
