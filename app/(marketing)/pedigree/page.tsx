import React from 'react';
import Link from 'next/link';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import { FadeIn } from '@/components/marketing/motion';
import HeroBackground from '@/components/marketing/hero-background';
import { CapabilitySlider } from '@/components/marketing/capability-slider';
import { IPhoneMockup } from '@/components/marketing/iphone-mockup';
import { ScanningReveal } from '@/components/marketing/trace-animation';
import {
  ChevronRight,
  Check,
  QrCode,
} from 'lucide-react';

/* ─── DATA ─────────────────────────────────────────────────────────── */

const stats = [
  { label: 'Source-verified not self-declared', value: '100%' },
  { label: 'Publicly verifiable in real time', value: 'QR-linked' },
  { label: 'Data fields per farm in every record', value: '6+' },
];

const pedigreeCapabilities = [
  {
    number: '01',
    title: 'Farm Origin',
    description: 'Every contributing farm or extraction site is GPS-registered and identity-verified before collection begins. The pedigree starts here, not at the warehouse.',
    iconName: 'MapPin',
  },
  {
    number: '02',
    title: 'Batch Collection',
    description: 'Field agents log each collection against registered sources. Weight, variety, GPS point, and contributor identity are captured and linked to the batch record.',
    iconName: 'Package',
  },
  {
    number: '03',
    title: 'Processing & Aggregation',
    description: 'Each transformation — sorting, drying, hulling, grading — is logged against the source record. Mass balance is maintained. The chain is never broken.',
    iconName: 'Factory',
  },
  {
    number: '04',
    title: 'Pedigree QR Generation',
    description: 'A tamper-evident QR code is generated from the verified record. Scan it at any point in the chain to access the full origin and compliance evidence.',
    iconName: 'FileText',
  },
];

const verificationCards = [
  {
    title: 'Scan the QR',
    body: 'Any smartphone. No app required. The QR links to the live pedigree record hosted on OriginTrace infrastructure.',
  },
  {
    title: 'Access the Passport',
    body: 'Farm names, GPS coordinates, collection dates, processing steps, compliance scores, and certification status — all in one view.',
  },
  {
    title: 'Confirm Compliance',
    body: 'The passport shows which frameworks the shipment has been checked against and the result of each check. Buyers and auditors can verify independently.',
  },
];

const beneficiaryCards = [
  {
    title: 'For Buyers',
    body: 'You need to clear the shipment at port, satisfy your own due diligence requirements, and give your downstream buyers the sourcing evidence they need. The OriginTrace pedigree gives you independently verifiable origin data.',
  },
  {
    title: 'For Auditors',
    body: 'The OriginTrace pedigree record is structured, timestamped, GPS-anchored, and publicly accessible. It is designed to satisfy audit requirements, not to replace the audit.',
  },
  {
    title: 'For Customs & Regulators',
    body: 'The QR-linked pedigree gives you direct access to the underlying record — without waiting for the exporter to assemble a documentation pack.',
  },
  {
    title: 'For Cooperatives & Farmers',
    body: 'The pedigree record is the evidence that gets you access to premium buyers and compliance-sensitive markets — generated automatically from the same data your field agents already capture.',
  },
];

/* ─── PAGE ──────────────────────────────────────────────────────────── */

