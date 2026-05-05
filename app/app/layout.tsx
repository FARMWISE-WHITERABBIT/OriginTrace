'use client';

import { ErrorBoundary } from '@/components/error-boundary';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import { ImpersonationBanner } from '@/components/impersonation-banner';
import { ConnectivityIndicator } from '@/components/connectivity-indicator';
import { HelpButton } from '@/components/help-button';
import { NotificationCenter } from '@/components/notification-center';
import { OnboardingProvider } from '@/lib/hooks/use-onboarding';
import { MobileNav, AgentBottomNav } from '@/components/mobile-nav';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CacheWarmer } from '@/components/cache-warmer';
import { AutoSync } from '@/components/auto-sync';
import { TenantThemeProvider } from '@/components/tenant-theme-provider';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { RouteProgressBar } from '@/components/route-progress';
import { AppBreadcrumb } from '@/components/app-breadcrumb';
import { CommandPalette } from '@/components/command-palette';
import { PWAInstallPrompt } from '@/components/pwa-install-prompt';
import { Search } from 'lucide-react';

function SearchTrigger() {
  const trigger = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
  return (
    <button
      onClick={trigger}
      className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 hover:bg-muted border border-border rounded-md px-3 py-1.5 transition-colors"
      aria-label="Search (⌘K)"
    >
      <Search className="h-3.5 w-3.5" />
      <span className="hidden md:inline">Search…</span>
      <kbd className="hidden lg:flex items-center gap-0.5 text-[10px] bg-background px-1 py-0.5 rounded border border-border font-mono ml-1">
        ⌘K
      </kbd>
    </button>
  );
}

function AppContent({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RouteProgressBar />
      <div className="flex flex-col flex-1 overflow-hidden pb-16 lg:pb-0">
        <ImpersonationBanner />
        <header className="flex items-center justify-between gap-4 p-3 border-b bg-background">
          <div className="flex items-center gap-2 min-w-0">
            <MobileNav />
            <SidebarTrigger className="hidden lg:flex shrink-0" data-testid="button-sidebar-toggle" />
            <div className="hidden sm:block min-w-0">
              <AppBreadcrumb />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SearchTrigger />
            <ConnectivityIndicator />
            <NotificationCenter />
            <HelpButton />
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
      <AgentBottomNav />
      <CommandPalette />
      <PWAInstallPrompt />
    </>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const style = {
    '--sidebar-width': '16rem',
    '--sidebar-width-icon': '3rem',
  };

  return (
    <OnboardingProvider>
      <TooltipProvider>
        <TenantThemeProvider>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <AppContent>{children}</AppContent>
              <CacheWarmer />
              <AutoSync />
            </div>
          </SidebarProvider>
        </TenantThemeProvider>
      </TooltipProvider>
    </OnboardingProvider>
  );
}
