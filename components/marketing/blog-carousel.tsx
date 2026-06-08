'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, ArrowLeft, ArrowRight } from 'lucide-react';
import { FadeIn } from '@/components/marketing/motion';
import type { BlogPost } from '@/lib/blog';

interface BlogCarouselProps {
  posts: BlogPost[];
}

const PER_PAGE = 2;

export function BlogCarousel({ posts }: BlogCarouselProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(posts.length / PER_PAGE);
  const total = posts.length;

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

          {/* Arrow nav — matches How It Works dashed circle style */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
            <button
              onClick={prev}
              aria-label="Previous posts"
              style={{
                width: '3rem', height: '3rem', borderRadius: '50%',
                border: '1.5px dashed var(--mk-border)',
                background: 'transparent',
                color: 'var(--mk-text-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                transition: 'border-color 0.2s, color 0.2s',
              }}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={next}
              aria-label="Next posts"
              style={{
                width: '3rem', height: '3rem', borderRadius: '50%',
                border: '1.5px dashed var(--mk-border)',
                background: 'transparent',
                color: 'var(--mk-text-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                transition: 'border-color 0.2s, color 0.2s',
              }}
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div style={{ marginTop: '1.25rem' }}>
            <Link href="/blog" className="btn-mk-outline">
              View All Insights
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </FadeIn>

      {/* RIGHT — sliding card track */}
      <div className="mk-blog-slider">
        {/* Sliding track */}
        <div style={{ overflow: 'hidden' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${total}, calc((100% - 1rem) / 2))`,
              gap: '1rem',
              transform: `translateX(calc(-${page} * (100% / ${total}) * ${total / PER_PAGE}))`,
              transition: 'transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            }}
          >
            {posts.map((post, i) => (
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
                  <h2 className="mk-blog-title">{post.title}</h2>
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
