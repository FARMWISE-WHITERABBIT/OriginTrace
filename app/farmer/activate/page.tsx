'use client';

import { useState, useEffect, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogoIcon } from '@/components/logo';
import { CheckCircle2, Shield } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

function FarmerActivateContent() {
  const t = useTranslations('farmerActivate');
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [step, setStep] = useState<'loading' | 'confirm' | 'pin' | 'success' | 'error'>('loading');
  const [farmerData, setFarmerData] = useState<any>(null);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setStep('error');
      setError(t('invalidLink'));
      return;
    }
    verifyToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const verifyToken = async () => {
    try {
      const res = await fetch(`/api/auth/farmer-activate?token=${token}`);
      if (res.ok) {
        const data = await res.json();
        setFarmerData(data);
        setStep('confirm');
      } else {
        setStep('error');
        setError(t('linkInvalidOrUsed'));
      }
    } catch {
      setStep('error');
      setError(t('verifyError'));
    }
  };

  const handleActivate = async () => {
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setError(t('pinMustBe4Digits'));
      return;
    }
    if (pin !== confirmPin) {
      setError(t('pinsDoNotMatch'));
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/auth/farmer-activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, pin }),
      });

      if (res.ok) {
        setStep('success');
      } else {
        const data = await res.json();
        setError(data.error || t('activationFailed'));
      }
    } catch {
      setError(t('somethingWentWrong'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8FAF9] to-[#E8F0ED] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <LogoIcon size={64} className="drop-shadow-sm" />
          </div>
          <h1 className="text-xl font-bold text-[#1F5F52]">OriginTrace</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('portalTitle')}</p>
        </div>

        {step === 'loading' && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {t('verifyingLink')}
            </CardContent>
          </Card>
        )}

        {step === 'confirm' && farmerData && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('welcomeName', { name: farmerData.farmer_name })}</CardTitle>
              <CardDescription>{t('confirmPhoneDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('phone')}</span>
                  <span className="font-medium" data-testid="text-farmer-phone">{farmerData.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('community')}</span>
                  <span className="font-medium">{farmerData.community}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('organization')}</span>
                  <span className="font-medium">{farmerData.org_name}</span>
                </div>
              </div>
              <Button className="w-full" onClick={() => setStep('pin')} data-testid="button-confirm-phone">
                {t('confirmPhoneButton')}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'pin' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#2E7D6B]" />
                {t('setPinTitle')}
              </CardTitle>
              <CardDescription>{t('setPinDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('enterPin')}</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="text-center text-2xl tracking-[0.5em]"
                  data-testid="input-pin"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('confirmPin')}</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={confirmPin}
                  onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="text-center text-2xl tracking-[0.5em]"
                  data-testid="input-confirm-pin"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button className="w-full" onClick={handleActivate} disabled={submitting || pin.length !== 4} data-testid="button-activate">
                {submitting ? t('activating') : t('activateButton')}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'success' && (
          <Card>
            <CardContent className="py-8 text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
              <h2 className="text-xl font-bold text-[#1F5F52]">{t('accountActivated')}</h2>
              <p className="text-muted-foreground text-sm">{t('accountActivatedDesc')}</p>
              <Button className="w-full" onClick={() => window.location.href = '/auth/farmer-login'} data-testid="button-go-login">
                {t('goToLogin')}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'error' && (
          <Card>
            <CardContent className="py-8 text-center space-y-4">
              <p className="text-red-600 font-medium">{error}</p>
              <p className="text-muted-foreground text-sm">{t('contactFieldAgent')}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function FarmerActivatePageInner() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-[#F8FAF9] to-[#E8F0ED] flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading...
          </CardContent>
        </Card>
      </div>
    }>
      <FarmerActivateContent />
    </Suspense>
  );
}

export default function FarmerActivatePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
      <FarmerActivatePageInner />
    </Suspense>
  );
}
