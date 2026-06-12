import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import HeroBackground from '@/components/marketing/hero-background';
import { FadeIn } from '@/components/marketing/motion';
import { FaqSection } from '@/components/marketing/faq-section';
import { FAQSchema } from '@/components/marketing/faq-schema';
import { CapabilitySlider } from '@/components/marketing/capability-slider';
import { ChevronRight, Globe, Package, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Lacey Act & USDA NOP Compliance | OriginTrace',
  description:
    'The Lacey Act prohibits trade in illegally harvested agricultural commodities. USDA NOP certification requires documented chain-of-custody. OriginTrace provides the farm-level evidence both frameworks require.',
};

const faqs = [
  {
    question: 'What is the Lacey Act and how does it apply to agricultural commodities?',
    answer:
      'The Lacey Act, originally enacted in 1900 and significantly amended in 2008, prohibits the trade in wildlife, fish, and plants — including plant products — that have been taken, possessed, transported, or sold in violation of any US or foreign law. For agricultural commodities, this means any goods harvested in violation of the laws of the country of origin cannot lawfully be imported into or traded within the United States.',
  },
  {
    question: 'What is a Lacey Act declaration and who must file one?',
    answer:
      'Importers of plant products covered by the Lacey Act must file an import declaration with US Customs and Border Protection. The declaration must state the scientific name of the plant, the value of the importation, the quantity, and the country where the plant was harvested. Filing a false declaration is a federal offence.',
  },
  {
    question: 'What are the penalties for Lacey Act violations?',
    answer:
      'Lacey Act violations can result in civil penalties of up to $10,000 per violation and criminal penalties including fines and imprisonment. Egregious violations — particularly those involving falsification of declarations — can result in felony charges. The US government has pursued criminal prosecutions against corporate importers in high-profile cases.',
  },
  {
    question: 'What is the USDA National Organic Program (NOP) chain-of-custody requirement?',
    answer:
      'The USDA NOP requires certified organic operations to maintain records that demonstrate the integrity of organic products from production through sale. For exporters, this means maintaining documented chain-of-custody from registered farm plots through processing and export, with records available for inspection by accredited certifiers.',
  },
  {
    question: 'How does OriginTrace support Lacey Act compliance?',
    answer:
      'OriginTrace captures GPS farm coordinates, verified farmer identity, and legal land status data at point of collection. Each batch is traceable to its registered farm of origin with timestamps and agent identity — giving you the documented evidence of legal harvest that Lacey Act declarations require.',
  },
  {
    question: 'How does OriginTrace support USDA NOP certification?',
    answer:
      'OriginTrace maintains complete chain-of-custody records from farm registration through collection, aggregation, and export. Each step in the supply chain is logged with verified identity, timestamps, and GPS location data — providing the audit trail that NOP certifiers require to verify organic integrity.',
  },
  {
    question: 'Does the Lacey Act apply to cocoa and coffee from African origins?',
    answer:
      'Yes. The Lacey Act covers plant products including cocoa and coffee. Any importer bringing these commodities into the US must be able to demonstrate they were legally harvested under the laws of the country of origin. OriginTrace is built for African agricultural origins and generates this evidence from first collection.',
  },
  {
    question: 'Can OriginTrace help with both Lacey Act and NOP requirements simultaneously?',
    answer:
      'Yes. Because OriginTrace captures farm-level identity, GPS coordinates, and collection chain-of-custody as a single verified record, the same data set supports both Lacey Act import declarations and NOP chain-of-custody requirements. One platform, one record, two compliance frameworks covered.',
  },
];

const stats = [
  { label: 'US compliance frameworks', value: '2' },
  { label: 'Penalty for Lacey violations', value: 'Criminal' },
  { label: 'NOP chain-of-custody coverage', value: '100%' },
];

const capabilities = [
  {
    number: '01',
    title: 'Verify Legal Harvest Status',
    description:
      'Every farm plot is GPS-mapped and cross-checked against legal land use data before collection. Legally ambiguous plots are flagged before goods enter your supply chain.',
    iconName: 'MapPin',
  },
  {
    number: '02',
    title: 'Register Farmer Identity',
    description:
      'Every contributing farmer is registered with verified identity and GPS farm coordinates. Your Lacey Act due diligence starts with verified people and verified land.',
    iconName: 'Users',
  },
  {
    number: '03',
    title: 'Capture with Chain-of-Custody',
    description:
      'Every collection event is logged in real time, even offline. Each batch is traceable back to the registered farm of origin with timestamps and agent identity.',
    iconName: 'Factory',
  },
  {
    number: '04',
    title: 'Score Against Lacey and NOP',
    description:
      'OriginTrace scores your shipment against Lacey Act due diligence requirements and USDA NOP chain-of-custody standards simultaneously — before you book freight.',
    iconName: 'ShieldCheck',
  },
  {
    number: '05',
    title: 'Generate US-Ready Documentation',
    description:
      'Produce your Lacey Act declaration, NOP chain-of-custody certificate, and supporting farm-level records from one verified shipment record.',
    iconName: 'FileText',
  },
];

