import { Metadata } from 'next';
import Link from 'next/link';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';

export const metadata: Metadata = {
  title: 'Terms of Service | OriginTrace',
  description: 'OriginTrace platform terms of service and user agreement.',
};

const EFFECTIVE_DATE = '1 April 2026';
const COMPANY = 'WhiteRabbit Agro Limited';
const PLATFORM = 'OriginTrace';
const EMAIL = 'legal@origintrace.trade';

export default function TermsOfService() {
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
              <span className="text-slate-900 dark:text-slate-100">Terms of Service</span>
            </div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-50 tracking-tight">
              Terms of Service
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
                {[
                  ['1', 'Acceptance of Terms'],
                  ['2', 'Description of Service'],
                  ['3', 'Account & Security'],
                  ['4', 'Subscription & Billing'],
                  ['5', 'Acceptable Use'],
                  ['6', 'Data & Compliance'],
                  ['7', 'Intellectual Property'],
                  ['8', 'Privacy'],
                  ['9', 'Limitation of Liability'],
                  ['10', 'Termination'],
                  ['11', 'Governing Law'],
                  ['12', 'Changes'],
                  ['13', 'Contact'],
                ].map(([num, label]) => (
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
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">1. Acceptance of Terms</h2>
                <p>By accessing or using the {PLATFORM} platform (&ldquo;Platform&rdquo;), operated by {COMPANY} (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), you agree to be bound by these Terms of Service. If you are accessing the Platform on behalf of an organisation, you represent that you have authority to bind that organisation to these terms.</p>
              </section>

              <section id="section-2">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">2. Description of Service</h2>
                <p>{PLATFORM} is an agricultural supply chain traceability platform that enables commodity aggregators, processors, and exporters to digitise farm data, generate compliance documentation, and meet due diligence obligations including the EU Deforestation Regulation (EUDR), UK Environment Act, Lacey Act, and related frameworks.</p>
              </section>

              <section id="section-3">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">3. Account Registration and Security</h2>
                <p>You must provide accurate and complete information during registration. You are responsible for maintaining the confidentiality of your credentials and for all activities that occur under your account. You must notify us immediately of any unauthorised access. We reserve the right to suspend accounts where security is compromised.</p>
              </section>

              <section id="section-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">4. Subscription Plans and Billing</h2>
                <p>Access to paid features requires an active subscription. Subscription fees are quoted in Nigerian Naira (NGN) and processed via Paystack. All fees are non-refundable except as required by applicable law. Subscriptions renew automatically unless cancelled before the renewal date. We reserve the right to change pricing with 30 days notice to active subscribers.</p>
                <p className="mt-3">Failure to pay will result in a 7-day grace period during which full access is maintained. After the grace period, the account reverts to the Starter plan. Your data is retained for a minimum of 90 days after downgrade.</p>
              </section>

              <section id="section-5">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">5. Acceptable Use</h2>
                <p>You agree not to: (a) upload false, fabricated, or misleading traceability data; (b) use the Platform to circumvent regulatory requirements rather than comply with them; (c) reverse engineer, decompile, or attempt to extract source code; (d) use the Platform in any manner that violates applicable laws in Nigeria, the EU, or any jurisdiction where your commodities are sold; (e) share access credentials with unauthorised parties.</p>
              </section>

              <section id="section-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">6. Data Accuracy and Compliance</h2>
                <p>You are solely responsible for the accuracy of all data you upload, including farm GPS coordinates, farmer information, batch weights, and compliance attestations. {PLATFORM} provides tools and workflows to assist compliance but does not guarantee regulatory approval. We are not liable for rejected Due Diligence Statements, failed customs declarations, or regulatory penalties arising from inaccurate data.</p>
              </section>

              <section id="section-7">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">7. Intellectual Property</h2>
                <p>The Platform, including its software, design, and content, is owned by {COMPANY} and protected by copyright and intellectual property laws. You retain ownership of all data you upload to the Platform. You grant us a limited licence to process and store your data solely for the purpose of providing the service.</p>
              </section>

              <section id="section-8">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">8. Privacy and Data Protection</h2>
                <p>Our collection and use of personal data is governed by our{' '}
                  <Link href="/legal/privacy" className="text-green-700 dark:text-green-400 underline underline-offset-2 hover:text-green-800">Privacy Policy</Link>,
                  {' '}which is incorporated into these Terms. We process personal data of farmers and field agents in accordance with the Nigeria Data Protection Act 2023 and, where applicable, the EU General Data Protection Regulation (GDPR).</p>
              </section>

              <section id="section-9">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">9. Limitation of Liability</h2>
                <p>To the maximum extent permitted by applicable law, {COMPANY} shall not be liable for any indirect, incidental, special, or consequential damages, including loss of profits, data, or business opportunities, arising from your use of the Platform. Our total liability shall not exceed the fees paid by you in the 12 months preceding the claim.</p>
              </section>

              <section id="section-10">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">10. Termination</h2>
                <p>Either party may terminate the subscription with 30 days written notice. We may suspend or terminate your access immediately if you materially breach these Terms or if required by law. Upon termination, you may export your data for 90 days. After this period, data may be permanently deleted.</p>
              </section>

              <section id="section-11">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">11. Governing Law</h2>
                <p>These Terms are governed by the laws of the Federal Republic of Nigeria. Any disputes shall be resolved by the courts of Lagos State, Nigeria, except where applicable law requires otherwise.</p>
              </section>

              <section id="section-12">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">12. Changes to Terms</h2>
                <p>We may update these Terms at any time. We will notify active subscribers by email at least 14 days before material changes take effect. Continued use after the effective date constitutes acceptance.</p>
              </section>

              <section id="section-13">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">13. Contact</h2>
                <p>For questions about these Terms, contact us at{' '}
                  <a href={`mailto:${EMAIL}`} className="text-green-700 dark:text-green-400 underline underline-offset-2 hover:text-green-800">{EMAIL}</a>.
                </p>
              </section>

              {/* Navigation between legal pages */}
              <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-sm">
                <Link href="/legal/privacy" className="text-green-700 dark:text-green-400 hover:underline">
                  → Privacy Policy
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
