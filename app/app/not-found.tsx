import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileSearch, Home } from 'lucide-react';

/**
 * Next.js App Router not-found boundary for the /app segment.
 * Server component — no event handlers, no window.* calls.
 */
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 p-8 text-center">
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
        <FileSearch className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-2 max-w-sm">
        <h2 className="text-xl font-semibold tracking-tight">Page not found</h2>
        <p className="text-sm text-muted-foreground">
          This record doesn&apos;t exist or you don&apos;t have access to it. It may have been deleted or the link is incorrect.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/app">
            <Home className="h-4 w-4 mr-2" />
            Dashboard
          </Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/app/inventory">
            Back to Inventory
          </Link>
        </Button>
      </div>
    </div>
  );
}
