'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowUpRight, Loader2, ReceiptText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

type MobileMoneyProvider = 'mtn_momo' | 'opay' | 'palmpay';

const PROVIDERS: Array<{ value: MobileMoneyProvider; label: string }> = [
  { value: 'mtn_momo', label: 'MTN MoMo' },
  { value: 'opay', label: 'OPay' },
  { value: 'palmpay', label: 'PalmPay' },
];

export default function FarmerDisbursementPage() {
  const t = useTranslations('PaymentsDisbursement');
  const { toast } = useToast();
  const [payeeName, setPayeeName] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [provider, setProvider] = useState<MobileMoneyProvider>('opay');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = Number(amount);

    if (!payeeName.trim() || !phone.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError(t('missingFields'));
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/payments/disburse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payee_name: payeeName.trim(),
          phone: phone.trim(),
          amount: parsedAmount,
          currency,
          provider,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || data.message || t('failureTitle'));
      }

      const status = data.disbursement?.status || data.payment?.status || 'pending';
      setResult(status);
      toast({ title: t('successTitle'), description: String(status) });
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : t('failureTitle');
      setError(message);
      toast({ title: t('failureTitle'), description: message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/app/payments/transactions">
            <ReceiptText className="mr-2 h-4 w-4" />
            {t('history')}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('detailsTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="payee_name">{t('payeeName')}</Label>
                <Input
                  id="payee_name"
                  value={payeeName}
                  onChange={event => setPayeeName(event.target.value)}
                  placeholder={t('payeePlaceholder')}
                  autoComplete="off"
                  data-testid="input-disbursement-payee"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t('phone')}</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={event => setPhone(event.target.value)}
                  placeholder={t('phonePlaceholder')}
                  inputMode="tel"
                  autoComplete="off"
                  data-testid="input-disbursement-phone"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="amount">{t('amount')}</Label>
                <Input
                  id="amount"
                  value={amount}
                  onChange={event => setAmount(event.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  data-testid="input-disbursement-amount"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('currency')}</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger data-testid="select-disbursement-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NGN">NGN</SelectItem>
                    <SelectItem value="GHS">GHS</SelectItem>
                    <SelectItem value="XOF">XOF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('provider')}</Label>
                <Select value={provider} onValueChange={value => setProvider(value as MobileMoneyProvider)}>
                  <SelectTrigger data-testid="select-disbursement-provider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t('notes')}</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={event => setNotes(event.target.value)}
                placeholder={t('notesPlaceholder')}
                data-testid="textarea-disbursement-notes"
              />
            </div>

            {error && (
              <Alert variant="destructive" data-testid="alert-disbursement-error">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {result && (
              <Alert data-testid="alert-disbursement-success">
                <AlertDescription>{t('successTitle')}: {result}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={isSubmitting} data-testid="button-submit-disbursement">
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowUpRight className="mr-2 h-4 w-4" />
              )}
              {isSubmitting ? t('submitting') : t('submit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
