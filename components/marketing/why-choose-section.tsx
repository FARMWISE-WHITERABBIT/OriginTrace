'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface Feature {
  title: string;
  body: string;
  icon: React.ReactNode;
}

interface WhyChooseSectionProps {
  features: Feature[];
}

export function WhyChooseSection({ features }: WhyChooseSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
      {/* ── Left column — header + accordion ───────────────────────────── */}
      <div className="flex flex-col">
        {/* Section header sits at the top of the left col, aligned with image top */}
        <div style={{ marginBottom: '2.5rem' }}>
          <span
            className="pre-title margin-bottom margin-medium"
            style={{
              background: 'transparent',
              border: '1px solid var(--mk-green)',
              color: 'var(--mk-green)',
            }}
          >
            Why OriginTrace
          </span>
          <h2
            className="text-display-lg"
            style={{ color: 'var(--mk-text-primary)', marginTop: '0.75rem' }}
          >
            Built for exporters.{' '}
            <span className="text-mk-muted">Not just buyers.</span>
          </h2>
        </div>

        {/* Accordion */}
        {features.map((feature, i) => {
          const isActive = i === activeIndex;

          return (
            <div key={i}>
              <button
                className="w-full text-left py-6 flex items-start gap-4 group cursor-pointer"
                onClick={() => setActiveIndex(i)}
                aria-expanded={isActive}
              >
                {/* Green dot indicator */}
                <span
                  className="mt-[0.6rem] flex-shrink-0 w-2.5 h-2.5 rounded-full transition-colors duration-300"
                  style={{
                    backgroundColor: isActive ? 'var(--mk-green)' : 'var(--mk-border)',
                  }}
                />

                <div className="flex-1 min-w-0">
                  <h3
                    className="text-display-sm transition-colors duration-200"
                    style={{
                      color: isActive ? 'var(--mk-green)' : 'var(--mk-text-primary)',
                    }}
                  >
                    {feature.title}
                  </h3>

                  <AnimatePresence initial={false}>
                    {isActive && (
                      <motion.div
                        key="body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                        style={{ overflow: 'hidden' }}
                      >
                        <p
                          className="text-sm leading-relaxed pt-3 pb-1"
                          style={{ color: 'var(--mk-text-secondary)' }}
                        >
                          {feature.body}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </button>

              {i < features.length - 1 && (
                <div
                  style={{
                    height: 0,
                    borderTop: '1px dashed var(--mk-border)',
                    width: '100%',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Right column — image with pill straddling the bottom edge ───── */}
      <div className="relative lg:sticky lg:top-24">
        {/* Padding-bottom reserves space for the pill that hangs below */}
        <div className="relative w-full" style={{ paddingBottom: '2.25rem' }}>
          {/* Image card clips independently */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '3/4',
              borderRadius: '1.5rem',
              overflow: 'hidden',
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: "url('/images/pexels-matt-arellano-1239978561-23022542.jpg')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to bottom, transparent 55%, rgba(10,35,28,0.35) 100%)',
              }}
            />
          </div>

          {/* Outer pill (section bg colour) wraps green inner button, straddles bottom edge */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 20,
              background: 'var(--color--gray-7)',
              borderRadius: '9999px',
              padding: '0.4rem',
            }}
          >
            <Link
              href="/demo"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.85rem 2.5rem',
                borderRadius: '9999px',
                fontSize: '1rem',
                fontWeight: 600,
                background: 'var(--mk-green)',
                color: '#fff',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              Request a Demo
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
