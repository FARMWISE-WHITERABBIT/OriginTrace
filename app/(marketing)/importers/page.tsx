import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import { FadeIn } from '@/components/marketing/motion';
import HeroBackground from '@/components/marketing/hero-background';
import { CapabilitySlider } from '@/components/marketing/capability-slider';
import { BlogCarousel } from '@/components/marketing/blog-carousel';
import { SimpleFAQList } from '@/components/marketing/faq-accordion';
import { FAQSchema } from '@/components/marketing/faq-schema';
import { getPostBySlug } from '@/lib/blog';
import { ChevronRight, ShieldCheck, Banknote, FileText, Lock, CheckCircle2, ShieldQuestion } from 'lucide-react';

export const metadata: Metadata = {
  title: 'For Importers & Buyers',
  description:
    'You carry the compliance liability and the payment risk. OriginTrace puts your suppliers\' farms, documents, lab tests, and shipments in one workspace you can verify — before your money is on the water.',
};

/* ─── DATA ─────────────────────────────────────────────────────────── */

const stats = [
  { label: 'Maximum EUDR fine on EU-wide annual turnover', value: '4%' },
  { label: 'Nigerian sesame consignments physically checked at EU borders', value: '1 in 2' },
  { label: 'Markets served from one supplier data pack — EU, GCC, China', value: '3' },
];

const buyerSteps = [
  {
    number: '01',
    title: 'Onboard Your Suppliers',
    description:
      'Invite your exporters onto OriginTrace and make on-platform documentation part of the order. They maintain the record at origin; you see it from your buyer workspace — no more chasing PDFs before every contract.',
    iconName: 'Package',
  },
  {
    number: '02',
    title: 'See the Origin',
    description:
      'Farm polygons, GPS points, farmer registries, and collection batches — captured in the field as your supplier operates, not assembled after you ask. Cross-checked against satellite deforestation data.',
    iconName: 'MapPin',
  },
  {
    number: '03',
    title: 'Check the Evidence',
    description:
      'Lab results, phytosanitary and origin certificates, compliance scores per target market, and DDS-ready data for EUDR commodities. Every claim traces back to a source record you can open.',
    iconName: 'ShieldCheck',
  },
  {
    number: '04',
    title: 'Track and Pay on Proof',
    description:
      'Follow the shipment through a structured 9-stage pipeline. Hold funds in escrow and release milestones against verified shipping events — with the final tranche always under your confirmation.',
    iconName: 'Banknote',
  },
];

const marketCards = [
  {
    title: 'EU Importers',
    body: 'EUDR due diligence lands on you, not your supplier — from 30 December 2026, with fines up to 4% of turnover. OriginTrace gives you plot-level geolocation, deforestation cross-checks, and a DDS-ready data pack per consignment, plus the food-safety paper trail that gets sesame and spices through border controls.',
    href: '/compliance/eudr',
    linkLabel: 'EUDR compliance',
  },
  {
    title: 'UK Importers',
    body: 'The UK Environment Act 2021 prohibits larger businesses from using forest-risk commodities unless due diligence proves legal harvest — a due diligence system you must establish and report on annually. OriginTrace gives you the farm-level evidence trail: legal land status, verified identity, and a source-to-shipment record your supplier maintains as they operate.',
    href: '/compliance/uk',
    linkLabel: 'UK due diligence',
  },
  {
    title: 'US Importers',
    body: "The Lacey Act prohibits trading commodities harvested in violation of the country of origin's laws, and requires a customs declaration stating species, quantity, and harvest origin — false declarations are a federal offence. USDA NOP adds documented chain-of-custody on top. OriginTrace captures the GPS coordinates, verified identity, and legal land status your declaration and organic certification both need.",
    href: '/compliance/usa',
    linkLabel: 'Lacey Act & USDA NOP compliance',
  },
  {
    title: 'Buyers Sourcing for China',
    body: 'GACC enforcement is live: unregistered facilities are refused at Chinese ports. Verify that your supplier\'s facility registration, traceability records, and documentation hold up before the contract is signed.',
    href: '/compliance/china',
    linkLabel: 'China GACC compliance',
  },
  {
    title: 'UAE Importers & Re-Exporters',
    body: 'Clear Dubai Municipality inspection with a complete, consistent data pack — and keep the EU channel open on re-export. Origin follows the goods: the same supplier record that clears FIRS in Dubai satisfies due diligence in Rotterdam.',
    href: '/compliance/uae',
    linkLabel: 'UAE compliance',
  },
];

