'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!supabase) {
      toast({ 
        title: 'Configuration Error', 
        description: 'Supabase is not configured.',
        variant: 'destructive' 
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({ 
          title: 'Login Failed', 
          description: error.message,
          variant: 'destructive' 
        });
      } else if (authData.user) {
        const { data: systemAdmin } = await supabase
          .from('system_admins')
          .select('id')
          .eq('user_id', authData.user.id)
          .single();

        if (systemAdmin) {
          toast({ title: 'Welcome to Command Tower' });
          router.push('/superadmin');
        } else {
          toast({ title: 'Welcome back!' });
          router.push('/app');
        }
        router.refresh();
      }
    } catch (err) {
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
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
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
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>
            Sign in to your OriginTrace account
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
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
                className="touch-target"
                data-testid="input-email"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-primary hover:underline"
                  data-testid="link-forgot-password"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="touch-target"
                data-testid="input-password"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button 
              type="submit" 
              className="w-full touch-target" 
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
            <div className="text-sm text-muted-foreground text-center space-y-1">
              <p>
                Have an invite code?{' '}
                <Link href="/auth/join" className="text-primary hover:underline" data-testid="link-join">
                  Join an organization
                </Link>
              </p>
              <p className="text-xs text-muted-foreground/70" data-testid="text-contact-prompt">
                New to OriginTrace? Contact us to get access.
              </p>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
