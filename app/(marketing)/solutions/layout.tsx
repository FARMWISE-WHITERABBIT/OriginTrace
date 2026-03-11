import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Solutions — Traceability Software for Every Role',
  description: 'OriginTrace provides role-specific traceability and compliance solutions for exporters, processors, compliance teams, and trade associations. Reduce rejection risk across your entire supply chain.',
  keywords: ['traceability software', 'compliance solutions', 'supply chain management', 'role-based traceability', 'exporter compliance', 'processor traceability', 'trade association software'],
  openGraph: {
    title: 'Solutions — Traceability Software for Every Role | OriginTrace',
    description: 'Role-specific traceability and compliance solutions for exporters, processors, compliance teams, and trade associations.',
    type: 'website',
  },
  alternates: {
    canonical: 'https://origintrace.trade/solutions',
  },
};

export default function SolutionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
