import { ThemeProvider } from '@/lib/contexts/theme-context';
import type { Metadata } from 'next';

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
  },  alternates: {
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
      {children}
    </ThemeProvider>
  );
}
