import Link from 'next/link';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import HeroBackground from '@/components/marketing/hero-background';
import { FadeIn } from '@/components/marketing/motion';
import { FaqSection } from '@/components/marketing/faq-section';
import { FAQSchema } from '@/components/marketing/faq-schema';
import { ChevronRight } from 'lucide-react';

const hubFaqs = [
  {
    question: 'Which export regulations affect Nigerian and Ghanaian food exporters in 2026?',
    answer: 'Nigerian and Ghanaian exporters are currently affected by several major regulations simultaneously: the EU Deforestation Regulation (EUDR) with full enforcement by December 2026, China GACC Decree 248 facility registration (deadline June 2026), the UK Environment Act due diligence rules, and the US FDA FSMA 204 Food Traceability Rule. The specific regulations that apply to you depend on which markets you export to and which commodities you handle.',
  },
  {
    question: 'What is the difference between EUDR and GACC?',
    answer: "EUDR (EU Deforestation Regulation) is a European law that requires commodities like cocoa, coffee, soy, and palm oil to be deforestation-free before entering the EU market. GACC (General Administration of Customs of China) is China's customs authority that requires overseas food facilities to be registered under Decree 248 before they can export food products to China. Both regulations affect African agricultural exporters but for different markets and with different documentation requirements.",
  },
  {
    question: 'Do I need to comply with EUDR if I export cocoa or cashew from Nigeria to Europe?',
    answer: 'Yes. If you export cocoa, coffee, rubber, or other EUDR-covered commodities to the EU, your EU buyer is required to conduct due diligence — and they will ask you to provide traceability data and geolocation coordinates for all farms in your supply chain. Without this data, your EU buyer cannot place your goods on the EU market. Effectively, EUDR compliance starts with you as the African exporter.',
  },
  {
    question: 'What is GACC registration and does it affect Nigerian exporters?',
    answer: 'GACC registration under Decree 248 is mandatory for all overseas food production, processing, and storage facilities that export food to China. Nigeria is a major exporter of sesame seeds, cocoa, and agricultural products to China, making GACC registration directly relevant for Nigerian exporters. The registration deadline of June 2026 is enforced — unregistered facilities will have their shipments refused at Chinese ports.',
  },
  {
    question: 'Can one platform handle EUDR, GACC, and other compliance requirements at the same time?',
    answer: 'Yes. OriginTrace provides a single platform that captures the farm-level GPS data, batch traceability, documentation, and compliance scoring needed across multiple regulations simultaneously. Rather than running separate processes for each export market, OriginTrace lets you collect data once and use it across EUDR due diligence statements, GACC traceability documentation, and UK/US buyer requirements.',
  },
];

const stats = [
  { label: 'Frameworks checked simultaneously', value: '5' },
  { label: 'Countries with active requirements', value: '40+' },
  { label: 'Gap detection before loading', value: 'Real-time' },
];

const frameworks = [
  {
    gradient: 'linear-gradient(135deg, #1F5F52, #2E7D6B)',
    label: 'EU Deforestation Regulation',
    h3: 'Deforestation-free proof required for 7 commodity groups.',
    body: 'The EU Deforestation Regulation requires operators to prove that seven commodity groups were produced on land not deforested after December 31 2020. A due diligence statement is mandatory for every shipment.',
    deadline: 'Large operators: December 2025',
    features: [
      'GPS-verified plot coordinates required',
      'Due diligence statement (DDS) for every shipment',
      'Covers cocoa, coffee, soy, palm oil, rubber, cattle, timber',
      'Deforestation risk assessment built in',
    ],
    linkLabel: 'Learn more about EUDR →',
    linkHref: '/compliance/eudr',
    imageLeft: true,
  },
  {
    gradient: 'linear-gradient(135deg, #1a2744, #243b6e)',
    label: 'US FDA FSMA Section 204',
    h3: 'Farm-to-processor records retrievable within 24 hours.',
    body: 'The US FDA Food Safety Modernization Act Section 204 requires supply chain traceability records for high-risk foods. Records must be traceable to the farm level within 24 hours of an FDA request.',
    deadline: 'Effective: January 2026',
    features: [
      'Farm-level traceability required',
      '24-hour FDA record retrieval capability',
      'Covers fresh produce, seafood, processed foods',
      'Applies to US importers and their foreign suppliers',
    ],
    linkLabel: 'Learn more about FSMA →',
    linkHref: '/compliance/usa',
    imageLeft: false,
  },
  {
    gradient: 'linear-gradient(135deg, #2d1515, #5c2020)',
    label: 'UK Environment Act — Forest Risk Commodities',
    h3: 'Due diligence records required for UK market access.',
    body: 'UK due diligence requirements for forest-risk commodities mirror the EU model but with UK-specific implementation. Businesses placing forest-risk commodities on the UK market must conduct due diligence and keep records demonstrating legality and deforestation-free sourcing.',
    deadline: 'In force: January 2025',
    features: [
      'Mirrors EUDR commodity scope',
      'Cocoa, coffee, soy, palm oil, cattle, timber',
      'Due diligence records required per shipment',
      'Distinct legal basis from EUDR',
    ],
    linkLabel: 'Learn more about UK requirements →',
    linkHref: '/compliance/uk',
    imageLeft: true,
  },
  {
    gradient: 'linear-gradient(135deg, #2d0a0a, #8b1a1a)',
    label: 'China GACC — General Administration of Customs',
    h3: 'Supplier registration required for Chinese market access.',
    body: "China's General Administration of Customs requires registration and traceability documentation for food and agricultural imports. GACC-registered facilities receive preferential access; unregistered sources face detention or rejection.",
    deadline: 'Ongoing — registration required',
    features: [
      'Supplier registration required for GACC access',
      'Farm-level traceability expected for high-risk commodities',
      'Documentation must accompany each shipment',
      'Covers grains, oilseeds, fruits, vegetables',
    ],
    linkLabel: 'Learn more about GACC →',
    linkHref: '/compliance/china',
    imageLeft: false,
  },
  {
    gradient: 'linear-gradient(135deg, #2a1f0a, #6b4f1a)',
    label: 'UAE ESMA — Emirates Authority for Standardisation',
    h3: 'Origin documentation and halal certification for UAE imports.',
    body: 'The Emirates Authority for Standardisation & Metrology sets food safety and product standards for UAE imports. Agricultural commodities must meet specific testing, labelling, and origin documentation requirements for UAE market access.',
    deadline: 'Ongoing compliance required',
    features: [
      'Halal certification and origin traceability required',
      'Commodity-specific standards per product category',
      'Documentation verified at UAE port of entry',
      'Covers food, feed, and processed agricultural products',
    ],
    linkLabel: 'Learn more about UAE requirements →',
    linkHref: '/compliance/uae',
    imageLeft: true,
  },
];

