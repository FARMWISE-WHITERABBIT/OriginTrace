'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// Bags have been merged into Inventory (/app/inventory → Bags tab)
export default function BagsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/app/inventory'); }, [router]);
  return <div className="space-y-3 p-4">{Array.from({length:6}).map((_,i)=><div key={i} className="h-12 bg-muted animate-pulse rounded-lg"/>)}</div>;
}
