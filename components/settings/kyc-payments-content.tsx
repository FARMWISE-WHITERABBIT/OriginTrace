'use client';

/**
 * components/settings/kyc-payments-content.tsx
 *
 * Self-contained: manages its own state, fetches from /api/org/kyc.
 * Extracted from app/app/settings/page.tsx to reduce file size.
 * Rendered inside the "kyc" tab of SettingsContent.
 */

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, BadgeCheck, AlertTriangle, CheckCircle, Landmark } from 'lucide-react';

// ── Component ─────────────────────────────────────────────────────────────────

export function KycPaymentsContent({ orgId }: { orgId: string }) {
  const { toast } = useToast();

  const [kyc, setKyc] = useState<any>(null);
  const [banks, setBanks] = useState<{ id: number; name: string; code: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resolvedAccountName, setResolvedAccountName] = useState('');

  const [form, setForm] = useState({
    cac_registration_number: '',
    tin: '',
    rc_number: '',
    director_name: '',
    director_id_type: '',
    director_id_number: '',
    director_id_url: '',
    bank_account_number: '',
    bank_code: '',
    bank_name: '',
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/org/kyc').then((r) => r.json()),
      fetch('/api/org/kyc/banks').then((r) => r.json()),
    ]).then(([kycData, bankData]) => {
      if (kycData.kyc) {
        setKyc(kycData.kyc);
        setForm({
          cac_registration_number: kycData.kyc.cac_registration_number ?? '',
          tin: kycData.kyc.tin ?? '',
          rc_number: kycData.kyc.rc_number ?? '',
          director_name: kycData.kyc.director_name ?? '',
          director_id_type: kycData.kyc.director_id_type ?? '',
          director_id_number: kycData.kyc.director_id_number ?? '',
          director_id_url: kycData.kyc.director_id_url ?? '',
          bank_account_number: kycData.kyc.bank_account_number ?? '',
          bank_code: kycData.kyc.bank_code ?? '',
          bank_name: kycData.kyc.bank_name ?? '',
        });
        if (kycData.kyc.bank_account_name) setResolvedAccountName(kycData.kyc.bank_account_name);
      }
      setBanks(bankData.banks ?? []);
    }).finally(() => setIsLoading(false));
  }, []);

  const handleSaveKyc = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/org/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          bank_account_name: resolvedAccountName || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: 'Error', description: data.error, variant: 'destructive' }); return; }
      setKyc(data.kyc);
      toast({ title: 'KYC details saved', description: 'Your submission is under review.' });
    } finally { setIsSaving(false); }
  };

  const handleVerifyBank = async () => {
    if (!form.bank_account_number || !form.bank_code) {
      toast({ title: 'Missing fields', description: 'Enter account number and select bank first.', variant: 'destructive' });
      return;
    }
    setIsVerifying(true);
    setResolvedAccountName('');
    try {
      const res = await fetch('/api/org/kyc/verify-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_number: form.bank_account_number, bank_code: form.bank_code }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: 'Verification failed', description: data.error, variant: 'destructive' }); return; }
      setResolvedAccountName(data.accountName);
      toast({ title: 'Account verified', description: `Name: ${data.accountName}` });
    } finally { setIsVerifying(false); }
  };

  const kycStatusColor: Record<string, string> = {
    pending:      'bg-gray-100 text-gray-700',
    under_review: 'bg-amber-100 text-amber-800',
    approved:     'bg-green-100 text-green-800',
    rejected:     'bg-red-100 text-red-800',
  };

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Loading…</div>;

  return (
    <div className="space-y-6">
      {/* Status banner */}
      {kyc && (
        <div className={`flex items-center gap-3 rounded-lg px-4 py-3 ${kycStatusColor[kyc.kyc_status] ?? 'bg-gray-100 text-gray-700'}`}>
          {kyc.kyc_status === 'approved' ? <CheckCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          <div>
            <p className="font-semibold capitalize text-sm">{kyc.kyc_status.replace('_', ' ')}</p>
            {kyc.kyc_notes && <p className="text-xs mt-0.5">{kyc.kyc_notes}</p>}
          </div>
        </div>
      )}

      {/* Business Verification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-green-700" />
            Business Verification (KYC)
          </CardTitle>
          <CardDescription>
            Required to activate farmer bank transfer disbursements. Reviewed by the OriginTrace team.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label>CAC Registration Number</Label>
            <Input value={form.cac_registration_number} onChange={(e) => setForm((f) => ({ ...f, cac_registration_number: e.target.value }))} placeholder="RC 123456" />
          </div>
          <div>
            <Label>TIN (Tax Identification Number)</Label>
            <Input value={form.tin} onChange={(e) => setForm((f) => ({ ...f, tin: e.target.value }))} placeholder="12345678-0001" />
          </div>
          <div>
            <Label>RC Number</Label>
            <Input value={form.rc_number} onChange={(e) => setForm((f) => ({ ...f, rc_number: e.target.value }))} />
          </div>
          <div>
            <Label>Director / Owner Name</Label>
            <Input value={form.director_name} onChange={(e) => setForm((f) => ({ ...f, director_name: e.target.value }))} />
          </div>
          <div>
            <Label>Director ID Type</Label>
            <Select value={form.director_id_type} onValueChange={(v) => setForm((f) => ({ ...f, director_id_type: v }))}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nin">NIN (National ID)</SelectItem>
                <SelectItem value="passport">International Passport</SelectItem>
                <SelectItem value="drivers_license">Driver's License</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Director ID Number</Label>
            <Input value={form.director_id_number} onChange={(e) => setForm((f) => ({ ...f, director_id_number: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <Label>Director ID Document URL</Label>
            <Input
              type="url"
              placeholder="https://storage.example.com/director-id.pdf"
              value={form.director_id_url}
              onChange={(e) => setForm((f) => ({ ...f, director_id_url: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground mt-1">Upload to your document vault first, then paste the URL here.</p>
          </div>
        </CardContent>
      </Card>

      {/* Organisation Bank Account */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-green-700" />
            Organisation Bank Account
          </CardTitle>
          <CardDescription>
            Used for receiving NGN payouts. Verified via Paystack account resolution.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Bank</Label>
              <Select
                value={form.bank_code}
                onValueChange={(v) => {
                  const bank = banks.find((b) => b.code === v);
                  setForm((f) => ({ ...f, bank_code: v, bank_name: bank?.name ?? '' }));
                  setResolvedAccountName('');
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {banks.map((b) => (
                    <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Account Number</Label>
              <Input
                value={form.bank_account_number}
                onChange={(e) => { setForm((f) => ({ ...f, bank_account_number: e.target.value })); setResolvedAccountName(''); }}
                placeholder="0123456789"
                maxLength={10}
              />
            </div>
          </div>
          {resolvedAccountName && (
            <div className="flex items-center gap-2 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">
              <CheckCircle className="h-4 w-4 shrink-0" />
              Account verified: <strong>{resolvedAccountName}</strong>
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleVerifyBank} disabled={isVerifying}>
              {isVerifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Verify Account
            </Button>
            <Button
              className="bg-green-700 hover:bg-green-800"
              onClick={handleSaveKyc}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save & Submit KYC
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