export default function PedigreePage() {
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
                      Pedigree & Digital Product Passport
                    </span>
                  </FadeIn>
                  <FadeIn delay={0.15}>
                    <h1
                      className="text-display-2xl margin-bottom margin-large"
                      style={{ color: '#ffffff', fontFamily: 'var(--font-display)', maxWidth: '16ch' }}
                    >
                      The proof that travels with the product.
                    </h1>
                  </FadeIn>
                  <FadeIn delay={0.2}>
                    <p
                      className="margin-bottom margin-xlarge"
                      style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1.0625rem)', lineHeight: 1.75, maxWidth: '40ch', color: 'rgba(255,255,255,0.62)' }}
                    >
                      A pedigree certificate is only as strong as the data behind it. OriginTrace generates tamper-evident, QR-linked pedigree records and Digital Product Passports from a verified source-to-export record — not from self-declaration.
                    </p>
                  </FadeIn>
                  <FadeIn delay={0.3}>
                    <Link href="/demo" className="btn-mk-primary btn-mk-lg">
                      See a sample pedigree record <ChevronRight className="h-5 w-5" />
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

        {/* ── SECTION 2: 4-step flow ── */}
        <section className="section-spacing section-dark">
          <div className="mk-container-lg">
            <CapabilitySlider capabilities={pedigreeCapabilities} />
          </div>
        </section>

        {/* ── SECTION 3: Digital Product Passport ── */}
        <section
          className="section-spacing"
          style={{ background: 'var(--color--gray-7)', borderRadius: '2rem 2rem 0 0', marginTop: '-2rem', position: 'relative', zIndex: 1 }}
        >
          <div className="mk-container-lg">
            <div className="solutions-field-header" style={{ marginBottom: '2.5rem' }}>
              <div>
                <span className="pre-title" style={{ marginBottom: '0.75rem', display: 'inline-block' }}>Digital Product Passport</span>
                <h2 className="text-display-lg" style={{ marginTop: '0.75rem' }}>
                  Structured data your buyers and regulators can independently verify.
                </h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <p style={{ fontSize: '1rem', color: 'var(--mk-text-secondary)', lineHeight: 1.75 }}>
                  The OriginTrace Digital Product Passport outputs a JSON-LD structured record containing GPS coordinates, farmer identities, collection dates, processing steps, compliance scores, and certification status. It is publicly accessible via QR, machine-readable by buyer systems, and compatible with EU DPP emerging standards.
                </p>
              </div>
            </div>

            <div style={{ background: '#0f1117', borderRadius: '0.75rem', padding: '1.5rem', fontFamily: 'monospace', fontSize: '0.8125rem', color: '#c9d1d9', overflowX: 'auto' }}>
              <pre className="whitespace-pre-wrap"><code>{`{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Cocoa Butter — FW-2026-CB-0847",
  "identifier": "DPP-OT-2026-0847",
  "manufacturer": { "@type": "Organization", "name": "Lagos Processing Co." },
  "material": [{ "@type": "Product", "name": "Raw Cocoa Beans", "productionDate": "2026-01-15", "originAddress": { "addressCountry": "NG", "geo": { "latitude": 7.38, "longitude": 3.94 } } }],
  "sustainabilityClaim": ["Deforestation-Free", "GPS-Verified Origin"],
  "verificationUrl": "/verify/DPP-OT-2026-0847"
}`}</code></pre>
            </div>
          </div>
        </section>

        {/* ── SECTION 4: Scan. Verify. Trust ── */}
        <section className="section-spacing section-white">
          <div className="mk-container-lg">
            <FadeIn>
              <div className="section-header">
                <span className="pre-title margin-bottom margin-medium">Verification</span>
                <h2 className="text-display-lg margin-bottom margin-medium">Three steps. Zero trust required.</h2>
              </div>
            </FadeIn>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
              {verificationCards.map((card, i) => (
                <FadeIn key={i} delay={i * 0.1}>
                  <div className="mk-card" style={{ padding: '2rem' }}>
                    <div className="mk-card__icon" style={{ marginBottom: '1rem' }}>
                      <QrCode className="w-5 h-5" />
                    </div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--mk-text-primary)' }}>
                      {card.title}
                    </h3>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--mk-text-secondary)', lineHeight: 1.7 }}>
                      {card.body}
                    </p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 5: Why it matters ── */}
        <section
          className="section-spacing"
          style={{ background: 'var(--color--gray-7)', borderRadius: '2rem 2rem 0 0', marginTop: '-2rem', position: 'relative', zIndex: 1 }}
        >
          <div className="mk-container-lg">
            <FadeIn>
              <div className="section-header--left margin-bottom margin-xlarge">
                <span className="pre-title margin-bottom margin-medium">Why It Matters</span>
                <h2 className="text-display-lg">Who benefits from a verified pedigree record.</h2>
              </div>
            </FadeIn>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
              {beneficiaryCards.map((card, i) => (
                <FadeIn key={i} delay={i * 0.1}>
                  <div className="mk-card" style={{ padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--mk-text-primary)' }}>
                      {card.title}
                    </h3>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--mk-text-secondary)', lineHeight: 1.7 }}>
                      {card.body}
                    </p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="section-spacing section-dark">
          <div className="mk-container-sm">
            <FadeIn>
              <div className="flex flex-col items-center text-center mk-cta-block">
                <span className="pre-title margin-bottom margin-medium">Pedigree</span>
                <h2 className="text-display-lg margin-bottom margin-medium" style={{ color: 'var(--mk-text-primary)' }}>
                  A pedigree record that stands up to scrutiny.
                </h2>
                <p className="margin-bottom margin-xlarge" style={{ color: 'var(--mk-text-secondary)', lineHeight: 1.75 }}>
                  Built from GPS-verified source data, linked by QR, and independently verifiable at any point in the chain. See what a pedigree record looks like for your commodity.
                </p>
                <div className="flex gap-4" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
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
  );
}