const importerFaqs = [
  {
    question: "How is this different from just asking my supplier for documents directly?",
    answer: "Documents assembled the week you ask for them can be forged, outdated, or simply wrong — a fabricated certificate looks exactly like a real one in a PDF. OriginTrace records accumulate continuously as your supplier operates (farm registration, GPS mapping, collection events, lab results) and are cross-checked against satellite deforestation data, not assembled retroactively for your review.",
  },
  {
    question: "What happens if a supplier's data doesn't hold up?",
    answer: "You see the compliance score and the gaps directly from your buyer workspace — before the contract is signed or the shipment books freight, not after it's rejected at a border.",
  },
  {
    question: "Does escrow release automatically, without my confirmation?",
    answer: "No. Milestones release only against carrier-confirmed shipping events — gate-in, loaded on board, discharge — never on an estimate or your supplier's word. The final tranche always requires your explicit confirmation, and any dispute freezes every release until it's resolved.",
  },
  {
    question: "Which regulatory regimes does OriginTrace cover?",
    answer: "EU EUDR, UK Environment Act due diligence, US Lacey Act & USDA NOP, China GACC, and UAE/Dubai Municipality import requirements — one supplier record scored against all five simultaneously.",
  },
  {
    question: "Do my suppliers need to already be on OriginTrace?",
    answer: "No — you invite them as part of onboarding and make on-platform documentation part of the order. They maintain the record at origin; you see it from your buyer workspace without chasing PDFs before every contract.",
  },
];

const escrowSteps = [
  {
    number: '01',
    title: 'Funds move into escrow, not to your supplier',
    body: 'When the contract is signed, your payment moves into a secured account instead of leaving on an invoice and a promise. Your supplier sees the funds are committed; you keep control until delivery is proven.',
    icon: Lock,
  },
  {
    number: '02',
    title: 'Every milestone is verified independently',
    body: 'As the shipment moves — gate-in, loaded on board, vessel departed, discharged at destination — OriginTrace checks each event against the carrier\'s own tracking data. Not your supplier\'s word. Not an estimate.',
    icon: CheckCircle2,
  },
  {
    number: '03',
    title: 'Payment releases in tranches, matched to what actually happened',
    body: 'Each carrier-confirmed milestone triggers its agreed share of the payment automatically. If a milestone hasn\'t happened, nothing moves — there\'s no way to release funds against a shipment that isn\'t where it\'s supposed to be.',
    icon: Banknote,
  },
  {
    number: '04',
    title: 'You confirm the final release',
    body: 'The last tranche is never automatic. Delivery only completes when you sign off — and if a dispute is raised at any point, every remaining release freezes until it\'s resolved.',
    icon: ShieldQuestion,
  },
];

const buyerGuideSlugs = [
  'how-to-verify-supplier-eudr-claims',
  'verify-nigerian-exporter-legitimacy',
  'dubai-food-import-firs-registration-guide',
  'dubai-reexport-eu-rules-african-commodities',
];

/* ─── PAGE ──────────────────────────────────────────────────────────── */