export default function ComplianceHubPage() {
  return (
    <>
      <FAQSchema faqs={hubFaqs} />
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
                        Compliance
                      </span>
                    </FadeIn>
                    <FadeIn delay={0.15}>
                      <h1
                        className="text-display-2xl margin-bottom margin-large"
                        style={{ color: '#ffffff', fontFamily: 'var(--font-display)', maxWidth: '16ch' }}
                      >
                        Your markets changed the rules. We track every one.
                      </h1>
                    </FadeIn>
                    <FadeIn delay={0.2}>
                      <p
                        className="margin-bottom margin-xlarge"
                        style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1.0625rem)', lineHeight: 1.75, maxWidth: '40ch', color: 'rgba(255,255,255,0.62)' }}
                      >
                        Five major import markets — the EU, UK, US, China, and UAE — have each introduced or tightened origin traceability and due diligence requirements for agricultural and mineral commodities. OriginTrace checks your shipment against all of them before you book freight.
                      </p>
                    </FadeIn>
                    <FadeIn delay={0.3}>
                      <Link href="/demo" className="btn-mk-primary btn-mk-lg">
                        Check your compliance status <ChevronRight className="h-5 w-5" />
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


          {/* ── FRAMEWORK PANELS ─────────────────────────────────── */}
          <section className="section-spacing section-white">
            <div className="mk-container-lg margin-bottom margin-xlarge">
              <FadeIn>
                <div className="section-header">
                  <span className="pre-title margin-bottom margin-medium">Market Frameworks</span>
                  <h2 className="text-display-lg">Five markets. Five frameworks. One check.</h2>
                  <p className="section-header__body">
                    Select a market to see what OriginTrace verifies — and what documentation your shipment needs before you load.
                  </p>
                </div>
              </FadeIn>
            </div>

            {frameworks.map((fw, i) => (
              <FadeIn key={i} delay={i * 0.06}>
                <div style={{ borderTop: '1px solid var(--mk-border)' }}>
                  <div className="mk-container-lg compliance-framework-grid">
                    {/* Gradient image panel */}
                    <div
                      style={{
                        background: fw.gradient,
                        minHeight: 280,
                        order: fw.imageLeft ? 0 : 1,
                      }}
                    />
                    {/* Text panel */}
                    <div
                      style={{
                        order: fw.imageLeft ? 1 : 0,
                        padding: '2.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        background: '#ffffff',
                      }}
                    >
                      <span className="pre-title margin-bottom margin-medium" style={{ width: 'fit-content' }}>
                        {fw.label}
                      </span>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--mk-text-primary)', lineHeight: 1.35, marginBottom: '1rem' }}>
                        {fw.h3}
                      </h3>
                      <p style={{ fontSize: '0.9375rem', color: 'var(--mk-text-secondary)', lineHeight: 1.7, marginBottom: '1rem' }}>
                        {fw.body}
                      </p>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--mk-green-dark)', background: 'var(--mk-green-light)', padding: '0.2rem 0.6rem', borderRadius: '9999px', display: 'inline-block', marginBottom: '1rem', width: 'fit-content' }}>
                        {fw.deadline}
                      </span>
                      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 0.5rem' }}>
                        {fw.features.map((feat, j) => (
                          <li
                            key={j}
                            style={{ fontSize: '0.875rem', color: 'var(--mk-text-secondary)', marginBottom: '0.375rem', paddingLeft: '1rem', position: 'relative' }}
                          >
                            <span style={{ position: 'absolute', left: 0, color: 'var(--mk-green)' }}>–</span>
                            {feat}
                          </li>
                        ))}
                      </ul>
                      <Link
                        href={fw.linkHref}
                        style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--mk-green)', textDecoration: 'none', marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        {fw.linkLabel}
                      </Link>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
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
                    Know your compliance status before you load.
                  </h2>
                  <p className="margin-bottom margin-xlarge-2" style={{ color: 'var(--mk-text-on-dark-2)', lineHeight: 1.7, fontSize: '1.0625rem' }}>
                    We will score your commodity against all five frameworks and show you exactly what documentation your shipment needs — for your target markets, your supply chain, your next export season.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link href="/demo" className="btn-mk-primary btn-mk-lg">
                      Get your compliance score <ChevronRight className="h-5 w-5" />
                    </Link>
                    <Link href="/demo" className="btn-mk-ghost btn-mk-lg">
                      Book a walkthrough
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
