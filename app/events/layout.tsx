import type { Metadata } from 'next';

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

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
