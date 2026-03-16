'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const STORAGE_KEY = 'ot_cookie_consent';

type ConsentValue = 'accepted' | 'declined' | null;

function getStoredConsent(): ConsentValue {
  try {
    return (localStorage.getItem(STORAGE_KEY) as ConsentValue) || null;
  } catch {
    return null;
  }
}

function setStoredConsent(value: 'accepted' | 'declined') {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {}
}

// Disable GA by setting the opt-out cookie Google recognises
function disableGA() {
  try {
    (window as any)[`ga-disable-G-EVZ942SKW9`] = true;
  } catch {}
}

function enableGA() {
  try {
    delete (window as any)[`ga-disable-G-EVZ942SKW9`];
  } catch {}
}

export function CookieBanner() {
  const [consent, setConsent] = useState<ConsentValue>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = getStoredConsent();
    setConsent(stored);
    if (stored === 'declined') disableGA();
    setMounted(true);
  }, []);

  const accept = () => {
    setStoredConsent('accepted');
    setConsent('accepted');
    enableGA();
  };

  const decline = () => {
    setStoredConsent('declined');
    setConsent('declined');
    disableGA();
  };

  // Don't render on server or if already decided
  if (!mounted || consent !== null) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
        role="dialog"
        aria-label="Cookie consent"
        data-testid="cookie-banner"
      >
        <div className="max-w-4xl mx-auto bg-background border rounded-xl shadow-xl p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium mb-1">We use cookies</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We use Google Analytics to understand how visitors use our site. No personal data is shared with third parties for advertising.{' '}
              <Link href="/legal/privacy" className="underline underline-offset-2 hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={decline}
              data-testid="button-cookie-decline"
            >
              Decline
            </Button>
            <Button
              size="sm"
              onClick={accept}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              data-testid="button-cookie-accept"
            >
              Accept
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
