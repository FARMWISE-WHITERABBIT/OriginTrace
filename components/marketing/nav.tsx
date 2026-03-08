'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Menu, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const complianceLinks = [
  { href: '/compliance', label: 'Compliance Hub' },
  { href: '/compliance/eudr', label: 'EU EUDR' },
  { href: '/compliance/usa', label: 'US FSMA 204' },
  { href: '/compliance/uk', label: 'UK Environment Act' },
  { href: '/compliance/china', label: 'China GACC' },
  { href: '/compliance/uae', label: 'UAE ESMA' },
];

const industryLinks = [
  { href: '/industries/agriculture', label: 'Agriculture' },
  { href: '/industries/timber', label: 'Timber' },
  { href: '/industries/textiles', label: 'Textiles' },
  { href: '/industries/minerals', label: 'Minerals' },
];

const navLinks = [
  { href: '/solutions', label: 'Solutions' },
  { href: '/compliance', label: 'Compliance', dropdown: complianceLinks },
  { href: '/industries', label: 'Industries', dropdown: industryLinks },
  { href: '/pedigree', label: 'Pedigree' },
];

function NavDropdown({ link, pathname }: { link: typeof navLinks[0]; pathname: string | null }) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  };

  const isActive = pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href));

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link
        href={link.href}
        className={`px-3 py-2 text-sm rounded-md transition-colors inline-flex items-center gap-1 ${
          isActive
            ? 'text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/5'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
        data-testid={`nav-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
      >
        {link.label}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </Link>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-1 w-52 bg-background border rounded-md shadow-lg py-1 z-50"
            data-testid={`dropdown-${link.label.toLowerCase()}`}
          >
            {link.dropdown!.map((sub) => (
              <Link
                key={sub.href}
                href={sub.href}
                className={`block px-4 py-2 text-sm transition-colors ${
                  pathname === sub.href
                    ? 'text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/5'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                data-testid={`dropdown-link-${sub.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {sub.label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MarketingNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
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
    setMobileExpanded(null);
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
            {navLinks.map((link) =>
              link.dropdown ? (
                <NavDropdown key={link.href} link={link} pathname={pathname} />
              ) : (
                <Link 
                  key={link.href}
                  href={link.href} 
                  className={`px-3 py-2 text-sm rounded-md transition-colors ${
                    pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href.split('#')[0]))
                      ? 'text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/5'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  data-testid={`nav-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {link.label}
                </Link>
              )
            )}
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
                <div key={link.href}>
                  {link.dropdown ? (
                    <>
                      <button
                        onClick={() => setMobileExpanded(mobileExpanded === link.label ? null : link.label)}
                        className={`flex items-center justify-between w-full px-4 py-3 text-sm rounded-md transition-colors ${
                          pathname?.startsWith(link.href)
                            ? 'text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/5'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                        data-testid={`mobile-nav-${link.label.toLowerCase()}`}
                      >
                        {link.label}
                        <ChevronDown className={`h-4 w-4 transition-transform ${mobileExpanded === link.label ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {mobileExpanded === link.label && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.15 }}
                            className="pl-4"
                          >
                            {link.dropdown.map((sub) => (
                              <Link
                                key={sub.href}
                                href={sub.href}
                                className={`block px-4 py-2.5 text-sm rounded-md transition-colors ${
                                  pathname === sub.href
                                    ? 'text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/5'
                                    : 'text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                                data-testid={`mobile-link-${sub.label.toLowerCase().replace(/\s+/g, '-')}`}
                              >
                                {sub.label}
                              </Link>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  ) : (
                    <Link 
                      href={link.href} 
                      className={`block px-4 py-3 text-sm rounded-md transition-colors ${
                        pathname === link.href
                          ? 'text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/5'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {link.label}
                    </Link>
                  )}
                </div>
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
