'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  Building2,
  Users,
  BarChart3,
  Settings,
  RefreshCw,
  LogOut,
  Menu,
  X,
  Shield,
  Zap,
  Activity,
  AlertCircle,
  Wheat,
  Handshake,
  CreditCard,
  CalendarDays,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const isLoginPage = pathname === '/superadmin/login';

  useEffect(() => {
    if (isLoginPage) {
      setIsLoading(false);
      setIsAuthorized(true);
      return;
    }

    async function checkAuth() {
      const client = createClient();
      if (!client) {
        router.push('/superadmin/login');
        return;
      }
      
      const { data: { user } } = await client.auth.getUser();
      
      if (!user) {
        router.push('/superadmin/login');
        return;
      }

      try {
        const res = await fetch('/api/superadmin');
        if (!res.ok) {
          router.push('/app');
          return;
        }
      } catch {
        router.push('/superadmin/login');
        return;
      }

      setIsAuthorized(true);
      setIsLoading(false);
    }

    checkAuth();
  }, [router, isLoginPage]);

  const handleSignOut = async () => {
    const client = createClient();
    if (client) {
      await client.auth.signOut();
    }
    router.push('/superadmin/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  const navItems = [
    { href: '/superadmin', label: 'Command Tower', icon: BarChart3 },
    { href: '/superadmin/organizations', label: 'Tenants', icon: Building2 },
    { href: '/superadmin/users', label: 'Users', icon: Users },
    { href: '/superadmin/tenant-health', label: 'Tenant Health', icon: Activity },
    { href: '/superadmin/commodities', label: 'Commodity Master', icon: Wheat },
    { href: '/superadmin/feature-toggles', label: 'Feature Toggles', icon: Zap },
    { href: '/superadmin/billing', label: 'Billing', icon: CreditCard },
    { href: '/superadmin/events', label: 'Events', icon: CalendarDays },
    { href: '/superadmin/sync', label: 'First-Mile Pulse', icon: RefreshCw },
    { href: '/superadmin/buyer-orgs', label: 'Buyer Orgs', icon: Handshake },
    { href: '/superadmin/health', label: 'War Room', icon: AlertCircle },
    { href: '/superadmin/settings', label: 'Platform Settings', icon: Settings },
  ];

  const isActive = (href: string) => {
    if (href === '/superadmin') {
      return pathname === '/superadmin';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-slate-900 border-b border-slate-700 p-4 flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-slate-300 hover:text-white hover:bg-slate-800"
          data-testid="button-toggle-sidebar"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-cyan-400" />
          <span className="font-semibold text-cyan-400">Command Tower</span>
        </div>
        <div className="w-10" />
      </div>

      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-700 transform transition-transform duration-200 ease-in-out
        lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">OriginTrace</h1>
                <p className="text-xs text-cyan-400 font-medium">COMMAND TOWER</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${isActive(item.href) 
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'}
                `}
                data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-700 space-y-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50">
              <Zap className="h-4 w-4 text-green-400" />
              <span className="text-xs text-slate-400">System Operational</span>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-slate-400 hover:text-white hover:bg-slate-800"
              onClick={handleSignOut}
              data-testid="button-sign-out"
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/70 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
