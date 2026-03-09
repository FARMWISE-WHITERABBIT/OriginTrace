import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | OriginTrace',
  description: 'How OriginTrace collects, uses, and protects your personal data.',
};

const EFFECTIVE_DATE = '1 April 2026';
const COMPANY = 'WhiteRabbit Agro Limited';
const EMAIL = 'privacy@origintrace.trade';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-gray-500">Effective date: {EFFECTIVE_DATE}</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900">1. Who We Are</h2>
            <p>{COMPANY} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) operates the OriginTrace agricultural traceability platform. We are the data controller for personal data processed through the Platform. Our registered address is Lagos, Nigeria.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900">2. Data We Collect</h2>
            <p><strong>Account data:</strong> Name, email address, phone number, organisation name, and role when you register.</p>
            <p><strong>Farmer and field agent data:</strong> Names, phone numbers, national ID references, GPS farm coordinates, compliance attestation records, and KYC information uploaded by your organisation. You are responsible for obtaining consent from farmers and agents whose data you upload.</p>
            <p><strong>Transaction data:</strong> Payment records, subscription history, and billing contact information.</p>
            <p><strong>Usage data:</strong> API calls, page views, feature usage, error logs, and device/browser information for platform operation and security.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900">3. How We Use Your Data</h2>
            <p>We use personal data to: (a) provide and operate the Platform; (b) process payments; (c) send transactional emails (document expiry alerts, payment receipts, security notices); (d) comply with our own legal obligations; (e) investigate security incidents and prevent fraud; (f) improve the Platform through aggregated, anonymised analytics.</p>
            <p>We do not sell personal data. We do not use personal data for advertising.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900">4. Legal Basis for Processing</h2>
            <p>Under the Nigeria Data Protection Act 2023 and GDPR (for EU-linked data subjects), we process personal data on the following bases: (a) contractual necessity — to deliver the service you subscribe to; (b) legal obligation — to comply with tax, anti-money-laundering, and export regulations; (c) legitimate interests — for security monitoring and fraud prevention; (d) consent — for any processing you explicitly authorise.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900">5. Data Sharing</h2>
            <p>We share personal data only with: (a) Supabase (database and storage infrastructure, hosted in EU-West); (b) Resend (transactional email delivery); (c) Paystack (payment processing); (d) Sentry (error monitoring, anonymised); (e) competent authorities where legally required. All sub-processors are bound by data processing agreements.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900">6. International Data Transfers</h2>
            <p>Your data may be stored in data centres outside Nigeria, including the European Union. Where data is transferred internationally, we ensure appropriate safeguards are in place including standard contractual clauses or adequacy decisions.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900">7. Data Retention</h2>
            <p>We retain account and traceability data for the duration of your subscription plus 3 years, to comply with commodity traceability obligations under EUDR and related regulations. Payment records are retained for 7 years for accounting and tax purposes. You may request earlier deletion subject to legal retention obligations.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900">8. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have the right to: access your personal data; correct inaccurate data; request deletion (right to erasure); receive your data in a portable format (data portability); object to or restrict processing; withdraw consent at any time.</p>
            <p>You can exercise your right to deletion and data export directly from your account settings. For other requests, contact us at <a href={`mailto:${EMAIL}`} className="text-green-700 underline">{EMAIL}</a>. We will respond within 30 days.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900">9. Security</h2>
            <p>We implement row-level security, encrypted data at rest and in transit (TLS 1.2+), rate limiting, audit logging, and regular security reviews. Access to production data is restricted to authorised personnel. We will notify affected users within 72 hours of becoming aware of a data breach where required by law.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900">10. Cookies</h2>
            <p>We use session cookies necessary for authentication. We do not use advertising or tracking cookies. Analytics, if implemented, use anonymised, aggregate data only.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900">11. Children</h2>
            <p>The Platform is not directed at individuals under 18 years of age. We do not knowingly collect personal data from minors.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900">12. Changes to This Policy</h2>
            <p>We may update this policy to reflect changes in our practices or applicable law. We will notify you by email and update the effective date. The current version is always available at origintrace.trade/legal/privacy.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900">13. Contact</h2>
            <p>Data protection enquiries: <a href={`mailto:${EMAIL}`} className="text-green-700 underline">{EMAIL}</a></p>
            <p>{COMPANY}, Lagos, Nigeria.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
