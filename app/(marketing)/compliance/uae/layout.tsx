import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'UAE Food Import Compliance | ESMA Standards',
  description: 'Navigate UAE food import regulations with confidence. OriginTrace helps exporters meet ESMA standards, halal certification, Arabic labeling, and municipality permit requirements.',
  keywords: ['UAE food import compliance', 'ESMA standards', 'halal certification', 'Dubai Municipality food import', 'Arabic food labeling'],
  openGraph: {
    title: 'UAE Food Import Compliance | ESMA Standards | OriginTrace',
    description: 'Navigate UAE food import regulations with confidence. Meet ESMA standards, halal certification, and municipality permit requirements.',
    type: 'website',
  },
  alternates: {
    canonical: 'https://origintrace.trade/compliance/uae',
  },
};

export default function UaeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
