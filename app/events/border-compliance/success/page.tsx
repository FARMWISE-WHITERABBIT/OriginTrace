import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle, Calendar, Video, Lightbulb } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Registration Confirmed – Border Compliance Webinar 2026',
};

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A2E25] via-[#1F5F52] to-[#2E7D6B] flex flex-col items-center justify-center px-4 py-16">

      {/* Logo */}
      <div className="flex items-center justify-center mb-10">
        <Image
          src="/images/logo-white.png"
          alt="OriginTrace"
          width={130}
          height={34}
          style={{ width: 'auto', height: '28px' }}
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
            Thank you for reserving your spot for the Border Compliance Webinar.
            A confirmation email has been sent to your inbox with event details.
          </p>

          {/* Event details box */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 mb-6 space-y-3">
            <p className="text-emerald-700 text-xs font-semibold uppercase tracking-wider">
              Event Details
            </p>
            <div className="flex items-start gap-2.5">
              <Calendar className="h-4 w-4 text-[#1F5F52] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-800">Friday, 12 June 2026</p>
                <p className="text-xs text-slate-500">Time to be confirmed — check your email</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Video className="h-4 w-4 text-[#1F5F52] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-800">Online · Zoom</p>
                <p className="text-xs text-slate-500">Joining link will be sent to your registered email</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Lightbulb className="h-4 w-4 text-[#1F5F52] shrink-0 mt-0.5" />
              <p className="text-sm text-slate-600 italic">
                &ldquo;Don&apos;t let a missing document stop your next shipment.&rdquo;
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-400 mb-6 text-center leading-relaxed">
            Please check your spam folder if you don&apos;t see the confirmation email.
            For enquiries:{' '}
            <a href="mailto:info@origintrace.trade" className="text-[#1F5F52] hover:underline">
              info@origintrace.trade
            </a>
          </p>

          <Link
            href="/events/border-compliance"
            className="block text-center text-sm text-[#1F5F52] hover:underline font-medium"
          >
            ← Register another attendee
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center space-y-1">
          <p className="text-white/40 text-xs">
            Hosted by OriginTrace
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
