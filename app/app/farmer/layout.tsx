'use client';

import { ErrorBoundary } from '@/components/error-boundary';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, Banknote, GraduationCap, User, Sprout } from 'lucide-react';

const tabs = [
  { href: '/app/farmer', label: 'My Farm', icon: Home },
  { href: '/app/farmer/deliveries', label: 'Deliveries', icon: Package },
  { href: '/app/farmer/payments', label: 'Payments', icon: Banknote },
  { href: '/app/farmer/training', label: 'Training', icon: GraduationCap },
  { href: '/app/farmer/profile', label: 'Profile', icon: User },
];

export default function FarmerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
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
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col max-w-md mx-auto">
      <header className="bg-[#1F5F52] text-white px-4 py-3 flex items-center gap-2 sticky top-0 z-30">
        <Sprout className="h-5 w-5" />
        <h1 className="text-lg font-bold">OriginTrace</h1>
      </header>

      {showOnboarding && (
        <div className="bg-[#2E7D6B] text-white p-4 mx-4 mt-4 rounded-lg space-y-3" data-testid="farmer-onboarding">
          <h2 className="text-lg font-bold">Welcome to Your Farmer Portal!</h2>
          <p className="text-sm opacity-90">Here you can:</p>
          <ul className="text-sm space-y-1 opacity-90">
            <li>• View your farm details and compliance status</li>
            <li>• See your delivery history and weights</li>
            <li>• Track your payments and mobile money</li>
            <li>• Complete training modules</li>
            <li>• Record agricultural inputs</li>
          </ul>
          <button
            onClick={dismissOnboarding}
            className="bg-background text-primary px-4 py-2 rounded font-medium text-sm w-full border border-primary/30"
            data-testid="button-dismiss-onboarding"
          >
            Got it, let's go!
          </button>
        </div>
      )}

      <main className="flex-1 p-4 pb-24">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-background border-t border-border z-30">
        <div className="flex justify-around">
          {tabs.map(tab => {
            const isActive = pathname === tab.href || (tab.href !== '/app/farmer' && pathname.startsWith(tab.href));
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center py-2 px-3 text-xs min-h-[60px] justify-center ${
                  isActive ? 'text-primary font-medium' : 'text-muted-foreground'
                }`}
                data-testid={`nav-farmer-${tab.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon className={`h-5 w-5 mb-1 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
