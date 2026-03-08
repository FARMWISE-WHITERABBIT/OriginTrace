import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Product Pedigree — Verifiable Provenance for Every Shipment',
  description: 'OriginTrace Pedigree links every finished good to its exact farm origins via a single QR code. Auditors verify provenance in seconds — meeting EUDR, FSMA, and buyer compliance requirements.',
  openGraph: {
    title: 'Product Pedigree — Verifiable Provenance for Every Shipment | OriginTrace',
    description: 'A single QR code on your finished good links back to the exact GPS coordinates of every contributing farm.',
    type: 'website',
  },
};

export default function PedigreeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
