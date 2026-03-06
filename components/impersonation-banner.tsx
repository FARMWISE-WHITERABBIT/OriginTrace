'use client';

import { useOrg } from '@/lib/contexts/org-context';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X } from 'lucide-react';

export function ImpersonationBanner() {
  const { impersonation, stopImpersonation, isSystemAdmin } = useOrg();
  
  if (!impersonation.isImpersonating || !isSystemAdmin) {
    return null;
  }
  
  const handleStopImpersonation = async () => {
    await stopImpersonation();
    window.location.href = '/superadmin/organizations';
  };
  
  return (
    <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-between gap-4 sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm font-medium">
          Viewing as <strong>{impersonation.orgName}</strong>. Exit Session.
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleStopImpersonation}
        className="h-7 bg-white/10 border-white/30 text-white hover:bg-white/20"
        data-testid="button-stop-impersonation"
      >
        <X className="h-3 w-3 mr-1" />
        Exit Session
      </Button>
    </div>
  );
}
