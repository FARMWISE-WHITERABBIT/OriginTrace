import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://origintrace.trade';

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

    // ── Blog ───────────────────────────────────────────────────────────────
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date('2026-04-01'),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog/africa-trade-finance-gap-supply-chain-traceability`,
      lastModified: new Date('2026-04-01'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog/how-to-export-to-china-gacc-registration-guide`,
      lastModified: new Date('2026-03-29'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog/supply-chain-traceability-global-trade`,
      lastModified: new Date('2026-03-29'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog/food-supply-chain-traceability`,
      lastModified: new Date('2026-03-29'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog/eudr-regulation-complete-guide`,
      lastModified: new Date('2026-03-29'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog/china-gacc-compliance-deadline-june-2026`,
      lastModified: new Date('2026-03-10'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog/eudr-compliance-tools-cocoa-exporters-practical-guide`,
      lastModified: new Date('2026-02-28'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog/eudr-compliance-tools-herbs-spices-exporters-practical-guide`,
      lastModified: new Date('2026-02-20'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog/eudr-cocoa-compliance-importers-readiness-guide`,
      lastModified: new Date('2026-02-10'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/blog/eudr-herbs-spices-compliance-importers-readiness-guide`,
      lastModified: new Date('2026-01-30'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/blog/sesame-seed-eudr-export-compliance-guide`,
      lastModified: new Date('2026-01-20'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/blog/soybean-eudr-export-compliance-guide`,
      lastModified: new Date('2026-01-10'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/blog/pre-shipment-compliance-scoring-prevent-rejection`,
      lastModified: new Date('2026-02-15'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/blog/eudr-compliance-deadline-2026-exporters-guide`,
      lastModified: new Date('2026-02-28'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog/offline-first-traceability-low-connectivity-regions`,
      lastModified: new Date('2026-01-30'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },

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
