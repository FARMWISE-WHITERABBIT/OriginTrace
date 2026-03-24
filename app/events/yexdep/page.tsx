'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa',
  'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti',
  'Enugu', 'FCT - Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano',
  'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger',
  'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
  'Taraba', 'Yobe', 'Zamfara',
];

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  organization: string;
  role: string;
  state: string;
}

export default function YexdepRegistrationPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>({
    fullName: '',
    email: '',
    phone: '',
    organization: '',
    role: '',
    state: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
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
        body: JSON.stringify(form),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Something went wrong. Please try again.');
        return;
      }

      router.push('/events/yexdep/success');
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D3D32] via-[#1F5F52] to-[#2E7D6B] flex flex-col">
      {/* Top bar */}
      <header className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
            <span className="text-white font-bold text-sm">OT</span>
          </div>
          <span className="text-white/80 text-sm font-medium">OriginTrace × NEPC</span>
        </div>
        <span className="text-white/50 text-xs hidden sm:block">25 March 2026 · Enugu</span>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-lg">

          {/* Hero card */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 mb-6 text-center">
            <p className="text-[#A7D9CC] text-xs font-semibold tracking-widest uppercase mb-2">
              Youth Export Development Programme
            </p>
            <h1 className="text-white text-2xl font-bold leading-tight mb-1">YEXDEP 2026</h1>
            <p className="text-white/70 text-sm italic mb-4">
              "From Passion to Port: Unlocking Youth Export Potential"
            </p>
            <div className="flex flex-wrap justify-center gap-3 text-xs text-white/80">
              <span className="bg-white/10 rounded-full px-3 py-1">📅 Wed, 25 March 2026</span>
              <span className="bg-white/10 rounded-full px-3 py-1">🕘 9:00 AM prompt</span>
              <span className="bg-white/10 rounded-full px-3 py-1">📍 NEPC Enugu</span>
            </div>
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-gray-900 font-semibold text-lg">Register to Attend</h2>
              <p className="text-gray-500 text-sm mt-0.5">All fields are required. Free entry.</p>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  placeholder="e.g. Amara Okafor"
                  value={form.fullName}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1F5F52] focus:border-transparent transition"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1F5F52] focus:border-transparent transition"
                />
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  placeholder="e.g. 08012345678"
                  value={form.phone}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1F5F52] focus:border-transparent transition"
                />
              </div>

              {/* Organization */}
              <div>
                <label htmlFor="organization" className="block text-sm font-medium text-gray-700 mb-1">
                  Organisation / Company
                </label>
                <input
                  id="organization"
                  name="organization"
                  type="text"
                  required
                  placeholder="e.g. ABC Agro Exports Ltd"
                  value={form.organization}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1F5F52] focus:border-transparent transition"
                />
              </div>

              {/* Role */}
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Role / Job Title
                </label>
                <input
                  id="role"
                  name="role"
                  type="text"
                  required
                  placeholder="e.g. Export Manager"
                  value={form.role}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1F5F52] focus:border-transparent transition"
                />
              </div>

              {/* State */}
              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                  State of Origin
                </label>
                <select
                  id="state"
                  name="state"
                  required
                  value={form.state}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1F5F52] focus:border-transparent transition bg-white"
                >
                  <option value="" disabled>Select your state</option>
                  {NIGERIAN_STATES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#1F5F52] hover:bg-[#174D42] text-white font-semibold py-3 px-6 rounded-lg text-sm transition disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {submitting ? 'Registering…' : 'Register Now →'}
              </button>
            </form>

            <div className="px-6 pb-5 text-center">
              <p className="text-xs text-gray-400">
                A confirmation email will be sent to you. For enquiries:{' '}
                <a href="mailto:info@origintrace.trade" className="text-[#1F5F52] underline">
                  info@origintrace.trade
                </a>
              </p>
            </div>
          </div>

          {/* Hosted by */}
          <p className="text-center text-white/40 text-xs mt-6">
            Hosted by OriginTrace & NEPC · events.origintrace.trade
          </p>
        </div>
      </main>
    </div>
  );
}
