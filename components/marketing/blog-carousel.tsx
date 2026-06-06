'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, ArrowRight } from 'lucide-react';
import { FadeIn } from '@/components/marketing/motion';
import type { BlogPost } from '@/lib/blog';

interface BlogCarouselProps {
  posts: BlogPost[];
}

/* Show 4 posts in the slider, matching the Webflow reference */
const SLIDES = 4;

export function BlogCarousel({ posts }: BlogCarouselProps) {
  const [page, setPage] = useState(0);
  const slides = posts.slice(0, SLIDES);
  const visible = slides[page];

  function prev() {
    setPage((p) => (p - 1 + SLIDES) % SLIDES);
  }
  function next() {
    setPage((p) => (p + 1) % SLIDES);
  }

  return (
    <div className="mk-blog-layout">
      {/* LEFT — heading */}
      <FadeIn>
        <div className="mk-blog-layout__heading">
          <span className="pre-title margin-bottom margin-medium">Our Blog</span>
          <h2
            className="text-display-lg"
            data-testid="text-blog-headline"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              lineHeight: 1.15,
              color: 'var(--mk-text-primary)',
              marginTop: '0.75rem',
            }}
          >
            Insights &amp;{' '}
            <span style={{ color: 'var(--mk-text-muted)', fontWeight: 400 }}>
              case studies
            </span>{' '}
            from our team
          </h2>
          <div style={{ marginTop: '2rem' }}>
            <Link href="/blog" className="btn-mk-outline">
              View All Insights
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </FadeIn>

      {/* RIGHT — slider (.blog-slider equivalent) */}
      <div className="mk-blog-slider" role="region" aria-label="Blog posts carousel">

        {/* Mask — clips the active slide */}
        <div className="mk-blog-mask">
          <FadeIn key={`${page}-${visible.slug}`}>
            <Link href={`/blog/${visible.slug}`} className="mk-blog-item">
              <div className="mk-blog-image-wrap">
                {visible.coverImage ? (
                  <Image
                    src={visible.coverImage}
                    alt={visible.coverImageAlt || visible.title}
                    fill
                    className="mk-blog-image object-cover"
                    sizes="(max-width: 768px) 100vw, 55vw"
                  />
                ) : (
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${visible.coverGradient} flex items-center justify-center`}
                  >
                    <BookOpen className="h-8 w-8" style={{ color: 'rgba(255,255,255,0.15)' }} />
                  </div>
                )}
                <div className="mk-blog-image-overlay" />
                <div className="mk-blog-meta-wrap">
                  <div className="mk-blog-category">{visible.category}</div>
                  <div className="mk-blog-date">{visible.date}</div>
                </div>
              </div>
              <div className="mk-blog-info">
                <h2 className="mk-blog-title">{visible.title}</h2>
              </div>
            </Link>
          </FadeIn>
        </div>

        {/* Left arrow (.blog-arrow-wrap left) */}
        <button
          className="mk-blog-arrow-wrap mk-blog-arrow-wrap--left"
          aria-label="previous slide"
          onClick={prev}
        >
          <div className="mk-blog-arrow-inner">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </div>
        </button>

        {/* Right arrow (.blog-arrow-wrap right) */}
        <button
          className="mk-blog-arrow-wrap mk-blog-arrow-wrap--right"
          aria-label="next slide"
          onClick={next}
        >
          <div className="mk-blog-arrow-inner">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
        </button>

        {/* Numbered dot nav (.slide-nav w-round w-num) */}
        <div className="mk-slide-nav" role="tablist" aria-label="Slides">
          {slides.map((_, i) => (
            <button
              key={i}
              className="mk-slide-dot"
              role="tab"
              aria-pressed={i === page}
              aria-label={`Show slide ${i + 1} of ${SLIDES}`}
              data-active={i === page || undefined}
              onClick={() => setPage(i)}
            >
              {i + 1}
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
