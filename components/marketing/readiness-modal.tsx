'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { ComplianceCalculator } from './compliance-calculator';

export function ReadinessModal() {
  const [open, setOpen] = useState(false);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
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
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            className="relative w-full rounded-2xl overflow-hidden"
            style={{
              maxWidth: '680px',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: 'var(--mk-surface-white, #fff)',
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 z-10 flex items-center justify-center rounded-full w-8 h-8 transition-colors"
              style={{ background: 'rgba(0,0,0,0.08)' }}
              aria-label="Close"
            >
              <X size={16} />
            </button>

            <ComplianceCalculator />
          </div>
        </div>
      )}
    </>
  );
}
