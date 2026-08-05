'use client';

import { ErrorBoundary } from '@/components/error-boundary';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, Banknote, GraduationCap, User, Sprout, Wheat, WifiOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useOnlineStatus } from '@/lib/hooks/use-online-status';

const tabs = [
  { href: '/app/farmer', key: 'myFarm', icon: Home },
  { href: '/app/farmer/deliveries', key: 'deliveries', icon: Package },
  { href: '/app/farmer/payments', key: 'payments', icon: Banknote },
  { href: '/app/farmer/training', key: 'training', icon: GraduationCap },
  { href: '/app/farmer/inputs', key: 'inputs', icon: Wheat },
  { href: '/app/farmer/profile', key: 'profile', icon: User },
] as const;

export default function FarmerLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('farmer');
  const pathname = usePathname();
  const isOnline = useOnlineStatus();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('farmer_onboarding_done');
    if (!seen) setShowOnboarding(true);
  }, []);

  const dismissOnboarding = () => {
    localStorage.setItem('farmer_onboarding_done', '1');
    setShowOnboarding(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      <header className="bg-[#1F5F52] text-white px-4 py-3 flex items-center gap-2 sticky top-0 z-30">
        <Sprout className="h-5 w-5" />
        <h1 className="text-lg font-bold">OriginTrace</h1>
      </header>

      {!isOnline && (
        <div
          className="bg-amber-500 text-white px-4 py-2 flex items-center gap-2 text-sm sticky top-[52px] z-20"
          data-testid="farmer-offline-banner"
        >
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>{t('offlineMessage')}</span>
        </div>
      )}

      {showOnboarding && (
        <div className="bg-[#2E7D6B] text-white p-4 mx-4 mt-4 rounded-lg space-y-3" data-testid="farmer-onboarding">
          <h2 className="text-lg font-bold">{t('welcomeTitle')}</h2>
          <p className="text-sm opacity-90">{t('onboardingIntro')}</p>
          <ul className="text-sm space-y-1 opacity-90">
            <li>• {t('onboardingViewFarm')}</li>
            <li>• {t('onboardingDeliveryHistory')}</li>
            <li>• {t('onboardingPayments')}</li>
            <li>• {t('onboardingTraining')}</li>
            <li>• {t('onboardingInputs')}</li>
          </ul>
          <button
            onClick={dismissOnboarding}
            className="bg-background text-primary px-4 py-2 rounded font-medium text-sm w-full border border-primary/30"
            data-testid="button-dismiss-onboarding"
          >
            {t('gotIt')}
          </button>
        </div>
      )}

      <main className="flex-1 p-4 pb-24">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-background border-t border-border z-30">
        <div className="flex justify-around">
          {tabs.map(tab => {
            const isActive = pathname === tab.href || (tab.href !== '/app/farmer' && pathname.startsWith(tab.href));
            const Icon = tab.icon;
            const label = t(tab.key);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center py-2 px-3 text-xs min-h-[60px] justify-center ${
                  isActive ? 'text-primary font-medium' : 'text-muted-foreground'
                }`}
                data-testid={`nav-farmer-${label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon className={`h-5 w-5 mb-1 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
