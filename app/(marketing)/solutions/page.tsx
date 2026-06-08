import Link from 'next/link';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import { FadeIn } from '@/components/marketing/motion';
import {
  Globe,
  MapPin,
  FileText,
  ShieldCheck,
  Factory,
  Shield,
  ClipboardCheck,
  Smartphone,
  Wifi,
  Users,
  ArrowRight,
  Check,
  ChevronRight,
  Banknote,
} from 'lucide-react';

const roles = [
  {
    id: 'exporters',
    label: 'Exporter',
    icon: Globe,
    headline: 'Know your compliance status before you book freight.',
    body: 'You source produce, arrange logistics, and manage buyers across multiple markets. OriginTrace gives you a compliance score before loading, documentation when you ship, and payment settlement when you deliver.',
    features: [
      'Pre-shipment compliance score across 5 markets simultaneously',
      'One-click export documentation — no manual assembly',
      'Milestone escrow: payment releases when shipment clears',
      'Farmer disbursement direct from the platform',
    ],
  },
  {
    id: 'cooperatives',
    label: 'Cooperative / Aggregator',
    icon: Users,
    headline: 'Hundreds of farmers. One verified traceability record.',
    body: 'You work with smallholder farmers across multiple communities. OriginTrace helps you register every farm, log every collection, and generate a single verified batch record — even without internet.',
    features: [
      'GPS farm registration for every contributing plot',
      'Offline-first batch collection — syncs when connectivity returns',
      'Bag-level traceability from farm to export warehouse',
      'Anti-fraud yield validation to protect your data integrity',
    ],
  },
  {
    id: 'compliance',
    label: 'Compliance Officer',
    icon: ClipboardCheck,
    headline: 'Stop assembling compliance packs at midnight.',
    body: 'You are responsible for ensuring every shipment meets destination market requirements. OriginTrace runs your shipment against all five major frameworks simultaneously and flags gaps before loading.',
    features: [
      'EUDR, FSMA 204, UK Environment Act, GACC, ESMA — all in one check',
      'Automated gap detection with resolution guidance',
      'Audit-ready dossiers generated on demand',
      'Document vault with expiry tracking and alerts',
    ],
  },
  {
    id: 'logistics',
    label: 'Logistics Coordinator',
    icon: FileText,
    headline: 'All your export documents from one source of truth.',
    body: 'You manage dispatch, freight booking, and waybill documentation. OriginTrace generates every export document from the same traceability record — no duplicate data entry across five different systems.',
    features: [
      'Waybill and pedigree certificate generation',
      'Shipment pipeline with 9-stage tracking',
      'Container and port manifest linkage',
      'Shared document access for buyers and inspectors',
    ],
  },
];

const workflowSteps = [
  {
    number: '01',
    title: 'Farm Registration',
    body: 'Register every farm and farmer with GPS coordinates and identity verification. Your supply chain starts with verified origin — not declarations.',
    icon: MapPin,
  },
  {
    number: '02',
    title: 'Batch Collection',
    body: 'Field agents log aggregation in real time — even offline. Every bag is traceable to the farm it came from. Syncs automatically when connectivity returns.',
    icon: Factory,
  },
  {
    number: '03',
    title: 'Compliance Clearance',
    body: 'Run your shipment against EU, UK, US, China, and UAE requirements simultaneously. Know your clearance status and fix gaps before you book freight.',
    icon: ShieldCheck,
  },
  {
    number: '04',
    title: 'Shipment & Documentation',
    body: 'Generate your pedigree certificate, waybill, and full compliance pack in one place. No more assembling files from multiple sources the night before loading.',
    icon: FileText,
  },
  {
    number: '05',
    title: 'Payment Settlement',
    body: 'Your buyers pay into escrow. Funds release when the shipment is confirmed and compliance is verified. No more chasing. No more trust-based risk.',
    icon: Banknote,
  },
];

