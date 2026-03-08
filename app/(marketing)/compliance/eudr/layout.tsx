import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'EUDR Compliance for Exporters',
  description: 'Meet EU Deforestation Regulation (EUDR) requirements with OriginTrace. GPS polygon mapping, due diligence statement generation, and full supply chain traceability for deforestation-free commodity exports.',
  keywords: ['EUDR compliance', 'EU deforestation regulation', 'deforestation-free supply chain', 'due diligence statement', 'EUDR geolocation', 'cocoa traceability'],
  openGraph: {
    title: 'EUDR Compliance for Exporters | OriginTrace',
    description: 'Meet EU Deforestation Regulation requirements with GPS polygon mapping, DDS generation, and full farm-to-export traceability.',
    type: 'website',
  },
};

export default function EudrLayout({ children }: { children: React.ReactNode }) {
  return children;
}
