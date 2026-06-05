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
  { href: '/',           label: 'Home' },
  { href: '/solutions',  label: 'Solutions' },
  { href: '/compliance', label: 'Compliance', dropdown: complianceLinks },
  { href: '/industries', label: 'Industries', dropdown: industryLinks },
  { href: '/blog',       label: 'Insights' },
];

function NavDropdown({ link, pathname }: { link: typeof navLinks[0]; pathname: string | null }) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isActive = link.href === '/' ? pathname === '/' : pathname?.startsWith(link.href);

  return (
    <div
      className="relative"
      onMouseEnter={() => { if (timeoutRef.current) clearTimeout(timeoutRef.current); setOpen(true); }}
      onMouseLeave={() => { timeoutRef.current = setTimeout(() => setOpen(false), 150); }}
    >
      <Link
        href={link.href}
        className="mk-nav-link"
        data-active={isActive || undefined}
        data-testid={`nav-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
      >
        {link.label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </Link>

      {/* SEO hidden links — always in DOM */}
      <div aria-hidden={!open} className={`absolute top-full left-0 mt-2 w-56 ${open ? 'visible' : 'invisible'}`}>
        {link.dropdown!.map((sub) => (
          <Link key={sub.href} href={sub.href} tabIndex={-1} className="block px-4 py-2 text-sm">{sub.label}</Link>
        ))}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 w-56 rounded-xl py-1.5 z-50"
            style={{
              background: '#fff',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              border: '1px solid var(--mk-border)',
            }}
            data-testid={`dropdown-${link.label.toLowerCase()}`}
          >
            {link.dropdown!.map((sub) => (
              <Link
                key={sub.href}
                href={sub.href}
                className="block px-4 py-2.5 text-[15px] transition-colors"
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
      {/* ── Desktop nav ──────────────────────────────────────────────────────── */}
      {/*
        Mivora exact structure:
          .container-full  → full-width wrapper, padding-left:1.875rem padding-right:2.5rem
            .grid-nav      → CSS Grid 1fr auto, gap:9px, position:relative
              .nav-inner-grid → CSS Grid auto 1fr, gap:20px, white pill, padding:1rem 1.25rem
              .right-nav   → flex center, CTA button
      */}
      <header
        className="fixed top-0 left-0 right-0 z-50 hidden md:block"
        style={{ paddingTop: '1.25rem', paddingBottom: '1.25rem' }}
        data-testid="marketing-nav"
      >
        {/* .container-full */}
        <div style={{ maxWidth: '100%', marginLeft: 'auto', marginRight: 'auto', paddingLeft: '1.875rem', paddingRight: '2.5rem' }}>

          {/* .grid-nav — 1fr auto, gap 9px */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gridColumnGap: '9px',
              gridRowGap: '9px',
              gridTemplateRows: 'auto',
              position: 'relative',
              maxWidth: '1390px',
              marginInline: 'auto',
            }}
          >

            {/* .nav-inner-grid — auto 1fr, gap 20px, white pill */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gridColumnGap: '20px',
                gridRowGap: '20px',
                gridTemplateRows: 'auto',
                gridAutoColumns: '1fr',
                borderRadius: 'var(--border-radius--button)',
                backgroundColor: 'var(--color--white)',
                placeItems: 'center stretch',
                width: '100%',
                padding: '1rem 1.25rem',
                position: 'relative',
                overflow: 'visible',
                boxShadow: '0 2px 20px rgba(0,0,0,0.09)',
              }}
            >
              {/* Logo — grid node, justify-self: start */}
              <Link
                href="/"
                aria-label="OriginTrace home"
                style={{ justifySelf: 'start', display: 'flex', alignItems: 'center' }}
              >
                <Image
                  src="/images/logo-green.png"
                  alt="OriginTrace"
                  width={140}
                  height={36}
                  style={{ width: 'auto', height: '24px' }}
                  priority
                />
              </Link>

              {/* Nav links — grid node, justify-self: start */}
              <div
                style={{
                  justifySelf: 'start',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0,
                  width: '100%',
                }}
              >
                <nav style={{ display: 'flex', alignItems: 'center', gap: 0, flex: 1 }}>
                  {navLinks.map((link) =>
                    link.dropdown ? (
                      <NavDropdown key={link.href} link={link} pathname={pathname} />
                    ) : (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="mk-nav-link"
                        data-active={
                          (link.href === '/' ? pathname === '/' : pathname?.startsWith(link.href.split('#')[0])) || undefined
                        }
                        data-testid={`nav-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {link.label}
                      </Link>
                    )
                  )}
                </nav>

                {/* Nav-divider shape SVG — absolutely positioned on right edge of left pill */}
                <div style={{ position: 'relative', width: '13px', flexShrink: 0, alignSelf: 'stretch' }}>
                  <img
                    src="/images/6835561dd6d805810e0f5ed2_b66967c74a5d313b1ff8ca2989cd1a26_shape.svg"
                    alt=""
                    aria-hidden
                    className="nav-divider"
                  />
                </div>
              </div>
            </div>

            {/* .right-nav — flex center, CTA */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Link
                href="/demo"
                className="btn-mk-primary"
                style={{ boxShadow: '0 2px 20px rgba(0,0,0,0.09)', whiteSpace: 'nowrap' }}
                data-testid="nav-request-demo"
              >
                Request Demo
              </Link>
            </div>

          </div>
        </div>
      </header>

      {/* ── Mobile nav bar ───────────────────────────────────────────────────── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex md:hidden items-center justify-between px-5"
        style={{
          height: '60px',
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--mk-border)',
        }}
      >
        <Link href="/" aria-label="OriginTrace home">
          <Image
            src="/images/logo-green.png"
            alt="OriginTrace"
            width={130}
            height={36}
            style={{ width: 'auto', height: '28px' }}
            priority
          />
        </Link>
        <button
          className="flex items-center justify-center w-10 h-10 rounded-full transition-colors"
          style={{ background: 'var(--mk-surface-gray)' }}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
          data-testid="button-mobile-menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* ── Mobile drawer ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed z-50 md:hidden rounded-2xl py-3"
            style={{
              top: '68px',
              left: '1rem',
              right: '1rem',
              background: '#fff',
              boxShadow: '0 12px 40px rgba(0,0,0,0.14)',
              border: '1px solid var(--mk-border)',
            }}
          >
            {navLinks.map((link) => (
              <div key={link.href}>
                {link.dropdown ? (
                  <>
                    <button
                      onClick={() => setMobileExpanded(mobileExpanded === link.label ? null : link.label)}
                      className="flex items-center justify-between w-full px-5 py-3.5 font-medium transition-colors"
                      style={{
                        fontSize: '15px',
                        color: pathname?.startsWith(link.href) ? 'var(--mk-green)' : 'var(--mk-text-secondary)',
                      }}
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
                          className="overflow-hidden"
                        >
                          {link.dropdown.map((sub) => (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              className="block px-8 py-3 transition-colors"
                              style={{ fontSize: '15px', color: pathname === sub.href ? 'var(--mk-green)' : 'var(--mk-text-muted)' }}
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
                    className="block px-5 py-3.5 font-medium transition-colors"
                    style={{ fontSize: '15px', color: pathname === link.href ? 'var(--mk-green)' : 'var(--mk-text-secondary)' }}
                  >
                    {link.label}
                  </Link>
                )}
              </div>
            ))}
            <div
              className="flex flex-col gap-2 px-4 pt-3 pb-2"
              style={{ borderTop: '1px solid var(--mk-border)', marginTop: '0.5rem' }}
            >
              <Link
                href="/demo"
                className="block text-center py-3 font-semibold rounded-full"
                style={{ fontSize: '15px', background: 'var(--mk-green)', color: '#fff' }}
              >
                Request Demo
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
