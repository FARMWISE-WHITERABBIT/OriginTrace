'use client';

import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const frameworks = [
  {
    id: 'eudr',
    label: '01',
    name: 'EU Deforestation Regulation',
    abbr: 'EUDR',
    market: 'European Union',
    deadline: 'Dec 2025',
    image: '/images/pexels-michael-burrows-7125465.jpg',
    body: 'Cocoa, coffee, timber, palm oil, soya, cattle, rubber, and derived products entering the EU must carry verifiable proof of zero-deforestation origin. OriginTrace GPS-maps every source plot, calculates deforestation risk, and generates your due diligence statement before you ship.',
    commodities: 'Cocoa · Coffee · Timber · Palm Oil · Rubber',
    stats: [
      { value: '€50K+', label: 'Max fine per violation' },
      { value: '5yr', label: 'Record retention required' },
      { value: '8', label: 'Covered commodity groups' },
    ],
  },
  {
    id: 'oecd',
    label: '02',
    name: 'OECD Due Diligence Guidance',
    abbr: 'OECD DDG',
    market: 'Global / LBMA / RMI',
    deadline: 'Ongoing',
    image: '/images/pexels-tomfisk-2101135.jpg',
    body: 'Gold, coltan, tungsten, tin, and tantalum exports to responsible smelters and refiners require documented chain-of-custody and conflict-minerals declarations. OriginTrace registers extraction sites, tracks mine-to-export custody, and generates OECD-aligned audit trails.',
    commodities: 'Gold · Coltan · Lithium · Tin · Tungsten',
    stats: [
      { value: '3T+1G', label: 'Minerals in scope' },
      { value: '100%', label: 'Chain-of-custody coverage' },
      { value: 'LBMA', label: 'Responsible Gold aligned' },
    ],
  },
  {
    id: 'fsma',
    label: '03',
    name: 'FSMA Section 204',
    abbr: 'FSMA 204',
    market: 'United States',
    deadline: 'Jan 2026',
    image: '/images/pexels-traveliving-4663476.jpg',
    body: 'US FDA requires traceability records for high-risk food commodities at every step of the supply chain. OriginTrace captures farm-level Key Data Elements (KDEs), links them to each Critical Tracking Event (CTE), and produces FDA-compliant records on demand.',
    commodities: 'Sesame · Cashew · Shea · Cocoa · Spices',
    stats: [
      { value: '$10K', label: 'FDA daily fine per violation' },
      { value: '24hr', label: 'FDA record retrieval window' },
      { value: 'KDE/CTE', label: 'Traceability standard' },
    ],
  },
  {
    id: 'gacc',
    label: '04',
    name: 'GACC Registration',
    abbr: 'GACC',
    market: 'China',
    deadline: 'Ongoing',
    image: '/images/baged product in wareouse.jpg',
    body: "China's General Administration of Customs requires registered facilities and verifiable origin documentation for agricultural imports. OriginTrace manages facility registration records, links farm-to-processor traceability, and maintains documentation needed to hold and renew GACC status.",
    commodities: 'Sesame · Cashew · Groundnuts · Cocoa',
    stats: [
      { value: '#1', label: "World's largest food importer" },
      { value: '100%', label: 'Facility-to-farm linkage' },
      { value: 'CIFER', label: 'Aligned registration system' },
    ],
  },
  {
    id: 'cs3d',
    label: '05',
    name: 'EU CS3D / Lacey Act',
    abbr: 'CS3D · Lacey',
    market: 'EU · United States',
    deadline: '2027 onwards',
    image: '/images/pexels-jan-van-der-wolf-11680885-15780139.jpg',
    body: "The EU's Corporate Sustainability Due Diligence Directive and the US Lacey Act both demand documented legal harvest origin for timber and forest-risk commodities. OriginTrace records species identification, concession GPS boundaries, and chain-of-custody from stump to shipment.",
    commodities: 'Timber · Rubber · Charcoal · Wood Products',
    stats: [
      { value: '5%', label: 'Max fine as % of global turnover (CS3D)' },
      { value: 'Species', label: 'ID + CITES documentation' },
      { value: 'GPS', label: 'Concession boundary mapping' },
    ],
  },
];

const CARD_WIDTH = 400;
const CARD_GAP = 24;
const SCROLL_PER_CARD = 600;

