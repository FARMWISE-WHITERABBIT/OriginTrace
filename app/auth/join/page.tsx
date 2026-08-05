'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, CheckCircle2 } from 'lucide-react';

export default function JoinPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState(['', '', '', '', '', '']);
  const [role, setRole] = useState('agent');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<{ orgName: string; role: string } | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...inviteCode];
    if (value.length > 1) {
      const digits = value.split('').slice(0, 6 - index);
      digits.forEach((d, i) => {
        if (index + i < 6) newCode[index + i] = d;
      });
      setInviteCode(newCode);
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
    } else {
      newCode[index] = value;
      setInviteCode(newCode);
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !inviteCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const codeString = inviteCode.join('');

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (codeString.length !== 6) {
      toast({
        title: 'Invalid Code',
        description: 'Please enter the full 6-digit invite code.',
        variant: 'destructive'
      });
      return;
    }

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
      const response = await fetch('/api/auth/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          fullName,
          inviteCode: codeString,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: 'Could Not Join',
          description: data.error || 'Failed to join organization.',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }

      setSuccess({ orgName: data.orgName, role: data.role });
      toast({
        title: 'Welcome!',
        description: data.message
      });

      setTimeout(() => {
        router.push('/auth/verify-email?email=' + encodeURIComponent(email));
      }, 2000);

    } catch (err) {
      console.error('Join error:', err);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-8">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
            <h2 className="text-2xl font-bold">You're In!</h2>
            <p className="text-muted-foreground">
              You've been added to <span className="font-semibold text-foreground">{success.orgName}</span> as {success.role === 'agent' ? 'a Field Agent' : 'an Aggregator'}.
            </p>
            <p className="text-sm text-muted-foreground">
              Please check your email to verify your account, then sign in.
            </p>
            <Button
              className="w-full mt-4"
              onClick={() => router.push('/auth/verify-email?email=' + encodeURIComponent(email))}
              data-testid="button-continue-verify"
            >
              Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <Users className="w-5 h-5 text-primary" />
            <CardTitle className="text-2xl">Join Organization</CardTitle>
          </div>
          <CardDescription>
            Enter the 6-digit invite code from your organization admin
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleJoin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Invite Code</Label>
              <div className="flex gap-2 justify-center">
                {inviteCode.map((digit, i) => (
                  <Input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleCodeChange(i, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(i, e)}
                    className="w-12 h-14 text-center text-2xl font-mono font-bold"
                    disabled={isLoading}
                    data-testid={`input-code-${i}`}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={isLoading}
                data-testid="input-fullname"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
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
            <div className="space-y-2">
              <Label htmlFor="role">Your Role</Label>
              <Select value={role} onValueChange={setRole} disabled={isLoading}>
                <SelectTrigger data-testid="select-role">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">Field Agent</SelectItem>
                  <SelectItem value="aggregator">Aggregator</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Your admin can change your role later if needed.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || codeString.length !== 6}
              data-testid="button-join"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                'Join Organization'
              )}
            </Button>
            <div className="text-sm text-muted-foreground text-center space-y-1">
              <p>
                Want to create a new organization?{' '}
                <Link href="/auth/register" className="text-primary hover:underline" data-testid="link-register">
                  Register here
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
