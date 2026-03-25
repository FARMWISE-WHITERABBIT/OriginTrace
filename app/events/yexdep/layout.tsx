import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'YEXDEP 2026 – Youth Export Development Programme',
  description:
    'Register for the Youth Export Development Programme (YEXDEP) 2026, hosted by OriginTrace and NEPC. 25 March 2026 · NEPC Enugu Regional Office.',
  openGraph: {
    title: 'YEXDEP 2026 – Youth Export Development Programme',
    description:
      '"From Passion to Port: Unlocking Youth Export Potential" — Free event, 25 March 2026, Enugu.',
    siteName: 'OriginTrace Events',
    type: 'website',
  },
};

export default function YexdepLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
