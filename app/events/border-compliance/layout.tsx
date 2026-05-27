import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Border Compliance Webinar – Free Virtual Session | OriginTrace',
  description:
    'Free virtual session for Nigerian exporters on meeting traceability and compliance requirements for Europe, the US, China, the UK, and UAE. Friday, 12 June 2026.',
  openGraph: {
    title: 'How to Get Your Exports Into Europe, the US, China, the UK and UAE Without Getting Flagged at the Border',
    description:
      'Free virtual session — 12 June 2026. Speaker: Chikaodi Nwaosu, One Acre Fund. What EUDR, UK due diligence, US import rules, and China green trade requirements mean for your business.',
    siteName: 'OriginTrace Events',
    type: 'website',
  },
};

export default function BorderComplianceLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
