import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Export Readiness 2026 – NEPC × Union Bank × OriginTrace',
  description:
    'Register for the One Day Capacity Building Export Readiness and Mentorship Training, hosted by NEPC South East Regional Office in collaboration with Union Bank. 23 April 2026 · Union Bank, Ogui Road, Enugu.',
  openGraph: {
    title: 'Export Readiness & Mentorship Training 2026',
    description:
      '"Empowering Nigerian Exporters for Sustainable Growth in Global Market" — Free event, 23 April 2026, Enugu.',
    siteName: 'OriginTrace Events',
    type: 'website',
  },
};

export default function ExportReadinessLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
