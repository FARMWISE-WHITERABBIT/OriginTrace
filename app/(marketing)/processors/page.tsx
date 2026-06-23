import React from 'react';
import Link from 'next/link';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import { FadeIn } from '@/components/marketing/motion';
import HeroBackground from '@/components/marketing/hero-background';
import {
  Scale,
  Factory,
  AlertTriangle,
  Shield,
  FileText,
  ChevronRight,
  Check,
  ClipboardCheck,
} from 'lucide-react';

/* ─── DATA ─────────────────────────────────────────────────────────── */

const stats = [
  { label: 'Chain-of-custody through processing', value: '100%' },
  { label: 'Mass balance tolerance', value: '±0.5%' },
  { label: 'Document types from one record', value: '6+' },
];

const iconMap: Record<string, React.ElementType> = {
  Scale,
  Factory,
  Shield,
  AlertTriangle,
};

const processingControls = [
  {
    iconName: 'Scale',
    title: 'Mass Balance',
    description: 'Input weight is logged at intake. Output weight is captured at each processing stage. The system flags any discrepancy outside tolerance before the batch moves forward.',
  },
  {
    iconName: 'Factory',
    title: 'Transformation Audit Trail',
    description: 'Every processing step — when it started, who operated it, what went in, what came out — is logged against the batch record. The trail is immutable.',
  },
  {
    iconName: 'Shield',
    title: 'Identity Preservation',
    description: 'Where buyers require identity-preserved product — single-origin, single-variety, certified — OriginTrace maintains strict lot separation through processing.',
  },
  {
    iconName: 'AlertTriangle',
    title: 'Contamination Prevention',
    description: 'Processing runs are logged by input lot. If a contamination event is identified downstream, the system can isolate the affected lots and trace them back to source within minutes.',
  },
];

const commodityRecovery = [
  {
    name: 'Cocoa',
    input: 'Fermented dry cocoa',
    products: [
      { name: 'Cocoa liquor', range: '80–85%' },
      { name: 'Cocoa butter', range: '38–45%' },
      { name: 'Cocoa powder', range: '20–25%' },
    ],
  },
  {
    name: 'Cashew',
    input: 'Raw cashew nut',
    products: [
      { name: 'Whole kernels', range: '22–28%' },
      { name: 'CNSL', range: '18–22%' },
      { name: 'Shell', range: '65–70%' },
    ],
  },
  {
    name: 'Palm Kernel',
    input: 'Palm kernel',
    products: [
      { name: 'Oil', range: '45–52%' },
      { name: 'Cake', range: '40–48%' },
      { name: 'Losses', range: '5–10%' },
    ],
  },
];

const pedigreeItems = [
  'GPS-verified farm origins',
  'Processing steps applied',
  'Mass balance summary',
  'QR code for buyer verification',
  'Compliance status per framework',
];

const documentTypes = [
  'Pedigree certificate',
  'Phytosanitary waybill',
  'Due diligence statement',
  'Certification pack',
];

/* ─── PAGE ──────────────────────────────────────────────────────────── */

