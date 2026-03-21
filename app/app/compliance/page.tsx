'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// Compliance Review has been merged into Farm Polygons (/app/farms → Pending Review tab)
export default function ComplianceRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/app/farms'); }, [router]);
  return <div className="space-y-3 p-4">{Array.from({length:4}).map((_,i)=><div key={i} className="h-16 bg-muted animate-pulse rounded-xl"/>)}</div>;
}
