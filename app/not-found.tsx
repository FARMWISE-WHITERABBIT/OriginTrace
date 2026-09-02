import Link from 'next/link';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
// Root not-found.tsx renders under the root layout only — it does not pick
// up app/(marketing)/layout.tsx's own marketing.css import, so it must be
// imported here directly or the design-system classes below render unstyled.
import '@/app/marketing.css';

export const metadata = {
  title: 'Page Not Found | OriginTrace',
  description: 'The page you were looking for could not be found.',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <MarketingNav />
      <main>
        <section className="section-white" style={{ paddingTop: '10rem', paddingBottom: '10rem' }}>
          <div className="mk-container-sm" style={{ textAlign: 'center' }}>
            <span className="pre-title">404</span>
            <h1 className="text-display-lg" style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
              We couldn&apos;t find that page.
            </h1>
            <p className="text-mk-muted" style={{ maxWidth: '38ch', margin: '0 auto 2.5rem' }}>
              The page may have been moved or the link may be out of date. Try the homepage, or one of these:
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/" className="btn-mk-primary">Go to homepage</Link>
              <Link href="/solutions" className="btn-mk-outline">Solutions</Link>
              <Link href="/compliance" className="btn-mk-outline">Compliance Hub</Link>
              <Link href="/blog" className="btn-mk-outline">Insights</Link>
              <Link href="/demo" className="btn-mk-outline">Request a Demo</Link>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