export default function ProcessorsPage() {
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
                      Processing & Chain-of-Custody
                    </span>
                  </FadeIn>
                  <FadeIn delay={0.15}>
                    <h1
                      className="text-display-2xl margin-bottom margin-large"
                      style={{ color: '#ffffff', fontFamily: 'var(--font-display)', maxWidth: '16ch' }}
                    >
                      Every transformation logged. Every gram accounted for.
                    </h1>
                  </FadeIn>
                  <FadeIn delay={0.2}>
                    <p
                      className="margin-bottom margin-xlarge"
                      style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1.0625rem)', lineHeight: 1.75, maxWidth: '40ch', color: 'rgba(255,255,255,0.62)' }}
                    >
                      Processing is where most traceability records break down. OriginTrace maintains chain-of-custody through every transformation — sorting, drying, hulling, grading, and blending — so the pedigree record that reaches your buyer reflects what actually happened.
                    </p>
                  </FadeIn>
                  <FadeIn delay={0.3}>
                    <Link href="/demo" className="btn-mk-primary btn-mk-lg">
                      See how processing traceability works <ChevronRight className="h-5 w-5" />
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

        {/* ── SECTION 2: Processing controls ── */}
        <section className="section-spacing section-white">
          <div className="mk-container-lg">
            <FadeIn>
              <div className="section-header">
                <span className="pre-title margin-bottom margin-medium">Controls</span>
                <h2 className="text-display-lg margin-bottom margin-medium">Four controls that keep the chain intact.</h2>
              </div>
            </FadeIn>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
              {processingControls.map((control, i) => {
                const Icon = iconMap[control.iconName];
                return (
                  <FadeIn key={i} delay={i * 0.1}>
                    <div className="mk-card" style={{ padding: '2rem' }}>
                      <div className="mk-card__icon" style={{ marginBottom: '1rem' }}>
                        {Icon && <Icon className="w-5 h-5" />}
                      </div>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--mk-text-primary)' }}>
                        {control.title}
                      </h3>
                      <p style={{ fontSize: '0.9375rem', color: 'var(--mk-text-secondary)', lineHeight: 1.7 }}>
                        {control.description}
                      </p>
                    </div>
                  </FadeIn>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── SECTION 3: Dashboard preview ── */}
        <section className="section-spacing section-dark">
          <div className="mk-container-lg">
            <div className="solutions-field-header" style={{ marginBottom: '2.5rem' }}>
              <div>
                <span className="pre-title" style={{ marginBottom: '0.75rem', display: 'inline-block' }}>Live Processing View</span>
                <h2 className="text-display-lg" style={{ marginTop: '0.75rem' }}>
                  Your processing operation, visible in real time.
                </h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <p style={{ fontSize: '1rem', color: 'var(--mk-text-secondary)', lineHeight: 1.75 }}>
                  Processing coordinators log runs directly in OriginTrace. Every input lot, processing step, and output batch is visible to the exporter, compliance officer, and logistics coordinator simultaneously.
                </p>
              </div>
            </div>

            <FadeIn delay={0.2}>
              <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '2rem' }}>
                <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Live Dashboard</p>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff', marginBottom: '1.5rem' }}>Processing Run Summary</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '0.5rem', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>Input Batches</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#ffffff' }}>12 batches</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>Total Weight</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#ffffff' }}>24,500 kg</span>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '0.5rem', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>Output Product</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#ffffff' }}>Cocoa Butter</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>Output Weight</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#ffffff' }}>10,045 kg</span>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '0.5rem', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>Recovery Rate</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#ffffff' }}>41.0%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>Expected Range</span>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>38% – 45%</span>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(46,125,107,0.2)', borderRadius: '0.5rem', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.875rem', color: 'var(--mk-green-mid)' }}>Mass Balance</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Check className="h-4 w-4" style={{ color: 'var(--mk-green-mid)' }} />
                        <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--mk-green-mid)' }}>Verified</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '0.5rem', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>Source Farms</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#ffffff' }}>347 farms traced</span>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ── SECTION 4: Commodity recovery ── */}
        <section
          className="section-spacing"
          style={{ background: 'var(--color--gray-7)', borderRadius: '2rem 2rem 0 0', marginTop: '-2rem', position: 'relative', zIndex: 1 }}
        >
          <div className="mk-container-lg">
            <FadeIn>
              <div className="section-header">
                <span className="pre-title margin-bottom margin-medium">Recovery Standards</span>
                <h2 className="text-display-lg margin-bottom margin-medium">Commodity-specific yield benchmarks built in.</h2>
              </div>
            </FadeIn>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
              {commodityRecovery.map((commodity, i) => (
                <FadeIn key={i} delay={i * 0.1}>
                  <div className="mk-card" style={{ padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--mk-text-primary)' }}>
                      {commodity.name}
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--mk-text-muted)', marginBottom: '1rem' }}>{commodity.input}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      {commodity.products.map((product, j) => (
                        <p key={j} style={{ fontSize: '0.875rem', color: 'var(--mk-text-secondary)' }}>
                          {product.name}: {product.range}
                        </p>
                      ))}
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 5: Output & Compliance ── */}
        <section className="section-spacing section-white">
          <div className="mk-container-lg">
            {/* Panel 1 */}
            <FadeIn>
              <div
                style={{
                  background: 'var(--color--gray-1)',
                  borderRadius: '1rem',
                  padding: '3rem',
                  marginBottom: '1.5rem',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '3rem',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div className="mk-card__icon" style={{ marginBottom: '1.25rem' }}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <h3 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--mk-text-primary)', marginBottom: '1rem' }}>
                    Finished Goods Pedigree
                  </h3>
                  <p style={{ fontSize: '0.9375rem', color: 'var(--mk-text-secondary)', lineHeight: 1.75, marginBottom: '1.5rem' }}>
                    When processing is complete, OriginTrace generates a finished goods pedigree certificate from the source-to-output record. It carries the GPS-verified origin of every contributing lot, the processing steps applied, the mass balance summary, and the QR link for buyer verification. No manual assembly.
                  </p>
                  <Link href="/pedigree" className="btn-mk-ghost btn-mk-lg" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    See the pedigree record <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--mk-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
                    What's in the pedigree
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {pedigreeItems.map((item, i) => (
                      <div key={i} className="mk-list-item">
                        <span className="mk-list-item__icon"><Check className="w-3 h-3" /></span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* Panel 2 */}
            <FadeIn delay={0.1}>
              <div
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--mk-border)',
                  borderRadius: '1rem',
                  padding: '3rem',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '3rem',
                  alignItems: 'center',
                }}
              >
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--mk-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
                    Document types generated
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {documentTypes.map((doc, i) => (
                      <div key={i} className="mk-list-item">
                        <span className="mk-list-item__icon"><Check className="w-3 h-3" /></span>
                        <span>{doc}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mk-card__icon" style={{ marginBottom: '1.25rem' }}>
                    <ClipboardCheck className="w-5 h-5" />
                  </div>
                  <h3 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--mk-text-primary)', marginBottom: '1rem' }}>
                    Export Compliance Documentation
                  </h3>
                  <p style={{ fontSize: '0.9375rem', color: 'var(--mk-text-secondary)', lineHeight: 1.75, marginBottom: '1.5rem' }}>
                    The finished goods record is the input for the compliance documentation pack. Every document is generated from the same verified record. One source of truth.
                  </p>
                  <Link href="/solutions" className="btn-mk-ghost btn-mk-lg" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    See all compliance features <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="section-spacing section-dark">
          <div className="mk-container-sm">
            <FadeIn>
              <div className="flex flex-col items-center text-center mk-cta-block">
                <span className="pre-title margin-bottom margin-medium">Processing Traceability</span>
                <h2 className="text-display-lg margin-bottom margin-medium" style={{ color: 'var(--mk-text-primary)' }}>
                  Chain-of-custody that survives processing.
                </h2>
                <p className="margin-bottom margin-xlarge" style={{ color: 'var(--mk-text-secondary)', lineHeight: 1.75 }}>
                  Most traceability platforms stop at the farm gate. OriginTrace follows the product through every transformation — so the pedigree record that reaches your buyer is as strong as the origin evidence you started with.
                </p>
                <div className="flex gap-4" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
                  <Link href="/demo" className="btn-mk-primary btn-mk-lg">
                    Book a walkthrough <ChevronRight className="h-5 w-5" />
                  </Link>
                  <Link href="/pedigree" className="btn-mk-ghost btn-mk-lg">
                    See the pedigree record
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
