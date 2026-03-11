import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FSMA 204 Compliance | Food Traceability Rule',
  description: 'Achieve FSMA 204 compliance with OriginTrace. Manage Key Data Elements, Critical Tracking Events, and Food Traceability List requirements for FDA food traceability.',
  keywords: ['FSMA 204 compliance', 'food traceability rule', 'FDA traceability', 'Key Data Elements', 'Critical Tracking Events', 'Food Traceability List'],
  openGraph: {
    title: 'FSMA 204 Compliance | Food Traceability Rule | OriginTrace',
    description: 'Achieve FSMA 204 compliance with OriginTrace. Manage KDEs, CTEs, and FTL requirements for FDA food traceability.',
    type: 'website',
  },
  alternates: {
    canonical: 'https://origintrace.trade/compliance/usa',
  },
};

export default function UsaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
