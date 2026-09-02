/**
 * SEO utility — builds consistent meta tags for all marketing pages.
 * Import buildMetaTags() in any page's export const metadata block.
 */

export interface SeoConfig {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  type?: 'website' | 'article';
  publishedAt?: string;
}

const SITE_URL = 'https://origintrace.trade';
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/og-default.png`;
const SITE_NAME = 'OriginTrace';

export function buildMetaTags(config: SeoConfig) {
  const {
    title,
    description,
    canonical,
    ogImage = DEFAULT_OG_IMAGE,
    type = 'website',
    publishedAt,
  } = config;

  const canonicalUrl = canonical.startsWith('http') ? canonical : `${SITE_URL}${canonical}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type,
      siteName: SITE_NAME,
      title,
      description,
      url: canonicalUrl,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      ...(publishedAt ? { publishedTime: publishedAt } : {}),
    },
    twitter: {
      card: 'summary_large_image' as const,
      title,
      description,
      images: [ogImage],
    },
  };
}

/**
 * JSON-LD helpers — call these inside page components, render in <script> tag.
 */

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'OriginTrace',
    url: SITE_URL,
    logo: `${SITE_URL}/images/icon-green.png`,
    description:
      'OriginTrace is the all-in-one platform for agricultural supply chain traceability, EUDR compliance, and export readiness.',
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'hello@origintrace.trade',
      contactType: 'sales',
    },
    sameAs: [
      'https://linkedin.com/company/origintrace',
    ],
  };
}

export function softwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'OriginTrace',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description:
      'Supply chain traceability and compliance platform for African agricultural commodity exporters.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free pilot available',
    },
    url: SITE_URL,
  };
}

export function articleSchema(params: {
  headline: string;
  description: string;
  url: string;
  publishedAt?: string;
  modifiedAt?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: params.headline,
    description: params.description,
    url: params.url.startsWith('http') ? params.url : `${SITE_URL}${params.url}`,
    author: { '@type': 'Organization', name: 'OriginTrace' },
    publisher: {
      '@type': 'Organization',
      name: 'OriginTrace',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/images/icon-green.png` },
    },
    ...(params.publishedAt ? { datePublished: params.publishedAt } : {}),
    ...(params.modifiedAt ? { dateModified: params.modifiedAt } : {}),
  };
}

export function serviceSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'OriginTrace Discovery Call',
    description:
      'Book a free 30-minute discovery call to see how OriginTrace handles EUDR compliance and traceability for your supply chain.',
    provider: { '@type': 'Organization', name: 'OriginTrace' },
    potentialAction: {
      '@type': 'ReserveAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/demo/confirm`,
        actionPlatform: 'http://schema.org/DesktopWebPlatform',
      },
      result: { '@type': 'Reservation', name: 'Discovery Call Booking' },
    },
  };
}
