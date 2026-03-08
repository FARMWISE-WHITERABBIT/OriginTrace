import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'China Food Import Compliance | GACC Requirements',
  description: "Navigate China's food import regulations with OriginTrace. Meet GACC facility registration, labeling standards, and inspection requirements. Streamline compliance for food exports to China.",
  openGraph: {
    title: 'China Food Import Compliance | GACC Requirements | OriginTrace',
    description: "Navigate China's food import regulations with OriginTrace. Meet GACC facility registration and labeling standards.",
    type: 'website',
  },
};

export default function ChinaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
