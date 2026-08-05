'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shield,
  Database,
} from 'lucide-react';

export default function SuperadminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white" data-testid="text-page-title">Platform Settings</h1>
        <p className="text-slate-400">System information and security status</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Database className="h-5 w-5 text-green-400" />
              Platform Information
            </CardTitle>
            <CardDescription className="text-slate-400">System version and configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-slate-700">
              <span className="text-sm text-slate-300">Platform Version</span>
              <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">v1.0.0</Badge>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-700">
              <span className="text-sm text-slate-300">Database</span>
              <Badge variant="secondary" className="bg-slate-700 text-slate-300">Supabase PostgreSQL</Badge>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-700">
              <span className="text-sm text-slate-300">Authentication</span>
              <Badge variant="secondary" className="bg-slate-700 text-slate-300">Supabase Auth</Badge>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-slate-300">PWA Support</span>
              <Badge className="bg-green-500/10 text-green-400 border border-green-500/30">Enabled</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-400" />
              Security Settings
            </CardTitle>
            <CardDescription className="text-slate-400">Security and access controls</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-slate-700">
              <span className="text-sm text-slate-300">Row Level Security</span>
              <Badge className="bg-green-500/10 text-green-400 border border-green-500/30">Active</Badge>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-700">
              <span className="text-sm text-slate-300">Multi-tenant Isolation</span>
              <Badge className="bg-green-500/10 text-green-400 border border-green-500/30">Enabled</Badge>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-700">
              <span className="text-sm text-slate-300">Impersonation Logging</span>
              <Badge className="bg-green-500/10 text-green-400 border border-green-500/30">Enabled</Badge>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-slate-300">Compliance Enforcement</span>
              <Badge className="bg-green-500/10 text-green-400 border border-green-500/30">Active</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
