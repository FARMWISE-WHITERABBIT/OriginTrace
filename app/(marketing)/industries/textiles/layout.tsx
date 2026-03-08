import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Textiles & Apparel Traceability',
  description: 'Supply chain transparency and compliance verification for textiles and apparel. Trace raw materials from farm to finished garment with full chain-of-custody documentation and regulatory alignment.',
  keywords: ['textiles traceability', 'apparel supply chain', 'cotton traceability', 'textile compliance', 'garment supply chain transparency', 'fashion traceability', 'fiber tracking'],
  openGraph: {
    title: 'Textiles & Apparel Traceability | OriginTrace',
    description: 'Supply chain transparency and compliance verification for textiles and apparel.',
    type: 'website',
  },
};

export default function TextilesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
