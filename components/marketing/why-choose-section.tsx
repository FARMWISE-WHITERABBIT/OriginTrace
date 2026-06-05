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
      {/* ── Left column — accordion list ───────────────────────────────── */}
      <div className="flex flex-col">
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
                  {/* Icon + title row */}
                  <div className="flex items-center gap-3 mb-0.5">
                    <span
                      className="mk-icon-badge flex-shrink-0 transition-colors duration-200"
                      style={{
                        width: '2rem',
                        height: '2rem',
                        borderRadius: '0.5rem',
                        backgroundColor: isActive
                          ? 'var(--mk-green)'
                          : 'var(--mk-green-light)',
                        color: isActive ? '#fff' : 'var(--mk-green)',
                      }}
                    >
                      {feature.icon}
                    </span>

                    <h3
                      className="text-display-sm transition-colors duration-200"
                      style={{
                        color: isActive ? 'var(--mk-green)' : 'var(--mk-text-primary)',
                      }}
                    >
                      {feature.title}
                    </h3>
                  </div>

                  {/* Expandable body */}
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
                          className="text-sm leading-relaxed pt-3 pb-1 pl-0"
                          style={{ color: 'var(--mk-text-secondary)' }}
                        >
                          {feature.body}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </button>

              {/* Dashed divider between items */}
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

      {/* ── Right column — tall photo with overlaid CTA button ───────────── */}
      <div className="relative lg:sticky lg:top-24">
        <div
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: '3/4', borderRadius: '1.5rem' }}
        >
          {/* Real photo */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "url('/images/farmer in field.jpg')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />

          {/* Subtle bottom gradient so CTA button reads clearly */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, transparent 50%, rgba(20,50,40,0.65) 100%)',
            }}
          />

          {/* Overlaid CTA button — absolutely positioned at bottom */}
          <div className="absolute bottom-6 left-0 right-0 z-20 flex justify-center px-6">
            <Link href="/solutions" className="btn-mk-primary">
              Meet our team
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
