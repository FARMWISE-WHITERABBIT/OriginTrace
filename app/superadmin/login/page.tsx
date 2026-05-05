'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, KeyRound, AlertTriangle } from 'lucide-react';

type Step = 'credentials' | 'totp';

export default function SuperadminLoginPage() {
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [factorId, setFactorId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const supabase = createClient();

  const timedOut = searchParams.get('reason') === 'timeout';

  // Step 1 — email + password
  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setIsLoading(true);

    try {
      await supabase.auth.signOut();

      const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        toast({ title: 'Login Failed', description: error.message, variant: 'destructive' });
        return;
      }
      if (!authData.user) {
        toast({ title: 'Login Failed', description: 'Unable to authenticate.', variant: 'destructive' });
        return;
      }

      // Verify superadmin status before proceeding
      const checkRes = await fetch('/api/superadmin');
      if (!checkRes.ok) {
        await supabase.auth.signOut();
        toast({ title: 'Access Denied', description: 'This account does not have superadmin privileges.', variant: 'destructive' });
        return;
      }

      // Check if the user has MFA enrolled
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const totpFactor = factorsData?.totp?.find(f => f.status === 'verified');

      if (totpFactor) {
        // MFA enrolled — require TOTP before granting access
        setFactorId(totpFactor.id);
        setStep('totp');
      } else {
        // No MFA enrolled — warn but allow through (encourage enrollment)
        toast({ title: 'MFA not enrolled', description: 'Please enrol TOTP in your account settings for enhanced security.', variant: 'default' });
        router.push('/superadmin');
        router.refresh();
      }
    } catch {
      toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2 — TOTP verification
  const handleTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setIsLoading(true);

    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError || !challengeData) {
        toast({ title: 'MFA Error', description: challengeError?.message ?? 'Failed to start MFA challenge.', variant: 'destructive' });
        return;
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: totpCode.replace(/\s/g, ''),
      });

      if (verifyError) {
        toast({ title: 'Invalid Code', description: 'The TOTP code is incorrect or has expired.', variant: 'destructive' });
        setTotpCode('');
        return;
      }

      toast({ title: 'Welcome to Command Tower' });
      router.push('/superadmin');
      router.refresh();
    } catch {
      toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800/30 via-slate-950 to-slate-950" />
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: `radial-gradient(circle at 1px 1px, rgb(100 116 139 / 0.3) 1px, transparent 0)`, backgroundSize: '32px 32px' }} />
      </div>

      <Card className="w-full max-w-md relative z-10 bg-slate-900 border-slate-700 text-slate-100">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              {step === 'totp' ? <KeyRound className="h-8 w-8 text-white" /> : <Shield className="h-8 w-8 text-white" />}
            </div>
          </div>
          <CardTitle className="text-2xl text-white">
            {step === 'totp' ? 'Two-Factor Authentication' : 'Command Tower'}
          </CardTitle>
          <CardDescription className="text-slate-400">
            {step === 'totp'
              ? 'Enter the 6-digit code from your authenticator app.'
              : 'Superadmin access only. Sign in with your credentials.'}
          </CardDescription>
        </CardHeader>

        {timedOut && step === 'credentials' && (
          <div className="mx-6 mb-2 flex items-center gap-2 rounded-lg bg-amber-950/40 border border-amber-800/50 px-4 py-3 text-sm text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Session expired due to 30 minutes of inactivity.
          </div>
        )}

        {step === 'credentials' ? (
          <form onSubmit={handleCredentials}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sa-email" className="text-slate-300">Email</Label>
                <Input id="sa-email" type="email" placeholder="admin@origintrace.trade"
                  value={email} onChange={e => setEmail(e.target.value)}
                  required disabled={isLoading}
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-cyan-500"
                  data-testid="input-sa-email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sa-password" className="text-slate-300">Password</Label>
                <Input id="sa-password" type="password" placeholder="Your password"
                  value={password} onChange={e => setPassword(e.target.value)}
                  required disabled={isLoading}
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-cyan-500"
                  data-testid="input-sa-password" />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border-0"
                disabled={isLoading} data-testid="button-sa-login">
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Authenticating…</> : 'Access Command Tower'}
              </Button>
              <p className="text-xs text-slate-500 text-center">Restricted to platform administrators.</p>
            </CardFooter>
          </form>
        ) : (
          <form onSubmit={handleTotp}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="totp-code" className="text-slate-300">Authenticator Code</Label>
                <Input id="totp-code" type="text" inputMode="numeric" placeholder="000 000"
                  value={totpCode} onChange={e => setTotpCode(e.target.value)}
                  maxLength={7} required disabled={isLoading} autoFocus
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-cyan-500 text-center text-2xl tracking-[0.5em] font-mono"
                  data-testid="input-totp-code" />
              </div>
              <p className="text-xs text-slate-500 text-center">
                Open your authenticator app and enter the current 6-digit code.
              </p>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border-0"
                disabled={isLoading || totpCode.replace(/\s/g, '').length < 6} data-testid="button-verify-totp">
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying…</> : 'Verify & Sign In'}
              </Button>
              <Button type="button" variant="ghost" className="w-full text-slate-500 hover:text-slate-300 text-sm"
                onClick={() => { setStep('credentials'); setTotpCode(''); }}>
                Back to login
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
