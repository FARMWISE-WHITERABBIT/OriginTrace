import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle, Calendar, MapPin, Lightbulb } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Registration Confirmed – Export Readiness 2026',
};

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1F5C] via-[#0052A3] to-[#0066B2] flex flex-col items-center justify-center px-4 py-16">

      {/* Triple-brand logos */}
      <div className="flex items-center justify-center gap-4 mb-10 flex-wrap">
        <Image
          src="/images/nepc-logo.png"
          alt="Nigerian Export Promotion Council"
          width={130}
          height={36}
          style={{ width: 'auto', height: '30px', filter: 'brightness(0) invert(1)' }}
          priority
        />
        <span className="text-white/30 text-xl font-light select-none">×</span>
        <Image
          src="/images/union-bank-logo.png"
          alt="Union Bank"
          width={110}
          height={32}
          style={{ width: 'auto', height: '28px', mixBlendMode: 'screen' }}
          priority
        />
        <span className="text-white/30 text-xl font-light select-none">×</span>
        <Image
          src="/images/logo-white.png"
          alt="OriginTrace"
          width={120}
          height={32}
          style={{ width: 'auto', height: '24px' }}
          priority
        />
      </div>

      <div className="w-full max-w-md">

        {/* Success icon */}
        <div className="flex justify-center mb-6">
          <div className="h-20 w-20 rounded-full bg-white/15 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-white" strokeWidth={1.5} />
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl px-8 py-10">
          <h1 className="text-2xl font-bold text-slate-900 mb-2 text-center">
            You&apos;re Registered!
          </h1>
          <p className="text-slate-500 text-sm mb-6 text-center leading-relaxed">
            Thank you for registering for the Export Readiness &amp; Mentorship Training 2026.
            A confirmation email with full event details has been sent to your inbox.
          </p>

          {/* Event details box */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-6 space-y-3">
            <p className="text-blue-700 text-xs font-semibold uppercase tracking-wider">
              Event Details
            </p>
            <div className="flex items-start gap-2.5">
              <Calendar className="h-4 w-4 text-[#0052A3] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-800">Thursday, 23rd April 2026</p>
                <p className="text-xs text-slate-500">9:00 AM prompt</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 text-[#0052A3] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-800">Union Bank, Ogui Road, Enugu</p>
                <p className="text-xs text-slate-500">Top Floor, Union Bank, Ogui Road, Enugu</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Lightbulb className="h-4 w-4 text-[#0052A3] shrink-0 mt-0.5" />
              <p className="text-sm text-slate-600 italic">
                &ldquo;Empowering Nigerian Exporters for Sustainable Growth in Global Market&rdquo;
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-400 mb-6 text-center leading-relaxed">
            Please check your spam folder if you don&apos;t see the confirmation email.
            For enquiries:{' '}
            <a href="mailto:info@origintrace.trade" className="text-[#0052A3] hover:underline">
              info@origintrace.trade
            </a>
          </p>

          <Link
            href="/events/export-readiness"
            className="block text-center text-sm text-[#0052A3] hover:underline font-medium"
          >
            ← Register another attendee
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center space-y-1">
          <p className="text-white/40 text-xs">
            Hosted by NEPC South East Regional Office in collaboration with Union Bank and OriginTrace
          </p>
          <p className="text-white/25 text-xs">
            <Link href="/events" className="hover:text-white/50 transition-colors">
              ← Back to all events
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
