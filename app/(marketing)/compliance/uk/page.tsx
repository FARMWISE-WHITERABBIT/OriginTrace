import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import HeroBackground from '@/components/marketing/hero-background';
import { FadeIn } from '@/components/marketing/motion';
import { FaqSection } from '@/components/marketing/faq-section';
import { FAQSchema } from '@/components/marketing/faq-schema';
import { CapabilitySlider } from '@/components/marketing/capability-slider';
import { ChevronRight, Globe, Package, Banknote } from 'lucide-react';

export const metadata: Metadata = {
  title: 'UK Due Diligence (UKDDS) Compliance',
  description:
    'The UK Environment Act 2021 requires due diligence on forest-risk commodities. OriginTrace gives you farm-level evidence from first collection to export declaration.',
};

const faqs = [
  {
    question: 'What is the UK Environment Act 2021 due diligence requirement?',
    answer:
      'The UK Environment Act 2021 introduced a forest risk commodity due diligence obligation that prohibits larger businesses from using certain commodities or derived products unless they have conducted due diligence to ensure those goods come from legally harvested land. Businesses must establish and implement a due diligence system and report on it annually.',
  },
  {
    question: 'Which commodities are covered under the UK due diligence rules?',
    answer:
      'The UK regulations cover seven forest-risk commodity groups: cocoa, coffee, palm oil, soy, cattle, rubber, and timber — along with a range of derived products such as chocolate, leather, furniture, and printed paper.',
  },
  {
    question: 'Which businesses must comply with the UK due diligence requirement?',
    answer:
      'Large businesses operating in the UK that use forest-risk commodities or derived products in their operations or supply chains must comply. A large business is generally defined as one with more than £36 million in annual turnover or more than 250 employees. Smaller businesses are encouraged to prepare voluntarily.',
  },
  {
    question: 'What does &apos;legally harvested&apos; mean under the UK rules?',
    answer:
      'Legally harvested means the commodity was produced in compliance with all applicable laws of the country of production — including laws governing land use, land tenure, labour rights, environmental protection, and taxation. Businesses must gather sufficient evidence to satisfy themselves that the commodity meets this standard.',
  },
  {
    question: 'How does OriginTrace support UK due diligence?',
    answer:
      'OriginTrace captures GPS farm coordinates, verified farmer identity, collection event records, and legal land status data from first collection. This farm-level evidence chain is the foundation of your UK due diligence record — enabling you to demonstrate legally harvested origin across your supply base.',
  },
  {
    question: 'What penalties apply for non-compliance with UK due diligence rules?',
    answer:
      'The UK regulations provide for financial penalties of up to £50,000 per offence for businesses that fail to comply with the due diligence requirements. Enforcement is carried out by the Office for Product Safety and Standards (OPSS).',
  },
  {
    question: 'Do UK rules apply to exporters from African origins?',
    answer:
      'The obligation sits with the UK-based business, but in practice your UK buyer will require you — as the exporter — to provide the farm-level evidence they need to complete their due diligence. OriginTrace is built for African agricultural origins and makes this evidence generation practical for field-level operations.',
  },
  {
    question: 'How often must businesses report on their due diligence?',
    answer:
      'Businesses must produce an annual due diligence report describing the steps taken to identify and address risk in their forest-risk commodity supply chains. OriginTrace&apos;s audit-ready data vault makes it straightforward to produce this report from your verified traceability records.',
  },
];

const stats = [
  { label: 'UK regulated commodities', value: '7+' },
  { label: 'Penalty for non-compliance', value: 'Up to £50k' },
  { label: 'Farm-level evidence', value: '100%' },
];

const capabilities = [
  {
    number: '01',
    title: 'Map Legal Land Status',
    description:
      'Every farm plot is GPS-registered and cross-checked against legal land boundary data before collection begins. Illegal harvest land is flagged before you buy.',
    iconName: 'MapPin',
  },
  {
    number: '02',
    title: 'Register with KYC',
    description:
      'Every farmer and collector is registered with verified identity. No anonymous contributors. Your due diligence chain starts with people, not paper.',
    iconName: 'Users',
  },
  {
    number: '03',
    title: 'Capture at Source',
    description:
      'Field agents log every collection event in real time, linking each unit back to its farm of origin. Evidence is generated as collection happens — not reconstructed later.',
    iconName: 'Factory',
  },
  {
    number: '04',
    title: 'Score Against UK Requirements',
    description:
      'Your shipment is automatically scored against UK Environment Act requirements before you book freight. Gaps are surfaced before they become border problems.',
    iconName: 'ShieldCheck',
  },
  {
    number: '05',
    title: 'Generate Your Due Diligence Record',
    description:
      'Produce your UK due diligence report, origin declaration, and supporting documentation from one verified record. Ready for submission or audit.',
    iconName: 'FileText',
  },
];

