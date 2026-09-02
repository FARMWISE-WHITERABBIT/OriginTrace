'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useOrg } from '@/lib/contexts/org-context';
import { Map, Package, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';

export function AgentDashboard() {
  const { profile } = useOrg();
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSync, setPendingSync] = useState(0);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    try {
      const stored = localStorage.getItem('origintrace-offline-collections');
      if (stored) {
        const items = JSON.parse(stored);
        if (Array.isArray(items)) {
          setPendingSync(items.length);
        }
      }
    } catch {
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Connectivity banner */}
      <Card className={`border-l-4 ${isOnline ? 'border-l-green-500 bg-green-50/50 dark:bg-green-950/20' : 'border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/20'}`}>
        <CardContent className="p-4 flex items-center gap-3">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${isOnline ? 'bg-green-100 dark:bg-green-900/50' : 'bg-orange-100 dark:bg-orange-900/50'}`}>
            {isOnline
              ? <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" />
              : <WifiOff className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {isOnline ? 'Online — all systems connected' : 'Offline — collections saved locally'}
            </p>
            {!isOnline && (
              <p className="text-xs text-muted-foreground">Will sync automatically when connection is restored</p>
            )}
          </div>
          {pendingSync > 0 && (
            <span className="badge-warning text-xs font-medium px-2 py-0.5 rounded-full shrink-0">
              {pendingSync} pending
            </span>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="card-accent-emerald transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <CardHeader>
            <div className="h-12 w-12 rounded-xl flex items-center justify-center icon-bg-emerald mb-3">
              <Package className="h-6 w-6" />
            </div>
            <CardTitle className="field-heading">Smart Collect</CardTitle>
            <CardDescription className="field-text">
              Create a new collection batch
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/app/collect">
              <Button size="lg" className="w-full min-h-[48px] text-lg font-semibold" data-testid="button-collect">
                New Collection
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="card-accent-blue transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <CardHeader>
            <div className="h-12 w-12 rounded-xl flex items-center justify-center icon-bg-blue mb-3">
              <Map className="h-6 w-6" />
            </div>
            <CardTitle className="field-heading">Map a Farm</CardTitle>
            <CardDescription className="field-text">
              Map farm boundaries with GPS or satellite
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/app/farms/map">
              <Button size="lg" className="w-full min-h-[48px] text-lg font-semibold" data-testid="button-map-farm">
                Start Mapping
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="card-accent-violet transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
        <CardHeader>
          <div className="h-12 w-12 rounded-xl flex items-center justify-center icon-bg-violet mb-3">
            <RefreshCw className="h-6 w-6" />
          </div>
          <CardTitle className="field-heading">Sync Dashboard</CardTitle>
          <CardDescription className="field-text">
            View and manage offline data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/app/sync">
            <Button size="lg" variant="outline" className="w-full min-h-[48px] text-lg font-semibold" data-testid="button-sync-dashboard">
              Open Sync Dashboard
            </Button>
          </Link>
        </CardContent>
      </Card>

      {(profile?.assigned_state || profile?.assigned_lga) && (
        <Card>
          <CardHeader>
            <CardTitle>Your Assignment</CardTitle>
            <CardDescription>Your designated collection area</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {profile.assigned_state && <p><strong>State:</strong> {profile.assigned_state}</p>}
              {profile.assigned_lga && <p><strong>LGA:</strong> {profile.assigned_lga}</p>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