export default function ImportersPage() {
  const buyerGuidePosts = buyerGuideSlugs
    .map((slug) => getPostBySlug(slug))
    .filter((post): post is NonNullable<typeof post> => post !== undefined);

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--color--gray-8)' }}>
      <MarketingNav />

      <main>
        {/* ── HERO ── */}
        <section className="mk-hero mk-hero--solutions">
          <HeroBackground videoSrc="https://gnvcvvsnnesieugnzmrz.supabase.co/storage/v1/object/public/media/hero-background.mp4" />
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
                      style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.25)', color: 'var(--mk-text-on-dark)' }}
                    >
                      For Importers & Buyers
                    </span>
                  </FadeIn>
                  <FadeIn delay={0.15}>
                    <h1
                      className="text-display-2xl margin-bottom margin-large"
                      style={{ color: '#ffffff', fontFamily: 'var(--font-display)', maxWidth: '16ch' }}
                    >
                      Verify at origin. Buy with evidence.
                    </h1>
                  </FadeIn>
                  <FadeIn delay={0.2}>
                    <p
                      className="margin-bottom margin-xlarge"
                      style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1.0625rem)', lineHeight: 1.75, maxWidth: '42ch', color: 'var(--mk-text-on-dark)' }}
                    >
                      You carry the compliance liability and the payment risk — your supplier carries the data. OriginTrace closes that gap: your exporters document farms, lab tests, certificates, and shipments at origin, and you verify all of it from one buyer workspace before your money is on the water.
                    </p>
                  </FadeIn>
                  <FadeIn delay={0.3}>
                    <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
                      <Link href="/demo?role=buyer" className="btn-mk-primary btn-mk-lg">
                        Request a supplier risk snapshot <ChevronRight className="h-5 w-5" />
                      </Link>
                    </div>
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

        {/* ── SECTION 2: How buyers use OriginTrace ── */}
        <section className="section-spacing section-dark">
          <div className="mk-container-lg">
            <CapabilitySlider capabilities={buyerSteps} />
          </div>
        </section>

        {/* ── SECTION 3: The problem, plainly ── */}
        <section
          className="section-spacing"
          style={{ background: 'var(--color--gray-7)', borderRadius: '2rem 2rem 0 0', marginTop: '-2rem', position: 'relative', zIndex: 1 }}
        >
          <div className="mk-container-sm">
            <FadeIn>
              <div className="section-header">
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 36 36"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="margin-bottom margin-medium"
                  aria-hidden
                  style={{ color: 'var(--mk-text-muted)' }}
                >
                  <circle cx="18" cy="18" r="5" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="18" y1="2"  x2="18" y2="7"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="18" y1="29" x2="18" y2="34" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="2"  y1="18" x2="7"  y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="29" y1="18" x2="34" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="6.34"  y1="6.34"  x2="9.87"  y2="9.87"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="26.13" y1="26.13" x2="29.66" y2="29.66" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="29.66" y1="6.34"  x2="26.13" y2="9.87"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="9.87"  y1="26.13" x2="6.34"  y2="29.66" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>

                <span className="pre-title margin-bottom margin-medium">The Buyer&apos;s Problem</span>

                <h2 className="text-display-lg section-header__title" style={{ maxWidth: '28ch' }}>
                  Every supplier says they&apos;re{' '}
                  <span className="text-mk-muted">compliant.</span>{' '}
                  You&apos;re the one who pays if{' '}
                  <span className="text-mk-brand">they aren&apos;t.</span>
                </h2>

                <p className="section-header__body">
                  Rejected consignments bill the importer of record. Regulators fine the first
                  operator placing goods on the market — not the exporter. And a forged certificate
                  looks exactly like a real one in a PDF. The only durable answer is standing
                  visibility into your supply chain at origin: records that accumulate as your
                  supplier operates, instead of a data pack assembled the week you asked for it.
                </p>
              </div>
            </FadeIn>
          </div>

          {/* 3-column image grid — matches the homepage's Problem We Solve treatment */}
          <div className="mk-container-lg" style={{ marginTop: '3rem' }}>
            <div className="hidden md:grid" style={{
              gridTemplateColumns: '1fr 1.15fr 1fr', gap: '1rem',
              alignItems: 'center', marginBottom: '3rem',
            }}>
              <FadeIn delay={0.1} direction="up">
                <div style={{ height: '480px', borderRadius: '1.25rem', overflow: 'hidden', backgroundImage: "url('/images/pexels-tomfisk-1427107.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
              </FadeIn>
              <FadeIn delay={0.22} direction="up">
                <div style={{ height: '640px', borderRadius: '1.25rem', overflow: 'hidden', backgroundImage: "url('/images/lagos-apapa-port.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
              </FadeIn>
              <FadeIn delay={0.34} direction="up">
                <div style={{ height: '480px', borderRadius: '1.25rem', overflow: 'hidden', backgroundImage: "url('/images/pexels-tomfisk-2231744.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
              </FadeIn>
            </div>

            <div className="block md:hidden" style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ flex: 1, height: '160px', borderRadius: '1rem', overflow: 'hidden', backgroundImage: "url('/images/pexels-tomfisk-1427107.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <div style={{ flex: 1, height: '220px', borderRadius: '1rem', overflow: 'hidden', backgroundImage: "url('/images/lagos-apapa-port.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <div style={{ flex: 1, height: '160px', borderRadius: '1rem', overflow: 'hidden', backgroundImage: "url('/images/pexels-tomfisk-2231744.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 4: By market ── */}
        <section className="section-spacing section-white">
          <div className="mk-container-lg">
            <FadeIn>
              <div className="section-header">
                <span className="pre-title margin-bottom margin-medium">Built For Your Market</span>
                <h2 className="text-display-lg margin-bottom margin-medium">One supplier record. Every regime you answer to.</h2>
              </div>
            </FadeIn>

            <div className="mk-grid-3 mk-gap-md">
              {marketCards.map((card, i) => (
                <FadeIn key={i} delay={i * 0.1}>
                  <div className="mk-card" style={{ padding: '2rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div className="mk-card__icon" style={{ marginBottom: '1rem' }}>
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--mk-text-primary)' }}>
                      {card.title}
                    </h3>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--mk-text-secondary)', lineHeight: 1.7, flexGrow: 1 }}>
                      {card.body}
                    </p>
                    <Link href={card.href} className="mk-card__arrow" style={{ marginTop: '1.25rem', fontSize: '0.875rem', fontWeight: 600 }}>
                      {card.linkLabel} <ChevronRight className="h-4 w-4 inline" />
                    </Link>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 5: Escrow ── */}
        <section
          className="section-spacing"
          style={{ background: 'var(--color--gray-7)', borderRadius: '2rem 2rem 0 0', marginTop: '-2rem', position: 'relative', zIndex: 1 }}
        >
          <div className="mk-container-lg">
            <FadeIn>
              <div className="section-header--left margin-bottom margin-xlarge">
                <span className="pre-title margin-bottom margin-medium">Escrow Payments</span>
                <h2 className="text-display-lg" style={{ maxWidth: '30ch' }}>How your payment actually moves.</h2>
                <p style={{ marginTop: '1rem', fontSize: '1rem', color: 'var(--mk-text-secondary)', lineHeight: 1.75, maxWidth: '46ch' }}>
                  Not a black box, and not a substitute for a letter of credit — a mechanism you can
                  see the logic of. Four steps, each one gated on something a carrier confirmed, not
                  something a supplier claimed.
                </p>
              </div>
            </FadeIn>

            {/* Connected step flow */}
            <div style={{ position: 'relative' }}>
              <div
                className="hidden md:block"
                aria-hidden
                style={{ position: 'absolute', top: '28px', left: 'calc(12.5% + 28px)', right: 'calc(12.5% + 28px)', height: '1px', background: 'var(--mk-border)', zIndex: 0 }}
              />
              <div className="mk-grid-4 mk-gap-md" style={{ position: 'relative', zIndex: 1 }}>
                {escrowSteps.map((step, i) => (
                  <FadeIn key={step.number} delay={i * 0.1}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <div
                        style={{
                          width: '56px', height: '56px', borderRadius: '50%',
                          background: '#fff', border: '1px solid var(--mk-border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          marginBottom: '1.25rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', flexShrink: 0,
                        }}
                      >
                        <step.icon className="w-5 h-5" style={{ color: 'var(--mk-green)' }} />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--mk-text-muted)', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                        STEP {step.number}
                      </span>
                      <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: '0.625rem', color: 'var(--mk-text-primary)', lineHeight: 1.35 }}>
                        {step.title}
                      </h3>
                      <p style={{ fontSize: '0.875rem', color: 'var(--mk-text-secondary)', lineHeight: 1.7 }}>
                        {step.body}
                      </p>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>

            {/* Positioning callout — why suppliers prioritize this over an LC */}
            <FadeIn delay={0.4}>
              <div
                style={{
                  marginTop: '3rem', padding: '2rem 2.25rem', borderRadius: '1.25rem',
                  background: 'var(--mk-green-pale, rgba(46,125,107,0.06))',
                  border: '1px solid rgba(46,125,107,0.16)',
                  display: 'flex', flexDirection: 'column', gap: '0.5rem',
                }}
              >
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--mk-green)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Skip the LC paperwork, not the LC-level trust
                </span>
                <p style={{ fontSize: '0.9375rem', color: 'var(--mk-text-secondary)', lineHeight: 1.75, maxWidth: '64ch' }}>
                  Your best suppliers already deal with buyers who ask for 90-day letter-of-credit
                  terms and the documentary back-and-forth that comes with them. A buyer whose money
                  moves against verified milestones — not months later, and not against a discrepant
                  document — is the contract they take first.
                </p>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ── SECTION 6: Buyer guides — same carousel treatment as the homepage blog section ── */}
        <section className="section-spacing-sm section-white mk-blog-section">
          <div className="mk-container-lg">
            <BlogCarousel
              posts={buyerGuidePosts}
              eyebrow="Buyer Guides"
              heading={<>Do the{' '}<span style={{ color: 'var(--mk-text-muted)', fontWeight: 400 }}>homework</span>{' '}before the contract</>}
              viewAllHref="/blog"
              viewAllLabel="Read All Buyer Guides"
            />
          </div>
        </section>

        {/* ── SECTION 7: FAQ ── */}
        <section className="section-spacing section-white">
          <div className="mk-container-sm">
            <FadeIn>
              <div className="section-header--left margin-bottom margin-xlarge">
                <span className="pre-title margin-bottom margin-medium">FAQ</span>
                <h2 className="text-display-lg">Questions buyers ask before the first contract.</h2>
              </div>
            </FadeIn>
            <SimpleFAQList items={importerFaqs} testIdPrefix="importer-faq" />
          </div>
        </section>
        <FAQSchema faqs={importerFaqs} />

        {/* ── FINAL CTA ── */}
        <section className="section-spacing section-dark">
          <div className="mk-container-sm">
            <FadeIn>
              <div className="flex flex-col items-center text-center" style={{ maxWidth: '40rem', marginInline: 'auto' }}>
                <span className="pre-title margin-bottom margin-medium">
                  <FileText className="h-3.5 w-3.5 inline" style={{ marginRight: '0.375rem' }} />
                  For Importers & Buyers
                </span>
                <h2 className="text-display-lg margin-bottom margin-medium" style={{ color: 'var(--mk-text-primary)' }}>
                  Bring your suppliers onto OriginTrace.
                </h2>
                <p className="margin-bottom margin-xlarge" style={{ color: 'var(--mk-text-secondary)', lineHeight: 1.75 }}>
                  Make on-platform documentation part of the order — supply chain, compliance evidence, lab tests, and shipment tracking, maintained at origin and visible from your workspace. Start with a supplier risk snapshot on a real counterparty.
                </p>
                <div className="flex gap-4" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
                  <Link href="/demo?role=buyer" className="btn-mk-primary btn-mk-lg">
                    Book a demo <ChevronRight className="h-5 w-5" />
                  </Link>
                  <Link href="/blog" className="btn-mk-ghost btn-mk-lg">
                    Read the buyer guides
                  </Link>
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
