'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// Compliance Review has been merged into Farm Polygons (/app/farms → Pending Review tab)
export default function ComplianceRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/app/farms'); }, [router]);
  return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
}
