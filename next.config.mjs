import withPWAInit from 'next-pwa';
import { withSentryConfig } from '@sentry/nextjs';

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development' && process.env.ENABLE_PWA_DEV !== 'true',
  fallbacks: { document: '/offline.html' },
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-api-cache',
        expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 },
        networkTimeoutSeconds: 10,
      },
    },
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'supabase-storage-cache',
        expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
      },
    },
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-static-cache',
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 365 },
      },
    },
  ],
});

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control',     value: 'on' },
  { key: 'X-Frame-Options',            value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options',     value: 'nosniff' },
  { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',         value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.sentry.io",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co https://tile.openstreetmap.org",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://*.sentry.io https://data-api.globalforestwatch.org https://api.openai.com https://api.paystack.co wss://*.supabase.co",
      "frame-src 'self' https://js.paystack.co",
      "worker-src 'self' blob:",
      "media-src 'self' blob:",
    ].join('; '),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '10mb' },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

// Sentry wraps the config to inject build-time source map uploads
const sentryConfig = {
  org:          process.env.SENTRY_ORG,
  project:      process.env.SENTRY_PROJECT,
  authToken:    process.env.SENTRY_AUTH_TOKEN,

  // Upload wider set of client source files for better stack trace resolution
  widenClientFileUpload: true,

  // Proxy Sentry requests through /monitoring to bypass ad-blockers
  tunnelRoute: '/monitoring',

  // Suppress non-CI build output
  silent: !process.env.CI,
};

export default withSentryConfig(withPWA(nextConfig), sentryConfig);
