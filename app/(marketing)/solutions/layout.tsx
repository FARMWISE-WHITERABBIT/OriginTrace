import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Solutions — Traceability Software for Every Role',
  description: 'OriginTrace provides role-specific traceability and compliance solutions for exporters, processors, compliance teams, and trade associations. Reduce rejection risk across your entire supply chain.',
  openGraph: {
    title: 'Solutions — Traceability Software for Every Role | OriginTrace',
    description: 'Role-specific traceability and compliance solutions for exporters, processors, compliance teams, and trade associations.',
    type: 'website',
  },
};

export default function SolutionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
