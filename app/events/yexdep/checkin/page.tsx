'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface Registration {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  organization: string;
  role: string;
  state: string;
  registered_at: string;
  checked_in: boolean;
  checked_in_at: string | null;
}

export default function CheckinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400 text-sm">Loading…</p></div>}>
      <CheckinPageContent />
    </Suspense>
  );
}

function CheckinPageContent() {
  const searchParams = useSearchParams();
  const adminKey = searchParams.get('key') ?? '';

  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [lastCheckedIn, setLastCheckedIn] = useState<string | null>(null);

  const fetchRegistrations = useCallback(async () => {
    if (!adminKey) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/events/registrations', {
        headers: { 'x-admin-key': adminKey },
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to load registrations');
        return;
      }
      setRegistrations(json.registrations ?? []);
    } catch {
      setError('Network error. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  async function handleCheckin(id: string, fullName: string) {
    setCheckingIn(id);
    setLastCheckedIn(null);
    try {
      const res = await fetch('/api/events/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({ registrationId: id }),
      });
      const json = await res.json();

      if (res.status === 409) {
        alert(`${fullName} is already checked in.`);
        return;
      }
      if (!res.ok) {
        alert(json.error ?? 'Check-in failed. Try again.');
        return;
      }

      // Update local state
      setRegistrations(prev =>
        prev.map(r => r.id === id ? { ...r, checked_in: true, checked_in_at: json.checkedInAt } : r)
      );
      setLastCheckedIn(json.fullName);
    } finally {
      setCheckingIn(null);
    }
  }

  const filtered = search
    ? registrations.filter(r => {
        const q = search.toLowerCase();
        return r.full_name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
      })
    : [];

  const checkedInCount = registrations.filter(r => r.checked_in).length;

  if (!adminKey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow p-8 max-w-sm w-full text-center">
          <p className="text-gray-500 text-sm">
            Access this page with <code className="bg-gray-100 px-1 rounded text-xs">?key=YOUR_ADMIN_KEY</code> in the URL.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#1F5F52] text-white px-6 py-4 shadow-sm">
        <div className="max-w-2xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[#A7D9CC] text-xs font-semibold tracking-widest uppercase">YEXDEP 2026</p>
            <h1 className="text-lg font-bold">On-site Check-in</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-2xl font-bold leading-none">{checkedInCount}</p>
              <p className="text-[#A7D9CC] text-xs">of {registrations.length} checked in</p>
            </div>
            <button
              onClick={fetchRegistrations}
              disabled={loading}
              className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg transition disabled:opacity-50"
            >
              {loading ? '…' : '↻'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Success toast */}
        {lastCheckedIn && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
            <span className="text-green-500 text-xl">✓</span>
            <div>
              <p className="text-green-800 font-semibold text-sm">{lastCheckedIn} checked in successfully!</p>
              <p className="text-green-600 text-xs">Attendance recorded.</p>
            </div>
            <button
              onClick={() => setLastCheckedIn(null)}
              className="ml-auto text-green-400 hover:text-green-600 text-lg leading-none"
            >
              ×
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search attendee by name or email
          </label>
          <input
            type="text"
            autoFocus
            placeholder="Start typing a name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F5F52]"
          />
        </div>

        {/* Results */}
        {search && (
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 px-5 py-8 text-center text-sm text-gray-400">
                No registrations match &ldquo;{search}&rdquo;
              </div>
            ) : (
              filtered.map(r => (
                <div
                  key={r.id}
                  className={`bg-white rounded-xl border shadow-sm p-4 flex items-start gap-4 ${
                    r.checked_in ? 'border-green-200' : 'border-gray-200'
                  }`}
                >
                  {/* Avatar */}
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    r.checked_in ? 'bg-green-100 text-green-700' : 'bg-[#E8F5F1] text-[#1F5F52]'
                  }`}>
                    {r.full_name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{r.full_name}</p>
                    <p className="text-gray-500 text-xs">{r.email}</p>
                    <p className="text-gray-400 text-xs">{r.organization} · {r.state}</p>
                    {r.checked_in && r.checked_in_at && (
                      <p className="text-green-600 text-xs mt-1">
                        ✓ Checked in at{' '}
                        {new Date(r.checked_in_at).toLocaleTimeString('en-NG', {
                          timeZone: 'Africa/Lagos',
                          timeStyle: 'short',
                        })}
                      </p>
                    )}
                  </div>

                  {/* Action */}
                  <div className="flex-shrink-0">
                    {r.checked_in ? (
                      <span className="inline-flex items-center bg-green-100 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                        ✓ Attended
                      </span>
                    ) : (
                      <button
                        onClick={() => handleCheckin(r.id, r.full_name)}
                        disabled={checkingIn === r.id}
                        className="bg-[#1F5F52] hover:bg-[#174D42] text-white text-xs font-semibold px-4 py-2 rounded-lg transition disabled:opacity-60"
                      >
                        {checkingIn === r.id ? 'Marking…' : 'Mark Attended'}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {!search && (
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-8 text-center">
            <p className="text-gray-400 text-sm">
              Search for an attendee above to check them in.
            </p>
            <p className="text-gray-300 text-xs mt-1">{registrations.length} total registrations loaded</p>
          </div>
        )}

        <div className="mt-4 text-center">
          <a
            href={`/events/yexdep/admin?key=${encodeURIComponent(adminKey)}`}
            className="text-sm text-[#1F5F52] hover:underline font-medium"
          >
            ← Back to admin dashboard
          </a>
        </div>
      </main>
    </div>
  );
}
