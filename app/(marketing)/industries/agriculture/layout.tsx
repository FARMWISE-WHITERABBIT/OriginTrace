import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Agriculture Traceability & Compliance',
  description: 'End-to-end traceability and compliance verification for agricultural supply chains. From smallholder farms to export — GPS mapping, batch tracking, and regulatory alignment for cocoa, coffee, soy, and more.',
  keywords: ['agriculture traceability', 'farm to export', 'agricultural compliance', 'cocoa traceability', 'coffee supply chain', 'EUDR agriculture', 'smallholder traceability'],
  openGraph: {
    title: 'Agriculture Traceability & Compliance | OriginTrace',
    description: 'End-to-end traceability and compliance verification for agricultural supply chains.',
    type: 'website',
  },
};

export default function AgricultureLayout({ children }: { children: React.ReactNode }) {
  return children;
}
