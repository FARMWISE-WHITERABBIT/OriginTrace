import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Timber & Forestry Traceability',
  description: 'Chain-of-custody traceability and deforestation-free verification for timber and forestry supply chains. GPS polygon mapping, EUDR compliance, and export documentation for wood products.',
  keywords: ['timber traceability', 'forestry compliance', 'wood supply chain', 'EUDR timber', 'deforestation-free wood', 'timber chain of custody', 'forest management'],
  openGraph: {
    title: 'Timber & Forestry Traceability | OriginTrace',
    description: 'Chain-of-custody traceability and deforestation-free verification for timber and forestry supply chains.',
    type: 'website',
  },
};

export default function TimberLayout({ children }: { children: React.ReactNode }) {
  return children;
}
