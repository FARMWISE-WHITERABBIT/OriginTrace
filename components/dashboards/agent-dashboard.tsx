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
      <Card className={isOnline ? 'border-green-500/50' : 'border-orange-500/50'}>
        <CardContent className="p-4 flex items-center gap-3">
          {isOnline ? (
            <>
              <Wifi className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">You're online</span>
            </>
          ) : (
            <>
              <WifiOff className="h-5 w-5 text-orange-500" />
              <span className="text-sm font-medium">You're offline - Collections will sync when connected</span>
            </>
          )}
          {pendingSync > 0 && (
            <span className="ml-auto text-sm text-muted-foreground">
              {pendingSync} pending sync
            </span>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="hover-elevate">
          <CardHeader>
            <Package className="h-10 w-10 text-primary mb-2" />
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

        <Card className="hover-elevate">
          <CardHeader>
            <Map className="h-10 w-10 text-primary mb-2" />
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

      <Card className="hover-elevate">
        <CardHeader>
          <RefreshCw className="h-10 w-10 text-primary mb-2" />
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
