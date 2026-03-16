import { ThemeProvider } from '@/lib/contexts/theme-context';
import type { Metadata } from 'next';
import Script from 'next/script';
import { CookieBanner } from '@/components/marketing/cookie-banner';

export const metadata: Metadata = {
  title: {
    default: 'OriginTrace — Supply Chain Compliance & Traceability Platform',
    template: '%s | OriginTrace',
  },
  description: 'OriginTrace is the all-in-one platform for supply chain traceability, compliance verification, and export readiness. Prevent shipment rejections with pre-shipment compliance scoring across EUDR, FSMA 204, UK Environment Act, and more.',
  keywords: ['supply chain compliance', 'traceability platform', 'EUDR compliance', 'FSMA 204', 'export readiness', 'deforestation regulation', 'food traceability', 'supply chain traceability software'],
  openGraph: {
    type: 'website',
    siteName: 'OriginTrace',
    title: 'OriginTrace — Supply Chain Compliance & Traceability Platform',
    description: 'The all-in-one platform for supply chain traceability, compliance verification, and export readiness.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OriginTrace — Supply Chain Compliance & Traceability Platform',
    description: 'The all-in-one platform for supply chain traceability, compliance verification, and export readiness.',
  },
  alternates: {
    canonical: 'https://origintrace.trade',
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      {/*
       * Google Analytics — marketing pages only, not /app.
       * GA is loaded with default_consent denied so it fires no cookies
       * until the visitor explicitly accepts via the CookieBanner.
       */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-EVZ942SKW9"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('consent', 'default', {
            analytics_storage: 'denied',
            ad_storage: 'denied',
            wait_for_update: 500,
          });
          gtag('js', new Date());
          gtag('config', 'G-EVZ942SKW9', { anonymize_ip: true });

          // Honour previously stored consent on page load
          try {
            var stored = localStorage.getItem('ot_cookie_consent');
            if (stored === 'accepted') {
              gtag('consent', 'update', { analytics_storage: 'granted' });
            }
          } catch(e) {}
        `}
      </Script>
      {children}
      <CookieBanner />
    </ThemeProvider>
  );
}
