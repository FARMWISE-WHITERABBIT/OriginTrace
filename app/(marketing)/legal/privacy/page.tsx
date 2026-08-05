import { Metadata } from 'next';
import Link from 'next/link';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';

export const metadata: Metadata = {
  title: 'Privacy Policy | OriginTrace',
  description: 'How OriginTrace collects, uses, and protects your personal data.',
};

const EFFECTIVE_DATE = '1 April 2026';
const COMPANY = 'WhiteRabbit Agro Limited';
const EMAIL = 'privacy@origintrace.trade';

const TOC = [
  ['1', 'Who We Are'],
  ['2', 'Data We Collect'],
  ['3', 'How We Use Your Data'],
  ['4', 'Legal Basis for Processing'],
  ['5', 'Data Sharing'],
  ['6', 'International Transfers'],
  ['7', 'Data Retention'],
  ['8', 'Your Rights'],
  ['9', 'Security'],
  ['10', 'Cookies'],
  ['11', 'Children'],
  ['12', 'Changes'],
  ['13', 'Contact'],
];

export default function PrivacyPolicy() {
  return (
    <>
      <MarketingNav />
      <main className="min-h-screen bg-white dark:bg-slate-950">

        {/* Header band */}
        <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
              <Link href="/" className="hover:text-green-700 transition-colors">Home</Link>
              <span>/</span>
              <span className="text-slate-900 dark:text-slate-100">Privacy Policy</span>
            </div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-50 tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-slate-500 mt-2 text-sm">
              Effective date: {EFFECTIVE_DATE} · {COMPANY}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="max-w-4xl mx-auto px-6 py-14">
          <div className="flex gap-12">

            {/* ToC sidebar */}
            <aside className="hidden lg:block w-52 flex-shrink-0">
              <div className="sticky top-24 space-y-1 text-sm">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Contents</p>
                {TOC.map(([num, label]) => (
                  <a
                    key={num}
                    href={`#section-${num}`}
                    className="flex items-start gap-2 py-1 text-slate-500 hover:text-green-700 transition-colors"
                  >
                    <span className="text-slate-300 font-mono text-xs mt-0.5 min-w-[18px]">{num}.</span>
                    <span>{label}</span>
                  </a>
                ))}
              </div>
            </aside>

            {/* Content */}
            <article className="flex-1 min-w-0 space-y-10 text-slate-700 dark:text-slate-300 leading-relaxed">

              <section id="section-1">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">1. Who We Are</h2>
                <p>{COMPANY} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) operates the OriginTrace agricultural traceability platform. We are the data controller for personal data processed through the Platform. Our registered address is Lagos, Nigeria.</p>
              </section>

              <section id="section-2">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">2. Data We Collect</h2>
                <p><strong className="text-slate-900 dark:text-slate-100">Account data:</strong> Name, email address, phone number, organisation name, and role when you register.</p>
                <p className="mt-3"><strong className="text-slate-900 dark:text-slate-100">Farmer and field agent data:</strong> Names, phone numbers, national ID references, GPS farm coordinates, compliance attestation records, and KYC information uploaded by your organisation. You are responsible for obtaining consent from farmers and agents whose data you upload.</p>
                <p className="mt-3"><strong className="text-slate-900 dark:text-slate-100">Transaction data:</strong> Payment records, subscription history, and billing contact information.</p>
                <p className="mt-3"><strong className="text-slate-900 dark:text-slate-100">Usage data:</strong> API calls, page views, feature usage, error logs, and device/browser information for platform operation and security.</p>
              </section>

              <section id="section-3">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">3. How We Use Your Data</h2>
                <p>We use personal data to: (a) provide and operate the Platform; (b) process payments; (c) send transactional emails (document expiry alerts, payment receipts, security notices); (d) comply with our own legal obligations; (e) investigate security incidents and prevent fraud; (f) improve the Platform through aggregated, anonymised analytics.</p>
                <p className="mt-3 font-medium text-slate-900 dark:text-slate-100">We do not sell personal data. We do not use personal data for advertising.</p>
              </section>

              <section id="section-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">4. Legal Basis for Processing</h2>
                <p>Under the Nigeria Data Protection Act 2023 and GDPR (for EU-linked data subjects), we process personal data on the following bases: (a) contractual necessity — to deliver the service you subscribe to; (b) legal obligation — to comply with tax, anti-money-laundering, and export regulations; (c) legitimate interests — for security monitoring and fraud prevention; (d) consent — for any processing you explicitly authorise.</p>
              </section>

              <section id="section-5">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">5. Data Sharing</h2>
                <p>We share personal data only with: (a) Supabase (database and storage infrastructure, hosted in EU-West); (b) Resend (transactional email delivery); (c) Paystack (payment processing); (d) Sentry (error monitoring, anonymised); (e) competent authorities where legally required. All sub-processors are bound by data processing agreements.</p>
              </section>

              <section id="section-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">6. International Data Transfers</h2>
                <p>Your data may be stored in data centres outside Nigeria, including the European Union. Where data is transferred internationally, we ensure appropriate safeguards are in place including standard contractual clauses or adequacy decisions.</p>
              </section>

              <section id="section-7">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">7. Data Retention</h2>
                <p>We retain account and traceability data for the duration of your subscription plus 3 years, to comply with commodity traceability obligations under EUDR and related regulations. Payment records are retained for 7 years for accounting and tax purposes. You may request earlier deletion subject to legal retention obligations.</p>
              </section>

              <section id="section-8">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">8. Your Rights</h2>
                <p>Depending on your jurisdiction, you may have the right to: access your personal data; correct inaccurate data; request deletion (right to erasure); receive your data in a portable format (data portability); object to or restrict processing; withdraw consent at any time.</p>
                <p className="mt-3">You can exercise your right to deletion and data export directly from your account settings. For other requests, contact us at{' '}
                  <a href={`mailto:${EMAIL}`} className="text-green-700 dark:text-green-400 underline underline-offset-2 hover:text-green-800">{EMAIL}</a>.
                  We will respond within 30 days.
                </p>
              </section>

              <section id="section-9">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">9. Security</h2>
                <p>We implement row-level security, encrypted data at rest and in transit (TLS 1.2+), rate limiting, audit logging, and regular security reviews. Access to production data is restricted to authorised personnel. We will notify affected users within 72 hours of becoming aware of a data breach where required by law.</p>
              </section>

              <section id="section-10">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">10. Cookies</h2>
                <p>We use session cookies necessary for authentication. We do not use advertising or tracking cookies. Analytics, if implemented, use anonymised, aggregate data only.</p>
              </section>

              <section id="section-11">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">11. Children</h2>
                <p>The Platform is not directed at individuals under 18 years of age. We do not knowingly collect personal data from minors.</p>
              </section>

              <section id="section-12">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">12. Changes to This Policy</h2>
                <p>We may update this policy to reflect changes in our practices or applicable law. We will notify you by email and update the effective date. The current version is always available at origintrace.trade/legal/privacy.</p>
              </section>

              <section id="section-13">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">13. Contact</h2>
                <p>Data protection enquiries:{' '}
                  <a href={`mailto:${EMAIL}`} className="text-green-700 dark:text-green-400 underline underline-offset-2 hover:text-green-800">{EMAIL}</a>
                </p>
                <p className="mt-2">{COMPANY}, Lagos, Nigeria.</p>
              </section>

              {/* Cross-links */}
              <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-sm">
                <Link href="/legal/terms" className="text-green-700 dark:text-green-400 hover:underline">
                  → Terms of Service
                </Link>
                <Link href="/auth/login" className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100">
                  Back to app
                </Link>
              </div>

            </article>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
