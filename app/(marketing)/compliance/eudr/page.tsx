import Link from 'next/link';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import HeroBackground from '@/components/marketing/hero-background';
import { FadeIn } from '@/components/marketing/motion';
import { FaqSection } from '@/components/marketing/faq-section';
import { FAQSchema } from '@/components/marketing/faq-schema';
import { CapabilitySlider } from '@/components/marketing/capability-slider';
import { ChevronRight, Globe, Factory, FileText } from 'lucide-react';

const faqs = [
  {
    question: 'What is the EUDR and when does it take effect?',
    answer: 'The EU Deforestation Regulation (EUDR, Regulation 2023/1115) requires that certain commodities and derived products placed on or exported from the EU market are deforestation-free, legally produced, and covered by a due diligence statement. Large operators must comply by December 30, 2025, with full enforcement for all operators by December 30, 2026.',
  },
  {
    question: 'Which commodities are covered by the EUDR?',
    answer: 'The EUDR covers seven commodity groups: cocoa, coffee, soy, palm oil, rubber, cattle (including leather), and wood (including timber and paper products). It also covers a wide range of derived products — for example, chocolate, furniture, tires, and printed paper.',
  },
  {
    question: 'Who needs to comply with the EUDR?',
    answer: 'Any operator or trader placing covered commodities on the EU market — or exporting them from the EU — must comply. This includes EU-based importers, distributors, and retailers, as well as non-EU exporters whose products enter the EU market. The regulation applies regardless of where the commodities were produced.',
  },
  {
    question: 'What geolocation data is required under the EUDR?',
    answer: 'Operators must provide the geolocation coordinates of all plots of land where the commodity was produced. For plots larger than 4 hectares, polygon boundary coordinates are required (not just a single GPS point). This data must be included in the due diligence statement submitted to the EU Information System.',
  },
  {
    question: 'How does OriginTrace help with EUDR compliance?',
    answer: 'OriginTrace provides end-to-end infrastructure for EUDR compliance: GPS polygon farm mapping, full supply chain traceability from farm to export, automated due diligence statement generation, compliance scoring, risk assessment, and an audit-ready data vault. The platform is designed for real-world conditions in producing countries — working offline, on any smartphone, and in low-connectivity environments.',
  },
  {
    question: 'What happens if an operator fails to comply with the EUDR?',
    answer: "Non-compliance can result in fines of up to 4% of the operator's annual EU-wide turnover, confiscation of products, exclusion from public procurement, and a temporary ban on placing products on the EU market. Competent authorities in each EU member state are responsible for enforcement and inspections.",
  },
  {
    question: 'Does the EUDR apply to smallholder farmers?',
    answer: 'The EUDR applies to operators and traders, not directly to smallholder farmers. However, smallholders are significantly affected because operators must trace commodities back to the farm level and verify deforestation-free status. OriginTrace is specifically designed to make this farm-level data collection practical — even in remote, low-infrastructure regions.',
  },
  {
    question: 'How is the December 31, 2020 cut-off date applied?',
    answer: 'The EUDR uses December 31, 2020 as the deforestation cut-off date. Any land that was forested before this date and subsequently cleared is considered non-compliant. Satellite imagery and geospatial analysis are used to verify that production land was not subject to deforestation after this date.',
  },
];

const stats = [
  { label: 'Covered commodity groups', value: '7' },
  { label: 'Large operator deadline', value: 'Dec 2025' },
  { label: 'Max fine as % of EU turnover', value: '4%' },
];

const capabilities = [
  {
    number: '01',
    title: 'GPS Plot Registration',
    description: 'Every contributing farm plot is registered with GPS coordinates and cross-referenced against deforestation risk databases. You start with verified, deforestation-free origin — not a declaration.',
    iconName: 'MapPin',
  },
  {
    number: '02',
    title: 'Farmer Identity Verification',
    description: 'Every contributor is registered with verified identity. Your due diligence record has named, located sources — not anonymous smallholders.',
    iconName: 'Package',
  },
  {
    number: '03',
    title: 'Offline Field Collection',
    description: 'Field agents log every collection at the farm gate — even without internet. Bags, weight, variety, and origin point are captured and linked automatically.',
    iconName: 'Factory',
  },
  {
    number: '04',
    title: 'Deforestation Risk Scoring',
    description: 'Each source plot is scored against post-2020 satellite deforestation data. High-risk plots are flagged before they enter your supply chain.',
    iconName: 'ShieldCheck',
  },
  {
    number: '05',
    title: 'DDS-Ready Documentation',
    description: 'From your verified traceability record, OriginTrace generates the due diligence statement documentation your EU importer needs to submit to the EU customs system.',
    iconName: 'FileText',
  },
];

const timeline = [
  { date: 'June 2023', event: 'EUDR enters into force', active: false },
  { date: 'December 2024', event: 'Original compliance deadline (delayed)', active: false },
  { date: 'December 2025', event: 'Compliance deadline for large operators', active: true },
  { date: 'June 2026', event: 'Compliance deadline for SMEs', active: false },
  { date: 'Ongoing', event: 'EU Commission reviews and updates country risk benchmarks', active: false },
];

