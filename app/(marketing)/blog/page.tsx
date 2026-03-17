import Link from 'next/link';
import type { Metadata } from 'next';
import { getAllPosts } from '@/lib/blog';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/marketing/motion';
import { BookOpen, Clock, ArrowRight, ChevronRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Insights — Compliance & Traceability Blog',
  description: 'Expert guidance on EUDR compliance, China GACC requirements, export traceability, and supply chain best practices for agricultural exporters and importers.',
  alternates: { canonical: 'https://origintrace.trade/blog' },
  openGraph: {
    title: 'Insights — Compliance & Traceability Blog | OriginTrace',
    description: 'Expert guidance on EUDR, GACC, and supply chain traceability for agricultural exporters.',
  },
};

const CATEGORY_COLORS: Record<string, string> = {
  EUDR: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Regulatory: 'bg-red-500/10 text-red-600 dark:text-red-400',
  'Best Practices': 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  Technology: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  Compliance: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
};

export default function BlogListingPage() {
  const allPosts = getAllPosts();
  const categories = ['All', ...Array.from(new Set(allPosts.map(p => p.category)))];
  const featured = allPosts[0];
  const rest = allPosts.slice(1);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <MarketingNav />

      <main className="pt-24 pb-20 md:pb-28">
        {/* ── Hero ── */}
        <section className="py-14 md:py-20 border-b border-slate-100 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn>
              <div className="max-w-2xl">
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 block">
                  [ Insights ]
                </span>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
                  Compliance & Traceability Insights
                </h1>
                <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
                  Practical guidance on EUDR, China GACC, and global supply chain traceability — written for exporters, importers, and compliance teams.
                </p>
              </div>
            </FadeIn>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-6">

          {/* ── Featured Post ── */}
          {featured && (
            <section className="py-12 border-b border-slate-100 dark:border-slate-800">
              <FadeIn>
                <Link href={`/blog/${featured.slug}`} className="group block">
                  <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
                    <div className={`h-64 md:h-80 rounded-2xl bg-gradient-to-br ${featured.coverGradient} flex items-center justify-center border border-slate-200 dark:border-slate-700 overflow-hidden`}>
                      <BookOpen className="h-16 w-16 text-emerald-500/20 dark:text-emerald-400/20" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[featured.category] || 'bg-slate-100 text-slate-600'}`}>
                          {featured.category}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {featured.readingTime}
                        </span>
                      </div>
                      <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-tight">
                        {featured.title}
                      </h2>
                      <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                        {featured.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">{featured.date}</span>
                        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 group-hover:gap-2 transition-all">
                          Read Article <ArrowRight className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </FadeIn>
            </section>
          )}

          {/* ── Category filter + grid ── */}
          <section className="py-12">
            <FadeIn className="flex items-center gap-2 flex-wrap mb-10">
              {categories.map(cat => (
                <span
                  key={cat}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border cursor-default select-none ${
                    cat === 'All'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {cat}
                </span>
              ))}
            </FadeIn>

            <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rest.map(post => (
                <StaggerItem key={post.slug}>
                  <Link href={`/blog/${post.slug}`} className="group block h-full">
                    <Card className="h-full overflow-hidden border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-lg transition-all">
                      <div className={`h-36 bg-gradient-to-br ${post.coverGradient} flex items-center justify-center`}>
                        <BookOpen className="h-8 w-8 text-emerald-500/20 dark:text-emerald-400/20" />
                      </div>
                      <CardContent className="p-5 flex flex-col h-[calc(100%-9rem)]">
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
                        <div className="flex items-center justify-between mt-auto">
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
          </section>

          {/* ── Bottom CTA ── */}
          <section className="py-12 border-t border-slate-100 dark:border-slate-800">
            <FadeIn>
              <div className="bg-gradient-to-br from-emerald-50 to-slate-50 dark:from-emerald-950/30 dark:to-slate-900/30 rounded-2xl p-8 md:p-12 text-center border border-emerald-100 dark:border-emerald-900/50">
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white mb-4">
                  Ready to act on what you've read?
                </h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto mb-8">
                  Book a compliance assessment to see exactly where your supply chain stands against EUDR, GACC, and global buyer requirements.
                </p>
                <Link href="/demo">
                  <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-8">
                    Request a Demo
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </FadeIn>
          </section>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
