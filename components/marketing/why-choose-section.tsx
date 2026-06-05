'use client';

import React, { useState } from 'react';
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

      {/* ── Right column — tall image placeholder with CTA overlay ──────── */}
      <div className="relative lg:sticky lg:top-24">
        <div
          className="relative w-full overflow-hidden rounded-2xl"
          style={{ aspectRatio: '3/4' }}
        >
          {/* Background gradient — emerald-800 → emerald-900 */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(160deg, #065f46 0%, #2E7D6B 35%, #1F5F52 65%, #064e3b 100%)',
            }}
          />

          {/* Dot-grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)',
              backgroundSize: '26px 26px',
            }}
          />

          {/* Supply-chain visual content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-8 z-10">
            {/* Platform icon */}
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}
            >
              <svg
                width="40"
                height="40"
                viewBox="0 0 40 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="opacity-85"
              >
                <path
                  d="M20 3C10.611 3 3 10.611 3 20C3 29.389 10.611 37 20 37C29.389 37 37 29.389 37 20C37 10.611 29.389 3 20 3ZM20 9C22.761 9 25 11.239 25 14C25 16.761 22.761 19 20 19C17.239 19 15 16.761 15 14C15 11.239 17.239 9 20 9ZM20 33.5C15.5 33.5 11.525 31.26 9.111 27.812C9.17 23.667 17.333 21.417 20 21.417C22.654 21.417 30.83 23.667 30.889 27.812C28.475 31.26 24.5 33.5 20 33.5Z"
                  fill="white"
                />
              </svg>
            </div>

            {/* Labels */}
            <div className="text-center">
              <p
                className="text-base font-semibold"
                style={{ color: 'rgba(255,255,255,0.92)' }}
              >
                Supply Chain Platform
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: 'rgba(255,255,255,0.52)' }}
              >
                Farm to Export. Verified.
              </p>
            </div>

            {/* Mini stat row */}
            <div
              className="flex items-center gap-5 mt-2 px-5 py-3 rounded-xl w-full max-w-[16rem]"
              style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)' }}
            >
              <div className="text-center flex-1">
                <p
                  className="text-xl font-extrabold leading-none"
                  style={{
                    color: 'rgba(255,255,255,0.95)',
                    fontFamily: 'var(--font-display)',
                    letterSpacing: '-0.04em',
                  }}
                >
                  500+
                </p>
                <p className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Farms
                </p>
              </div>

              <div
                className="w-px self-stretch"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              />

              <div className="text-center flex-1">
                <p
                  className="text-xl font-extrabold leading-none"
                  style={{
                    color: 'rgba(255,255,255,0.95)',
                    fontFamily: 'var(--font-display)',
                    letterSpacing: '-0.04em',
                  }}
                >
                  99.2%
                </p>
                <p className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Clearance
                </p>
              </div>

              <div
                className="w-px self-stretch"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              />

              <div className="text-center flex-1">
                <p
                  className="text-xl font-extrabold leading-none"
                  style={{
                    color: 'rgba(255,255,255,0.95)',
                    fontFamily: 'var(--font-display)',
                    letterSpacing: '-0.04em',
                  }}
                >
                  12
                </p>
                <p className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Countries
                </p>
              </div>
            </div>

            {/* Supply chain step icons row */}
            <div className="flex items-center gap-2 mt-3">
              {[
                { label: 'Farm' },
                { label: 'Collect' },
                { label: 'Process' },
                { label: 'Export' },
              ].map((step, idx) => (
                <React.Fragment key={step.label}>
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.12)' }}
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ background: 'rgba(255,255,255,0.6)' }}
                      />
                    </div>
                    <span
                      className="text-[9px] font-medium"
                      style={{ color: 'rgba(255,255,255,0.45)' }}
                    >
                      {step.label}
                    </span>
                  </div>
                  {idx < 3 && (
                    <div
                      className="w-4 h-px mb-3"
                      style={{ background: 'rgba(255,255,255,0.2)' }}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Overlaid CTA button — absolutely positioned at bottom */}
          <div className="absolute bottom-6 left-0 right-0 z-20 flex justify-center px-6">
            <Link href="/solutions" className="btn-mk-primary btn-mk-sm">
              Explore the Platform
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
