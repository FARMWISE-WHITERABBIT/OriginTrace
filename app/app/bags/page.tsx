'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// Bags have been merged into Inventory (/app/inventory → Bags tab)
export default function BagsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/app/inventory'); }, [router]);
  return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
}
