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

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400 text-sm">Loading…</p></div>}>
      <AdminPageContent />
    </Suspense>
  );
}

function AdminPageContent() {
  const searchParams = useSearchParams();
  const adminKey = searchParams.get('key') ?? '';

  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState('');

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

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch('/api/events/export', {
        headers: { 'x-admin-key': adminKey },
      });
      if (!res.ok) {
        alert('Export failed. Check your admin key.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().slice(0, 10);
      a.download = `YEXDEP_2026_Registrations_${date}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const filtered = registrations.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.full_name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.organization.toLowerCase().includes(q) ||
      r.state.toLowerCase().includes(q)
    );
  });

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
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[#A7D9CC] text-xs font-semibold tracking-widest uppercase">YEXDEP 2026 — Admin</p>
            <h1 className="text-lg font-bold">Registration Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchRegistrations}
              disabled={loading}
              className="bg-white/10 hover:bg-white/20 text-white text-sm px-4 py-2 rounded-lg font-medium transition disabled:opacity-50"
            >
              {loading ? 'Refreshing…' : '↻ Refresh'}
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || registrations.length === 0}
              className="bg-white text-[#1F5F52] text-sm px-4 py-2 rounded-lg font-semibold transition hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? 'Exporting…' : '⬇ Export Excel'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <StatCard label="Total Registered" value={registrations.length} color="blue" />
          <StatCard label="Checked In" value={checkedInCount} color="green" />
          <StatCard label="Not Yet Checked In" value={registrations.length - checkedInCount} color="amber" />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by name, email, organisation or state…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:max-w-sm rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F5F52]"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Full Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Phone</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Organisation</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">State</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Registered</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Checked In</th>
                </tr>
              </thead>
              <tbody>
                {loading && registrations.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-gray-400 text-sm">Loading registrations…</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-gray-400 text-sm">
                      {search ? 'No registrations match your search.' : 'No registrations yet.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((r, i) => (
                    <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{r.full_name}</td>
                      <td className="px-4 py-3 text-gray-600">{r.email}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.phone}</td>
                      <td className="px-4 py-3 text-gray-600">{r.organization}</td>
                      <td className="px-4 py-3 text-gray-600">{r.role}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.state}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                        {new Date(r.registered_at).toLocaleString('en-NG', {
                          timeZone: 'Africa/Lagos',
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.checked_in ? (
                          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full">
                            ✓ Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-xs font-medium px-2.5 py-1 rounded-full">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filtered.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
              Showing {filtered.length} of {registrations.length} registration{registrations.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Check-in link */}
        <div className="mt-4 text-center">
          <a
            href={`/events/yexdep/checkin?key=${encodeURIComponent(adminKey)}`}
            className="text-sm text-[#1F5F52] hover:underline font-medium"
          >
            Go to on-site check-in →
          </a>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: 'blue' | 'green' | 'amber' }) {
  const colors = {
    blue:  'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
  };
  return (
    <div className={`rounded-xl border px-5 py-4 ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-medium mt-0.5 opacity-80">{label}</p>
    </div>
  );
}