const timeline = [
  { date: '1900', event: 'Lacey Act originally enacted', active: false },
  { date: '2008', event: 'Amended to cover plant products', active: false },
  { date: '2013+', event: 'Active enforcement with criminal penalties', active: true },
  { date: 'Ongoing', event: 'USDA NOP chain-of-custody requirements', active: false },
  { date: 'Now', event: 'Zero tolerance for undocumented origin', active: false },
];

export default function USACompliancePage() {
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
                        US Compliance
                      </span>
                    </FadeIn>
                    <FadeIn delay={0.15}>
                      <h1
                        className="text-display-2xl margin-bottom margin-large"
                        style={{ color: '#ffffff', fontFamily: 'var(--font-display)', maxWidth: '16ch' }}
                      >
                        Lacey Act and USDA NOP — one platform, one verified record.
                      </h1>
                    </FadeIn>
                    <FadeIn delay={0.2}>
                      <p
                        className="margin-bottom margin-xlarge"
                        style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1.0625rem)', lineHeight: 1.75, maxWidth: '40ch', color: 'rgba(255,255,255,0.62)' }}
                      >
                        The Lacey Act prohibits trade in agricultural commodities harvested in violation of foreign or domestic law. USDA National Organic Program certification requires documented chain-of-custody from farm to export. OriginTrace provides the farm-level evidence both frameworks require.
                      </p>
                    </FadeIn>
                    <FadeIn delay={0.3}>
                      <Link href="/demo" className="btn-mk-primary btn-mk-lg">
                        See US compliance in action <ChevronRight className="h-5 w-5" />
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
                  <h2 className="text-display-lg">Three types of organisation with US compliance obligations.</h2>
                </div>
              </FadeIn>

              <FadeIn delay={0.1}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }} className="eudr-who-grid">
                  <div className="mk-card" style={{ padding: '2rem' }}>
                    <div className="mk-card__icon" style={{ marginBottom: '1rem' }}>
                      <Globe className="h-6 w-6" style={{ color: 'var(--mk-green)' }} />
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--mk-text-primary)', marginBottom: '0.5rem' }}>US Agricultural Importers</h3>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--mk-text-secondary)', lineHeight: 1.7 }}>
                      Any entity importing plant-based agricultural commodities into the United States must be able to demonstrate that goods were legally harvested under the laws of the country of origin.
                    </p>
                  </div>

                  <div className="mk-card" style={{ padding: '2rem' }}>
                    <div className="mk-card__icon" style={{ marginBottom: '1rem' }}>
                      <ShieldCheck className="h-6 w-6" style={{ color: 'var(--mk-green)' }} />
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--mk-text-primary)', marginBottom: '0.5rem' }}>Organic Exporters</h3>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--mk-text-secondary)', lineHeight: 1.7 }}>
                      Exporters selling into certified organic supply chains must maintain documented chain-of-custody from farm registration through export. Certification bodies require farm-level audit trails.
                    </p>
                  </div>

                  <div className="mk-card" style={{ padding: '2rem' }}>
                    <div className="mk-card__icon" style={{ marginBottom: '1rem' }}>
                      <Package className="h-6 w-6" style={{ color: 'var(--mk-green)' }} />
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--mk-text-primary)', marginBottom: '0.5rem' }}>US Buyers and Distributors</h3>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--mk-text-secondary)', lineHeight: 1.7 }}>
                      US buyers sourcing from African agricultural origins face exposure under Lacey Act if their suppliers cannot evidence legal harvest. OriginTrace gives your supplier the documentation you need.
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
                  <h2 className="text-display-lg" style={{ color: '#ffffff' }}>Built for every step of US compliance.</h2>
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
                  <h2 className="text-display-lg">The US compliance timeline.</h2>
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
                    Lacey Act compliance starts before the goods leave the farm.
                  </h2>
                  <p className="margin-bottom margin-xlarge-2" style={{ color: 'var(--mk-text-on-dark-2)', lineHeight: 1.7, fontSize: '1.0625rem' }}>
                    We&apos;ll walk you through what US customs, buyers, and organic certification bodies require — and how OriginTrace builds your evidence record from first collection.
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