export function ComplianceStack() {
  const outerRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = useState(0);

  const maxTranslate = (frameworks.length - 1) * (CARD_WIDTH + CARD_GAP);

  useEffect(() => {
    function onScroll() {
      const el = outerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrollable = el.offsetHeight - window.innerHeight;
      const progress = Math.max(0, Math.min(1, -rect.top / scrollable));
      setTranslateX(progress * maxTranslate);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [maxTranslate]);

  // Outer div height = viewport + scroll distance for all cards
  const outerHeight = `calc(100vh + ${(frameworks.length - 1) * SCROLL_PER_CARD}px)`;

  return (
    <div ref={outerRef} style={{ height: outerHeight, background: 'var(--mk-surface-white)' }}>

      {/* Sticky inner — pins at top while we scroll through cards */}
      <div style={{
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        paddingBlock: '3rem',
      }}>

        {/* Header */}
        <div style={{
          paddingLeft: 'max(2rem, calc((100vw - 1280px) / 2 + 2rem))',
          paddingRight: 'max(2rem, calc((100vw - 1280px) / 2 + 2rem))',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '2rem',
        }}>
          <div>
            <span style={{
              display: 'inline-block',
              fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', background: 'transparent',
              border: '1px solid var(--mk-border)', color: 'var(--mk-text-muted)',
              padding: '0.3rem 0.85rem', borderRadius: '9999px', marginBottom: '0.75rem',
            }}>
              Compliance Coverage
            </span>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
              fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.2,
              color: 'var(--mk-text-primary)', margin: 0,
            }}>
              Every regulation your buyer{' '}
              <span style={{ color: 'var(--mk-text-muted)', fontWeight: 400 }}>will ask about</span>
            </h2>
          </div>
          <Link href="/compliance" className="btn-mk-outline" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            Compliance Hub <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Sliding card track */}
        <div style={{ overflow: 'visible', paddingLeft: 'max(2rem, calc((100vw - 1280px) / 2 + 2rem))' }}>
          <div style={{
            display: 'flex',
            gap: `${CARD_GAP}px`,
            transform: `translateX(-${translateX}px)`,
            transition: 'transform 0.06s linear',
            willChange: 'transform',
          }}>
            {frameworks.map((fw) => (
              <div key={fw.id} style={{
                flexShrink: 0,
                width: `${CARD_WIDTH}px`,
                background: '#fff',
                border: '1px solid var(--mk-border)',
                borderRadius: '1.25rem',
                overflow: 'hidden',
                boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                display: 'flex',
                flexDirection: 'column',
              }}>

                {/* Image */}
                <div style={{
                  height: '200px', flexShrink: 0,
                  backgroundImage: `url('${fw.image}')`,
                  backgroundSize: 'cover', backgroundPosition: 'center',
                  position: 'relative',
                }}>
                  <span style={{
                    position: 'absolute', top: '1rem', left: '1rem',
                    fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.07em', background: 'var(--mk-green)', color: '#fff',
                    padding: '0.2rem 0.65rem', borderRadius: '9999px',
                  }}>
                    {fw.market}
                  </span>
                  <span style={{
                    position: 'absolute', top: '1rem', right: '1rem',
                    fontSize: '0.6875rem', fontWeight: 600,
                    background: 'rgba(10,35,28,0.75)', color: 'rgba(255,255,255,0.9)',
                    padding: '0.2rem 0.65rem', borderRadius: '9999px',
                    backdropFilter: 'blur(4px)',
                  }}>
                    {fw.deadline}
                  </span>
                </div>

                {/* Content */}
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{
                    fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em',
                    textTransform: 'uppercase', color: 'var(--mk-green)', marginBottom: '0.35rem',
                  }}>
                    {fw.label} — {fw.abbr}
                  </div>
                  <h3 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.0625rem', fontWeight: 700,
                    letterSpacing: '-0.02em', lineHeight: 1.3,
                    color: 'var(--mk-text-primary)', marginBottom: '0.65rem',
                  }}>
                    {fw.name}
                  </h3>
                  <p style={{
                    fontSize: '0.8125rem', lineHeight: 1.65,
                    color: 'var(--mk-text-secondary)', marginBottom: '0.65rem', flex: 1,
                  }}>
                    {fw.body}
                  </p>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--mk-text-muted)', fontWeight: 600, marginBottom: '1rem' }}>
                    {fw.commodities}
                  </p>

                  {/* Stats */}
                  <div style={{
                    display: 'flex', gap: '0.5rem',
                    paddingTop: '0.875rem', borderTop: '1px solid var(--mk-border)',
                    marginBottom: '1rem',
                  }}>
                    {fw.stats.map((s, si) => (
                      <div key={si} style={{ flex: 1 }}>
                        <span style={{
                          display: 'block', fontFamily: 'var(--font-display)',
                          fontSize: '1rem', fontWeight: 800,
                          letterSpacing: '-0.03em', color: 'var(--mk-green)',
                        }}>
                          {s.value}
                        </span>
                        <span style={{ fontSize: '0.6rem', color: 'var(--mk-text-muted)', fontWeight: 500, lineHeight: 1.4 }}>
                          {s.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Link href="/compliance" style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                    fontSize: '0.8125rem', fontWeight: 600, color: 'var(--mk-green)',
                    textDecoration: 'none',
                  }}>
                    View compliance detail <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', marginTop: '1.75rem' }}>
          {frameworks.map((_, i) => {
            const active = Math.round(translateX / (CARD_WIDTH + CARD_GAP)) === i;
            return (
              <div key={i} style={{
                width: active ? '1.5rem' : '0.375rem',
                height: '0.375rem', borderRadius: '9999px',
                background: active ? 'var(--mk-green)' : 'var(--mk-border)',
                transition: 'width 0.3s, background 0.3s',
              }} />
            );
          })}
        </div>

      </div>
    </div>
  );
}
