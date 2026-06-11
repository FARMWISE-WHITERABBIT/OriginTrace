'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Plus, Minus } from 'lucide-react';
import { FadeIn } from '@/components/marketing/motion';

const faqs = [
  {
    q: 'What is OriginTrace?',
    a: 'OriginTrace is a supply chain traceability platform built for African agricultural exporters. It connects farm registration, batch collection, compliance checking, document generation, and payment settlement into one verified record — so exporters can prove origin and move goods with confidence.',
  },
  {
    q: 'Which commodities does OriginTrace support?',
    a: 'The platform currently supports cocoa, coffee, cashew, sesame, and other agricultural commodities traded from West and East Africa. It is designed to accommodate any bulk commodity where origin verification and multi-market compliance are required.',
  },
  {
    q: 'How does OriginTrace verify farm-level origin?',
    a: 'Every farm plot is GPS-mapped and every farmer registered with verified identity before any collection begins. Field agents log collection events in real time — even offline — and each batch is cryptographically linked back to its registered source. Declarations alone are never accepted as proof.',
  },
  {
    q: 'Which compliance frameworks does the platform cover?',
    a: 'OriginTrace scores shipments against EU EUDR, UK due diligence requirements, USDA NOP, China GACC, and UAE import regulations simultaneously. You see your clearance status before booking freight — not after loading.',
  },
  {
    q: 'What documents can OriginTrace generate?',
    a: 'From a single verified shipment record you can produce a pedigree certificate, phytosanitary waybill, bill of lading summary, and a full compliance pack ready for customs submission. No manual assembly across multiple systems.',
  },
  {
    q: 'Does OriginTrace work in areas with poor connectivity?',
    a: 'Yes. The field agent mobile app is built for low-connectivity environments. Data is captured and stored locally, then syncs automatically when connectivity returns. No collection event is lost due to network conditions.',
  },
  {
    q: 'How does payment settlement work?',
    a: 'Buyers pay into escrow held within the platform. Funds are released automatically when the shipment is confirmed received and compliance is verified. Farmers can be disbursed directly from the same record — no separate payment runs or manual reconciliation.',
  },
  {
    q: 'How long does onboarding take?',
    a: 'A cooperative or exporter can register their farm network, configure compliance settings, and run their first compliant shipment within two weeks. Dedicated onboarding support is included on all plans above the starter tier.',
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="section-spacing mk-faq-section">
      <div className="mk-container-lg">
        <FadeIn>
          <div className="mk-faq-header">
            <span className="pre-title margin-bottom margin-medium"
              style={{ background: 'transparent', border: '1px solid var(--mk-border)', color: 'var(--mk-text-muted)' }}
            >
              FAQs
            </span>
            <h2 className="text-display-lg" style={{ color: 'var(--mk-text-primary)', marginTop: '0.75rem' }}>
              Clearing doubts about{' '}
              <span style={{ color: 'var(--mk-text-muted)', fontWeight: 400 }}>our</span>{' '}
              traceability{' '}
              <span style={{ color: 'var(--mk-text-muted)', fontWeight: 400 }}>platform</span>
            </h2>
          </div>
        </FadeIn>

        <div className="mk-faq-body">
          {/* LEFT — image */}
          <FadeIn delay={0.1} direction="up">
            <div className="mk-faq-image-wrap">
              <Image
                src="/images/pexels-tomfisk-2231744.jpg"
                alt="Aerial view of an agricultural port showing the supply chain in action"
                fill
                className="object-cover"
                sizes="(max-width: 767px) 100vw, 45vw"
              />
            </div>
          </FadeIn>

          {/* RIGHT — accordion */}
          <FadeIn delay={0.2}>
            <div className="mk-faq-accordion">
              {faqs.map((faq, i) => {
                const isOpen = open === i;
                return (
                  <div key={i} className={`mk-faq-item${isOpen ? ' mk-faq-item--open' : ''}`}>
                    <button
                      className="mk-faq-trigger"
                      onClick={() => setOpen(isOpen ? null : i)}
                      aria-expanded={isOpen}
                    >
                      <span>{faq.q}</span>
                      <span className="mk-faq-icon" aria-hidden>
                        {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="mk-faq-answer">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
