'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { StaggerContainer, StaggerItem } from '@/components/marketing/motion';
import { BookOpen, Clock, ChevronRight } from 'lucide-react';
import type { BlogPost } from '@/lib/blog';

const CATEGORY_COLORS: Record<string, string> = {
  EUDR: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Regulatory: 'bg-red-500/10 text-red-600 dark:text-red-400',
  'Best Practices': 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  Technology: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  Compliance: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
};

interface Props {
  posts: BlogPost[];
  categories: string[];
}

export function BlogGrid({ posts, categories }: Props) {
  const [active, setActive] = useState('All');

  const filtered = active === 'All'
    ? posts
    : posts.filter(p => p.category === active);

  return (
    <section className="py-10 sm:py-12">
      {/* Filter pills */}
      <div className="flex items-center gap-2 flex-wrap mb-8 sm:mb-10">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActive(cat)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              active === cat
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-500'
            }`}
            data-testid={`filter-${cat.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="font-medium">No posts in this category yet</p>
        </div>
      ) : (
        <StaggerContainer
          key={active}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6"
        >
          {filtered.map(post => (
            <StaggerItem key={post.slug}>
              <Link href={`/blog/${post.slug}`} className="group block h-full">
                <Card className="h-full overflow-hidden border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-lg transition-all flex flex-col">
                  <div className={`h-36 relative overflow-hidden shrink-0 bg-gradient-to-br ${post.coverGradient} flex items-center justify-center`}>
                    {post.coverImage ? (
                      <Image
                        src={post.coverImage}
                        alt={post.coverImageAlt || post.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <BookOpen className="h-8 w-8 text-emerald-500/20 dark:text-emerald-400/20" />
                    )}
                  </div>
                  <CardContent className="p-5 flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[post.category] || 'bg-slate-100 text-slate-600'}`}>
                        {post.category}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {post.readingTime}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm mb-2 text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-snug flex-1">
                      {post.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4 line-clamp-3">
                      {post.description}
                    </p>
                    <div className="flex items-center justify-between mt-auto pt-2">
                      <span className="text-[10px] text-slate-400">{post.date}</span>
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 group-hover:gap-1.5 transition-all">
                        Read <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </section>
  );
}
