import Link from 'next/link';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import { FadeIn } from '@/components/marketing/motion';
import { LiveAgentIndicator } from '@/components/marketing/trace-animation';
import { DemoFormWidget } from '@/components/marketing/demo-form';
import { Shield, MapPin, FileText, Calendar } from 'lucide-react';

const demoFeatures = [
  {
    icon: Shield,
    title: 'Compliance Assessment',
    body: 'We map your export destinations against EUDR, FSMA 204, UK, China GACC, and UAE ESMA requirements — and identify exactly what documentation you are missing.',
  },
  {
    icon: MapPin,
    title: 'Live Platform Walkthrough',
    body: 'See farm registration, batch traceability, and shipment documentation working in a live environment, using your commodity and your markets.',
  },
  {
    icon: FileText,
    title: 'Pilot Onboarding',
    body: '30-day pilot with full platform access and a dedicated onboarding contact to get your first shipment traceability record live.',
  },
];

export default function DemoPage() {
  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--color--gray-8)' }}>
      <MarketingNav />

      <main>
        <section
          className="section-spacing"
          style={{ paddingTop: 'calc(var(--section-md) + 5rem)', background: 'var(--color--gray-8)' }}
        >
          <div className="mk-container-lg">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'start' }}>

              {/* ── LEFT: Copy ──────────────────────────────────── */}
              <FadeIn direction="right">
                <span className="pre-title margin-bottom margin-medium" data-testid="text-section-label">
                  Request a Demo
                </span>
                <h1
                  className="text-display-xl margin-bottom margin-medium"
                  style={{ color: 'var(--mk-text-primary)' }}
                  data-testid="text-demo-heading"
                >
                  See it working against your actual export operation.
                </h1>
                <p
                  className="margin-bottom margin-xlarge"
                  style={{ color: 'var(--mk-text-secondary)', fontSize: '1.0625rem', lineHeight: 1.7 }}
                  data-testid="text-demo-description"
                >
                  Request a 30-minute walkthrough. We will map your current workflow and show you
                  exactly where OriginTrace fits — for your commodity, your markets, your team.
                </p>

                <div className="flex flex-col gap-5 margin-bottom margin-xlarge">
                  {demoFeatures.map((f, i) => (
                    <div key={i} className="flex gap-4 items-start">
                      <div className="mk-card__icon" style={{ marginBottom: 0, flexShrink: 0 }}>
                        <f.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3
                          className="font-semibold margin-bottom margin-xsmall"
                          style={{ fontSize: '0.9375rem', color: 'var(--mk-text-primary)' }}
                          data-testid={`text-feature-${f.title.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          {f.title}
                        </h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--mk-text-secondary)', lineHeight: 1.65 }}>
                          {f.body}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                  <LiveAgentIndicator />
                  <div className="flex items-center gap-2" style={{ color: 'var(--mk-text-muted)', fontSize: '0.875rem' }}>
                    <Calendar className="h-4 w-4" />
                    <span>Response within 24 hours</span>
                  </div>
                </div>
              </FadeIn>

              {/* ── RIGHT: Form ─────────────────────────────────── */}
              <DemoFormWidget />

            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
