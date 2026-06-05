'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const complianceLinks = [
  { href: '/compliance',        label: 'Compliance Hub' },
  { href: '/compliance/eudr',   label: 'EU EUDR' },
  { href: '/compliance/usa',    label: 'US FSMA 204' },
  { href: '/compliance/uk',     label: 'UK Environment Act' },
  { href: '/compliance/china',  label: 'China GACC' },
  { href: '/compliance/uae',    label: 'UAE ESMA' },
];

const industryLinks = [
  { href: '/industries/agriculture', label: 'Agriculture' },
  { href: '/industries/timber',      label: 'Timber' },
  { href: '/industries/textiles',    label: 'Textiles' },
  { href: '/industries/minerals',    label: 'Minerals' },
];

const navLinks = [
  { href: '/solutions',   label: 'Solutions' },
  { href: '/compliance',  label: 'Compliance', dropdown: complianceLinks },
  { href: '/industries',  label: 'Industries', dropdown: industryLinks },
  { href: '/pedigree',    label: 'Pedigree' },
  { href: '/blog',        label: 'Insights' },
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
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <Link
        href={link.href}
        className="mk-pill-nav__link"
        data-active={isActive || undefined}
        data-testid={`nav-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
      >
        {link.label}
        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </Link>

      {/* SEO layer — always in DOM, invisible when closed */}
      <div
        aria-hidden={!open}
        className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 ${open ? 'visible' : 'invisible'}`}
        data-seo="dropdown-links"
      >
        {link.dropdown!.map((sub) => (
          <Link key={sub.href} href={sub.href} tabIndex={-1} className="block px-4 py-2 text-sm">
            {sub.label}
          </Link>
        ))}
      </div>

      {/* Visible animated dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 rounded-xl border py-1.5 z-50"
            style={{ background: '#fff', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', borderColor: 'var(--mk-border)' }}
            data-testid={`dropdown-${link.label.toLowerCase()}`}
          >
            {link.dropdown!.map((sub) => (
              <Link
                key={sub.href}
                href={sub.href}
                className="block px-4 py-2.5 text-sm transition-colors"
                style={{ color: pathname === sub.href ? 'var(--mk-green)' : 'var(--mk-text-secondary)' }}
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
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileExpanded(null);
  }, [pathname]);

  return (
    <>
      {/* ── Desktop floating pill nav ──────────────────────────────────────── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 hidden md:flex justify-center"
        style={{ paddingTop: '1.25rem' }}
        data-testid="marketing-nav"
      >
        <nav
          className="flex items-center gap-2 px-3 py-2"
          style={{
            background: '#ffffff',
            borderRadius: '9999px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
            minWidth: '720px',
            maxWidth: '1060px',
            width: 'calc(100% - 3rem)',
          }}
        >
          {/* Logo */}
          <Link href="/" className="shrink-0 mr-3 pl-1" aria-label="OriginTrace home">
            <Image
              src="/images/logo-green.png"
              alt="OriginTrace"
              width={120}
              height={32}
              style={{ width: 'auto', height: '26px' }}
              priority
            />
          </Link>

          {/* Links — centered, fill remaining space */}
          <div className="flex items-center gap-0.5 flex-1 justify-center">
            {navLinks.map((link) =>
              link.dropdown ? (
                <NavDropdown key={link.href} link={link} pathname={pathname} />
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="mk-pill-nav__link"
                  data-active={
                    (pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href.split('#')[0]))) || undefined
                  }
                  data-testid={`nav-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {link.label}
                </Link>
              )
            )}
          </div>

          {/* Right — sign in + CTA */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/auth/login"
              className="text-sm px-3 py-1.5 rounded-full transition-colors"
              style={{ color: 'var(--mk-text-secondary)' }}
              data-testid="nav-sign-in"
            >
              Sign in
            </Link>
            <Link
              href="/demo"
              className="text-sm font-semibold px-4 py-2 rounded-full transition-colors"
              style={{
                background: 'var(--mk-green)',
                color: '#fff',
              }}
              data-testid="nav-request-demo"
            >
              Contact us
            </Link>
          </div>
        </nav>
      </header>

      {/* ── Mobile nav ────────────────────────────────────────────────────── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex md:hidden items-center justify-between px-4 py-3"
        style={{ background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--mk-border)' }}
      >
        <Link href="/" aria-label="OriginTrace home">
          <Image src="/images/logo-green.png" alt="OriginTrace" width={110} height={30} style={{ width: 'auto', height: '24px' }} priority />
        </Link>

        <button
          className="p-2 rounded-full transition-colors"
          style={{ background: 'var(--mk-surface-gray)' }}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
          data-testid="button-mobile-menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Mobile menu drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="fixed top-14 left-4 right-4 z-50 rounded-2xl border py-3 md:hidden"
            style={{ background: '#fff', boxShadow: '0 12px 40px rgba(0,0,0,0.14)', borderColor: 'var(--mk-border)' }}
          >
            {navLinks.map((link) => (
              <div key={link.href}>
                {link.dropdown ? (
                  <>
                    <button
                      onClick={() => setMobileExpanded(mobileExpanded === link.label ? null : link.label)}
                      className="flex items-center justify-between w-full px-5 py-3 text-sm font-medium transition-colors"
                      style={{ color: pathname?.startsWith(link.href) ? 'var(--mk-green)' : 'var(--mk-text-secondary)' }}
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
                          className="pl-5"
                        >
                          {link.dropdown.map((sub) => (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              className="block px-5 py-2.5 text-sm transition-colors"
                              style={{ color: pathname === sub.href ? 'var(--mk-green)' : 'var(--mk-text-muted)' }}
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
                    className="block px-5 py-3 text-sm font-medium transition-colors"
                    style={{ color: pathname === link.href ? 'var(--mk-green)' : 'var(--mk-text-secondary)' }}
                  >
                    {link.label}
                  </Link>
                )}
              </div>
            ))}
            <div className="px-4 pt-2 pb-1 flex flex-col gap-2" style={{ borderTop: '1px solid var(--mk-border)', marginTop: '0.5rem' }}>
              <Link href="/auth/login" className="block text-center py-2.5 text-sm font-medium" style={{ color: 'var(--mk-text-secondary)' }}>
                Sign in
              </Link>
              <Link
                href="/demo"
                className="block text-center py-2.5 text-sm font-semibold rounded-full"
                style={{ background: 'var(--mk-green)', color: '#fff' }}
              >
                Contact us
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
