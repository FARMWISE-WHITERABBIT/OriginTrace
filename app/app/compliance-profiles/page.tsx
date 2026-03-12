'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// Compliance Profiles has been merged into Settings → Compliance tab.
// This page now redirects there so any bookmarked or cached links still work.
export default function ComplianceProfilesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/app/settings?tab=compliance');
  }, [router]);
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
