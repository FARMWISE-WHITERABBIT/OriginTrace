import { MetadataRoute } from 'next';
import { getAllPosts } from '@/lib/blog';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://origintrace.trade';

  // Blog entries are generated from the post registry so new/updated posts
  // are never silently missing from the sitemap (they used to be hard-coded
  // here, and drifted).
  const blogEntries: MetadataRoute.Sitemap = getAllPosts().map(post => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.dateModifiedISO || post.dateISO),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  return [
    // ── Core ───────────────────────────────────────────────────────────────
    {
      url: baseUrl,
      lastModified: new Date('2026-02-28'),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/solutions`,
      lastModified: new Date('2026-01-15'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/importers`,
      lastModified: new Date('2026-07-09'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/pedigree`,
      lastModified: new Date('2026-01-15'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/processors`,
      lastModified: new Date('2026-01-15'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/demo`,
      lastModified: new Date('2026-04-07'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/demo/confirm`,
      lastModified: new Date('2026-04-07'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },

    // ── Compliance ─────────────────────────────────────────────────────────
    {
      url: `${baseUrl}/compliance`,
      lastModified: new Date('2026-02-01'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/compliance/eudr`,
      lastModified: new Date('2026-02-01'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/compliance/usa`,
      lastModified: new Date('2026-02-01'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/compliance/uk`,
      lastModified: new Date('2026-02-01'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/compliance/china`,
      lastModified: new Date('2026-02-01'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/compliance/uae`,
      lastModified: new Date('2026-02-01'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },

    // ── Industries ─────────────────────────────────────────────────────────
    {
      url: `${baseUrl}/industries/agriculture`,
      lastModified: new Date('2026-01-15'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/industries/timber`,
      lastModified: new Date('2026-01-15'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/industries/textiles`,
      lastModified: new Date('2026-01-15'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/industries/minerals`,
      lastModified: new Date('2026-01-15'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },

    // ── Developer ──────────────────────────────────────────────────────────
    {
      url: `${baseUrl}/api-docs`,
      lastModified: new Date('2026-01-15'),
      changeFrequency: 'monthly',
      priority: 0.6,
    },

    // ── Blog (index page; post entries are generated above) ───────────────
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date('2026-07-09'),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...blogEntries,

    // ── Legal (trust signals) ──────────────────────────────────────────────
    {
      url: `${baseUrl}/legal/privacy`,
      lastModified: new Date('2026-04-01'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal/terms`,
      lastModified: new Date('2026-04-01'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
