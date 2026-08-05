import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: {
    default: 'Events & Programmes | OriginTrace',
    template: '%s | OriginTrace Events',
  },
  description:
    'Join OriginTrace at upcoming events, workshops, and export development programmes across Africa.',
  openGraph: {
    siteName: 'OriginTrace',
    type: 'website',
  },
};

export default function EventsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
