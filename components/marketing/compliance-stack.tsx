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
    image: '/images/pexels-seunadeniyi-14371700.jpg',
    body: 'Cocoa, coffee, timber, palm oil, soya, cattle, rubber, and derived products entering the EU must carry verifiable proof of zero-deforestation origin.',
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
    image: '/images/pexels-tomfisk-1427107.jpg',
    body: 'Gold, coltan, tungsten, tin, and tantalum exports to responsible smelters require documented chain-of-custody and conflict-minerals declarations.',
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
    image: '/images/pexels-josiah-matthew-145486517-10697911.jpg',
    body: 'US FDA requires traceability records for high-risk food commodities at every step. OriginTrace captures KDEs at farm level and links them to every Critical Tracking Event.',
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
    image: '/images/pexels-masudar-37218946.jpg',
    body: "China's Customs requires registered facilities and verifiable origin documentation for agricultural imports. OriginTrace manages registration records and links farm-to-processor traceability.",
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
    image: '/images/pexels-stephanefabricebass-10319259.jpg',
    body: "The EU's CS3D and the US Lacey Act demand documented legal harvest origin for timber and forest-risk commodities. OriginTrace records species ID, concession GPS boundaries, and chain-of-custody.",
    commodities: 'Timber · Rubber · Charcoal · Wood Products',
    stats: [
      { value: '5%', label: 'Max fine as % of global turnover' },
      { value: 'Species', label: 'ID + CITES documentation' },
      { value: 'GPS', label: 'Concession boundary mapping' },
    ],
  },
];

// 1.5 cards visible: card fills ~2/3 of the visible container width
// Scroll per card = card width + gap so each step reveals exactly 1 card
const CARD_W = 780;
const CARD_GAP = 28;
const STEP = CARD_W + CARD_GAP; // scroll distance to advance one card

export function ComplianceStack() {
  const outerRef = useRef<HTMLDivElement>(null);
  const [tx, setTx] = useState(0);

  const N = frameworks.length;
  const maxTx = (N - 1) * STEP;
  // Outer height = viewport + exact scroll distance to reveal all cards
  const outerHeight = `calc(100vh + ${maxTx}px)`;

  useEffect(() => {
    function onScroll() {
      const el = outerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrollable = el.offsetHeight - window.innerHeight;
      const progress = Math.max(0, Math.min(1, -rect.top / scrollable));
      setTx(progress * maxTx);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [maxTx]);

  const activeIndex = Math.round(tx / STEP);

  return (
    <div ref={outerRef} style={{ height: outerHeight, background: 'var(--mk-surface-white)' }}>

      {/* Sticky panel — 100vh, pins while we scroll through cards */}
      <div style={{
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        paddingBlock: '1.5rem',
      }}>

        {/* Section header */}
        <div style={{
          paddingInline: 'max(2rem, calc((100vw - 1280px) / 2 + 2rem))',
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
              textTransform: 'uppercase',
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

        {/* Card + stats track */}
        <div style={{ overflow: 'visible', paddingLeft: 'max(2rem, calc((100vw - 1280px) / 2 + 2rem))' }}>
          <div style={{
            display: 'flex',
            gap: `${CARD_GAP}px`,
            transform: `translateX(-${tx}px)`,
            transition: 'transform 0.07s linear',
            willChange: 'transform',
            alignItems: 'flex-start',
          }}>
            {frameworks.map((fw, i) => (
              <div key={fw.id} style={{ flexShrink: 0, width: `${CARD_W}px` }}>

                {/* Card */}
                <div style={{
                  background: '#fff',
                  border: '1px solid var(--mk-border)',
                  borderRadius: '1.25rem',
                  overflow: 'hidden',
                  boxShadow: '0 2px 20px rgba(0,0,0,0.07)',
                }}>
                  {/* Image */}
                  <div style={{
                    height: '260px',
                    backgroundImage: `url('${fw.image}')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
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

                  {/* Text */}
                  <div style={{ padding: '1.5rem 1.5rem 1.25rem' }}>
                    <div style={{
                      fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em',
                      textTransform: 'uppercase', color: 'var(--mk-green)', marginBottom: '0.4rem',
                    }}>
                      {fw.label} — {fw.abbr}
                    </div>
                    <h3 style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.125rem', fontWeight: 700,
                      letterSpacing: '-0.02em', lineHeight: 1.3,
                      color: 'var(--mk-text-primary)', marginBottom: '0.5rem',
                    }}>
                      {fw.name}
                    </h3>
                    <p style={{
                      fontSize: '0.8125rem', lineHeight: 1.6,
                      color: 'var(--mk-text-secondary)', marginBottom: '0.75rem',
                    }}>
                      {fw.body}
                    </p>
                    <p style={{
                      fontSize: '0.6875rem', color: 'var(--mk-text-muted)',
                      fontWeight: 600, marginBottom: '0.875rem',
                    }}>
                      {fw.commodities}
                    </p>
                    <Link href="/compliance" style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                      fontSize: '0.8125rem', fontWeight: 600, color: 'var(--mk-green)',
                      textDecoration: 'none',
                    }}>
                      View detail <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Stats — separate boxes below the card */}
                <div style={{
                  display: 'flex', gap: '0.5rem', marginTop: '0.75rem',
                }}>
                  {fw.stats.map((s, si) => (
                    <div key={si} style={{
                      flex: 1,
                      background: '#fff',
                      border: '1px solid var(--mk-border)',
                      borderRadius: '0.75rem',
                      padding: '0.875rem 0.75rem',
                    }}>
                      <span style={{
                        display: 'block',
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.125rem', fontWeight: 800,
                        letterSpacing: '-0.03em', color: 'var(--mk-green)',
                        marginBottom: '0.2rem',
                      }}>
                        {s.value}
                      </span>
                      <span style={{
                        fontSize: '0.625rem', color: 'var(--mk-text-muted)',
                        fontWeight: 500, lineHeight: 1.35,
                        display: 'block',
                      }}>
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>

              </div>
            ))}
          </div>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', marginTop: '1.5rem' }}>
          {frameworks.map((_, i) => (
            <div key={i} style={{
              width: i === activeIndex ? '1.5rem' : '0.375rem',
              height: '0.375rem', borderRadius: '9999px',
              background: i === activeIndex ? 'var(--mk-green)' : 'var(--mk-border)',
              transition: 'width 0.3s, background 0.3s',
            }} />
          ))}
        </div>

      </div>
    </div>
  );
}
