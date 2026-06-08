'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Shield, MapPin, Wifi, Users, QrCode, FileText } from 'lucide-react';

const icons = [Shield, MapPin, Wifi, Users, QrCode, FileText];

interface Capability {
  number: string;
  title: string;
  description: string;
  points: string[];
}

export function CapabilitySlider({ capabilities }: { capabilities: Capability[] }) {
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const VISIBLE = 3;
  const total = capabilities.length;
  const maxActive = total - VISIBLE;

  function prev() {
    setActive((a) => Math.max(0, a - 1));
  }

  function next() {
    setActive((a) => Math.min(maxActive, a + 1));
  }

  const translatePct = (active / total) * 100;

  return (
    <div>
      {/* Header row */}
      <div className="flex items-end justify-between gap-6 margin-bottom margin-xlarge">
        <div style={{ maxWidth: '32rem' }}>
          <span
            className="pre-title margin-bottom margin-medium"
            style={{ background: 'transparent', border: '1px solid var(--mk-green)', color: 'var(--mk-green)' }}
          >
            How It Works
          </span>
          <h2 className="text-display-lg" style={{ color: 'var(--mk-text-on-dark)', marginTop: '0.75rem' }}>
            From farm to payment —{' '}
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
              width: '3rem',
              height: '3rem',
              borderRadius: '50%',
              border: '1.5px dashed rgba(255,255,255,0.3)',
              background: 'transparent',
              color: active === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: active === 0 ? 'default' : 'pointer',
              transition: 'color 0.2s, border-color 0.2s',
            }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={next}
            disabled={active >= maxActive}
            aria-label="Next"
            style={{
              width: '3rem',
              height: '3rem',
              borderRadius: '50%',
              border: '1.5px dashed rgba(255,255,255,0.3)',
              background: 'transparent',
              color: active >= maxActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: active >= maxActive ? 'default' : 'pointer',
              transition: 'color 0.2s, border-color 0.2s',
            }}
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Slider track */}
      <div style={{ overflow: 'hidden' }}>
        <div
          ref={trackRef}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${total}, calc((100% - 2rem) / 3))`,
            gap: '1rem',
            transform: `translateX(calc(-${active} * (100% / ${total}) * ${total / VISIBLE}))`,
            transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        >
          {capabilities.map((cap, i) => {
            const Icon = icons[i % icons.length];
            return (
              <div
                key={i}
                data-testid={`card-capability-${i}`}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '1rem',
                  padding: '2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: '420px',
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: '2.5rem',
                    height: '2.5rem',
                    marginBottom: '1.25rem',
                    color: 'var(--mk-green-mid)',
                  }}
                >
                  <Icon className="w-7 h-7" strokeWidth={1.5} />
                </div>

                {/* Title */}
                <h3
                  style={{
                    fontSize: '1.0625rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    marginBottom: '0.625rem',
                    lineHeight: 1.35,
                  }}
                >
                  {cap.title}
                </h3>

                {/* Body */}
                <p
                  style={{
                    fontSize: '0.875rem',
                    color: 'rgba(255,255,255,0.55)',
                    lineHeight: 1.7,
                    marginBottom: '1.5rem',
                    flex: 1,
                  }}
                >
                  {cap.description}
                </p>

                {/* CTA */}
                <Link
                  href="/solutions"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.75)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '9999px',
                    padding: '0.4rem 1rem',
                    width: 'fit-content',
                    textDecoration: 'none',
                    transition: 'border-color 0.2s, color 0.2s',
                  }}
                >
                  View detail
                </Link>

                {/* Decorative number watermark */}
                <div
                  aria-hidden
                  style={{
                    marginTop: 'auto',
                    paddingTop: '2rem',
                    fontSize: '5rem',
                    fontWeight: 800,
                    color: 'rgba(255,255,255,0.04)',
                    lineHeight: 1,
                    fontFamily: 'var(--font-display)',
                    letterSpacing: '-0.05em',
                    textAlign: 'right',
                  }}
                >
                  {cap.number}
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
              height: '0.4rem',
              borderRadius: '9999px',
              background: i === active ? 'var(--mk-green-mid)' : 'rgba(255,255,255,0.2)',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              transition: 'width 0.3s, background 0.3s',
            }}
          />
        ))}
      </div>
    </div>
  );
}
