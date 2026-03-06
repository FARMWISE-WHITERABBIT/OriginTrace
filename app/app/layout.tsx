'use client';

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

function AppContent({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="flex flex-col flex-1 overflow-hidden pb-16 lg:pb-0">
        <ImpersonationBanner />
        <header className="flex items-center justify-between gap-4 p-3 border-b bg-background">
          <div className="flex items-center gap-2">
            <MobileNav />
            <SidebarTrigger className="hidden lg:flex" data-testid="button-sidebar-toggle" />
          </div>
          <div className="flex items-center gap-2">
            <ConnectivityIndicator />
            <NotificationCenter />
            <HelpButton />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
      <AgentBottomNav />
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
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <AppContent>{children}</AppContent>
            <CacheWarmer />
            <AutoSync />
          </div>
        </SidebarProvider>
      </TooltipProvider>
    </OnboardingProvider>
  );
}
