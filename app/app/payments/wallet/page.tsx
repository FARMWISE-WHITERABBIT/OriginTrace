'use client';

import { useState, useEffect, useCallback } from 'react';
import { useOrg } from '@/lib/contexts/org-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Info,
} from 'lucide-react';

interface WalletData {
  usdc: {
    provisioned: boolean;
    wallet_id: string | null;
    balance: number;
    deposit_address: string | null;
    networks: string[];
  };
  ngn: {
    balance: number | null;
    currency: string;
  };
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

interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  from: string | null;
  network: string | null;
  hash: string | null;
  reference: string | null;
  status: string;
  created_at: string;
}

const CURRENCY_FLAGS: Record<string, string> = {
  USD: '🇺🇸',
  GBP: '🇬🇧',
  EUR: '🇪🇺',
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCopy}>
      {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

export function WalletContent() {
  const { organization } = useOrg();
  const { toast } = useToast();
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'GBP' | 'EUR'>('USD');
  const [isAddingAccount, setIsAddingAccount] = useState(false);

  const fetchWallet = useCallback(async () => {
    if (!organization) return;
    setIsLoading(true);
    try {
      const [walletRes, txRes] = await Promise.all([
        fetch('/api/org/wallet'),
        fetch('/api/org/wallet/transactions?limit=15'),
      ]);
      if (walletRes.ok) setWalletData(await walletRes.json());
      if (txRes.ok) {
        const d = await txRes.json();
        setTransactions(d.transactions ?? []);
      }
    } catch {}
    setIsLoading(false);
  }, [organization]);

  useEffect(() => { fetchWallet(); }, [fetchWallet]);

  const handleProvisionWallet = async () => {
    setIsProvisioning(true);
    try {
      const res = await fetch('/api/org/wallet', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to activate USDC wallet');
      toast({ title: 'USDC wallet activated', description: `Your deposit address is ready.` });
      fetchWallet();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleAddVirtualAccount = async () => {
    setIsAddingAccount(true);
    try {
      const res = await fetch('/api/org/virtual-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency: selectedCurrency }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create account');
      toast({ title: `${selectedCurrency} account created`, description: 'Your new account is ready to receive transfers.' });
      setAddAccountOpen(false);
      fetchWallet();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsAddingAccount(false);
    }
  };

  const existingCurrencies = (walletData?.virtual_accounts ?? []).map((a) => a.currency);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg icon-bg-blue flex items-center justify-center shrink-0">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold leading-tight">OriginTrace Wallet</h2>
            <p className="text-sm text-muted-foreground">
              Receive payments from buyers — NGN, USDC, and international wire transfers
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchWallet}>
          <RefreshCw className="h-4 w-4 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Stats strip */}
      {walletData && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* NGN Balance */}
          <Card className="card-accent-emerald transition-all hover:shadow-md">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">NGN Balance</p>
                  <p className="text-xl font-bold mt-0.5 leading-tight">
                    {walletData.ngn.balance !== null
                      ? `₦${Number(walletData.ngn.balance).toLocaleString()}`
                      : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Available for disbursements</p>
                </div>
                <div className="h-9 w-9 rounded-lg icon-bg-emerald flex items-center justify-center shrink-0">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* USDC Balance */}
          <Card className="card-accent-blue transition-all hover:shadow-md">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">USDC Balance</p>
                  <p className="text-xl font-bold mt-0.5 leading-tight">
                    {walletData.usdc.provisioned
                      ? `${Number(walletData.usdc.balance).toFixed(2)} USDC`
                      : '—'}
                  </p>
                  {walletData.usdc.provisioned && walletData.usdc.deposit_address ? (
                    <div className="flex items-center gap-1 mt-1">
                      <code className="text-xs font-mono text-muted-foreground truncate max-w-[120px]">
                        {walletData.usdc.deposit_address}
                      </code>
                      <CopyButton text={walletData.usdc.deposit_address} />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {walletData.usdc.provisioned ? 'No address' : 'Not activated'}
                    </p>
                  )}
                </div>
                <div className="h-9 w-9 rounded-lg icon-bg-blue flex items-center justify-center shrink-0">
                  <Coins className="h-5 w-5" />
                </div>
              </div>
              {!walletData.usdc.provisioned && (
                <Button size="sm" className="mt-3 w-full h-8 text-xs" onClick={handleProvisionWallet} disabled={isProvisioning}>
                  {isProvisioning && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  Activate USDC Wallet
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Virtual Accounts count */}
          <Card className="card-accent-violet transition-all hover:shadow-md">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Transfer Accounts</p>
                  <p className="text-xl font-bold mt-0.5 leading-tight">{walletData.virtual_accounts.length}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">USD / GBP / EUR</p>
                </div>
                <div className="h-9 w-9 rounded-lg icon-bg-violet flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* International Transfer Accounts */}
      <Card className="card-accent-violet">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg icon-bg-violet flex items-center justify-center shrink-0">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm">International Transfer Accounts</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Receive USD, GBP, or EUR wire transfers from international buyers — issued in your organisation's name
                </CardDescription>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAddAccountOpen(true)}
              disabled={(walletData?.virtual_accounts ?? []).length >= 3}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Account
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {(walletData?.virtual_accounts ?? []).length === 0 ? (
            <div className="flex items-start gap-3 rounded-lg bg-muted/40 p-4">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                No transfer accounts set up yet. Add a USD, GBP, or EUR account to receive wire payments from buyers.
                Accounts are issued in your organisation's name.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {walletData!.virtual_accounts.map((acct) => (
                <div key={acct.account_id} className="rounded-lg border bg-card p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{CURRENCY_FLAGS[acct.currency] ?? '🏦'}</span>
                    <span className="font-semibold text-sm">{acct.currency}</span>
                    <Badge variant="secondary" className="text-xs ml-auto">Active</Badge>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Bank</span>
                      <span className="font-medium">{acct.bank_name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Account No.</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono">{acct.account_number}</span>
                        <CopyButton text={acct.account_number} />
                      </div>
                    </div>
                    {acct.routing_number && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Routing</span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono">{acct.routing_number}</span>
                          <CopyButton text={acct.routing_number} />
                        </div>
                      </div>
                    )}
                    {acct.iban && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">IBAN</span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs">{acct.iban}</span>
                          <CopyButton text={acct.iban} />
                        </div>
                      </div>
                    )}
                    {acct.swift && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">SWIFT/BIC</span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono">{acct.swift}</span>
                          <CopyButton text={acct.swift} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Inbound Transactions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <ArrowDownToLine className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-sm">Recent Inbound Payments</CardTitle>
              <CardDescription className="text-xs mt-0.5">Latest payments received across all channels</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No inbound payments recorded yet.</p>
          ) : (
            <div className="space-y-0 divide-y">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 py-3">
                  <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                    <ArrowDownToLine className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {tx.type === 'usdc_deposit' ? 'USDC Payment' : 'Wire Transfer'}
                      </span>
                      {tx.network && (
                        <Badge variant="secondary" className="text-xs">{tx.network}</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {tx.reference && <span>Ref: {tx.reference} &middot; </span>}
                      {new Date(tx.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold text-sm text-green-700">
                      +{Number(tx.amount).toLocaleString()} {tx.currency}
                    </div>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${tx.status === 'confirmed' || tx.status === 'completed' ? 'text-green-600' : 'text-amber-600'}`}
                    >
                      {tx.status === 'confirmed' || tx.status === 'completed' ? (
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                      ) : (
                        <Clock className="h-3 w-3 mr-1" />
                      )}
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add account dialog */}
      <Dialog open={addAccountOpen} onOpenChange={setAddAccountOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Set Up Transfer Account</DialogTitle>
            <DialogDescription>
              Create a dedicated bank account for receiving international payments.
              The account will be issued in the name of <strong>{organization?.name || 'your organisation'}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <p className="text-xs font-medium">Currency</p>
              <Select
                value={selectedCurrency}
                onValueChange={(v) => setSelectedCurrency(v as 'USD' | 'GBP' | 'EUR')}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['USD', 'GBP', 'EUR'] as const).map((c) => (
                    <SelectItem key={c} value={c} disabled={existingCurrencies.includes(c)}>
                      {CURRENCY_FLAGS[c]} {c} {existingCurrencies.includes(c) ? '(already active)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2.5">
              OriginTrace will provision the account and link it to your organisation. Buyers can wire funds directly to this account, which will be reconciled against your shipments.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddAccountOpen(false)}>Cancel</Button>
            <Button onClick={handleAddVirtualAccount} disabled={isAddingAccount}>
              {isAddingAccount && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default WalletContent;
