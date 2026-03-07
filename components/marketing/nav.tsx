'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const navLinks = [
  { href: '/solutions', label: 'Solutions' },
  { href: '/#use-cases', label: 'Use Cases' },
  { href: '/pedigree', label: 'Pedigree' },
  { href: '/#shipment-readiness', label: 'Readiness Score' },
  { href: '/api-docs', label: 'API' },
];

export function MarketingNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header 
      data-scrolled={scrolled}
      data-testid="marketing-nav"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-background/95 backdrop-blur-md border-b shadow-sm' 
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6">
        <nav className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center shrink-0">
            <Image 
              src="/images/logo-green.png" 
              alt="OriginTrace" 
              width={120} 
              height={32}
              className="block dark:hidden"
              style={{ width: 'auto', height: '28px' }}
              priority
            />
            <Image 
              src="/images/logo-white.png" 
              alt="OriginTrace" 
              width={120} 
              height={32}
              className="hidden dark:block"
              style={{ width: 'auto', height: '28px' }}
              priority
            />
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link 
                key={link.href}
                href={link.href} 
                className={`px-3 py-2 text-sm rounded-md transition-colors ${
                  pathname === link.href
                    ? 'text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/5'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link 
              href="/auth/login" 
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors px-3 py-2"
              data-testid="nav-sign-in"
            >
              Sign In
            </Link>
            <Link href="/demo">
              <Button 
                size="sm" 
                className="bg-emerald-600 text-white"
                data-testid="nav-request-demo"
              >
                Request Demo
              </Button>
            </Link>
          </div>

          <button 
            className="md:hidden p-2 rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            data-testid="button-mobile-menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-background border-b"
          >
            <div className="max-w-6xl mx-auto px-6 py-4 space-y-1">
              {navLinks.map((link) => (
                <Link 
                  key={link.href}
                  href={link.href} 
                  className={`block px-4 py-3 text-sm rounded-md transition-colors ${
                    pathname === link.href
                      ? 'text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/5'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link 
                href="/auth/login" 
                className="block px-4 py-3 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Sign In
              </Link>
              <div className="pt-2">
                <Link href="/demo">
                  <Button size="sm" className="w-full bg-emerald-600 text-white">
                    Request Demo
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
