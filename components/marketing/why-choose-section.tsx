'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface Feature {
  title: string;
  body: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface WhyChooseSectionProps {
  features: Feature[];
}

export function WhyChooseSection({ features }: WhyChooseSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
      {/* Left column — accordion list */}
      <div className="flex flex-col">
        {features.map((feature, i) => {
          const isActive = i === activeIndex;
          const Icon = feature.icon;
          return (
            <div key={i}>
              <button
                className="w-full text-left py-6 flex items-start gap-4 group"
                onClick={() => setActiveIndex(i)}
                aria-expanded={isActive}
              >
                {/* Green dot indicator */}
                <span
                  className="mt-2 flex-shrink-0 w-2.5 h-2.5 rounded-full transition-colors duration-300"
                  style={{
                    backgroundColor: isActive ? 'var(--mk-green)' : 'var(--mk-border)',
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span
                      className="mk-icon-badge"
                      style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem' }}
                    >
                      <Icon className="w-4 h-4" />
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
                          className="text-sm leading-relaxed pt-2 pb-1"
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
                <hr
                  className="mk-divider-h"
                  style={{
                    borderStyle: 'dashed',
                    background: 'none',
                    borderTop: '1px dashed var(--mk-border)',
                    height: 0,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Right column — tall image with CTA overlay */}
      <div className="relative lg:sticky lg:top-24">
        <div
          className="relative w-full overflow-hidden rounded-2xl"
          style={{ aspectRatio: '3/4' }}
        >
          {/* Background gradient visual */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-6"
            style={{
              background: 'linear-gradient(160deg, #1d5c4a 0%, #2E7D6B 40%, #1a4a3a 100%)',
            }}
          >
            {/* Decorative supply chain dots */}
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Background pattern */}
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)',
                  backgroundSize: '28px 28px',
                }}
              />
              {/* Centered icon cluster */}
              <div className="relative z-10 flex flex-col items-center gap-4 px-8">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.12)' }}
                >
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 40 40"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="opacity-80"
                  >
                    <path
                      d="M20 4C11.163 4 4 11.163 4 20C4 28.837 11.163 36 20 36C28.837 36 36 28.837 36 20C36 11.163 28.837 4 20 4ZM20 10C22.209 10 24 11.791 24 14C24 16.209 22.209 18 20 18C17.791 18 16 16.209 16 14C16 11.791 17.791 10 20 10ZM20 32C16 32 12.467 30.013 10.267 27C10.32 23.333 17.333 21.333 20 21.333C22.653 21.333 29.68 23.333 29.733 27C27.533 30.013 24 32 20 32Z"
                      fill="white"
                    />
                  </svg>
                </div>
                <div className="text-center">
                  <p
                    className="text-base font-semibold"
                    style={{ color: 'rgba(255,255,255,0.9)' }}
                  >
                    Supply Chain Platform
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: 'rgba(255,255,255,0.55)' }}
                  >
                    Farm to Export. Verified.
                  </p>
                </div>
                {/* Mini stats */}
                <div
                  className="flex items-center gap-4 mt-4 px-5 py-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.1)' }}
                >
                  <div className="text-center">
                    <p
                      className="text-xl font-extrabold"
                      style={{ color: 'rgba(255,255,255,0.95)', fontFamily: 'var(--font-display)', letterSpacing: '-0.04em' }}
                    >
                      500+
                    </p>
                    <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      Farms
                    </p>
                  </div>
                  <div
                    className="w-px self-stretch"
                    style={{ background: 'rgba(255,255,255,0.15)' }}
                  />
                  <div className="text-center">
                    <p
                      className="text-xl font-extrabold"
                      style={{ color: 'rgba(255,255,255,0.95)', fontFamily: 'var(--font-display)', letterSpacing: '-0.04em' }}
                    >
                      99.2%
                    </p>
                    <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      Clearance
                    </p>
                  </div>
                  <div
                    className="w-px self-stretch"
                    style={{ background: 'rgba(255,255,255,0.15)' }}
                  />
                  <div className="text-center">
                    <p
                      className="text-xl font-extrabold"
                      style={{ color: 'rgba(255,255,255,0.95)', fontFamily: 'var(--font-display)', letterSpacing: '-0.04em' }}
                    >
                      12
                    </p>
                    <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      Countries
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Overlaid CTA button at bottom */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20 px-6">
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
