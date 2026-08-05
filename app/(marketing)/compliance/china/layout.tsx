import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'China Food Import Compliance | GACC Requirements',
  description: "Navigate China's food import regulations with OriginTrace. Meet GACC facility registration, labeling standards, and inspection requirements. Streamline compliance for food exports to China.",
  keywords: ['China food import', 'GACC registration', 'China labeling standards', 'food export to China', 'GACC compliance', 'China inspection requirements'],
  openGraph: {
    title: 'China Food Import Compliance | GACC Requirements | OriginTrace',
    description: "Navigate China's food import regulations with OriginTrace. Meet GACC facility registration and labeling standards.",
    type: 'website',
  },
  alternates: {
    canonical: 'https://origintrace.trade/compliance/china',
  },
};

export default function ChinaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
