'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Video, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa',
  'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti',
  'Enugu', 'FCT - Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano',
  'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger',
  'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
  'Taraba', 'Yobe', 'Zamfara',
];

const WHAT_YOU_WILL_LEARN = [
  'What EUDR, UK due diligence, US import rules, and China green trade requirements mean for your business right now',
  'The documents and data your buyers actually expect before they accept your goods',
  'How to build a traceability system that satisfies multiple markets — without running separate processes',
  'The most common compliance mistakes that lead to rejected shipments — and how to avoid them',
];

interface RegistrationForm {
  fullName: string;
  email: string;
  phone: string;
  organization: string;
  role: string;
  state: string;
  currentlyExporting: string;
  exportProducts: string;
  nepcRegistered: string;
}

interface EventStatus {
  registrationOpen: boolean;
  loaded: boolean;
}

function ClosedBanner() {
  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 text-center">
      <AlertCircle className="h-10 w-10 text-amber-300 mx-auto mb-4" />
      <h2 className="text-white text-xl font-bold mb-2">Registration is now closed</h2>
      <p className="text-white/70 text-sm leading-relaxed">
        The registration window for this webinar has ended. We look forward to seeing you at future events.
      </p>
      <Link
        href="/events"
        className="inline-block mt-6 text-sm text-white/60 hover:text-white transition-colors"
      >
        ← View all events
      </Link>
    </div>
  );
}

