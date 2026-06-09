'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, MapPin, Package, ShieldCheck, FileText, Banknote } from 'lucide-react';

interface Capability {
  number: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

const journeySteps: Capability[] = [
  {
    number: '01',
    title: 'Register Your Sources',
    description: 'GPS-map every farm plot or extraction site and register every contributor with verified identity. Your supply chain starts with verified origin — not declarations.',
    icon: MapPin,
  },
  {
    number: '02',
    title: 'Capture & Aggregate',
    description: 'Field agents log collection in real time, even without internet. Every unit — bag, batch, or consignment — is traceable back to its exact source. Syncs automatically when connectivity returns.',
    icon: Package,
  },
  {
    number: '03',
    title: 'Run a Compliance Check',
    description: 'Score your shipment against EU, UK, US, China, and UAE requirements simultaneously before you book freight. Know your clearance status and resolve gaps before loading.',
    icon: ShieldCheck,
  },
  {
    number: '04',
    title: 'Generate Your Documents',
    description: 'Produce your pedigree certificate, waybill, and full compliance pack from a single verified record. No manual assembly across multiple systems.',
    icon: FileText,
  },
  {
    number: '05',
    title: 'Settle Payment',
    description: 'Your buyer pays into escrow. Funds release when the shipment is confirmed and compliance is verified. No chasing. No trust-based risk.',
    icon: Banknote,
  },
];

export function CapabilitySlider({ capabilities }: { capabilities?: Capability[] }) {
  const steps = capabilities ?? journeySteps;
  const [active, setActive] = useState(0);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => { setIsMobile(e.matches); setActive(0); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  const VISIBLE = isMobile ? 1 : 3;
  const total = steps.length;
  const maxActive = Math.max(0, total - VISIBLE);

  function prev() { setActive((a) => Math.max(0, a - 1)); }
  function next() { setActive((a) => Math.min(maxActive, a + 1)); }

  return (
    <div>
      {/* Header row */}
      <div className="flex items-end justify-between gap-6 margin-bottom margin-xlarge">
        <div style={{ maxWidth: '36rem' }}>
          <span
            className="pre-title margin-bottom margin-medium"
            style={{ background: 'transparent', border: '1px solid var(--mk-green)', color: 'var(--mk-green)' }}
          >
            How It Works
          </span>
          <h2 className="text-display-lg" style={{ color: 'var(--mk-text-on-dark)', marginTop: '0.75rem' }}>
            From source to payment —{' '}
            <span style={{ color: 'var(--mk-green-mid)' }}>every step connected</span>
          </h2>
        </div>

        {/* Arrow nav */}
        <div className="flex gap-3 shrink-0">
          <button
            onClick={prev}
            disabled={active === 0}
            aria-label="Previous"
            style={{
              width: '3rem', height: '3rem', borderRadius: '50%',
              border: '1.5px dashed rgba(255,255,255,0.3)',
              background: 'transparent',
              color: active === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: active === 0 ? 'default' : 'pointer',
              transition: 'color 0.2s',
            }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={next}
            disabled={active >= maxActive}
            aria-label="Next"
            style={{
              width: '3rem', height: '3rem', borderRadius: '50%',
              border: '1.5px dashed rgba(255,255,255,0.3)',
              background: 'transparent',
              color: active >= maxActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: active >= maxActive ? 'default' : 'pointer',
              transition: 'color 0.2s',
            }}
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Slider track */}
      <div style={{ overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${total}, calc((100% - ${(VISIBLE - 1)}rem) / ${VISIBLE}))`,
            gap: '1rem',
            transform: `translateX(calc(-${active} * (100% / ${total}) * ${total / VISIBLE}))`,
            transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        >
          {steps.map((step, i) => {
            const Icon = step.icon;
            const isLast = i === steps.length - 1;
            return (
              <div
                key={i}
                data-testid={`card-capability-${i}`}
                style={{
                  background: isLast ? 'rgba(46,125,107,0.18)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${isLast ? 'rgba(46,125,107,0.5)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '1rem',
                  padding: '2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: isMobile ? '360px' : '420px',
                }}
              >
                {/* Icon */}
                <div style={{ marginBottom: '1.25rem', color: 'var(--mk-green-mid)' }}>
                  <Icon className="w-7 h-7" strokeWidth={1.5} />
                </div>

                {/* Step number chip */}
                <div style={{ marginBottom: '0.5rem' }}>
                  <span style={{
                    fontSize: '0.6875rem', fontWeight: 700,
                    color: 'var(--mk-green-mid)',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                  }}>
                    Step {step.number}
                  </span>
                  {isLast && (
                    <span style={{
                      marginLeft: '0.5rem',
                      fontSize: '0.6rem', fontWeight: 700,
                      background: 'var(--mk-green)', color: '#fff',
                      padding: '0.15rem 0.5rem', borderRadius: '9999px',
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      Only on OriginTrace
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 style={{
                  fontSize: '1.0625rem', fontWeight: 700,
                  color: '#ffffff', marginBottom: '0.75rem', lineHeight: 1.35,
                }}>
                  {step.title}
                </h3>

                {/* Body */}
                <p style={{
                  fontSize: '0.875rem',
                  color: 'rgba(255,255,255,0.55)',
                  lineHeight: 1.75,
                  flex: 1,
                  marginBottom: '1.5rem',
                }}>
                  {step.description}
                </p>

                {/* CTA */}
                <Link
                  href="/solutions"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    fontSize: '0.8125rem', fontWeight: 600,
                    color: 'rgba(255,255,255,0.75)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '9999px', padding: '0.4rem 1rem',
                    width: 'fit-content', textDecoration: 'none',
                    transition: 'border-color 0.2s, color 0.2s',
                  }}
                >
                  View detail
                </Link>

                {/* Watermark number */}
                <div aria-hidden style={{
                  marginTop: 'auto', paddingTop: '1.5rem',
                  fontSize: '5rem', fontWeight: 800,
                  color: 'rgba(255,255,255,0.04)',
                  lineHeight: 1, fontFamily: 'var(--font-display)',
                  letterSpacing: '-0.05em', textAlign: 'right',
                }}>
                  {step.number}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dot pagination */}
      <div className="flex items-center justify-center gap-2" style={{ marginTop: '2rem' }}>
        {Array.from({ length: maxActive + 1 }).map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            aria-label={`Go to slide ${i + 1}`}
            style={{
              width: i === active ? '1.75rem' : '0.4rem',
              height: '0.4rem', borderRadius: '9999px',
              background: i === active ? 'var(--mk-green-mid)' : 'rgba(255,255,255,0.2)',
              border: 'none', cursor: 'pointer', padding: 0,
              transition: 'width 0.3s, background 0.3s',
            }}
          />
        ))}
      </div>
    </div>
  );
}
