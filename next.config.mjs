import { withSentryConfig } from '@sentry/nextjs';
import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development' && process.env.ENABLE_PWA_DEV !== 'true',
  fallbacks: { document: '/offline.html' },
  runtimeCaching: [
    // ── Supabase REST API — NetworkFirst so live data is preferred ──────────
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-api-cache',
        expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 },
        networkTimeoutSeconds: 10,
      },
    },
    // ── Supabase Storage (images, docs) — CacheFirst for performance ────────
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'supabase-storage-cache',
        expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
      },
    },
    // ── App-specific API routes — NetworkFirst, fall back to cache ──────────
    // Covers read-only lookup endpoints useful while offline:
    // locations, commodities, farmers list, batches list
    {
      urlPattern: /^\/api\/(locations|commodities|collect\/farmers|farmers)\b.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'app-api-cache',
        expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 }, // 24h
        networkTimeoutSeconds: 8,
      },
    },
    // ── Next.js static assets — CacheFirst, long TTL ────────────────────────
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-static-cache',
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 365 },
      },
    },
    // ── Next.js image optimisation endpoint ─────────────────────────────────
    {
      urlPattern: /\/_next\/image\?.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-image-cache',
        expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
    // ── App icons and static images ──────────────────────────────────────────
    {
      urlPattern: /\/images\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-images-cache',
        expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
  ],
});

// ── Security headers ────────────────────────────────────────────────────────
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control',  value: 'on' },
  { key: 'X-Frame-Options',         value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options',  value: 'nosniff' },
  { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',      value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://*.sentry.io",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co https://tile.openstreetmap.org https://server.arcgisonline.com",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://*.sentry.io https://de.sentry.io https://data-api.globalforestwatch.org https://api.openai.com https://api.paystack.co wss://*.supabase.co",
      "frame-src 'self' https://js.paystack.co",
      "worker-src 'self' blob:",
      "media-src 'self' blob:",
    ].join('; '),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
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
  async redirects() {
    return [
      {
        source: '/auth/register',
        destination: '/auth/login',
        permanent: true,
      },
      {
        source: '/auth/buyer-register',
        destination: '/auth/login',
        permanent: true,
      },
    ];
  },

  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default process.env.SENTRY_AUTH_TOKEN
  ? withSentryConfig(withPWA(nextConfig), {
  org:     'whiterabbit-agro-limited',
  project: 'javascript-nextjs',

  // Source map upload auth token
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Upload wider set of source files for better stack traces
  widenClientFileUpload: true,

  // Proxy Sentry requests through Next.js to bypass ad-blockers
  tunnelRoute: '/monitoring',

  webpack: {
    // Auto-instrument Vercel Cron jobs
    automaticVercelMonitors: true,

    // Tree-shake Sentry logger statements to reduce bundle size
    treeshake: {
      removeDebugLogging: true,
    },
  },
})
  : withPWA(nextConfig);
