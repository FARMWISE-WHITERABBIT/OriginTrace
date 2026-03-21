'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useOrg } from '@/lib/contexts/org-context';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { getNavigationConfig, UserRole, agentBottomNavItems } from '@/lib/config/navigation';
import { useOnlineStatus } from '@/lib/hooks/use-online-status';
import Image from 'next/image';

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { profile, organization, isSystemAdmin } = useOrg();
  const router = useRouter();
  const supabase = createClient();
  const isOnline = useOnlineStatus();

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
      router.push('/');
      router.refresh();
    }
  };

  // Determine user role
  let userRole: UserRole = 'agent';
  if (isSystemAdmin && pathname.startsWith('/superadmin')) {
    userRole = 'superadmin';
  } else if (isSystemAdmin || profile?.role === 'admin') {
    userRole = 'admin';
  } else if (profile?.role === 'aggregator') {
    userRole = 'aggregator';
  }

  const navConfig = getNavigationConfig(userRole);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" data-testid="button-mobile-menu">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0 flex flex-col h-full">
        <SheetHeader className="p-4 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2">
            {organization?.logo_url ? (
              <img
                src={organization.logo_url}
                alt={organization.name}
                className="h-8 object-contain"
              />
            ) : (
              <Image
                src="/images/logo-green.png"
                alt="OriginTrace"
                width={100}
                height={32}
                style={{ width: 'auto' }}
              />
            )}
          </SheetTitle>
        </SheetHeader>

        <nav className="flex-1 min-h-0 overflow-y-auto p-4">
          {navConfig.groups.map((group) => (
            <div key={group.label} className="mb-6">
              <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-2">
                {group.label}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.url || 
                    (item.url !== '/app' && item.url !== '/superadmin' && pathname.startsWith(item.url + '/'));
                  
                  return (
                    <Link
                      key={item.title}
                      href={item.url}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors hover-elevate ${
                        isActive 
                          ? 'bg-primary/10 text-primary' 
                          : 'text-foreground'
                      }`}
                      data-testid={`mobile-nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                      {...(item.tourId ? { 'data-tour': item.tourId } : {})}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t p-4 space-y-3 shrink-0">
          <div className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded ${
            isOnline 
              ? 'bg-green-500/10 text-green-600' 
              : 'bg-amber-500/10 text-amber-600'
          }`}>
            <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-amber-500'}`} />
            <span>{isOnline ? 'Connected' : 'Offline Mode'}</span>
          </div>

          {profile && (
            <div className="px-2">
              <p className="text-sm font-medium">{profile.full_name}</p>
              <p className="text-xs text-muted-foreground capitalize">{profile.role}</p>
            </div>
          )}

          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="w-full justify-start gap-2"
            data-testid="mobile-button-logout"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Bottom navigation bar for mobile agent view
export function AgentBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t lg:hidden z-50 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {agentBottomNavItems.map((item) => {
          const isActive = pathname === item.url ||
            (item.url !== '/app' && pathname.startsWith(item.url));
          return (
            <Link
              key={item.title}
              href={item.url}
              className={`relative flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-md min-w-[60px] transition-colors ${
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              data-testid={`bottom-nav-${item.title.toLowerCase()}`}
            >
              <item.icon className={`h-5 w-5 ${isActive ? 'text-primary' : ''}`} />
              <span className={`text-[10px] font-medium ${isActive ? 'text-primary font-semibold' : ''}`}>
                {item.title}
              </span>
              {isActive && (
                <span className="absolute top-1 w-5 h-0.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
