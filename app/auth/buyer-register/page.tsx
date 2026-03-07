'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2 } from 'lucide-react';

export default function BuyerRegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [country, setCountry] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({
        title: 'Password Too Short',
        description: 'Password must be at least 6 characters.',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/buyer-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          fullName,
          companyName,
          country,
          contactEmail: email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: 'Registration Failed',
          description: data.error || 'Could not create account.',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: 'Buyer Account Created!',
        description: 'Please check your email to verify your account, then sign in.'
      });
      router.push('/auth/verify-email?email=' + encodeURIComponent(email));

    } catch (err) {
      console.error('Buyer registration error:', err);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Image
              src="/images/logo-green.png"
              alt="OriginTrace"
              width={140}
              height={40}
              className="dark:hidden"
            />
            <Image
              src="/images/logo-white.png"
              alt="OriginTrace"
              width={140}
              height={40}
              className="hidden dark:block"
            />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-2xl" data-testid="text-page-title">Buyer Registration</CardTitle>
          </div>
          <CardDescription>
            Create a buyer account to manage your supply chain connections
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Jane Smith"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={isLoading}
                data-testid="input-fullname"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                type="text"
                placeholder="Your Buying Company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                disabled={isLoading}
                data-testid="input-company-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                type="text"
                placeholder="Netherlands"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                disabled={isLoading}
                data-testid="input-country"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                data-testid="input-email"
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
                disabled={isLoading}
                data-testid="input-password"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="button-register"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Buyer Account'
              )}
            </Button>
            <div className="text-sm text-muted-foreground text-center space-y-1">
              <p>
                Are you an exporter?{' '}
                <Link href="/auth/register" className="text-primary hover:underline" data-testid="link-exporter-register">
                  Register as exporter
                </Link>
              </p>
              <p>
                Already have an account?{' '}
                <Link href="/auth/login" className="text-primary hover:underline" data-testid="link-login">
                  Sign in
                </Link>
              </p>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
