import Link from 'next/link';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import { FadeIn } from '@/components/marketing/motion';
import { FAQSchema } from '@/components/marketing/faq-schema';
import { ArrowRight, Globe, Shield, FileCheck, Scale, Landmark, ChevronRight } from 'lucide-react';

const hubFaqs = [
  {
    question: 'Which export regulations affect Nigerian and Ghanaian food exporters in 2026?',
    answer: 'Nigerian and Ghanaian exporters are currently affected by several major regulations simultaneously: the EU Deforestation Regulation (EUDR) with full enforcement by December 2026, China GACC Decree 248 facility registration (deadline June 2026), the UK Environment Act due diligence rules, and the US FDA FSMA 204 Food Traceability Rule. The specific regulations that apply to you depend on which markets you export to and which commodities you handle.',
  },
  {
    question: 'What is the difference between EUDR and GACC?',
    answer: 'EUDR (EU Deforestation Regulation) is a European law that requires commodities like cocoa, coffee, soy, and palm oil to be deforestation-free before entering the EU market. GACC (General Administration of Customs of China) is China\'s customs authority that requires overseas food facilities to be registered under Decree 248 before they can export food products to China. Both regulations affect African agricultural exporters but for different markets and with different documentation requirements.',
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

const regulations = [
  {
    href: '/compliance/eudr',
    icon: Globe,
    flag: '🇪🇺',
    title: 'EU Deforestation Regulation (EUDR)',
    description: 'Zero-deforestation supply chains for 7 commodities entering the EU market. Requires GPS polygon mapping, due diligence statements, and deforestation-free proof.',
    deadline: 'Dec 30, 2026',
    status: 'Enforcement approaching',
    statusStyle: { background: 'var(--mk-yellow-light, #fef9c3)', color: '#92400e' },
    commodities: ['Cocoa', 'Coffee', 'Soy', 'Palm Oil', 'Rubber', 'Cattle', 'Wood'],
  },
  {
    href: '/compliance/usa',
    icon: FileCheck,
    flag: '🇺🇸',
    title: 'FSMA 204 Food Traceability Rule (USA)',
    description: 'FDA\'s traceability requirements for high-risk foods. Mandates Key Data Elements (KDEs), Critical Tracking Events (CTEs), and lot-level recordkeeping.',
    deadline: 'July 20, 2028',
    status: 'Extended deadline',
    statusStyle: { background: '#eff6ff', color: '#1e40af' },
    commodities: ['Fresh Produce', 'Seafood', 'Cheese', 'Eggs', 'Nut Butter', 'Herbs'],
  },
  {
    href: '/compliance/uk',
    icon: Shield,
    flag: '🇬🇧',
    title: 'UK Environment Act — Forest Risk Commodities',
    description: 'Due diligence obligations for large businesses using forest risk commodities. £50M+ turnover threshold with annual reporting requirements.',
    deadline: 'TBD (Pending)',
    status: 'Secondary legislation pending',
    statusStyle: { background: 'var(--mk-surface-gray)', color: 'var(--mk-text-secondary)' },
    commodities: ['Cocoa', 'Palm Oil', 'Soy', 'Beef', 'Rubber', 'Coffee', 'Wood'],
  },
  {
    href: '/compliance/china',
    icon: Landmark,
    flag: '🇨🇳',
    title: 'China Food Safety Import Requirements',
    description: 'GACC facility registration (Decree 248), SAMR labeling standards, inspection & quarantine protocols, and product category approvals for food imports.',
    deadline: 'Active',
    status: 'Currently enforced',
    statusStyle: { background: 'var(--mk-green-light)', color: 'var(--mk-green)' },
    commodities: ['Meat', 'Dairy', 'Grains', 'Seafood', 'Fruits', 'Nuts'],
  },
  {
    href: '/compliance/uae',
    icon: Scale,
    flag: '🇦🇪',
    title: 'UAE Food Safety & Import Compliance',
    description: 'ESMA standards, mandatory Halal certification, municipality import permits, Arabic labeling requirements, and origin declaration for food products.',
    deadline: 'Active',
    status: 'Currently enforced',
    statusStyle: { background: 'var(--mk-green-light)', color: 'var(--mk-green)' },
    commodities: ['All Food Products', 'Meat (Halal)', 'Dairy', 'Processed Foods'],
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
          <section className="section-spacing section-dark" style={{ paddingTop: 'calc(var(--section-md) + 5rem)' }}>
            <div className="mk-container-lg">
              <FadeIn>
                <div className="section-header" style={{ maxWidth: '44rem', marginInline: 'auto' }}>
                  <span className="pre-title margin-bottom margin-medium" data-testid="label-compliance-hub">
                    Compliance Hub
                  </span>
                  <h1
                    className="text-display-xl section-header__title"
                    style={{ color: 'var(--mk-text-on-dark)' }}
                    data-testid="text-compliance-headline"
                  >
                    Your markets changed the rules.{' '}
                    <span style={{ color: 'var(--mk-green-mid)' }}>We track every one.</span>
                  </h1>
                  <p
                    className="section-header__body"
                    style={{ color: 'var(--mk-text-on-dark-2)' }}
                  >
                    Five major import frameworks. One compliance check. OriginTrace runs your
                    shipment against EU, UK, US, China, and UAE requirements simultaneously —
                    before you book freight.
                  </p>
                  <div className="flex flex-wrap gap-3 mt-8 justify-center">
                    <Link href="/demo" className="btn-mk-primary btn-mk-lg">
                      Check My Compliance
                      <ChevronRight className="h-5 w-5" />
                    </Link>
                    <Link href="#regulations" className="btn-mk-ghost btn-mk-lg">
                      Browse regulations
                    </Link>
                  </div>
                </div>
              </FadeIn>
            </div>
          </section>


          {/* ── REGULATIONS LIST ─────────────────────────────────── */}
          <section id="regulations" className="section-spacing section-white">
            <div className="mk-container-lg" style={{ maxWidth: '56rem' }}>
              <FadeIn>
                <div className="section-header margin-bottom margin-xlarge">
                  <span className="pre-title margin-bottom margin-medium">Market Coverage</span>
                  <h2 className="text-display-lg section-header__title">
                    Five markets.{' '}
                    <span className="text-mk-muted">All in one check.</span>
                  </h2>
                  <p className="section-header__body">
                    Select a regulation to see how OriginTrace helps you comply — and which
                    commodities and deadlines apply to your operation.
                  </p>
                </div>
              </FadeIn>

              <div className="flex flex-col gap-4">
                {regulations.map((reg, i) => {
                  const Icon = reg.icon;
                  return (
                    <FadeIn key={reg.href} delay={i * 0.06}>
                      <Link
                        href={reg.href}
                        className="block"
                        data-testid={`card-regulation-${reg.href.split('/').pop()}`}
                      >
                        <div
                          className="mk-card"
                          style={{
                            padding: '1.5rem 2rem',
                            transition: 'box-shadow 0.2s, border-color 0.2s',
                          }}
                        >
                          <div className="flex flex-col md:flex-row md:items-start gap-5">
                            {/* Flag + icon */}
                            <div className="flex items-center gap-3 shrink-0">
                              <span style={{ fontSize: '2rem', lineHeight: 1 }}>{reg.flag}</span>
                              <div className="mk-card__icon" style={{ marginBottom: 0, flexShrink: 0 }}>
                                <Icon className="w-4 h-4" />
                              </div>
                            </div>

                            {/* Content */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                                <h2
                                  className="font-bold"
                                  style={{ fontSize: '1.0625rem', color: 'var(--mk-text-primary)' }}
                                  data-testid={`text-regulation-title-${reg.href.split('/').pop()}`}
                                >
                                  {reg.title}
                                </h2>
                                <span
                                  className="text-xs font-semibold"
                                  style={{
                                    ...reg.statusStyle,
                                    padding: '0.2rem 0.6rem',
                                    borderRadius: '9999px',
                                    whiteSpace: 'nowrap',
                                    width: 'fit-content',
                                  }}
                                >
                                  {reg.status}
                                </span>
                              </div>
                              <p style={{ fontSize: '0.9rem', color: 'var(--mk-text-secondary)', lineHeight: 1.65, marginBottom: '0.75rem' }}>
                                {reg.description}
                              </p>
                              <div className="flex flex-wrap items-center gap-2">
                                <span style={{ fontSize: '0.8125rem', color: 'var(--mk-text-muted)', fontWeight: 500 }}>
                                  Deadline: {reg.deadline}
                                </span>
                                <span style={{ color: 'var(--mk-border)' }}>·</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {reg.commodities.slice(0, 5).map((c) => (
                                    <span
                                      key={c}
                                      className="text-xs"
                                      style={{
                                        padding: '0.15rem 0.5rem',
                                        borderRadius: '0.375rem',
                                        background: 'var(--mk-surface-gray)',
                                        color: 'var(--mk-text-secondary)',
                                      }}
                                    >
                                      {c}
                                    </span>
                                  ))}
                                  {reg.commodities.length > 5 && (
                                    <span
                                      className="text-xs"
                                      style={{
                                        padding: '0.15rem 0.5rem',
                                        borderRadius: '0.375rem',
                                        background: 'var(--mk-surface-gray)',
                                        color: 'var(--mk-text-muted)',
                                      }}
                                    >
                                      +{reg.commodities.length - 5} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Arrow */}
                            <div className="hidden md:flex items-center self-center">
                              <ArrowRight
                                className="h-4 w-4"
                                style={{ color: 'var(--mk-text-muted)' }}
                              />
                            </div>
                          </div>
                        </div>
                      </Link>
                    </FadeIn>
                  );
                })}
              </div>
            </div>
          </section>


          {/* ── FAQ SECTION ──────────────────────────────────────── */}
          <section className="section-spacing section-gray">
            <div className="mk-container-lg" style={{ maxWidth: '52rem' }}>
              <FadeIn>
                <div className="section-header section-header--left margin-bottom margin-xlarge">
                  <span className="pre-title margin-bottom margin-medium" style={{ background: 'transparent', border: '1px solid var(--mk-green)', color: 'var(--mk-green)' }}>
                    Common Questions
                  </span>
                  <h2 className="text-display-lg section-header__title">
                    Compliance questions{' '}
                    <span className="text-mk-muted">we hear most often</span>
                  </h2>
                </div>
              </FadeIn>

              <div className="flex flex-col gap-4">
                {hubFaqs.map((faq, i) => (
                  <FadeIn key={i} delay={i * 0.05}>
                    <div className="mk-card" style={{ padding: '1.5rem 2rem' }}>
                      <h3 className="font-semibold margin-bottom margin-small" style={{ fontSize: '1rem', color: 'var(--mk-text-primary)', lineHeight: 1.4 }}>
                        {faq.question}
                      </h3>
                      <p style={{ fontSize: '0.9375rem', color: 'var(--mk-text-secondary)', lineHeight: 1.7, margin: 0 }}>
                        {faq.answer}
                      </p>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>
          </section>


          {/* ── CTA ──────────────────────────────────────────────── */}
          <section className="section-spacing section-dark">
            <div className="mk-container-sm">
              <FadeIn>
                <div className="flex flex-col items-center text-center" style={{ maxWidth: '40rem', marginInline: 'auto' }}>
                  <span className="pre-title margin-bottom margin-large">Get Started</span>
                  <h2 className="text-display-lg text-mk-on-dark margin-bottom margin-medium" data-testid="text-compliance-cta-headline">
                    Not sure which regulations apply to you?
                  </h2>
                  <p className="margin-bottom margin-xlarge-2" style={{ color: 'var(--mk-text-on-dark-2)', lineHeight: 1.7, fontSize: '1.0625rem' }}>
                    Our team will map your export destinations to the right compliance framework —
                    and show you how OriginTrace covers all of them from a single platform.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link href="/demo" className="btn-mk-primary btn-mk-lg" data-testid="button-compliance-cta-demo">
                      Request Demo
                      <ChevronRight className="h-5 w-5" />
                    </Link>
                    <Link href="/solutions" className="btn-mk-ghost btn-mk-lg" data-testid="button-compliance-cta-explore">
                      Explore Platform
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
    </>
  );
}
