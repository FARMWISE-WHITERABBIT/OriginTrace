import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'For Processors — Processing Compliance & Traceability',
  description: 'OriginTrace helps commodity processors maintain batch integrity, manage recovery standards, and generate verifiable pedigrees for finished goods across multiple commodities.',
  keywords: ['commodity processing', 'batch integrity', 'processing compliance', 'recovery standards', 'finished goods pedigree', 'mass balance verification'],
  openGraph: {
    title: 'For Processors — Processing Compliance & Traceability | OriginTrace',
    description: 'Maintain batch integrity, manage recovery standards, and generate verifiable pedigrees for finished goods.',
    type: 'website',
  },
  alternates: {
    canonical: 'https://origintrace.trade/processors',
  },
};

export default function ProcessorsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
