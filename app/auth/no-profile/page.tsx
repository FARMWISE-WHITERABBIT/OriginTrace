'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, LogOut } from 'lucide-react';

export default function NoProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push('/auth/login');
    router.refresh();
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
          <div className="flex justify-center mb-2">
            <AlertTriangle className="h-10 w-10 text-warning" />
          </div>
          <CardTitle className="text-xl">Account Setup Incomplete</CardTitle>
          <CardDescription>
            Your account exists but hasn't been linked to an organization yet. Please contact your organization administrator to complete your setup.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          <p>If you believe this is an error, try signing out and logging in again. If the issue persists, reach out to your admin for assistance.</p>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleSignOut}
            variant="outline"
            className="w-full"
            data-testid="button-signout"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out & Try Again
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
