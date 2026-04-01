import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getAllPosts, getPostBySlug, getRecentPosts } from '@/lib/blog';
import type { BlogSection } from '@/lib/blog';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, ArrowRight, ChevronRight, ArrowLeft, AlertTriangle, Info, Lightbulb, CalendarClock } from 'lucide-react';

// ── Static params ─────────────────────────────────────────────────────────────
export async function generateStaticParams() {
  return getAllPosts().map(post => ({ slug: post.slug }));
}

// ── Metadata per post ─────────────────────────────────────────────────────────
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `https://origintrace.trade/blog/${post.slug}` },
    openGraph: {
      title: `${post.title} | OriginTrace`,
      description: post.description,
      type: 'article',
      publishedTime: post.dateISO,
      authors: [post.author],
      tags: post.tags,
      ...(post.coverImage && {
        images: [{ url: `https://origintrace.trade${post.coverImage}`, alt: post.coverImageAlt || post.title }],
      }),
    },
    twitter: {
      card: post.coverImage ? 'summary_large_image' : 'summary',
      title: post.title,
      description: post.description,
      ...(post.coverImage && { images: [`https://origintrace.trade${post.coverImage}`] }),
    },
  };
}

// ── Callout config ────────────────────────────────────────────────────────────
const CALLOUT_CONFIG = {
  info: {
    icon: Info,
    bg: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900',
    icon_color: 'text-blue-600 dark:text-blue-400',
    title_color: 'text-blue-800 dark:text-blue-300',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900',
    icon_color: 'text-amber-600 dark:text-amber-400',
    title_color: 'text-amber-800 dark:text-amber-300',
  },
  tip: {
    icon: Lightbulb,
    bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900',
    icon_color: 'text-emerald-600 dark:text-emerald-400',
    title_color: 'text-emerald-800 dark:text-emerald-300',
  },
  deadline: {
    icon: CalendarClock,
    bg: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900',
    icon_color: 'text-red-600 dark:text-red-400',
    title_color: 'text-red-800 dark:text-red-300',
  },
};

const CATEGORY_COLORS: Record<string, string> = {
  EUDR: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Regulatory: 'bg-red-500/10 text-red-600 dark:text-red-400',
  'Best Practices': 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  Technology: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  Compliance: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
};

