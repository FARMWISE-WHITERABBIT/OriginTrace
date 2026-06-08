import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { FadeIn } from '@/components/marketing/motion';

const frameworks = [
  {
    id: 'eudr',
    label: '01',
    name: 'EU Deforestation Regulation',
    abbr: 'EUDR',
    market: 'European Union',
    deadline: 'Dec 2025',
    image: '/images/pexels-michael-burrows-7125465.jpg',
    imagePosition: 'center',
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
    imagePosition: 'center',
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
    imagePosition: 'center',
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
    imagePosition: 'center',
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
    imagePosition: 'center',
    body: "The EU's Corporate Sustainability Due Diligence Directive and the US Lacey Act both demand documented legal harvest origin for timber and forest-risk commodities. OriginTrace records species identification, concession GPS boundaries, and chain-of-custody from stump to shipment.",
    commodities: 'Timber · Rubber · Charcoal · Wood Products',
    stats: [
      { value: '5%', label: 'Max fine as % of global turnover (CS3D)' },
      { value: 'Species', label: 'ID + CITES documentation' },
      { value: 'GPS', label: 'Concession boundary mapping' },
    ],
  },
];

export function ComplianceStack() {
  return (
    <section className="section-spacing section-white">
      <div className="mk-container-lg">

        {/* Header row */}
        <FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'flex-end', gap: '2rem', marginBottom: '3.5rem' }}>
            <div>
              <span
                className="pre-title margin-bottom margin-medium"
                style={{ background: 'transparent', border: '1px solid var(--mk-border)', color: 'var(--mk-text-muted)' }}
              >
                Compliance Coverage
              </span>
              <h2 className="text-display-lg" style={{ color: 'var(--mk-text-primary)', marginTop: '0.75rem', maxWidth: '28rem' }}>
                Every regulation your buyer{' '}
                <span className="text-mk-muted">will ask about</span>
              </h2>
            </div>
            <Link href="/compliance" className="btn-mk-outline" style={{ whiteSpace: 'nowrap' }}>
              Compliance Hub
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </FadeIn>

        {/* Sticky stack */}
        <div className="mk-sticky-container" style={{ paddingBottom: `${(frameworks.length - 1) * 1.5}rem` }}>
          {frameworks.map((fw, i) => (
            <div
              key={fw.id}
              className="mk-sticky-card"
              style={{ top: `calc(5rem + ${i} * 1.5rem)`, marginBottom: '1rem' }}
            >
              <div className="mk-sticky-card__inner">

                {/* LEFT — image */}
                <div
                  className="mk-sticky-card__img"
                  style={{
                    backgroundImage: `url('${fw.image}')`,
                    backgroundSize: 'cover',
                    backgroundPosition: fw.imagePosition,
                  }}
                >
                  <span style={{
                    position: 'absolute', top: '1.25rem', left: '1.25rem',
                    fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.07em', background: 'var(--mk-green)', color: '#fff',
                    padding: '0.25rem 0.75rem', borderRadius: '9999px',
                  }}>
                    {fw.market}
                  </span>
                  <span style={{
                    position: 'absolute', top: '1.25rem', right: '1.25rem',
                    fontSize: '0.6875rem', fontWeight: 600,
                    background: 'rgba(10,35,28,0.75)', color: 'rgba(255,255,255,0.9)',
                    padding: '0.25rem 0.75rem', borderRadius: '9999px',
                    backdropFilter: 'blur(4px)',
                  }}>
                    {fw.deadline}
                  </span>
                </div>

                {/* RIGHT — content */}
                <div className="mk-sticky-card__content">
                  <div className="mk-sticky-card__number">{fw.label} — {fw.abbr}</div>
                  <h3 className="mk-sticky-card__title">{fw.name}</h3>
                  <p className="mk-sticky-card__body">{fw.body}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--mk-text-muted)', fontWeight: 500 }}>
                    {fw.commodities}
                  </p>
                  <div className="mk-sticky-card__counters">
                    {fw.stats.map((s, si) => (
                      <div key={si}>
                        <span className="mk-sticky-card__counter-value">{s.value}</span>
                        <span className="mk-sticky-card__counter-label">{s.label}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <Link
                      href="/compliance"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                        fontSize: '0.8125rem', fontWeight: 600, color: 'var(--mk-green)',
                        textDecoration: 'none',
                      }}
                    >
                      View compliance detail <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
