'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogoIcon } from '@/components/logo';
import { Loader2, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function FarmerLoginPage() {
  const t = useTranslations('auth');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (pin.length !== 4) {
      setError(t('pinMustBe4Digits'));
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/farmer-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, pin }),
      });

      if (res.ok) {
        window.location.assign('/app/farmer');
        return;
      }

      const data = await res.json().catch(() => ({}));
      setError(data.error || t('loginFailedGeneric'));
    } catch {
      setError(t('loginFailedGeneric'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8FAF9] to-[#E8F0ED] flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <LogoIcon size={56} className="drop-shadow-sm" />
          </div>
          <CardTitle className="text-xl flex items-center justify-center gap-2">
            <Shield className="h-5 w-5 text-[#2E7D6B]" />
            {t('farmerPortalTitle')}
          </CardTitle>
          <CardDescription>{t('farmerLoginDescription')}</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">{t('phone')}</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+234 800 000 0000"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
                disabled={isLoading}
                className="touch-target"
                data-testid="input-farmer-phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin">{t('pin')}</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                required
                disabled={isLoading}
                className="touch-target text-center text-2xl tracking-[0.5em]"
                data-testid="input-farmer-pin"
              />
            </div>
            {error && <p className="text-sm text-red-600" data-testid="text-farmer-login-error">{error}</p>}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full touch-target"
              disabled={isLoading || pin.length !== 4 || !phone}
              data-testid="button-farmer-login"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('signingIn')}
                </>
              ) : (
                t('login')
              )}
            </Button>
            <div className="text-sm text-muted-foreground text-center space-y-1">
              <p>
                {t('noAccountYetPrompt')}{' '}
                <span className="text-muted-foreground/70">{t('contactFieldAgentForInvite')}</span>
              </p>
              <p>
                <Link href="/auth/login" className="text-primary hover:underline" data-testid="link-staff-login">
                  {t('staffLoginLink')}
                </Link>
              </p>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