const timeline = [
  { date: 'Nov 2021', event: 'UK Environment Act enacted', active: false },
  { date: '2023', event: 'Secondary regulations consulted', active: false },
  { date: '2024', event: 'Large business obligations take effect', active: true },
  { date: '2025', event: 'Enforcement and penalty regime active', active: false },
  { date: 'Ongoing', event: 'Annual due diligence reporting required', active: false },
];

export default function UKCompliancePage() {
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
                        UK Compliance
                      </span>
                    </FadeIn>
                    <FadeIn delay={0.15}>
                      <h1
                        className="text-display-2xl margin-bottom margin-large"
                        style={{ color: '#ffffff', fontFamily: 'var(--font-display)', maxWidth: '16ch' }}
                      >
                        UK due diligence requirements — built into every shipment.
                      </h1>
                    </FadeIn>
                    <FadeIn delay={0.2}>
                      <p
                        className="margin-bottom margin-xlarge"
                        style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1.0625rem)', lineHeight: 1.75, maxWidth: '40ch', color: 'rgba(255,255,255,0.62)' }}
                      >
                        The UK Environment Act 2021 prohibits large businesses from using forest-risk commodities unless they have conducted due diligence to ensure they come from legally harvested land. OriginTrace gives you the farm-level evidence trail the regulations require.
                      </p>
                    </FadeIn>
                    <FadeIn delay={0.3}>
                      <Link href="/demo" className="btn-mk-primary btn-mk-lg">
                        See UK compliance in action <ChevronRight className="h-5 w-5" />
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
                  <h2 className="text-display-lg">Three types of organisation with UK due diligence obligations.</h2>
                </div>
              </FadeIn>

              <FadeIn delay={0.1}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }} className="eudr-who-grid">
                  <div className="mk-card" style={{ padding: '2rem' }}>
                    <div className="mk-card__icon" style={{ marginBottom: '1rem' }}>
                      <Globe className="h-6 w-6" style={{ color: 'var(--mk-green)' }} />
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--mk-text-primary)', marginBottom: '0.5rem' }}>UK Large Businesses</h3>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--mk-text-secondary)', lineHeight: 1.7 }}>
                      Businesses with &gt;£36m turnover or &gt;250 employees that use forest-risk commodities in their UK operations or supply chains must conduct and report due diligence.
                    </p>
                  </div>

                  <div className="mk-card" style={{ padding: '2rem' }}>
                    <div className="mk-card__icon" style={{ marginBottom: '1rem' }}>
                      <Package className="h-6 w-6" style={{ color: 'var(--mk-green)' }} />
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--mk-text-primary)', marginBottom: '0.5rem' }}>UK-Based Importers</h3>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--mk-text-secondary)', lineHeight: 1.7 }}>
                      Companies importing cocoa, coffee, palm oil, soy, cattle, leather, rubber, or timber products into the UK must evidence that goods come from legally harvested land.
                    </p>
                  </div>

                  <div className="mk-card" style={{ padding: '2rem' }}>
                    <div className="mk-card__icon" style={{ marginBottom: '1rem' }}>
                      <Banknote className="h-6 w-6" style={{ color: 'var(--mk-green)' }} />
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--mk-text-primary)', marginBottom: '0.5rem' }}>Financial Institutions</h3>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--mk-text-secondary)', lineHeight: 1.7 }}>
                      Banks and investors with exposure to forest-risk commodity supply chains face increasing pressure to evidence supply chain due diligence from their portfolio companies.
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
                  <h2 className="text-display-lg" style={{ color: '#ffffff' }}>Built for every step of UK due diligence.</h2>
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
                  <h2 className="text-display-lg">The UK due diligence timeline.</h2>
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
                <div className="flex flex-col items-center text-center mk-cta-block">
                  <span className="pre-title margin-bottom margin-large">Get Started</span>
                  <h2 className="text-display-lg text-mk-on-dark margin-bottom margin-medium">
                    UK due diligence starts at the farm — not the border declaration.
                  </h2>
                  <p className="margin-bottom margin-xlarge-2" style={{ color: 'var(--mk-text-on-dark-2)', lineHeight: 1.7, fontSize: '1.0625rem' }}>
                    We&apos;ll show you exactly what your UK buyers and regulators will ask for — and how OriginTrace builds the evidence record from first collection.
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
