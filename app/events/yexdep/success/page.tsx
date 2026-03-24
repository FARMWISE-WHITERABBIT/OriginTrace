import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Registration Confirmed – YEXDEP 2026',
};

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D3D32] via-[#1F5F52] to-[#2E7D6B] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">

        {/* Success icon */}
        <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-white/15 flex items-center justify-center">
          <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div className="bg-white rounded-2xl shadow-xl px-8 py-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re Registered!</h1>
          <p className="text-gray-500 text-sm mb-6">
            Thank you for registering for YEXDEP 2026. A confirmation email with full event details has been sent to your inbox.
          </p>

          {/* Event reminder box */}
          <div className="bg-[#F0FDF9] border border-[#A7F3D0] rounded-xl p-5 mb-6 text-left space-y-2.5">
            <p className="text-[#065F46] text-xs font-semibold uppercase tracking-wider mb-1">Event Details</p>
            <div className="flex items-start gap-2.5">
              <span className="text-[#1F5F52] mt-0.5">📅</span>
              <div>
                <p className="text-sm font-medium text-gray-800">Wednesday, 25th March 2026</p>
                <p className="text-xs text-gray-500">9:00 AM prompt</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-[#1F5F52] mt-0.5">📍</span>
              <div>
                <p className="text-sm font-medium text-gray-800">NEPC Enugu Regional Office</p>
                <p className="text-xs text-gray-500">Agric Bank Building, Upper Presidential Road, Independence Layout, Enugu</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-[#1F5F52] mt-0.5">💡</span>
              <p className="text-sm text-gray-700 italic">&ldquo;From Passion to Port: Unlocking Youth Export Potential&rdquo;</p>
            </div>
          </div>

          <p className="text-xs text-gray-400 mb-5">
            Please check your spam folder if you don&apos;t see the confirmation email. For enquiries:{' '}
            <a href="mailto:info@origintrace.trade" className="text-[#1F5F52] underline">
              info@origintrace.trade
            </a>
          </p>

          <Link
            href="/events/yexdep"
            className="text-sm text-[#1F5F52] hover:underline font-medium"
          >
            ← Register another attendee
          </Link>
        </div>

        <p className="text-white/40 text-xs mt-6">
          Hosted by OriginTrace & NEPC · events.origintrace.trade
        </p>
      </div>
    </div>
  );
}
