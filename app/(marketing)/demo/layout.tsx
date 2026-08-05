import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Request a Demo — Get Your Verified Pedigree Pilot',
  description: 'Schedule a personalized OriginTrace demo. See polygon mapping, bag-level traceability, DDS export, and compliance scoring for EUDR, FSMA 204, UK Environment Act, and more.',
  keywords: ['supply chain demo', 'traceability platform demo', 'EUDR compliance demo', 'export compliance software', 'pedigree pilot'],
  openGraph: {
    title: 'Request a Demo — Get Your Verified Pedigree Pilot | OriginTrace',
    description: 'Schedule a personalized OriginTrace demo. See polygon mapping, bag-level traceability, and compliance scoring in action.',
    type: 'website',
  },
  alternates: {
    canonical: 'https://origintrace.trade/demo',
  },
};

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
