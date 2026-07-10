import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import { FadeIn } from '@/components/marketing/motion';
import HeroBackground from '@/components/marketing/hero-background';
import { CapabilitySlider } from '@/components/marketing/capability-slider';
import { ChevronRight, ShieldCheck, Banknote, FileText } from 'lucide-react';

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
    title: 'UAE Importers & Re-Exporters',
    body: 'Clear Dubai Municipality inspection with a complete, consistent data pack — and keep the EU channel open on re-export. Origin follows the goods: the same supplier record that clears FIRS in Dubai satisfies due diligence in Rotterdam.',
    href: '/compliance/uae',
    linkLabel: 'UAE compliance',
  },
  {
    title: 'Buyers Sourcing for China',
    body: 'GACC enforcement is live: unregistered facilities are refused at Chinese ports. Verify that your supplier\'s facility registration, traceability records, and documentation hold up before the contract is signed.',
    href: '/compliance/china',
    linkLabel: 'China GACC compliance',
  },
];

const escrowPoints = [
  {
    title: 'Funds held, not wired',
    body: 'Money sits in escrow against agreed milestones instead of leaving your account on an invoice and a promise. Both sides see the same ledger.',
  },
  {
    title: 'Released on verified events',
    body: 'Milestones release against carrier-confirmed shipping events — loaded on board, vessel departed, discharged at destination — not against a supplier\'s say-so. Estimated events never move money.',
  },
  {
    title: 'You confirm the final tranche',
    body: 'Delivery is never automated. The last payment releases only when both sides confirm — and any dispute freezes everything until it\'s resolved.',
  },
];

const buyerGuides = [
  {
    title: 'How to Verify a Supplier\'s "EUDR-Ready" Claim',
    href: '/blog/how-to-verify-supplier-eudr-claims',
  },
  {
    title: 'How to Verify a Nigerian Exporter Before You Pay',
    href: '/blog/verify-nigerian-exporter-legitimacy',
  },
  {
    title: 'Importing Food Into Dubai: The FIRS Walkthrough',
    href: '/blog/dubai-food-import-firs-registration-guide',
  },
  {
    title: 'Re-Exporting From Dubai to the EU? You Inherit the EU\'s Rules',
    href: '/blog/dubai-reexport-eu-rules-african-commodities',
  },
];

/* ─── PAGE ──────────────────────────────────────────────────────────── */

export default function ImportersPage() {
  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--color--gray-8)' }}>
      <MarketingNav />

      <main>
        {/* ── HERO ── */}
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
                      style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1.0625rem)', lineHeight: 1.75, maxWidth: '42ch', color: 'rgba(255,255,255,0.62)' }}
                    >
                      You carry the compliance liability and the payment risk — your supplier carries the data. OriginTrace closes that gap: your exporters document farms, lab tests, certificates, and shipments at origin, and you verify all of it from one buyer workspace before your money is on the water.
                    </p>
                  </FadeIn>
                  <FadeIn delay={0.3}>
                    <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
                      <Link href="/demo" className="btn-mk-primary btn-mk-lg">
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
          <div className="mk-container-lg">
            <div className="solutions-field-header" style={{ marginBottom: '2.5rem' }}>
              <div>
                <span className="pre-title" style={{ marginBottom: '0.75rem', display: 'inline-block' }}>The Buyer&apos;s Problem</span>
                <h2 className="text-display-lg" style={{ marginTop: '0.75rem' }}>
                  Every supplier says they&apos;re compliant. You&apos;re the one who pays if they aren&apos;t.
                </h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <p style={{ fontSize: '1rem', color: 'var(--mk-text-secondary)', lineHeight: 1.75 }}>
                  Rejected consignments bill the importer of record. Regulators fine the first operator placing goods on the market — not the exporter. And a forged certificate looks exactly like a real one in a PDF. The only durable answer is standing visibility into your supply chain at origin: records that accumulate as your supplier operates, instead of a data pack assembled the week you asked for it.
                </p>
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
                <h2 className="text-display-lg">Pay on proof, not promises.</h2>
              </div>
            </FadeIn>

            <div className="mk-grid-3 mk-gap-md">
              {escrowPoints.map((point, i) => (
                <FadeIn key={i} delay={i * 0.1}>
                  <div className="mk-card" style={{ padding: '2rem' }}>
                    <div className="mk-card__icon" style={{ marginBottom: '1rem' }}>
                      <Banknote className="w-5 h-5" />
                    </div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--mk-text-primary)' }}>
                      {point.title}
                    </h3>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--mk-text-secondary)', lineHeight: 1.7 }}>
                      {point.body}
                    </p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 6: Buyer guides ── */}
        <section className="section-spacing section-white">
          <div className="mk-container-lg">
            <FadeIn>
              <div className="section-header--left margin-bottom margin-xlarge">
                <span className="pre-title margin-bottom margin-medium">Buyer Guides</span>
                <h2 className="text-display-lg">Do the homework before the contract.</h2>
              </div>
            </FadeIn>

            <div className="mk-grid-2 mk-gap-md">
              {buyerGuides.map((guide, i) => (
                <FadeIn key={i} delay={i * 0.05}>
                  <Link href={guide.href} className="mk-card" style={{ padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--mk-text-primary)', lineHeight: 1.5 }}>
                      {guide.title}
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0" style={{ color: 'var(--mk-green)' }} />
                  </Link>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

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
                  <Link href="/demo" className="btn-mk-primary btn-mk-lg">
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
