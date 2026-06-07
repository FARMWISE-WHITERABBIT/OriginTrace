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

/* Show 2 cards at a time; numbered dots for first 4 posts (matches Webflow "1 of 4") */
const PER_PAGE = 2;
const DOTS = 4;

export function BlogCarousel({ posts }: BlogCarouselProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(Math.min(posts.length, DOTS * PER_PAGE) / PER_PAGE);
  const visible = posts.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  function prev() {
    setPage((p) => (p - 1 + totalPages) % totalPages);
  }
  function next() {
    setPage((p) => (p + 1) % totalPages);
  }

  return (
    <div className="mk-blog-layout">

      {/* LEFT — sticky heading */}
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

      {/* RIGHT — 2-up card slider */}
      <div className="mk-blog-slider">

        {/* Left arrow */}
        <button
          className="mk-blog-arrow-wrap mk-blog-arrow-wrap--left"
          aria-label="Previous posts"
          onClick={prev}
        >
          <div className="mk-blog-arrow-inner">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </div>
        </button>

        {/* Right arrow */}
        <button
          className="mk-blog-arrow-wrap mk-blog-arrow-wrap--right"
          aria-label="Next posts"
          onClick={next}
        >
          <div className="mk-blog-arrow-inner">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
        </button>

        {/* 2 cards */}
        <div className="mk-blog-cards">
          {visible.map((post, i) => (
            <FadeIn key={`${page}-${post.slug}`} delay={i * 0.06}>
              <Link href={`/blog/${post.slug}`} className="mk-blog-item">
                <div className="mk-blog-image-wrap">
                  {post.coverImage ? (
                    <Image
                      src={post.coverImage}
                      alt={post.coverImageAlt || post.title}
                      fill
                      className="mk-blog-image object-cover"
                      sizes="(max-width: 768px) 100vw, 40vw"
                    />
                  ) : (
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${post.coverGradient} flex items-center justify-center`}
                    >
                      <BookOpen className="h-8 w-8" style={{ color: 'rgba(255,255,255,0.15)' }} />
                    </div>
                  )}
                  <div className="mk-blog-chips">
                    <span className="mk-blog-category">{post.category}</span>
                    <span className="mk-blog-date">{post.date}</span>
                  </div>
                </div>
                <div className="mk-blog-info">
                  <h2 className="mk-blog-title">{post.title}</h2>
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>

        {/* Numbered dot nav — 1 2 3 4 (matching .slide-nav w-round w-num) */}
        <div className="mk-slide-nav" role="tablist" aria-label="Blog slides">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              className="mk-slide-dot"
              role="tab"
              aria-pressed={i === page}
              aria-label={`Show slide ${i + 1} of ${totalPages}`}
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
