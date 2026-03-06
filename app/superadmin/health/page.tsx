'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { createClient } from '@/lib/supabase/client';
import { 
  Activity, 
  AlertTriangle, 
  Clock, 
  RefreshCw, 
  Server, 
  Database,
  Users,
  Wifi,
  WifiOff,
  MapPin,
  Loader2
} from 'lucide-react';

interface DeadRecord {
  id: string;
  batch_id: string;
  agent_name: string;
  agent_email: string;
  org_name: string;
  last_sync: string;
  hours_stale: number;
  last_location?: { lat: number; lng: number } | null;
}

interface SystemHealth {
  database: 'healthy' | 'degraded' | 'down';
  syncService: 'healthy' | 'degraded' | 'down';
  totalOrgs: number;
  activeAgents: number;
  pendingSyncs: number;
}

export default function SuperadminHealthPage() {
  const [deadRecords, setDeadRecords] = useState<DeadRecord[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const supabase = createClient();

  const fetchHealthData = async () => {
    if (!supabase) return;

    try {
      const now = new Date();
      const cutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      const { data: staleBatches } = await supabase
        .from('collection_batches')
        .select(`
          id,
          batch_id,
          created_at,
          updated_at,
          profiles:agent_id (
            full_name,
            email
          ),
          organizations:org_id (
            name
          )
        `)
        .eq('status', 'pending')
        .lt('updated_at', cutoff.toISOString())
        .order('updated_at', { ascending: true })
        .limit(50);

      const records: DeadRecord[] = (staleBatches || []).map((batch: any) => {
        const lastSync = new Date(batch.updated_at);
        const hoursStale = Math.round((now.getTime() - lastSync.getTime()) / (1000 * 60 * 60));
        
        return {
          id: batch.id,
          batch_id: batch.batch_id || batch.id.slice(0, 8),
          agent_name: batch.profiles?.full_name || 'Unknown',
          agent_email: batch.profiles?.email || 'N/A',
          org_name: batch.organizations?.name || 'Unknown Org',
          last_sync: batch.updated_at,
          hours_stale: hoursStale,
          last_location: null
        };
      });

      setDeadRecords(records);

      const [orgsCount, agentsCount, pendingCount] = await Promise.all([
        supabase.from('organizations').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'agent'),
        supabase.from('collection_batches').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      setSystemHealth({
        database: 'healthy',
        syncService: records.length > 10 ? 'degraded' : 'healthy',
        totalOrgs: orgsCount.count || 0,
        activeAgents: agentsCount.count || 0,
        pendingSyncs: pendingCount.count || 0
      });

    } catch (error) {
      console.error('Failed to fetch health data:', error);
      setSystemHealth({
        database: 'degraded',
        syncService: 'degraded',
        totalOrgs: 0,
        activeAgents: 0,
        pendingSyncs: 0
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
    
    const interval = setInterval(fetchHealthData, 60000);
    return () => clearInterval(interval);
  }, [supabase]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchHealthData();
  };

  const getStatusBadge = (status: 'healthy' | 'degraded' | 'down') => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-600">Healthy</Badge>;
      case 'degraded':
        return <Badge className="bg-orange-500">Degraded</Badge>;
      case 'down':
        return <Badge variant="destructive">Down</Badge>;
    }
  };

  const getStalenessBadge = (hours: number) => {
    if (hours >= 72) {
      return <Badge variant="destructive">{hours}h</Badge>;
    } else if (hours >= 48) {
      return <Badge className="bg-orange-500">{hours}h</Badge>;
    }
    return <Badge variant="secondary">{hours}h</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">System Health</h1>
          <p className="text-slate-400">
            Pilot War Room - Monitor sync status and system health
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="border-slate-600"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Database</CardTitle>
            <Database className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            {systemHealth && getStatusBadge(systemHealth.database)}
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Sync Service</CardTitle>
            <Server className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            {systemHealth && getStatusBadge(systemHealth.syncService)}
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Active Agents</CardTitle>
            <Users className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{systemHealth?.activeAgents || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Pending Syncs</CardTitle>
            <Clock className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{systemHealth?.pendingSyncs || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <AlertTriangle className="h-5 w-5 text-orange-400" />
            Dead Records - Stale Batches (&gt;48h)
          </CardTitle>
          <CardDescription className="text-slate-400">
            Collection batches that haven't synced in over 48 hours. Follow up with agents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deadRecords.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium text-white">All Clear</p>
              <p className="text-slate-400">No stale records detected</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-300">Batch ID</TableHead>
                    <TableHead className="text-slate-300">Agent</TableHead>
                    <TableHead className="text-slate-300">Organization</TableHead>
                    <TableHead className="text-slate-300">Last Sync</TableHead>
                    <TableHead className="text-slate-300">Staleness</TableHead>
                    <TableHead className="text-slate-300">Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deadRecords.map((record) => (
                    <TableRow key={record.id} className="border-slate-700">
                      <TableCell className="font-mono text-white">{record.batch_id}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-white">{record.agent_name}</p>
                          <p className="text-xs text-slate-400">{record.agent_email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">{record.org_name}</TableCell>
                      <TableCell className="text-slate-400">
                        {new Date(record.last_sync).toLocaleString()}
                      </TableCell>
                      <TableCell>{getStalenessBadge(record.hours_stale)}</TableCell>
                      <TableCell>
                        {record.last_location ? (
                          <Button variant="ghost" size="sm" className="text-cyan-400">
                            <MapPin className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        ) : (
                          <span className="text-slate-500 flex items-center gap-1">
                            <WifiOff className="h-3 w-3" /> Unknown
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Activity className="h-5 w-5 text-cyan-400" />
            Real-time Sync Activity
          </CardTitle>
          <CardDescription className="text-slate-400">
            Live feed of sync events across all organizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-400">
            <Wifi className="h-8 w-8 mx-auto mb-2 animate-pulse" />
            <p>Listening for sync events...</p>
            <p className="text-sm">Real-time updates will appear here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
