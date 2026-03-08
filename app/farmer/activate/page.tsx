'use client';

import { useState, useEffect, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Shield, Leaf } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function FarmerActivatePage() {
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
      setError('Invalid activation link.');
      return;
    }
    verifyToken();
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
        setError('This activation link is invalid or has already been used.');
      }
    } catch {
      setStep('error');
      setError('Unable to verify your activation link. Please try again.');
    }
  };

  const handleActivate = async () => {
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits.');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match.');
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
        setError(data.error || 'Activation failed. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8FAF9] to-[#E8F0ED] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#2E7D6B] rounded-full mb-3">
            <Leaf className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-[#1F5F52]">OriginTrace</h1>
          <p className="text-sm text-muted-foreground mt-1">Farmer Portal</p>
        </div>

        {step === 'loading' && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Verifying your link...
            </CardContent>
          </Card>
        )}

        {step === 'confirm' && farmerData && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Welcome, {farmerData.farmer_name}!</CardTitle>
              <CardDescription>Confirm your phone number to activate your account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="font-medium" data-testid="text-farmer-phone">{farmerData.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Community</span>
                  <span className="font-medium">{farmerData.community}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Organization</span>
                  <span className="font-medium">{farmerData.org_name}</span>
                </div>
              </div>
              <Button className="w-full" onClick={() => setStep('pin')} data-testid="button-confirm-phone">
                Yes, this is my phone number
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'pin' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#2E7D6B]" />
                Set Your PIN
              </CardTitle>
              <CardDescription>Choose a 4-digit PIN to log in to your account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Enter 4-digit PIN</Label>
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
                <Label>Confirm PIN</Label>
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
                {submitting ? 'Activating...' : 'Activate My Account'}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'success' && (
          <Card>
            <CardContent className="py-8 text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
              <h2 className="text-xl font-bold text-[#1F5F52]">Account Activated!</h2>
              <p className="text-muted-foreground text-sm">Your farmer portal is ready. You can now log in with your phone number and PIN.</p>
              <Button className="w-full" onClick={() => window.location.href = '/login'} data-testid="button-go-login">
                Go to Login
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'error' && (
          <Card>
            <CardContent className="py-8 text-center space-y-4">
              <p className="text-red-600 font-medium">{error}</p>
              <p className="text-muted-foreground text-sm">Contact your field agent for a new activation link.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
