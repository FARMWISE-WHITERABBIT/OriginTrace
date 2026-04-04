'use client';

/**
 * Wallet Dashboard
 *
 * Shows the org's:
 * - NGN balance (from Paystack)
 * - USDC wallet + deposit address (from Blockradar)
 * - Virtual bank accounts USD/GBP/EUR (from Grey)
 * - Recent inbound transactions
 */

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
      if (!res.ok) throw new Error(data.error || 'Failed to provision wallet');
      toast({ title: 'USDC Wallet provisioned', description: `Deposit address: ${data.deposit_address}` });
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
      if (!res.ok) throw new Error(data.error || 'Failed to provision virtual account');
      toast({ title: `${selectedCurrency} virtual account provisioned` });
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
        <div>
          <p className="text-sm text-muted-foreground">
            Manage inbound payments — NGN balance, USDC wallet, and virtual bank accounts
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchWallet}>
          <RefreshCw className="h-4 w-4 mr-1.5" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* NGN Balance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              NGN Balance (Paystack)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {walletData?.ngn.balance !== null ? (
              <div>
                <p className="text-3xl font-bold">
                  ₦{Number(walletData?.ngn.balance ?? 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Available for outbound transfers</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                PAYSTACK_SECRET_KEY not configured or balance unavailable.
              </p>
            )}
          </CardContent>
        </Card>

        {/* USDC Wallet */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Coins className="h-4 w-4" />
              USDC Wallet (Blockradar)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {walletData?.usdc.provisioned ? (
              <div className="space-y-3">
                <div>
                  <p className="text-3xl font-bold">{Number(walletData.usdc.balance).toFixed(2)} USDC</p>
                  <p className="text-xs text-muted-foreground mt-1">Confirmed balance</p>
                </div>
                {walletData.usdc.deposit_address && (
                  <div className="rounded-md bg-muted/50 p-3 space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Deposit address (Polygon)</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono flex-1 truncate">
                        {walletData.usdc.deposit_address}
                      </code>
                      <CopyButton text={walletData.usdc.deposit_address} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Also supports: Ethereum, Tron. Share this address with buyers to receive USDC.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  No USDC wallet provisioned. Provision one to start receiving stablecoin payments from buyers.
                </p>
                <Button onClick={handleProvisionWallet} disabled={isProvisioning} size="sm">
                  {isProvisioning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Provision USDC Wallet
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Virtual Bank Accounts */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Virtual Bank Accounts (Grey)
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                USD, GBP, or EUR accounts for traditional SWIFT wire transfers from buyers
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAddAccountOpen(true)}
              disabled={(walletData?.virtual_accounts ?? []).length >= 3}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Currency
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {(walletData?.virtual_accounts ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No virtual accounts yet. Add a USD, GBP, or EUR account for buyers to wire to.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {walletData!.virtual_accounts.map((acct) => (
                <div key={acct.account_id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{CURRENCY_FLAGS[acct.currency] ?? '🏦'}</span>
                    <span className="font-semibold">{acct.currency}</span>
                    <Badge variant="secondary" className="text-xs ml-auto">Virtual</Badge>
                  </div>
                  <div className="space-y-1 text-xs">
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
          <CardTitle className="text-sm flex items-center gap-2">
            <ArrowDownToLine className="h-4 w-4" />
            Recent Inbound Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No inbound transactions recorded yet.</p>
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
                        {tx.type === 'usdc_deposit' ? 'USDC Deposit' : 'Wire Transfer'}
                      </span>
                      {tx.network && (
                        <Badge variant="secondary" className="text-xs">{tx.network}</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {tx.from && <span>From: {tx.from.slice(0, 12)}… · </span>}
                      {tx.reference && <span>Ref: {tx.reference} · </span>}
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

      {/* Add virtual account dialog */}
      <Dialog open={addAccountOpen} onOpenChange={setAddAccountOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Virtual Account</DialogTitle>
            <DialogDescription>
              Provision a new virtual bank account for receiving international wire transfers.
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
                      {CURRENCY_FLAGS[c]} {c} {existingCurrencies.includes(c) ? '(already provisioned)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddAccountOpen(false)}>Cancel</Button>
            <Button onClick={handleAddVirtualAccount} disabled={isAddingAccount}>
              {isAddingAccount && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Provision Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default WalletContent;
