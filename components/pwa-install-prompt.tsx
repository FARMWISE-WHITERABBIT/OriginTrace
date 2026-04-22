'use client';

/**
 * PWA install prompt — shown on mobile/tablet when the app is installable.
 *
 * Supports:
 * - Android / Chrome: native `beforeinstallprompt` flow
 * - iOS / iPadOS: manual "Add to Home Screen" instructions
 *   - Detects iPadOS 13+ which sends a Mac UA in desktop mode (checks maxTouchPoints)
 * - Touch-screen Chromebooks / Windows tablets
 *
 * Dismiss behaviour: 7-day snooze. After 7 days the prompt reappears so users
 * who tapped "Not now" in the field can install later.
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X, Share, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'ot_pwa_prompt_dismissed_at';
const SNOOZE_DAYS = 7;

function isSnoozed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return false;
    const dismissedAt = parseInt(raw, 10);
    if (isNaN(dismissedAt)) return true; // legacy boolean format — keep dismissed
    const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
    return daysSince < SNOOZE_DAYS;
  } catch {
    return false;
  }
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  // Standard iOS UA (iPhone, older iPad, iPod)
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return true;
  // iPadOS 13+ sends a Mac UA in desktop mode — detect by touch capability
  if (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1) return true;
  return false;
}

function isInStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  );
}

function isTouchDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  // Primary check: touch point count (covers tablets, phones, touch-screen laptops)
  if (navigator.maxTouchPoints > 0) return true;
  // Fallback: UA matching for Android/iOS/tablet keyword
  return /android|iphone|ipad|ipod|mobile|tablet/i.test(navigator.userAgent);
}

export function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Already running as installed PWA
    if (isInStandaloneMode()) return;
    // Within the snooze window
    if (isSnoozed()) return;
    // Non-touch desktop without an install event pending — skip for now
    // (will still show if beforeinstallprompt fires on desktop Chrome)
    if (!isTouchDevice()) return;

    // Detect post-install (appinstalled event)
    const onInstalled = () => {
      setInstalled(true);
      setVisible(false);
    };
    window.addEventListener('appinstalled', onInstalled);

    if (isIOS()) {
      // Show manual iOS instructions with a short delay so it's not jarring
      const t = setTimeout(() => {
        setShowIOSHint(true);
        setVisible(true);
      }, 3000);
      return () => {
        clearTimeout(t);
        window.removeEventListener('appinstalled', onInstalled);
      };
    }

    // Android / Chrome / Chromebook — listen for browser install event
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const snooze = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISSED_KEY, Date.now().toString());
    } catch {}
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    } else {
      // User declined the native prompt — snooze our banner
      snooze();
    }
    setInstallEvent(null);
  };

  if (!visible || installed) return null;

  return (
    <div
      role="complementary"
      aria-label="Install app prompt"
      className="fixed bottom-[72px] lg:bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 animate-in slide-in-from-bottom-4 duration-300"
    >
      <div className="bg-background border border-border rounded-2xl shadow-xl p-4 space-y-3">
        <div className="flex items-start gap-3">
          {/* App icon */}
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shrink-0 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/icon-green.png" alt="OriginTrace" className="h-12 w-12 object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight">Install OriginTrace</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
              Add to your home screen for offline access — works without internet in the field.
            </p>
          </div>
          <button
            onClick={snooze}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0 -mt-0.5"
            aria-label="Dismiss for now"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {showIOSHint ? (
          <>
            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-2">
              <p className="font-medium text-foreground flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5" /> Add to Home Screen:
              </p>
              <p className="flex items-start gap-1.5">
                <span className="shrink-0 font-semibold text-foreground">1.</span>
                <span>Tap the <Share className="h-3 w-3 inline mx-0.5 shrink-0" /> <strong>Share</strong> button at the bottom of Safari</span>
              </p>
              <p className="flex items-start gap-1.5">
                <span className="shrink-0 font-semibold text-foreground">2.</span>
                <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
              </p>
              <p className="flex items-start gap-1.5">
                <span className="shrink-0 font-semibold text-foreground">3.</span>
                <span>Tap <strong>"Add"</strong> in the top-right corner</span>
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full h-9 text-xs"
              onClick={snooze}
            >
              Remind me later
            </Button>
          </>
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
              onClick={snooze}
            >
              Not now
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
