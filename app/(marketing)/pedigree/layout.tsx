import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Product Pedigree & Digital Product Passport (DPP) — Verifiable Provenance',
  description: 'OriginTrace Pedigree and Digital Product Passport (DPP) link every finished good to its exact farm origins. JSON-LD output, public verification endpoints, QR-based chain of custody, and sustainability claims — meeting EUDR, FSMA, and buyer compliance requirements.',
  openGraph: {
    title: 'Product Pedigree & Digital Product Passport (DPP) | OriginTrace',
    description: 'Complete product provenance with Digital Product Passports. JSON-LD structured data, public verification, sustainability claims, and QR-based chain of custody tracking.',
    type: 'website',
  },
};

export default function PedigreeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
