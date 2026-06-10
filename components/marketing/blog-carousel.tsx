'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, ArrowLeft, ArrowRight } from 'lucide-react';
import { FadeIn } from '@/components/marketing/motion';
import type { BlogPost } from '@/lib/blog';

interface BlogCarouselProps {
  posts: BlogPost[];
}

const MOBILE_QUERY = '(max-width: 767px)';

function subscribeToMediaQuery(callback: () => void) {
  const mq = window.matchMedia(MOBILE_QUERY);
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

export function BlogCarousel({ posts }: BlogCarouselProps) {
  const [page, setPage] = useState(0);
  const isMobile = useSyncExternalStore(
    subscribeToMediaQuery,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false
  );

  useEffect(() => {
    setPage(0);
  }, [isMobile]);

  const PER_PAGE = isMobile ? 1 : 2;
  const totalPages = Math.max(1, Math.ceil(posts.length / PER_PAGE));
  const total = posts.length;

  function prev() {
    setPage((p) => (p - 1 + totalPages) % totalPages);
  }
  function next() {
    setPage((p) => (p + 1) % totalPages);
  }

  if (total === 0) return null;

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

      {/* RIGHT — sliding card track with side circle arrows */}
      <div className="mk-blog-slider">

        {/* Left arrow at card left edge */}
        <button
          className="mk-blog-arrow-wrap mk-blog-arrow-wrap--left"
          aria-label="Previous posts"
          onClick={prev}
        >
          <div className="mk-blog-arrow-inner">
            <ArrowLeft width={16} height={16} strokeWidth={2} />
          </div>
        </button>

        {/* Right arrow at card right edge */}
        <button
          className="mk-blog-arrow-wrap mk-blog-arrow-wrap--right"
          aria-label="Next posts"
          onClick={next}
        >
          <div className="mk-blog-arrow-inner">
            <ArrowRight width={16} height={16} strokeWidth={2} />
          </div>
        </button>

        {/* Sliding track */}
        <div style={{ overflow: 'hidden' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${total}, calc((100% - ${PER_PAGE - 1}rem) / ${PER_PAGE}))`,
              gap: '1rem',
              transform: `translateX(calc(-${page} * (100% + 1rem)))`,
              transition: 'transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            }}
          >
            {posts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="mk-blog-item">
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
                  <h3 className="mk-blog-title">{post.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Dot pagination */}
        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '1.5rem' }}>
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              aria-label={`Go to page ${i + 1}`}
              style={{
                width: i === page ? '1.5rem' : '0.375rem',
                height: '0.375rem',
                borderRadius: '9999px',
                background: i === page ? 'var(--mk-green)' : 'var(--mk-border)',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                transition: 'width 0.3s, background 0.3s',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