const commodities = ['Cocoa', 'Coffee', 'Soy', 'Palm Oil', 'Rubber', 'Cattle', 'Timber'];

export default function EUDRCompliancePage() {
  return (
    <>
      <FAQSchema faqs={faqs} />
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
                        EU Deforestation Regulation
                      </span>
                    </FadeIn>
                    <FadeIn delay={0.15}>
                      <h1
                        className="text-display-2xl margin-bottom margin-large"
                        style={{ color: '#ffffff', fontFamily: 'var(--font-display)', maxWidth: '16ch' }}
                      >
                        EUDR compliance starts at the farm, not the border.
                      </h1>
                    </FadeIn>
                    <FadeIn delay={0.2}>
                      <p
                        className="margin-bottom margin-xlarge"
                        style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1.0625rem)', lineHeight: 1.75, maxWidth: '40ch', color: 'rgba(255,255,255,0.62)' }}
                      >
                        The EU Deforestation Regulation requires GPS-verified, deforestation-free origin for seven commodity groups. Operators must submit a due diligence statement before placing covered commodities on the EU market. Deadline: December 2025 for large operators.
                      </p>
                    </FadeIn>
                    <FadeIn delay={0.3}>
                      <Link href="/demo" className="btn-mk-primary btn-mk-lg">
                        Check your EUDR readiness <ChevronRight className="h-5 w-5" />
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
                  <h2 className="text-display-lg">Three types of operator with EUDR obligations.</h2>
                </div>
              </FadeIn>

              <FadeIn delay={0.1}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }} className="eudr-who-grid">
                  {/* EU Importers */}
                  <div className="mk-card" style={{ padding: '2rem' }}>
                    <div className="mk-card__icon" style={{ marginBottom: '1rem' }}>
                      <Globe className="h-6 w-6" style={{ color: 'var(--mk-green)' }} />
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--mk-text-primary)', marginBottom: '0.5rem' }}>EU Importers</h3>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--mk-text-secondary)', lineHeight: 1.7 }}>
                      Any company placing covered commodities or derived products on the EU market must conduct due diligence and submit a DDS. This includes importers of cocoa butter, coffee, timber products, and soy-derived goods.
                    </p>
                  </div>

                  {/* Non-EU Exporters */}
                  <div className="mk-card" style={{ padding: '2rem' }}>
                    <div className="mk-card__icon" style={{ marginBottom: '1rem' }}>
                      <Factory className="h-6 w-6" style={{ color: 'var(--mk-green)' }} />
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--mk-text-primary)', marginBottom: '0.5rem' }}>Non-EU Exporters</h3>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--mk-text-secondary)', lineHeight: 1.7 }}>
                      If your EU buyer requires a DDS, you need to provide the origin evidence they need to complete it. GPS plot data, deforestation risk assessments, and verified identity records are what your buyers are asking for.
                    </p>
                  </div>

                  {/* SME Traders */}
                  <div className="mk-card" style={{ padding: '2rem' }}>
                    <div className="mk-card__icon" style={{ marginBottom: '1rem' }}>
                      <FileText className="h-6 w-6" style={{ color: 'var(--mk-green)' }} />
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--mk-text-primary)', marginBottom: '0.5rem' }}>SME Traders</h3>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--mk-text-secondary)', lineHeight: 1.7 }}>
                      SMEs acting as traders rather than operators have simplified obligations but must still ensure their supplier has completed due diligence. Downstream liability means you need upstream evidence.
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
                  <h2 className="text-display-lg" style={{ color: '#ffffff' }}>Built for every step of EUDR compliance.</h2>
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
                  <h2 className="text-display-lg">The EUDR compliance timeline.</h2>
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


          {/* ── COVERED COMMODITIES ──────────────────────────────── */}
          <section className="section-spacing section-white">
            <div className="mk-container-lg">
              <FadeIn>
                <div className="section-header">
                  <span className="pre-title margin-bottom margin-medium">Covered Commodities</span>
                  <h2 className="text-display-lg">Seven commodity groups under EUDR.</h2>
                </div>
              </FadeIn>

              <FadeIn delay={0.1}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
                  {commodities.map((commodity, i) => (
                    <span
                      key={i}
                      style={{
                        border: '1px solid var(--mk-border)',
                        borderRadius: '9999px',
                        padding: '0.4rem 1.25rem',
                        fontSize: '0.9375rem',
                        fontWeight: 500,
                        color: 'var(--mk-text-secondary)',
                        background: 'var(--mk-surface-white)',
                      }}
                    >
                      {commodity}
                    </span>
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
                    Don't wait until your buyer asks for a DDS you can't produce.
                  </h2>
                  <p className="margin-bottom margin-xlarge-2" style={{ color: 'var(--mk-text-on-dark-2)', lineHeight: 1.7, fontSize: '1.0625rem' }}>
                    OriginTrace can register your supply base, run your first deforestation risk assessment, and generate DDS-ready documentation — in time for your next export season.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link href="/demo" className="btn-mk-primary btn-mk-lg">
                      Book a walkthrough <ChevronRight className="h-5 w-5" />
                    </Link>
                    <Link href="/solutions" className="btn-mk-ghost btn-mk-lg">
                      See the platform
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
