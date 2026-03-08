import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Minerals & Mining Traceability',
  description: 'Origin verification and responsible sourcing for mineral supply chains. Trace conflict-free minerals from mine to market with full chain-of-custody documentation and regulatory compliance.',
  keywords: ['minerals traceability', 'mining supply chain', 'conflict minerals', 'responsible sourcing', 'mineral compliance', 'mine to market traceability', 'conflict-free minerals'],
  openGraph: {
    title: 'Minerals & Mining Traceability | OriginTrace',
    description: 'Origin verification and responsible sourcing for mineral supply chains.',
    type: 'website',
  },
};

export default function MineralsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
