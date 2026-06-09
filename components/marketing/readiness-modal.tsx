'use client';

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { ComplianceCalculator } from './compliance-calculator';

export function ReadinessModal() {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-mk-primary btn-mk-lg"
        data-testid="button-check-readiness"
      >
        Check Your Export Readiness
      </button>

      {open && (
        <div
          className="fixed inset-0 flex"
          style={{ zIndex: 9999 }}
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
        >
          {/* Full-page panel */}
          <div className="relative flex w-full h-full overflow-hidden" style={{ maxWidth: '1100px', margin: 'auto', height: 'min(96vh, 820px)', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.45)' }}>

            {/* LEFT — context panel */}
            <div
              className="hidden lg:flex flex-col justify-between p-10 flex-shrink-0"
              style={{ width: '380px', background: 'var(--mk-green, #1a3d2b)', color: '#fff' }}
            >
              <div>
                {/* Logo mark */}
                <div className="flex items-center gap-2 mb-12">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  </div>
                  <span className="font-semibold text-sm tracking-wide" style={{ color: 'rgba(255,255,255,0.9)' }}>OriginTrace</span>
                </div>

                <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>Export Readiness Tool</p>
                <h2 className="text-2xl font-bold leading-tight mb-4" style={{ color: '#fff' }}>
                  Know your compliance gaps<br />before your buyer does.
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.62)' }}>
                  12 questions. Instant score. A prioritised action plan built for African agri and mineral exporters.
                </p>

                <div className="mt-10 space-y-4">
                  {[
                    { icon: '🌍', label: 'EU, US & China requirements' },
                    { icon: '⚡', label: 'Results in under 3 minutes' },
                    { icon: '🔒', label: 'Confidential — no spam' },
                  ].map(({ icon, label }) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-base">{icon}</span>
                      <span className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom badge */}
              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Trusted by exporters across West & Central Africa
              </div>
            </div>

            {/* RIGHT — form panel */}
            <div className="flex-1 flex flex-col" style={{ background: '#fff', overflowY: 'auto' }}>
              {/* Top bar */}
              <div className="flex items-center justify-between px-8 py-5 border-b flex-shrink-0" style={{ borderColor: 'rgba(0,0,0,0.07)' }}>
                {/* Mobile logo */}
                <div className="flex items-center gap-2 lg:hidden">
                  <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'var(--mk-green, #1a3d2b)' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: 'var(--mk-green, #1a3d2b)' }}>OriginTrace</span>
                </div>
                <div className="hidden lg:block" />

                <button
                  onClick={close}
                  className="flex items-center justify-center rounded-full w-9 h-9 transition-colors hover:bg-gray-100"
                  style={{ color: '#666' }}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Calculator */}
              <div className="flex-1 px-8 py-8 lg:px-12">
                <ComplianceCalculator onClose={close} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
