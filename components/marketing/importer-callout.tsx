import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

/**
 * Cross-link strip pointing buyers/importers at /importers. Dropped into
 * exporter-voiced pages (compliance, solutions) so the buyer persona who lands
 * there from search has a route to their own funnel.
 */
export function ImporterCallout() {
  return (
    <section className="section-spacing" style={{ paddingTop: 0 }}>
      <div className="mk-container-md">
        <div
          className="mk-card"
          style={{
            padding: '1.75rem 2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.5rem',
            flexWrap: 'wrap',
          }}
          data-testid="importer-callout"
        >
          <div style={{ minWidth: '16rem', flex: '1 1 20rem' }}>
            <p style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--mk-text-primary)', marginBottom: '0.25rem' }}>
              Buying, not selling?
            </p>
            <p style={{ fontSize: '0.9375rem', color: 'var(--mk-text-secondary)', lineHeight: 1.6 }}>
              Importers use OriginTrace to verify suppliers at origin, reuse one data pack across every
              regime, and pay on proof with milestone escrow.
            </p>
          </div>
          <Link href="/importers" className="btn-mk-outline">
            For Importers & Buyers <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
