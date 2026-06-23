'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, RefreshCw, FileText, Shield, ChevronLeft, ChevronRight } from 'lucide-react';

interface AuditLog {
  id: string;
  superadmin_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  metadata: Record<string, any> | null;
  ip_address: string | null;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  'impersonation.started':  'bg-cyan-900/40 text-cyan-300 border-cyan-700',
  'impersonation.stopped':  'bg-slate-700 text-slate-300 border-slate-600',
  'org.tier_changed':       'bg-amber-900/40 text-amber-300 border-amber-700',
  'org.status_changed':     'bg-orange-900/40 text-orange-300 border-orange-700',
  'org.created':            'bg-green-900/40 text-green-300 border-green-700',
  'feature_toggle.changed': 'bg-purple-900/40 text-purple-300 border-purple-700',
};

const PAGE_SIZE = 50;

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        resource: 'audit_logs',
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
        ...(search ? { search } : {}),
        ...(actionFilter !== 'all' ? { action: actionFilter } : {}),
      });
      const res = await fetch(`/api/superadmin?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs ?? []);
        setTotal(data.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, actionFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <FileText className="h-7 w-7 text-cyan-400" />Audit Log
          </h1>
          <p className="text-slate-400">All superadmin actions logged for security review</p>
        </div>
        <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800" onClick={fetchLogs}>
          <RefreshCw className="h-4 w-4 mr-2" />Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search by action or target…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="pl-9 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500" />
        </div>
        <Select value={actionFilter} onValueChange={v => { setActionFilter(v); setPage(0); }}>
          <SelectTrigger className="bg-slate-800 border-slate-600 text-white w-48">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-600">
            <SelectItem value="all">All actions</SelectItem>
            <SelectItem value="impersonation.started">Impersonation started</SelectItem>
            <SelectItem value="impersonation.stopped">Impersonation stopped</SelectItem>
            <SelectItem value="org.tier_changed">Tier changed</SelectItem>
            <SelectItem value="org.status_changed">Status changed</SelectItem>
            <SelectItem value="org.created">Org created</SelectItem>
            <SelectItem value="feature_toggle.changed">Feature toggle</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-slate-900 border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-base">
              {loading ? 'Loading…' : `${total.toLocaleString()} events`}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>Page {page + 1} of {totalPages}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-400">Timestamp</TableHead>
                    <TableHead className="text-slate-400">Action</TableHead>
                    <TableHead className="text-slate-400">Target</TableHead>
                    <TableHead className="text-slate-400">IP Address</TableHead>
                    <TableHead className="text-slate-400">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(log => (
                    <TableRow key={log.id} className="border-slate-700 hover:bg-slate-800/40">
                      <TableCell className="text-slate-400 text-xs whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium' })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs font-mono ${ACTION_COLORS[log.action] ?? 'border-slate-600 text-slate-400'}`}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm">
                        {log.target_label ?? log.target_id ?? '—'}
                        {log.target_type && <span className="text-slate-500 ml-1 text-xs">({log.target_type})</span>}
                      </TableCell>
                      <TableCell className="text-slate-500 text-xs font-mono">{log.ip_address ?? '—'}</TableCell>
                      <TableCell className="text-slate-500 text-xs max-w-xs truncate">
                        {log.metadata ? JSON.stringify(log.metadata) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {logs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-16">
                        <Shield className="h-8 w-8 mx-auto mb-3 text-slate-600" />
                        <p className="text-slate-500">No audit events found</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
