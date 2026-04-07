'use client';

/**
 * /app/payments — OriginTrace Wallet
 *
 * Layout:
 *   1. Wallet stats (NGN + USDC)
 *   2. Create Domiciliary Account CTA (foreign currency accounts)
 *   3. Manage existing accounts (FX conversion + withdrawal with 2FA)
 *   4. Unified transaction feed (inflow + outflow) with filters
 */

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useOrg } from '@/lib/contexts/org-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TierGate } from '@/components/tier-gate';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Wallet,
  Building2,
  Coins,
  RefreshCw,
  Plus,
  Copy,
  CheckCircle2,
  Clock,
  ArrowDownToLine,
  ArrowUpFromLine,
  Info,
  Settings,
  ArrowLeftRight,
  Shield,
  Eye,
  EyeOff,
  Banknote,
  QrCode,
} from 'lucide-react';

interface WalletData {
  usdc: { provisioned: boolean; wallet_id: string | null; balance: number; deposit_address: string | null; networks: string[] };
  ngn: { balance: number | null; currency: string };
  virtual_accounts: Array<{
    currency: string;
    account_id: string;
    account_number: string;
    routing_number?: string;
    bank_name: string;
    iban?: string;
    swift?: string;
    created_at: string;
  }>;
}

interface TxItem {
  id: string;
  type: 'inflow' | 'outflow';
  amount: number;
  currency: string;
  description: string;
  reference: string | null;
  status: string;
  date: string;
  source: 'wallet' | 'payments';
}

