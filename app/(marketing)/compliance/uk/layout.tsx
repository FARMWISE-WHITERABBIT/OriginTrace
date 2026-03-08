import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'UK Environment Act Compliance | Forest Risk Commodities',
  description: 'Prepare for the UK Environment Act forest risk commodity requirements. OriginTrace provides GPS farm mapping, deforestation monitoring, automated risk scoring, and due diligence reporting for businesses with £50M+ turnover.',
  keywords: ['UK Environment Act', 'forest risk commodities', 'Schedule 17', 'due diligence', 'deforestation', 'supply chain compliance'],
  openGraph: {
    title: 'UK Environment Act Compliance | Forest Risk Commodities | OriginTrace',
    description: 'Prepare for the UK Environment Act forest risk commodity requirements with OriginTrace.',
    type: 'website',
  },
};

export default function UkLayout({ children }: { children: React.ReactNode }) {
  return children;
}
