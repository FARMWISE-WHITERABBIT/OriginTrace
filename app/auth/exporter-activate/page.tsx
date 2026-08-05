'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LogoIcon } from '@/components/logo';
import { CheckCircle2, Loader2, Building2 } from 'lucide-react';

function ExporterActivateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [step, setStep] = useState<'loading' | 'form' | 'success' | 'error'>('loading');
  const [invite, setInvite] = useState<{ invited_org_name: string; buyer_company_name: string } | null>(null);
  const [orgName, setOrgName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setStep('error');
      setError('Invalid invitation link.');
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/auth/exporter-activate?token=${token}`);
        const data = await res.json();
        if (res.ok) {
          setInvite(data);
          setOrgName(data.invited_org_name || '');
          setStep('form');
        } else {
          setStep('error');
          setError(data.error || 'This invitation link is invalid or has expired.');
        }
      } catch {
        setStep('error');
        setError('Unable to verify your invitation link. Please try again.');
      }
    })();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/auth/exporter-activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, orgName, adminName, adminEmail, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep('success');
      } else {
        setError(data.error || 'Could not create your account. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8FAF9] to-[#E8F0ED] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <LogoIcon size={64} className="drop-shadow-sm" />
          </div>
          <h1 className="text-xl font-bold text-[#1F5F52]">OriginTrace</h1>
        </div>

        {step === 'loading' && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Verifying your invitation...
            </CardContent>
          </Card>
        )}

        {step === 'form' && invite && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="h-5 w-5 text-[#2E7D6B]" />
                <CardTitle className="text-lg">Join the OriginTrace family</CardTitle>
              </div>
              <CardDescription>
                <span className="font-medium text-foreground">{invite.buyer_company_name}</span> invited{' '}
                {invite.invited_org_name || 'your organization'} to join OriginTrace as a supplier. Set up your
                organization and admin account to get started.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input
                    id="orgName"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    required
                    disabled={submitting}
                    data-testid="input-org-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminName">Your Full Name</Label>
                  <Input
                    id="adminName"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    required
                    disabled={submitting}
                    data-testid="input-admin-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Your Email</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    required
                    disabled={submitting}
                    data-testid="input-admin-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={submitting}
                    data-testid="input-password"
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={submitting} data-testid="button-create-account">
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}

        {step === 'success' && (
          <Card>
            <CardContent className="py-8 text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
              <h2 className="text-xl font-bold text-[#1F5F52]">Account Created!</h2>
              <p className="text-muted-foreground text-sm">
                Your organization is set up and connected. You can now sign in to OriginTrace.
              </p>
              <Button className="w-full" onClick={() => router.push('/auth/login')} data-testid="button-go-login">
                Go to Login
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'error' && (
          <Card>
            <CardContent className="py-8 text-center space-y-4">
              <p className="text-red-600 font-medium">{error}</p>
              <p className="text-muted-foreground text-sm">Contact the buyer who invited you for a new invitation link.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function ExporterActivatePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
      <ExporterActivateContent />
    </Suspense>
  );
}
