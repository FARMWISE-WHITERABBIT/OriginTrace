'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, BookOpen, ArrowRight } from 'lucide-react';
import { FadeIn } from '@/components/marketing/motion';
import type { BlogPost } from '@/lib/blog';

interface BlogCarouselProps {
  posts: BlogPost[];
}

export function BlogCarousel({ posts }: BlogCarouselProps) {
  const [page, setPage] = useState(0);
  const totalPages = posts.length;
  const visible = posts[page];

  function prev() {
    setPage((p) => (p - 1 + totalPages) % totalPages);
  }
  function next() {
    setPage((p) => (p + 1) % totalPages);
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

      {/* RIGHT — carousel */}
      <div className="mk-blog-cards-wrap">
        {/* Prev arrow */}
        <button
          className="mk-blog-arrow mk-blog-arrow--prev"
          aria-label="Previous posts"
          onClick={prev}
        >
          <ChevronRight className="h-4 w-4" style={{ transform: 'rotate(180deg)' }} />
        </button>

        {/* Next arrow */}
        <button
          className="mk-blog-arrow mk-blog-arrow--next"
          aria-label="Next posts"
          onClick={next}
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Single card — full width of right column */}
        <FadeIn key={`${page}-${visible.slug}`}>
          <Link href={`/blog/${visible.slug}`} className="mk-blog-card">
            <div className="mk-blog-card__img-wrap">
              {visible.coverImage ? (
                <Image
                  src={visible.coverImage}
                  alt={visible.coverImageAlt || visible.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 55vw"
                />
              ) : (
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${visible.coverGradient} flex items-center justify-center`}
                >
                  <BookOpen className="h-8 w-8" style={{ color: 'rgba(255,255,255,0.15)' }} />
                </div>
              )}
              <div className="mk-blog-card__overlay" />
              <div className="mk-blog-meta-wrap">
                <div className="mk-blog-category">{visible.category}</div>
                <div className="mk-blog-date">{visible.date}</div>
              </div>
            </div>
            <div className="mk-blog-card__body">
              <h3 className="mk-blog-card__title">{visible.title}</h3>
            </div>
          </Link>
        </FadeIn>

        {/* Dot nav — show first 8 posts as dots */}
        <div className="mk-blog-dots">
          {posts.slice(0, 8).map((_, i) => (
            <button
              key={i}
              className="mk-blog-dot"
              data-active={i === page || undefined}
              aria-label={`Show post ${i + 1}`}
              onClick={() => setPage(i)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
