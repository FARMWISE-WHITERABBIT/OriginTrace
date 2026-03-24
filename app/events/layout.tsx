import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'YEXDEP 2026 – Youth Export Development Programme',
    template: '%s | YEXDEP 2026',
  },
  description:
    'Register for the Youth Export Development Programme (YEXDEP) 2026, hosted by OriginTrace and NEPC. 25th March 2026, NEPC Enugu Regional Office.',
  openGraph: {
    siteName: 'OriginTrace Events',
    type: 'website',
  },
};

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
