'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MailCheck, RefreshCw } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const [isResending, setIsResending] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  const handleResend = async () => {
    if (!supabase || !email) return;
    setIsResending(true);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        toast({
          title: 'Failed to Resend',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Verification Email Sent',
          description: 'Please check your inbox and spam folder.',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Could not resend verification email.',
        variant: 'destructive',
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
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
          <div className="flex justify-center mb-2">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <MailCheck className="h-7 w-7 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl" data-testid="text-verify-title">Check Your Email</CardTitle>
          <CardDescription>
            We sent a verification link to{' '}
            {email && (
              <span className="font-medium text-foreground">{email}</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Click the link in your email to verify your account. Once verified, you can sign in to access OriginTrace.
          </p>
          <Button
            variant="outline"
            onClick={handleResend}
            disabled={isResending}
            className="w-full"
            data-testid="button-resend-verification"
          >
            {isResending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Resend Verification Email
              </>
            )}
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Link href="/auth/login" className="w-full">
            <Button variant="default" className="w-full" data-testid="button-goto-login">
              Go to Sign In
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground">
            Did not receive the email? Check your spam folder or try resending.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

function VerifyEmailPageInner() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
      <VerifyEmailPageInner />
    </Suspense>
  );
}
