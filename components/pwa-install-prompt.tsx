'use client';

/**
 * PWA install prompt — shown on mobile/tablet when the app is installable.
 * Uses the `beforeinstallprompt` browser event. On iOS (Safari) where the
 * event is not fired, shows manual instructions instead.
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'ot_pwa_prompt_dismissed';

function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  );
}

function isMobileOrTablet() {
  if (typeof navigator === 'undefined') return false;
  return /android|iphone|ipad|ipod|mobile|tablet/i.test(navigator.userAgent);
}

export function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Already installed or dismissed
    if (isInStandaloneMode()) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    if (!isMobileOrTablet()) return;

    // iOS — show manual instructions
    if (isIOS()) {
      setShowIOSHint(true);
      setVisible(true);
      return;
    }

    // Android / Chrome / other — listen for install event
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, '1');
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
    setInstallEvent(null);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-[72px] lg:bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-background border border-border rounded-2xl shadow-xl p-4 space-y-3">
        <div className="flex items-start gap-3">
          {/* App icon */}
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-lg">OT</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight">Install OriginTrace</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
              Add to your home screen for offline access — perfect for field agents.
            </p>
          </div>
          <button
            onClick={dismiss}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0 -mt-0.5"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {showIOSHint ? (
          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1.5">
            <p className="font-medium text-foreground">Add to Home Screen:</p>
            <p className="flex items-center gap-1.5">
              <span>1.</span>
              <span>Tap the <Share className="h-3 w-3 inline" /> Share button in Safari</span>
            </p>
            <p>2. Scroll down and tap <strong>"Add to Home Screen"</strong></p>
            <p>3. Tap <strong>"Add"</strong></p>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 h-9"
              onClick={install}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Install App
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9 px-3 text-xs"
              onClick={dismiss}
            >
              Not now
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