export default function SolutionsPage() {
  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--color--gray-8)' }}>
      <MarketingNav />

      <main>

        {/* ── HERO ─────────────────────────────────────────────── */}
        <section className="section-spacing section-dark" style={{ paddingTop: 'calc(var(--section-md) + 5rem)' }}>
          <div className="mk-container-lg">
            <FadeIn>
              <div className="section-header section-header--left" style={{ maxWidth: '42rem' }}>
                <span className="pre-title margin-bottom margin-medium">Platform</span>
                <h1 className="text-display-xl section-header__title" style={{ color: 'var(--mk-text-on-dark)' }}>
                  One platform.{' '}
                  <span style={{ color: 'var(--mk-green-mid)' }}>Every step from farm to payment.</span>
                </h1>
                <p className="section-header__body" style={{ color: 'var(--mk-text-on-dark-2)', textAlign: 'left', marginInline: 0 }}>
                  Built for exporters, cooperatives, and compliance teams who need to prove
                  their supply chain — not just describe it. OriginTrace connects every step
                  from first-mile field capture to payment settlement.
                </p>
                <div className="flex flex-wrap gap-3 mt-8">
                  <Link href="/demo" className="btn-mk-primary btn-mk-lg">
                    Request Access
                    <ChevronRight className="h-5 w-5" />
                  </Link>
                  <Link href="#how-it-works" className="btn-mk-ghost btn-mk-lg">
                    See the workflow
                  </Link>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>


        {/* ── WHO IT'S FOR ─────────────────────────────────────── */}
        <section className="section-spacing section-white">
          <div className="mk-container-lg">
            <FadeIn>
              <div className="section-header">
                <span className="pre-title margin-bottom margin-medium">Who It&apos;s For</span>
                <h2 className="text-display-lg section-header__title">
                  Built for every role{' '}
                  <span className="text-mk-muted">in the export chain</span>
                </h2>
                <p className="section-header__body">
                  Whether you move the produce, aggregate it, clear it, or ship it —
                  OriginTrace has a workflow built for your specific role.
                </p>
              </div>
            </FadeIn>

            <div className="mk-grid-2" style={{ gap: '1.5rem' }}>
              {roles.map((role, i) => (
                <FadeIn key={role.id} delay={i * 0.07}>
                  <div
                    className="mk-card h-full flex flex-col"
                    data-testid={`card-role-${role.id}`}
                    style={{ padding: '2rem' }}
                  >
                    <div className="flex items-center gap-3 margin-bottom margin-large">
                      <div className="mk-card__icon" style={{ marginBottom: 0, flexShrink: 0 }}>
                        <role.icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--mk-green)' }}>
                        {role.label}
                      </span>
                    </div>
                    <h3 className="font-bold margin-bottom margin-small" style={{ fontSize: '1.125rem', color: 'var(--mk-text-primary)', lineHeight: 1.35 }}>
                      {role.headline}
                    </h3>
                    <p className="margin-bottom margin-large" style={{ color: 'var(--mk-text-secondary)', fontSize: '0.9375rem', lineHeight: 1.7, flex: 1 }}>
                      {role.body}
                    </p>
                    <ul className="flex flex-col gap-2.5">
                      {role.features.map((f, j) => (
                        <li key={j} className="mk-list-item">
                          <span className="mk-list-item__icon">
                            <Check className="w-3 h-3" />
                          </span>
                          <span style={{ fontSize: '0.875rem', color: 'var(--mk-text-secondary)' }}>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>


        {/* ── HOW IT WORKS ─────────────────────────────────────── */}
        <section id="how-it-works" className="section-spacing section-gray">
          <div className="mk-container-lg">
            <FadeIn>
              <div className="section-header section-header--left margin-bottom margin-xlarge">
                <span
                  className="pre-title margin-bottom margin-medium"
                  style={{ background: 'transparent', border: '1px solid var(--mk-green)', color: 'var(--mk-green)' }}
                >
                  The Workflow
                </span>
                <h2 className="text-display-lg section-header__title">
                  From farm to payment —{' '}
                  <span className="text-mk-muted">every step connected</span>
                </h2>
                <p className="section-header__body" style={{ textAlign: 'left', marginInline: 0 }}>
                  OriginTrace is the only platform that follows your produce all the way from
                  the farm to the moment you get paid. No missing links. No compliance gaps.
                </p>
              </div>
            </FadeIn>

            <div className="relative">
              {/* Vertical connector line */}
              <div
                className="hidden lg:block absolute"
                style={{ left: '27px', top: '28px', bottom: '28px', width: '1px', background: 'var(--mk-border)' }}
              />

              <div className="flex flex-col gap-6">
                {workflowSteps.map((step, i) => (
                  <FadeIn key={i} delay={i * 0.08}>
                    <div className="flex gap-6 lg:gap-8 items-start">
                      {/* Step number circle */}
                      <div
                        className="flex-shrink-0 flex items-center justify-center rounded-full font-bold text-sm z-10"
                        style={{
                          width: '56px',
                          height: '56px',
                          background: i === 4 ? 'var(--mk-green)' : 'var(--mk-surface-white)',
                          border: `2px solid ${i === 4 ? 'var(--mk-green)' : 'var(--mk-border)'}`,
                          color: i === 4 ? '#fff' : 'var(--mk-text-primary)',
                          fontFamily: 'var(--font-display)',
                        }}
                      >
                        {step.number}
                      </div>
                      {/* Content */}
                      <div
                        className="mk-card flex-1"
                        style={{
                          padding: '1.5rem',
                          borderLeft: i === 4 ? '3px solid var(--mk-green)' : undefined,
                        }}
                      >
                        <div className="flex items-center gap-3 margin-bottom margin-small">
                          <step.icon className="w-4 h-4" style={{ color: 'var(--mk-green)', flexShrink: 0 }} />
                          <h3 className="font-bold" style={{ fontSize: '1rem', color: 'var(--mk-text-primary)' }}>
                            {step.title}
                            {i === 4 && (
                              <span
                                className="ml-2 text-xs font-semibold"
                                style={{ background: 'var(--mk-green-light)', color: 'var(--mk-green)', padding: '0.15rem 0.5rem', borderRadius: '9999px' }}
                              >
                                Only on OriginTrace
                              </span>
                            )}
                          </h3>
                        </div>
                        <p style={{ color: 'var(--mk-text-secondary)', fontSize: '0.9375rem', lineHeight: 1.7 }}>
                          {step.body}
                        </p>
                      </div>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>
          </div>
        </section>


        {/* ── OFFLINE SECTION ──────────────────────────────────── */}
        <section className="section-spacing section-white">
          <div className="mk-container-lg">
            <div className="mk-technology-grid">
              <FadeIn direction="right">
                <div className="mk-technology-title-wrap">
                  <span className="pre-title margin-bottom margin-large" style={{ display: 'inline-flex' }}>
                    Field Operations
                  </span>
                  <h2 className="text-display-lg" style={{ color: 'var(--mk-text-primary)' }}>
                    Built for places where{' '}
                    <span className="text-mk-muted">the internet isn&apos;t reliable.</span>
                  </h2>
                  <p style={{ color: 'var(--mk-text-secondary)', lineHeight: 1.7, marginTop: '1.25rem', marginBottom: '2rem' }}>
                    Field agents in rural collection points can log batches, register farmers,
                    and record GPS coordinates without a live connection. Data syncs automatically
                    when connectivity is restored. No gaps in your traceability record because
                    of network coverage.
                  </p>
                  <div className="flex flex-col gap-3">
                    {[
                      { icon: Smartphone, text: 'Works on any smartphone — no app store download required' },
                      { icon: Wifi, text: 'Full offline data capture via PWA with automatic background sync' },
                      { icon: Shield, text: 'Anti-fraud protections: GPS verification and yield validation' },
                    ].map((item, i) => (
                      <div key={i} className="mk-list-item">
                        <span className="mk-list-item__icon">
                          <item.icon className="w-3.5 h-3.5" />
                        </span>
                        <span style={{ fontSize: '0.9375rem', color: 'var(--mk-text-secondary)' }}>{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>

              <FadeIn direction="left" delay={0.1}>
                <div className="mk-technology-info-wrap">
                  <div
                    className="mk-technology-image-wrap"
                    style={{
                      borderRadius: '1.25rem',
                      overflow: 'hidden',
                      aspectRatio: '4/3',
                      backgroundImage: "url('/images/farmer in field.jpg')",
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                </div>
              </FadeIn>
            </div>
          </div>
        </section>


        {/* ── FINAL CTA ────────────────────────────────────────── */}
        <section className="section-spacing section-dark">
          <div className="mk-container-sm">
            <FadeIn>
              <div className="flex flex-col items-center text-center" style={{ maxWidth: '40rem', marginInline: 'auto' }}>
                <span className="pre-title margin-bottom margin-large">Get Started</span>
                <h2 className="text-display-lg text-mk-on-dark margin-bottom margin-medium">
                  See it working against your actual export operation.
                </h2>
                <p className="margin-bottom margin-xlarge-2" style={{ color: 'var(--mk-text-on-dark-2)', lineHeight: 1.7, fontSize: '1.0625rem' }}>
                  Request a 30-minute walkthrough. We will map your current workflow and show
                  you exactly where OriginTrace fits — for your commodity, your markets, your team.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/demo" className="btn-mk-primary btn-mk-lg">
                    Request a Demo
                    <ChevronRight className="h-5 w-5" />
                  </Link>
                  <Link href="/compliance" className="btn-mk-ghost btn-mk-lg">
                    View compliance coverage
                    <ArrowRight className="h-4 w-4" />
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
