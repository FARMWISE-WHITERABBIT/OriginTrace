import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Global Compliance Coverage',
  description: 'One platform for multi-market supply chain compliance. OriginTrace covers EUDR, FSMA 204, UK Environment Act, China GACC, and UAE ESMA — so your exports clear every border.',
  openGraph: {
    title: 'Global Compliance Coverage | OriginTrace',
    description: 'One platform for multi-market supply chain compliance. Cover EUDR, FSMA 204, UK Environment Act, China, and UAE regulations.',
    type: 'website',
  },
};

export default function ComplianceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
