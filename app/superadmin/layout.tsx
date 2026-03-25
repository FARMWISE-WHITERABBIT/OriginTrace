'use client';

import React, { useEffect, useState } from 'react';
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
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { href: '/superadmin', label: 'Command Tower', icon: BarChart3 },
    ],
  },
  {
    title: 'Tenants & Users',
    items: [
      { href: '/superadmin/organizations', label: 'Tenants', icon: Building2 },
      { href: '/superadmin/users', label: 'Users', icon: Users },
      { href: '/superadmin/tenant-health', label: 'Tenant Health', icon: Activity },
    ],
  },
  {
    title: 'Platform',
    items: [
      { href: '/superadmin/commodities', label: 'Commodity Master', icon: Wheat },
      { href: '/superadmin/feature-toggles', label: 'Feature Toggles', icon: Zap },
      { href: '/superadmin/billing', label: 'Billing', icon: CreditCard },
      { href: '/superadmin/events', label: 'Events', icon: CalendarDays },
    ],
  },
  {
    title: 'System',
    items: [
      { href: '/superadmin/sync', label: 'First-Mile Pulse', icon: RefreshCw },
      { href: '/superadmin/buyer-orgs', label: 'Buyer Orgs', icon: Handshake },
      { href: '/superadmin/health', label: 'War Room', icon: AlertCircle },
      { href: '/superadmin/settings', label: 'Platform Settings', icon: Settings },
    ],
  },
];

// Flat list for mobile header label lookup
const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap(s => s.items);

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
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
      if (!client) { router.push('/superadmin/login'); return; }

      const { data: { user } } = await client.auth.getUser();
      if (!user) { router.push('/superadmin/login'); return; }

      try {
        const res = await fetch('/api/superadmin');
        if (!res.ok) { router.push('/app'); return; }
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
    if (client) await client.auth.signOut();
    router.push('/superadmin/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-400" />
        </div>
      </div>
    );
  }

  if (!isAuthorized) return null;
  if (isLoginPage) return <>{children}</>;

  const isActive = (href: string) => {
    if (href === '/superadmin') return pathname === '/superadmin';
    return pathname.startsWith(href);
  };

  const currentPage = ALL_NAV_ITEMS.find(item =>
    item.href === '/superadmin' ? pathname === '/superadmin' : pathname.startsWith(item.href)
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-slate-900 border-b border-slate-800 px-4 h-14 flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-slate-400 hover:text-white hover:bg-slate-800 h-9 w-9"
          data-testid="button-toggle-sidebar"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <div className="flex items-center gap-2 text-sm">
          <Shield className="h-4 w-4 text-cyan-400" />
          <span className="font-medium text-slate-200">{currentPage?.label || 'Command Tower'}</span>
        </div>
        <div className="w-9" />
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-60 bg-slate-900 border-r border-slate-800
        transform transition-transform duration-200 ease-in-out
        lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        flex flex-col
      `}>
        {/* Brand */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-white leading-tight">OriginTrace</div>
              <div className="text-[10px] font-semibold text-cyan-400 tracking-widest uppercase">Command Tower</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {NAV_SECTIONS.map((section, si) => (
            <div key={section.title} className={si > 0 ? 'mt-4' : ''}>
              <p className="px-3 mb-1 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
                {section.title}
              </p>
              {section.items.map(item => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all relative
                      ${active
                        ? 'bg-cyan-500/10 text-cyan-400'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'}
                    `}
                    data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-cyan-400 rounded-r-full" />
                    )}
                    <item.icon className={`h-4 w-4 shrink-0 ${active ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                    <span className="flex-1">{item.label}</span>
                    {active && <ChevronRight className="h-3 w-3 text-cyan-500 opacity-60" />}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 space-y-1">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
            <span className="text-xs text-slate-500">All systems operational</span>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-slate-400 hover:text-white hover:bg-slate-800 h-9 text-sm px-3"
            onClick={handleSignOut}
            data-testid="button-sign-out"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:ml-60 pt-14 lg:pt-0 min-h-screen">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
