'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Next.js App Router error boundary for the /app segment.
 * Catches unhandled errors in server components and async page loads.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to your error reporting service here
    console.error('[AppError]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8 text-center">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <div>
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          An unexpected error occurred loading this page. Try again or contact support if this persists.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <pre className="mt-4 text-xs text-left bg-muted p-3 rounded overflow-auto max-w-lg">
            {error.message}
            {error.digest ? `\nDigest: ${error.digest}` : ''}
          </pre>
        )}
      </div>
      <Button variant="outline" size="sm" onClick={reset}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}
