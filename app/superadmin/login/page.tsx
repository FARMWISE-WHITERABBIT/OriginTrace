'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield } from 'lucide-react';

export default function SuperadminLoginPage() {
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
      await supabase.auth.signOut();

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
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        toast({
          title: 'Login Failed',
          description: 'Unable to authenticate.',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }

      const res = await fetch('/api/superadmin?resource=metrics');
      if (!res.ok) {
        await supabase.auth.signOut();
        toast({
          title: 'Access Denied',
          description: 'This account does not have superadmin privileges.',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }

      toast({ title: 'Welcome to Command Tower' });
      router.push('/superadmin');
      router.refresh();
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
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800/30 via-slate-950 to-slate-950" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgb(100 116 139 / 0.3) 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <Card className="w-full max-w-md relative z-10 bg-slate-900 border-slate-700 text-slate-100">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-white">Command Tower</CardTitle>
          <CardDescription className="text-slate-400">
            Superadmin access only. Sign in with your credentials.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sa-email" className="text-slate-300">Email</Label>
              <Input
                id="sa-email"
                type="email"
                placeholder="admin@origintrace.trade"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20"
                data-testid="input-sa-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sa-password" className="text-slate-300">Password</Label>
              <Input
                id="sa-password"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20"
                data-testid="input-sa-password"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border-0"
              disabled={isLoading}
              data-testid="button-sa-login"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Access Command Tower'
              )}
            </Button>
            <p className="text-xs text-slate-500 text-center">
              This portal is restricted to platform administrators.
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
