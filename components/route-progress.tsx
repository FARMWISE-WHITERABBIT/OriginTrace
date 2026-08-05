'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Route changed — animate to completion
    setProgress(85);
    const done = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
    }, 150);
    return () => clearTimeout(done);
  }, [pathname, searchParams]);

  // Start the bar immediately on mount to handle initial load
  useEffect(() => {
    setVisible(true);
    setProgress(20);
    intervalRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 80) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return p;
        }
        return p + Math.random() * 8;
      });
    }, 200);
    timerRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }, 2000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-0.5 bg-transparent pointer-events-none"
      aria-hidden="true"
    >
      <div
        className="h-full bg-primary transition-all ease-out"
        style={{
          width: `${progress}%`,
          transitionDuration: progress === 100 ? '150ms' : '300ms',
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
}

// Wrapper with Suspense since useSearchParams requires it
import { Suspense } from 'react';

export function RouteProgressBar() {
  return (
    <Suspense fallback={null}>
      <RouteProgress />
    </Suspense>
  );
}