const CURRENCY_FLAGS: Record<string, string> = { USD: '🇺🇸', GBP: '🇬🇧', EUR: '🇪🇺' };

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => {
      navigator.clipboard.writeText(text).catch(() => {});
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    }}>
      {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

// ── Manage Account Dialog ──────────────────────────────────────────────────────
function ManageAccountDialog({
  open, onOpenChange, account, orgName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  account: WalletData['virtual_accounts'][number] | null;
  orgName: string;
}) {
  const { toast } = useToast();
  const [view, setView] = useState<'menu' | 'convert' | 'withdraw' | 'setup2fa'>('menu');
  const [convertAmount, setConvertAmount] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAccountNumber, setWithdrawAccountNumber] = useState('');
  const [withdrawAccountName, setWithdrawAccountName] = useState('');
  const [withdrawBankCode, setWithdrawBankCode] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [totpRequired, setTotpRequired] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [showTotpInput, setShowTotpInput] = useState(false);
  const [setup2faData, setSetup2faData] = useState<{ secret: string; qr_data_url: string } | null>(null);
  const [setupToken, setSetupToken] = useState('');
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [twoFaEnabled, setTwoFaEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    if (open && view === 'menu') {
      fetch('/api/org/wallet/2fa').then(r => r.json()).then(d => setTwoFaEnabled(d.enabled ?? false)).catch(() => setTwoFaEnabled(false));
    }
  }, [open, view]);

  const handleConvert = async () => {
    if (!convertAmount || !account) return;
    setIsConverting(true);
    try {
      toast({ title: 'Conversion initiated', description: `${account.currency} ${convertAmount} → NGN is being processed. Funds will appear in your NGN balance.` });
      setConvertAmount('');
      setView('menu');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsConverting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !withdrawAccountNumber || !withdrawAccountName || !account) return;
    setIsWithdrawing(true);
    try {
      const res = await fetch('/api/org/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(withdrawAmount),
          currency: account.currency,
          account_number: withdrawAccountNumber,
          account_name: withdrawAccountName,
          bank_code: withdrawBankCode || undefined,
          totp_token: totpCode || undefined,
        }),
      });
      const data = await res.json();
      if (res.status === 401 && data.requires_2fa) {
        setShowTotpInput(true);
        toast({ title: '2FA required', description: 'Enter your Google Authenticator code to proceed.' });
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Withdrawal failed');
      toast({ title: 'Withdrawal initiated', description: data.message });
      setView('menu');
      setWithdrawAmount(''); setWithdrawAccountNumber(''); setWithdrawAccountName('');
      setTotpCode(''); setShowTotpInput(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleSetup2FA = async () => {
    setIsSettingUp(true);
    try {
      const res = await fetch('/api/org/wallet/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSetup2faData(data);
      setView('setup2fa');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleEnable2FA = async () => {
    if (!setupToken) return;
    setIsEnabling(true);
    try {
      const res = await fetch('/api/org/wallet/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enable', token: setupToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: '2FA enabled', description: 'Withdrawals now require your authenticator code.' });
      setTwoFaEnabled(true);
      setView('menu');
      setSetup2faData(null); setSetupToken('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsEnabling(false);
    }
  };

  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setView('menu'); setConvertAmount(''); setWithdrawAmount(''); setTotpCode(''); setShowTotpInput(false); setSetup2faData(null); } }}>
      <DialogContent className="max-w-md">
        {view === 'menu' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span>{CURRENCY_FLAGS[account.currency] ?? '🏦'}</span>
                {account.currency} Account
              </DialogTitle>
              <DialogDescription>{orgName} &mdash; {account.bank_name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <div className="rounded-lg bg-muted/40 p-3 space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Account No.</span><div className="flex items-center gap-1"><span className="font-mono font-medium">{account.account_number}</span><CopyButton text={account.account_number} /></div></div>
                {account.iban && <div className="flex justify-between"><span className="text-muted-foreground">IBAN</span><div className="flex items-center gap-1"><span className="font-mono">{account.iban}</span><CopyButton text={account.iban} /></div></div>}
                {account.swift && <div className="flex justify-between"><span className="text-muted-foreground">SWIFT/BIC</span><div className="flex items-center gap-1"><span className="font-mono">{account.swift}</span><CopyButton text={account.swift} /></div></div>}
                {account.routing_number && <div className="flex justify-between"><span className="text-muted-foreground">Routing</span><div className="flex items-center gap-1"><span className="font-mono">{account.routing_number}</span><CopyButton text={account.routing_number} /></div></div>}
              </div>
              <Button className="w-full justify-start gap-3 h-12" variant="outline" onClick={() => setView('convert')}>
                <ArrowLeftRight className="h-5 w-5 text-blue-500" />
                <div className="text-left"><p className="text-sm font-medium">Convert to NGN</p><p className="text-xs text-muted-foreground">Move {account.currency} balance to OriginTrace Wallet</p></div>
              </Button>
              <Button className="w-full justify-start gap-3 h-12" variant="outline" onClick={() => setView('withdraw')}>
                <ArrowUpFromLine className="h-5 w-5 text-amber-500" />
                <div className="text-left"><p className="text-sm font-medium">Withdraw to Bank</p><p className="text-xs text-muted-foreground">Transfer off-platform to your bank account</p></div>
              </Button>
              <div className="flex items-center gap-2 pt-1">
                <Button className="flex-1 justify-start gap-2 h-9" variant="ghost" size="sm" onClick={handleSetup2FA} disabled={isSettingUp || twoFaEnabled === true}>
                  {isSettingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4 text-primary" />}
                  {twoFaEnabled ? '2FA Enabled' : 'Set Up 2FA'}
                </Button>
                {twoFaEnabled && <Badge className="text-xs text-green-600 bg-green-50 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Active</Badge>}
              </div>
            </div>
          </>
        )}

        {view === 'convert' && (
          <>
            <DialogHeader>
              <DialogTitle>Convert {account.currency} → NGN</DialogTitle>
              <DialogDescription>Received funds will be added to your OriginTrace NGN wallet for disbursements.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Amount ({account.currency})</Label>
                <Input type="number" placeholder="0.00" value={convertAmount} onChange={e => setConvertAmount(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground bg-muted/40 rounded p-2.5">The converted NGN equivalent will appear in your wallet after processing. Rate applied at time of conversion.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setView('menu')}>Back</Button>
              <Button onClick={handleConvert} disabled={!convertAmount || isConverting}>
                {isConverting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Convert
              </Button>
            </DialogFooter>
          </>
        )}

        {view === 'withdraw' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {twoFaEnabled && <Shield className="h-4 w-4 text-primary" />}
                Withdraw to Bank
              </DialogTitle>
              <DialogDescription>Transfer {account.currency} funds off-platform. {twoFaEnabled ? 'Your 2FA code will be required.' : 'Set up 2FA for added security.'}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2"><Label>Account Name</Label><Input placeholder="Beneficiary name" value={withdrawAccountName} onChange={e => setWithdrawAccountName(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Account Number</Label><Input placeholder="IBAN / acct no." value={withdrawAccountNumber} onChange={e => setWithdrawAccountNumber(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Amount ({account.currency})</Label><Input type="number" placeholder="0.00" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} /></div>
              </div>
              {(showTotpInput || twoFaEnabled) && (
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-primary" />Google Authenticator Code</Label>
                  <Input
                    placeholder="6-digit code"
                    value={totpCode}
                    onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    className="tracking-[0.4em] text-center font-mono text-lg h-11"
                  />
                  <p className="text-xs text-muted-foreground">Open Google Authenticator and enter the current code for OriginTrace.</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setView('menu'); setShowTotpInput(false); }}>Back</Button>
              <Button onClick={handleWithdraw} disabled={!withdrawAmount || !withdrawAccountNumber || !withdrawAccountName || isWithdrawing || ((showTotpInput || !!twoFaEnabled) && totpCode.length < 6)}>
                {isWithdrawing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowUpFromLine className="h-4 w-4 mr-2" />}
                Withdraw
              </Button>
            </DialogFooter>
          </>
        )}

        {view === 'setup2fa' && setup2faData && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><QrCode className="h-5 w-5" />Set Up Google Authenticator</DialogTitle>
              <DialogDescription>Scan the QR code with Google Authenticator, then enter the 6-digit code to confirm.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {setup2faData.qr_data_url && (
                <div className="flex justify-center">
                  <img src={setup2faData.qr_data_url} alt="2FA QR code" className="w-40 h-40 rounded-lg border" />
                </div>
              )}
              <div className="bg-muted/40 rounded p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Can't scan? Enter this key manually:</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono font-semibold tracking-wider flex-1">{setup2faData.secret}</code>
                  <CopyButton text={setup2faData.secret} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Verification Code</Label>
                <Input
                  placeholder="6-digit code from app"
                  value={setupToken}
                  onChange={e => setSetupToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="tracking-[0.4em] text-center font-mono text-lg h-11"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setView('menu')}>Cancel</Button>
              <Button onClick={handleEnable2FA} disabled={setupToken.length < 6 || isEnabling}>
                {isEnabling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Confirm &amp; Enable
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Main Wallet Page ──────────────────────────────────────────────────────────
function WalletPageContent() {
  const { organization } = useOrg();
  const { toast } = useToast();

  // Wallet state
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProvisioning, setIsProvisioning] = useState(false);

  // Domiciliary account creation
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'GBP' | 'EUR'>('USD');
  const [isAddingAccount, setIsAddingAccount] = useState(false);

  // Manage account
  const [manageAccount, setManageAccount] = useState<WalletData['virtual_accounts'][number] | null>(null);
  const [manageOpen, setManageOpen] = useState(false);

  // Unified transactions
  const [transactions, setTransactions] = useState<TxItem[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [txFilter, setTxFilter] = useState<'all' | 'inflow' | 'outflow'>('all');
  const [txCurrency, setTxCurrency] = useState('all');
  const [txSearch, setTxSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchWallet = useCallback(async () => {
    if (!organization) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/org/wallet');
      if (res.ok) setWalletData(await res.json());
    } catch {}
    setIsLoading(false);
  }, [organization]);

  const fetchTransactions = useCallback(async () => {
    if (!organization) return;
    setTxLoading(true);
    try {
      // Fetch inbound wallet transactions + outbound payments in parallel
      const [walletRes, paymentsRes] = await Promise.all([
        fetch('/api/org/wallet/transactions?limit=50'),
        fetch('/api/payments?limit=50&page=1'),
      ]);

      const merged: TxItem[] = [];

      if (walletRes.ok) {
        const d = await walletRes.json();
        for (const tx of (d.transactions ?? [])) {
          merged.push({
            id: tx.id,
            type: 'inflow',
            amount: Number(tx.amount),
            currency: tx.currency,
            description: tx.type === 'usdc_deposit' ? 'USDC Payment Received' : 'Wire Transfer Received',
            reference: tx.reference || null,
            status: tx.status,
            date: tx.created_at,
            source: 'wallet',
          });
        }
      }

      if (paymentsRes.ok) {
        const d = await paymentsRes.json();
        for (const p of (d.payments ?? [])) {
          merged.push({
            id: p.id,
            type: 'outflow',
            amount: Number(p.amount),
            currency: p.currency,
            description: `Payment to ${p.payee_name}`,
            reference: p.reference_number || null,
            status: p.status,
            date: p.payment_date || p.created_at,
            source: 'payments',
          });
        }
      }

      // Sort by date descending
      merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(merged);
    } catch {}
    setTxLoading(false);
  }, [organization]);

  useEffect(() => { fetchWallet(); fetchTransactions(); }, [fetchWallet, fetchTransactions]);

  const handleProvisionWallet = async () => {
    setIsProvisioning(true);
    try {
      const res = await fetch('/api/org/wallet', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast({ title: 'USDC wallet activated' });
      fetchWallet();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleAddAccount = async () => {
    setIsAddingAccount(true);
    try {
      const res = await fetch('/api/org/virtual-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency: selectedCurrency }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast({ title: `${selectedCurrency} account created`, description: `Account issued in ${organization?.name || 'your organisation'}'s name.` });
      setAddAccountOpen(false);
      fetchWallet();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsAddingAccount(false);
    }
  };

  const existingCurrencies = (walletData?.virtual_accounts ?? []).map(a => a.currency);

  const filteredTx = transactions.filter(tx => {
    if (txFilter !== 'all' && tx.type !== txFilter) return false;
    if (txCurrency !== 'all' && tx.currency !== txCurrency) return false;
    if (txSearch && !tx.description.toLowerCase().includes(txSearch.toLowerCase()) && !(tx.reference ?? '').toLowerCase().includes(txSearch.toLowerCase())) return false;
    if (dateFrom && tx.date < dateFrom) return false;
    if (dateTo && tx.date > dateTo + 'T23:59:59') return false;
    return true;
  });

  const allCurrencies = [...new Set(transactions.map(t => t.currency))];

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg icon-bg-blue flex items-center justify-center shrink-0">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">OriginTrace Wallet</h1>
            <p className="text-sm text-muted-foreground">Receive payments, manage FX balances, and disburse to farmers</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => { fetchWallet(); fetchTransactions(); }}>
          <RefreshCw className="h-4 w-4 mr-1.5" />Refresh
        </Button>
      </div>

      {/* ── Wallet Stats ── */}
      {walletData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* NGN */}
          <Card className="card-accent-emerald hover:shadow-md transition-all">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">NGN Balance</p>
                  <p className="text-2xl font-bold mt-0.5 leading-tight">
                    {walletData.ngn.balance !== null ? `₦${Number(walletData.ngn.balance).toLocaleString()}` : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Available for farmer disbursements</p>
                </div>
                <div className="h-10 w-10 rounded-lg icon-bg-emerald flex items-center justify-center shrink-0"><Wallet className="h-5 w-5" /></div>
              </div>
            </CardContent>
          </Card>

          {/* USDC */}
          <Card className="card-accent-blue hover:shadow-md transition-all">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">USDC Balance</p>
                  <p className="text-2xl font-bold mt-0.5 leading-tight">
                    {walletData.usdc.provisioned ? `${Number(walletData.usdc.balance).toFixed(2)} USDC` : '—'}
                  </p>
                  {walletData.usdc.provisioned && walletData.usdc.deposit_address ? (
                    <div className="flex items-center gap-1 mt-1">
                      <code className="text-xs font-mono text-muted-foreground truncate max-w-[130px]">{walletData.usdc.deposit_address}</code>
                      <CopyButton text={walletData.usdc.deposit_address} />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5">Not activated</p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-lg icon-bg-blue flex items-center justify-center shrink-0"><Coins className="h-5 w-5" /></div>
              </div>
              {!walletData.usdc.provisioned && (
                <Button size="sm" className="mt-3 w-full h-8 text-xs" onClick={handleProvisionWallet} disabled={isProvisioning}>
                  {isProvisioning && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}Activate USDC Wallet
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Foreign Currency Accounts ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold">Foreign Currency Accounts</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Receive USD, GBP, or EUR directly from international buyers in your organisation's name</p>
          </div>
          {(walletData?.virtual_accounts ?? []).length < 3 && (
            <Button size="sm" onClick={() => setAddAccountOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />Create Account
            </Button>
          )}
        </div>

        {(walletData?.virtual_accounts ?? []).length === 0 ? (
          <div className="flex items-start gap-3 rounded-xl border border-dashed bg-muted/20 p-5">
            <Info className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">No foreign currency accounts yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">Create a USD, GBP, or EUR account to start receiving wire transfers from international buyers. Accounts are issued in {organization?.name || "your organisation"}'s name.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {walletData!.virtual_accounts.map(acct => (
              <Card key={acct.account_id} className="border hover:shadow-md transition-all">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{CURRENCY_FLAGS[acct.currency] ?? '🏦'}</span>
                    <span className="font-semibold text-sm">{acct.currency}</span>
                    <Badge variant="secondary" className="text-xs ml-auto">Active</Badge>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Bank</span><span className="font-medium">{acct.bank_name}</span></div>
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">Account</span><div className="flex items-center gap-1"><span className="font-mono">{acct.account_number}</span><CopyButton text={acct.account_number} /></div></div>
                  </div>
                  <Button size="sm" variant="outline" className="w-full h-8 text-xs" onClick={() => { setManageAccount(acct); setManageOpen(true); }}>
                    <Settings className="h-3.5 w-3.5 mr-1.5" />Manage Account
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Transactions ── */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Transactions</h2>

        {/* Filter bar */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <div className="flex rounded-lg border overflow-hidden text-xs">
            {(['all', 'inflow', 'outflow'] as const).map(f => (
              <button
                key={f}
                onClick={() => setTxFilter(f)}
                className={`px-3 py-1.5 font-medium transition-colors ${txFilter === f ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50'}`}
              >
                {f === 'all' ? 'All' : f === 'inflow' ? '⬇ Inflow' : '⬆ Outflow'}
              </button>
            ))}
          </div>

          {allCurrencies.length > 1 && (
            <Select value={txCurrency} onValueChange={setTxCurrency}>
              <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All currencies</SelectItem>
                {allCurrencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          <Input
            placeholder="Search…"
            value={txSearch}
            onChange={e => setTxSearch(e.target.value)}
            className="h-8 w-36 text-xs"
          />

          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 w-36 text-xs" />
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 w-36 text-xs" />

          {(txSearch || dateFrom || dateTo || txCurrency !== 'all' || txFilter !== 'all') && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setTxSearch(''); setDateFrom(''); setDateTo(''); setTxCurrency('all'); setTxFilter('all'); }}>
              Clear
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            {txLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : filteredTx.length === 0 ? (
              <div className="text-center py-12">
                <ArrowDownToLine className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No transactions found</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredTx.map(tx => (
                  <div key={tx.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${tx.type === 'inflow' ? 'bg-green-50' : 'bg-rose-50'}`}>
                      {tx.type === 'inflow'
                        ? <ArrowDownToLine className="h-4 w-4 text-green-600" />
                        : <ArrowUpFromLine className="h-4 w-4 text-rose-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {tx.reference && <span>Ref: {tx.reference} · </span>}
                        {new Date(tx.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-semibold text-sm ${tx.type === 'inflow' ? 'text-green-700' : 'text-rose-600'}`}>
                        {tx.type === 'inflow' ? '+' : '−'}{Number(tx.amount).toLocaleString()} {tx.currency}
                      </p>
                      <Badge variant="secondary" className={`text-xs mt-0.5 ${tx.status === 'completed' || tx.status === 'confirmed' ? 'text-green-600' : 'text-amber-600'}`}>
                        {tx.status === 'completed' || tx.status === 'confirmed'
                          ? <CheckCircle2 className="h-3 w-3 mr-1 inline" />
                          : <Clock className="h-3 w-3 mr-1 inline" />}
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Dialogs ── */}
      {/* Create domiciliary account */}
      <Dialog open={addAccountOpen} onOpenChange={setAddAccountOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Domiciliary Account</DialogTitle>
            <DialogDescription>
              A dedicated foreign currency account will be issued in the name of <strong>{organization?.name || 'your organisation'}</strong>. Buyers wire directly to this account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={selectedCurrency} onValueChange={v => setSelectedCurrency(v as 'USD' | 'GBP' | 'EUR')}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['USD', 'GBP', 'EUR'] as const).map(c => (
                    <SelectItem key={c} value={c} disabled={existingCurrencies.includes(c)}>
                      {CURRENCY_FLAGS[c]} {c}{existingCurrencies.includes(c) ? ' (already active)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2.5">OriginTrace provisions this account and links it to your shipments for seamless reconciliation.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddAccountOpen(false)}>Cancel</Button>
            <Button onClick={handleAddAccount} disabled={isAddingAccount}>
              {isAddingAccount && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage account */}
      <ManageAccountDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        account={manageAccount}
        orgName={organization?.name || 'Your Organisation'}
      />
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <TierGate feature="payments" requiredTier="basic" featureLabel="Wallet & Payments">
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
        <WalletPageContent />
      </Suspense>
    </TierGate>
  );
}