export default function BorderComplianceRegistrationPage() {
  const router = useRouter();
  const [form, setForm] = useState<RegistrationForm>({
    fullName: '',
    email: '',
    phone: '',
    organization: '',
    role: '',
    state: '',
    currentlyExporting: '',
    exportProducts: '',
    nepcRegistered: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventStatus, setEventStatus] = useState<EventStatus>({ registrationOpen: true, loaded: false });

  useEffect(() => {
    fetch('/api/events/status?slug=border-compliance-2026')
      .then(r => r.json())
      .then(data => setEventStatus({ registrationOpen: data.registrationOpen ?? true, loaded: true }))
      .catch(() => setEventStatus({ registrationOpen: true, loaded: true }));
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/events/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, slug: 'border-compliance-2026' }),
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 410) {
          setEventStatus({ registrationOpen: false, loaded: true });
          return;
        }
        setError(json.error ?? 'Something went wrong. Please try again.');
        return;
      }

      router.push('/events/border-compliance/success');
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const isExporting = form.currentlyExporting === 'yes';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A2E25] via-[#1F5F52] to-[#2E7D6B] flex flex-col">

      {/* Top nav */}
      <header className="px-6 py-4 flex items-center justify-between">
        <Link
          href="/events"
          className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All Events
        </Link>
        <span className="text-white/40 text-xs hidden sm:block">origintrace.trade/events</span>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-6 pb-16">
        <div className="w-full max-w-lg">

          {/* OriginTrace logo */}
          <div className="flex items-center justify-center mb-8">
            <Image
              src="/images/logo-white.png"
              alt="OriginTrace"
              width={140}
              height={36}
              style={{ width: 'auto', height: '30px' }}
              priority
            />
          </div>

          {/* Hero card */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 mb-4 text-center">
            <p className="text-emerald-300 text-xs font-semibold tracking-widest uppercase mb-2">
              Free Virtual Event · 12 June 2026
            </p>
            <h1 className="text-white text-xl font-bold leading-tight mb-4">
              How to Get Your Exports Into Europe, the US, China, the UK and UAE Without Getting Flagged at the Border
            </h1>
            <div className="flex flex-wrap justify-center gap-2.5 text-xs text-white/80 mb-4">
              <span className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
                <Calendar className="h-3.5 w-3.5" /> Fri, 12 June 2026
              </span>
              <span className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
                <Video className="h-3.5 w-3.5" /> Online · Zoom
              </span>
            </div>
            <p className="text-white/65 text-sm leading-relaxed">
              Regulations are tightening. Buyers are demanding proof. This session gives Nigerian exporters a clear picture of what traceability requirements actually look like across the world&apos;s most important markets.
            </p>
          </div>

          {/* What you will learn */}
          <div className="bg-white/8 border border-white/15 rounded-xl px-5 py-4 mb-4">
            <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-3">What You Will Learn</p>
            <ul className="space-y-2.5">
              {WHAT_YOU_WILL_LEARN.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="text-emerald-300 mt-0.5 shrink-0">→</span>
                  <span className="text-white/75 text-sm leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Speaker card */}
          <div className="bg-white/8 border border-white/15 rounded-xl px-5 py-4 mb-6">
            <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-3">Featured Speaker</p>
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-600/40 border border-emerald-400/30 flex items-center justify-center shrink-0">
                <span className="text-white text-sm font-bold">CN</span>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Chikaodi (Chinyere) Nwaosu</p>
                <p className="text-white/60 text-xs mt-0.5">Supply Chain &amp; Procurement Professional · One Acre Fund</p>
                <p className="text-white/50 text-xs mt-1 leading-relaxed">
                  Expert in end-to-end supply chain operations, compliance-driven procurement, strategic sourcing &amp; logistics
                </p>
              </div>
            </div>
          </div>

          {/* Closed banner or form */}
          {eventStatus.loaded && !eventStatus.registrationOpen ? (
            <ClosedBanner />
          ) : (
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <h2 className="text-slate-900 font-semibold text-lg">Reserve Your Spot</h2>
                <p className="text-slate-500 text-sm mt-0.5">All fields are required · Free to attend</p>
              </div>

              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                  <input
                    id="fullName" name="fullName" type="text" required
                    placeholder="e.g. Amara Okafor"
                    value={form.fullName} onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1F5F52] focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                  <input
                    id="email" name="email" type="email" required
                    placeholder="you@example.com"
                    value={form.email} onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1F5F52] focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                  <input
                    id="phone" name="phone" type="tel" required
                    placeholder="e.g. 08012345678"
                    value={form.phone} onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1F5F52] focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label htmlFor="organization" className="block text-sm font-medium text-slate-700 mb-1">Organisation / Company</label>
                  <input
                    id="organization" name="organization" type="text" required
                    placeholder="e.g. ABC Agro Exports Ltd"
                    value={form.organization} onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1F5F52] focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-1">Role / Job Title</label>
                  <input
                    id="role" name="role" type="text" required
                    placeholder="e.g. Export Manager"
                    value={form.role} onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1F5F52] focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-slate-700 mb-1">State</label>
                  <select
                    id="state" name="state" required
                    value={form.state} onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1F5F52] focus:border-transparent transition bg-white"
                  >
                    <option value="" disabled>Select your state</option>
                    {NIGERIAN_STATES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="border-t border-slate-100 pt-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Export Profile</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Are you currently exporting?
                  </label>
                  <div className="flex gap-4">
                    {['yes', 'no'].map(val => (
                      <label key={val} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="currentlyExporting"
                          value={val}
                          checked={form.currentlyExporting === val}
                          onChange={handleChange}
                          required
                          className="accent-[#1F5F52]"
                        />
                        <span className="text-sm text-slate-700 capitalize">{val}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="exportProducts" className="block text-sm font-medium text-slate-700 mb-1">
                    {isExporting
                      ? 'What are you currently exporting?'
                      : 'What would you like to export?'}
                  </label>
                  <input
                    id="exportProducts" name="exportProducts" type="text" required
                    placeholder={isExporting ? 'e.g. Cashew nuts, Cocoa beans' : 'e.g. Shea butter, Leather goods'}
                    value={form.exportProducts} onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1F5F52] focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Are you registered with NEPC?
                  </label>
                  <div className="flex gap-4">
                    {['yes', 'no'].map(val => (
                      <label key={val} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="nepcRegistered"
                          value={val}
                          checked={form.nepcRegistered === val}
                          onChange={handleChange}
                          required
                          className="accent-[#1F5F52]"
                        />
                        <span className="text-sm text-slate-700 capitalize">{val}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#1F5F52] hover:bg-[#174D42] text-white font-semibold py-3 px-6 rounded-xl text-sm transition disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                >
                  {submitting ? 'Registering…' : 'Register Now — Spots are limited →'}
                </button>
              </form>

              <div className="px-6 pb-5 text-center">
                <p className="text-xs text-slate-400">
                  A confirmation email will be sent to you. Zoom link shared before the event. For enquiries:{' '}
                  <a href="mailto:info@origintrace.trade" className="text-[#1F5F52] hover:underline">
                    info@origintrace.trade
                  </a>
                </p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 text-center space-y-1">
            <p className="text-white/40 text-xs">
              Hosted by OriginTrace
            </p>
            <p className="text-white/25 text-xs pt-1">
              <Link href="/events" className="hover:text-white/50 transition-colors">
                ← Back to all events
              </Link>
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}
