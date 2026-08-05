'use client';

/**
 * /app/settings/subscription — Subscription status + upgrade request + GDPR actions
 * Rebuilt with Tailwind + shadcn — zero inline styles, full dark mode support.
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CheckCircle2, AlertTriangle, Download, Trash2, Check, ArrowUpCircle, Loader2 } from 'lucide-react';

const TIER_LABELS: Record<string, string> = {
  starter: 'Starter', basic: 'Basic', pro: 'Pro', enterprise: 'Enterprise',
};
const TIER_BADGE: Record<string, string> = {
  starter:    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  basic:      'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  pro:        'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  enterprise: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};
const TIER_BORDER: Record<string, string> = {
  starter: 'border-gray-300 dark:border-gray-600',
  basic:   'border-blue-400 dark:border-blue-600',
  pro:     'border-violet-400 dark:border-violet-600',
  enterprise: 'border-emerald-500 dark:border-emerald-600',
};
const TIER_ORDER = ['starter', 'basic', 'pro', 'enterprise'];
const TIER_FEATURES: Record<string, string[]> = {
  starter:    ['Up to 50 farmers', 'Basic farm mapping', 'EUDR batch certificates', '1 user'],
  basic:      ['Up to 500 farmers', 'Full GPS mapping', 'All compliance frameworks', '5 users', 'API access'],
  pro:        ['Unlimited farmers', 'Digital Product Passport', 'Buyer portal', '10 users', 'Webhooks', 'Analytics'],
  enterprise: ['Unlimited everything', 'Custom integrations', 'Dedicated support', 'SLA guarantee', 'Multi-org', 'On-premise option'],
};

export default function SubscriptionPage() {
  const router = useRouter();
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [requestTier, setRequestTier] = useState<string | null>(null);
  const [requestNote, setRequestNote] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/profile').then(r => r.json())
      .then(d => { setOrg(d.organization || d.org); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const currentTier = org?.subscription_tier || 'starter';
  const currentTierIdx = TIER_ORDER.indexOf(currentTier);
  const subStatus = org?.subscription_status || 'active';
  const expiresAt = org?.subscription_expires_at ? new Date(org.subscription_expires_at) : null;
  const graceEnds  = org?.grace_period_ends_at  ? new Date(org.grace_period_ends_at)  : null;

  const handleRequestUpgrade = async () => {
    if (!requestTier) return;
    setSendingRequest(true); setError('');
    try {
      const res = await fetch('/api/subscription/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: requestTier, note: requestNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRequestSent(true); setRequestTier(null); setRequestNote('');
    } catch (e: any) { setError(e.message || 'Failed to send request'); }
    finally { setSendingRequest(false); }
  };

  const handleExport = async () => {
    setExportLoading(true);
    const res = await fetch('/api/account/export');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `origintrace-data-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url); setExportLoading(false);
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== 'DELETE MY ACCOUNT') return;
    setDeleting(true);
    const res = await fetch('/api/account', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation: 'DELETE MY ACCOUNT' }),
    });
    if (res.ok) { router.push('/auth/login?deleted=1'); }
    else { const d = await res.json(); setError(d.error || 'Failed to delete account'); setDeleting(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[200px]">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Subscription</h1>
        <p className="text-muted-foreground mt-1">Manage your plan and account settings</p>
      </div>

      {requestSent && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Upgrade request sent. Your account manager will reach out shortly.
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      {/* Current plan */}
      <Card className={`border-2 ${TIER_BORDER[currentTier]}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold ${TIER_BADGE[currentTier]}`}>
                  {TIER_LABELS[currentTier]}
                </span>
                {subStatus === 'grace_period' && (
                  <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-400 text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />Grace Period
                  </Badge>
                )}
                {subStatus === 'expired' && <Badge variant="destructive" className="text-xs">Expired</Badge>}
                {subStatus === 'active' && currentTier !== 'starter' && (
                  <Badge variant="outline" className="border-emerald-400 text-emerald-700 dark:text-emerald-400 text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />Active
                  </Badge>
                )}
              </div>
              {expiresAt && subStatus === 'active' && (
                <p className="text-sm text-muted-foreground">
                  Renews: <span className="font-medium text-foreground">{expiresAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </p>
              )}
              {graceEnds && subStatus === 'grace_period' && (
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  Grace period ends {graceEnds.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}. Renew to avoid downgrade.
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">Organisation</p>
              <p className="font-semibold">{org?.name || '—'}</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Plan grid */}
      <div>
        <h2 className="text-base font-semibold mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {TIER_ORDER.map((tier, idx) => {
            const isCurrent = tier === currentTier;
            const isUpgrade = idx > currentTierIdx;
            const isSelected = requestTier === tier;
            return (
              <Card key={tier} className={`relative transition-all ${isCurrent ? `border-2 ${TIER_BORDER[tier]} shadow-sm` : ''}`}>
                {isCurrent && (
                  <div className="absolute -top-2.5 right-3">
                    <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white tracking-wide">CURRENT</span>
                  </div>
                )}
                <CardContent className="pt-4 pb-4 space-y-3">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase ${TIER_BADGE[tier]}`}>
                    {TIER_LABELS[tier]}
                  </span>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {TIER_FEATURES[tier].map(f => (
                      <li key={f} className="flex items-start gap-1.5">
                        <Check className="h-3 w-3 mt-0.5 shrink-0 text-emerald-600" />{f}
                      </li>
                    ))}
                  </ul>
                  {isUpgrade && !requestSent && (
                    <Button size="sm" variant={isSelected ? 'default' : 'outline'} className="w-full text-xs"
                      onClick={() => setRequestTier(isSelected ? null : tier)}>
                      <ArrowUpCircle className="h-3 w-3 mr-1.5" />
                      {isSelected ? 'Selected ✓' : 'Request Upgrade'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Upgrade form */}
      {requestTier && !requestSent && (
        <Card className="border-emerald-300 dark:border-emerald-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-emerald-700 dark:text-emerald-400">
              Request upgrade to {TIER_LABELS[requestTier]}
            </CardTitle>
            <CardDescription>We'll review your request and send you a payment link within 1 business day.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea placeholder="Optional: tell us about your use case or any questions" value={requestNote}
              onChange={e => setRequestNote(e.target.value)} rows={3} />
            <div className="flex gap-2">
              <Button onClick={handleRequestUpgrade} disabled={sendingRequest}>
                {sendingRequest ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending…</> : 'Send Request'}
              </Button>
              <Button variant="outline" onClick={() => setRequestTier(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
        <strong>Custom pricing for your operation.</strong>{' '}
        Pricing is tailored based on your volume, geography, and compliance requirements. Your account manager will contact you after your upgrade request.
      </div>

      <Separator />

      {/* GDPR */}
      <div>
        <h2 className="text-base font-semibold mb-1">Account &amp; Data</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Your rights under the Nigeria Data Protection Act 2023 and GDPR.{' '}
          <a href="/legal/privacy" className="underline underline-offset-2 hover:text-foreground transition-colors">Privacy Policy</a>
        </p>
        <div className="flex flex-col gap-3 max-w-sm">
          <Button variant="outline" className="justify-start gap-2" onClick={handleExport} disabled={exportLoading}>
            {exportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {exportLoading ? 'Preparing export…' : 'Download My Data (GDPR Art. 20)'}
          </Button>
          <Button variant="outline" className="justify-start gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive"
            onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 className="h-4 w-4" />Delete My Account (GDPR Art. 17)
          </Button>
        </div>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={open => { if (!open) { setShowDeleteConfirm(false); setDeleteConfirmText(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete account permanently?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>This is permanent and cannot be undone. Your profile, API keys, and access will be removed immediately.</p>
                <p className="font-medium text-foreground">
                  Type <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">DELETE MY ACCOUNT</code> to confirm:
                </p>
                <Input value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE MY ACCOUNT" className="font-mono text-sm" />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}
              disabled={deleteConfirmText !== 'DELETE MY ACCOUNT' || deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50">
              {deleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting…</> : 'Delete permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