// ── Content section renderer ──────────────────────────────────────────────────
function RenderSection({ section }: { section: BlogSection }) {
  switch (section.type) {
    case 'paragraph':
      return <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{section.text}</p>;

    case 'h2':
      return <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-10 mb-4">{section.text}</h2>;

    case 'h3':
      return <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-8 mb-3">{section.text}</h3>;

    case 'bullets':
      return (
        <div>
          {section.intro && <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-3">{section.intro}</p>}
          <ul className="space-y-2">
            {section.items.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      );

    case 'numbered':
      return (
        <div>
          {section.intro && <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-3">{section.intro}</p>}
          <ol className="space-y-3">
            {section.items.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ol>
        </div>
      );

    case 'callout': {
      const cfg = CALLOUT_CONFIG[section.variant];
      const Icon = cfg.icon;
      return (
        <div className={`rounded-xl border p-5 ${cfg.bg}`}>
          <div className="flex items-start gap-3">
            <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${cfg.icon_color}`} />
            <div>
              <p className={`font-semibold mb-1 ${cfg.title_color}`}>{section.title}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{section.text}</p>
            </div>
          </div>
        </div>
      );
    }

    case 'table':
      return (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                {section.headers.map((h, i) => (
                  <th key={i} className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.rows.map((row, ri) => (
                <tr key={ri} className="border-t border-slate-100 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-4 py-3 text-slate-600 dark:text-slate-300 leading-relaxed">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'image':
      return (
        <figure className="my-2">
          <div className="relative w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
            <Image
              src={section.src}
              alt={section.alt}
              width={800}
              height={450}
              className="w-full h-auto object-cover"
              sizes="(max-width: 768px) 100vw, 720px"
            />
          </div>
          {section.caption && (
            <figcaption className="text-xs text-slate-400 dark:text-slate-500 text-center mt-2 italic">
              {section.caption}
            </figcaption>
          )}
        </figure>
      );

    case 'cta':
      return (
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-slate-50 dark:from-emerald-950/30 dark:to-slate-900/30 border border-emerald-100 dark:border-emerald-900/50 p-8 text-center my-8">
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-3">{section.heading}</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-lg mx-auto">{section.text}</p>
          <Link href={section.href}>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              {section.buttonText}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      );

    case 'references':
      return (
        <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Sources &amp; Further Reading</p>
          <ol className="space-y-2">
            {section.items.map((ref, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-500 dark:text-slate-400">
                <span className="shrink-0 font-medium text-slate-400 dark:text-slate-500 min-w-[1.25rem]">{i + 1}.</span>
                <span>
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    {ref.label}
                  </a>
                  {ref.publisher && (
                    <span className="text-slate-400 dark:text-slate-500"> — {ref.publisher}</span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </div>
      );

    default:
      return null;
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const recent = getRecentPosts(3).filter(p => p.slug !== post.slug).slice(0, 3);

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.dateISO,
    dateModified: post.dateISO,
    author: { '@type': 'Organization', name: post.author },
    publisher: {
      '@type': 'Organization',
      name: 'OriginTrace',
      logo: { '@type': 'ImageObject', url: 'https://origintrace.trade/images/logo-green.png' },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://origintrace.trade/blog/${post.slug}` },
    keywords: post.tags.join(', '),
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <MarketingNav />

      <main className="pt-24 pb-20 md:pb-28">
        {/* ── Cover / Hero ── */}
        {post.coverImage ? (
          <div className="w-full h-56 md:h-72 relative overflow-hidden">
            <Image
              src={post.coverImage}
              alt={post.coverImageAlt || post.title}
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
          </div>
        ) : (
          <div className={`w-full h-56 md:h-72 bg-gradient-to-br ${post.coverGradient} flex items-center justify-center`}>
            <BookOpen className="h-16 w-16 text-white/10" />
          </div>
        )}

        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-[1fr_300px] gap-12 mt-10">

            {/* ── Main content ── */}
            <article className="min-w-0">
              {/* Back */}
              <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors mb-8">
                <ArrowLeft className="h-3.5 w-3.5" />
                All Insights
              </Link>

              {/* Meta */}
              <div className="flex items-center gap-3 flex-wrap mb-5">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[post.category] || 'bg-slate-100 text-slate-600'}`}>
                  {post.category}
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  {post.readingTime}
                </span>
                <span className="text-xs text-slate-400">{post.date}</span>
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6 leading-tight">
                {post.title}
              </h1>

              {/* Lead description */}
              <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 leading-relaxed mb-8 pb-8 border-b border-slate-100 dark:border-slate-800">
                {post.description}
              </p>

              {/* Mobile demo CTA — shown only below lg */}
              <div className="lg:hidden mb-8 rounded-xl bg-emerald-600 p-5 text-white">
                <p className="font-bold mb-1">Assess your compliance readiness</p>
                <p className="text-sm text-emerald-100 mb-4 leading-relaxed">See how OriginTrace handles your specific commodity and target markets.</p>
                <Link href="/demo">
                  <Button size="sm" className="w-full bg-white text-emerald-700 hover:bg-emerald-50 font-semibold">
                    Request a Demo
                  </Button>
                </Link>
              </div>

              {/* Body */}
              <div className="space-y-6">
                {post.content.map((section, i) => (
                  <RenderSection key={i} section={section} />
                ))}
              </div>

              {/* Tags */}
              <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-medium text-slate-400 mb-3 uppercase tracking-wide">Topics</p>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map(tag => (
                    <span key={tag} className="text-xs px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Mobile related posts */}
              {recent.length > 0 && (
                <div className="lg:hidden mt-10 pt-8 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">More Insights</p>
                  <div className="grid sm:grid-cols-3 gap-4">
                    {recent.map(p => (
                      <Link key={p.slug} href={`/blog/${p.slug}`} className="group flex gap-3 items-start">
                        <div className={`h-12 w-12 shrink-0 rounded-lg overflow-hidden relative bg-gradient-to-br ${p.coverGradient} flex items-center justify-center`}>
                          {p.coverImage ? (
                            <Image src={p.coverImage} alt={p.coverImageAlt || p.title} fill className="object-cover" sizes="48px" />
                          ) : (
                            <BookOpen className="h-4 w-4 text-white/20" />
                          )}
                        </div>
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-snug line-clamp-3">
                          {p.title}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </article>

            {/* ── Sidebar — desktop only ── */}
            <aside className="hidden lg:block space-y-6 sticky top-28 self-start">
              {/* Author card */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-9 w-9 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">OT</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{post.author}</p>
                    <p className="text-xs text-slate-400">{post.authorRole}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  OriginTrace helps agricultural exporters build traceable, compliant supply chains across EUDR, GACC, and global buyer standards.
                </p>
              </div>

              {/* Demo CTA */}
              <div className="rounded-xl bg-emerald-600 p-5 text-white">
                <p className="font-bold mb-2">Assess your compliance readiness</p>
                <p className="text-sm text-emerald-100 mb-4 leading-relaxed">See how OriginTrace handles your specific commodity and target markets.</p>
                <Link href="/demo">
                  <Button size="sm" className="w-full bg-white text-emerald-700 hover:bg-emerald-50 font-semibold">
                    Request a Demo
                  </Button>
                </Link>
              </div>

              {/* Related posts */}
              {recent.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">More Insights</p>
                  <div className="space-y-4">
                    {recent.map(p => (
                      <Link key={p.slug} href={`/blog/${p.slug}`} className="group block">
                        <div className="flex gap-3">
                          <div className={`h-14 w-14 shrink-0 rounded-lg overflow-hidden relative bg-gradient-to-br ${p.coverGradient} flex items-center justify-center`}>
                            {p.coverImage ? (
                              <Image src={p.coverImage} alt={p.coverImageAlt || p.title} fill className="object-cover" sizes="56px" />
                            ) : (
                              <BookOpen className="h-4 w-4 text-white/20" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${CATEGORY_COLORS[p.category] || 'bg-slate-100 text-slate-600'}`}>
                              {p.category}
                            </span>
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-snug mt-1 line-clamp-2">
                              {p.title}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <Link href="/blog" className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 mt-4 hover:underline">
                    View all articles <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
