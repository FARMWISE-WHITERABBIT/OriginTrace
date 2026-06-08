'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

const footerLinks = [
  { href: '/',                label: 'Home' },
  { href: '/solutions',       label: 'Solutions' },
  { href: '/compliance',      label: 'Compliance Hub' },
  { href: '/industries',      label: 'Industries' },
  { href: '/blog',            label: 'Insights' },
  { href: '/demo',            label: 'Request Demo' },
  { href: '/auth/login',      label: 'Sign In' },
  { href: '/legal/privacy',   label: 'Privacy Policy' },
  { href: '/legal/terms',     label: 'Terms' },
];

const socialLinks = [
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/origintrace',
    icon: (
      <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    label: 'X (Twitter)',
    href: 'https://x.com/OriginTraceHq',
    icon: (
      <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/origintrace.trade/',
    icon: (
      <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
  },
];

export function MarketingFooter() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (email) setSubscribed(true);
  }

  return (
    <footer className="mk-footer" data-testid="marketing-footer">
      {/* ── Background video + dark overlay ─────────────────────────── */}
      <video
        autoPlay
        muted
        loop
        playsInline
        aria-hidden
        className="mk-footer__bg"
        style={{ objectFit: 'cover' }}
      >
        <source src="https://sjpnqhlohgyyndxyfgvh.supabase.co/storage/v1/object/public/media/0607%20(2)(1).mp4" type="video/mp4" />
      </video>
      <div className="mk-footer__overlay" aria-hidden />

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="mk-footer__inner">
        {/* Two floating white panels */}
        <div className="mk-footer__panels">
          {/* Shape connector between panels */}
          <img
            src="/images/6835561dd6d805810e0f5ed2_b66967c74a5d313b1ff8ca2989cd1a26_shape.svg"
            alt=""
            aria-hidden
            className="mk-footer__shape"
          />

          {/* ── LEFT PANEL ─────────────────────────────────────── */}
          <div className="mk-footer-panel mk-footer-panel--left">
            {/* Logo */}
            <div className="mk-footer-panel__logo">
              <Image
                src="/images/logo-green.png"
                alt="OriginTrace"
                width={140}
                height={36}
                style={{ width: 'auto', height: '28px' }}
              />
            </div>

            {/* Spacer — pushes tagline/form/attribution to bottom */}
            <div style={{ flex: 1 }} />

            {/* Tagline */}
            <p className="mk-footer-panel__tagline">
              Trust infrastructure for origin-sensitive supply chains. From farm to port,
              compliance verified.
            </p>

            {/* Email subscribe */}
            <form onSubmit={handleSubscribe} className="mk-footer-subscribe">
              {subscribed ? (
                <p className="mk-footer-subscribe__success">
                  Thank you — you&apos;re on the list!
                </p>
              ) : (
                <>
                  <input
                    type="email"
                    required
                    placeholder="Your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mk-footer-subscribe__input"
                    aria-label="Email address for newsletter"
                  />
                  <button type="submit" className="mk-footer-subscribe__btn btn-mk-primary btn-mk-sm">
                    Subscribe
                  </button>
                </>
              )}
            </form>

            {/* Attribution */}
            <p className="mk-footer-panel__attr">
              &copy; 2026 OriginTrace. All rights reserved.
            </p>
          </div>

          {/* ── RIGHT PANEL ────────────────────────────────────── */}
          <div className="mk-footer-panel mk-footer-panel--right">
            <div className="mk-footer-grid">

              {/* Pages */}
              <div className="mk-footer-col">
                <h4 className="mk-footer-col__heading">Pages</h4>
                <ul className="mk-footer-col__list">
                  {footerLinks.slice(0, 6).map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="mk-footer-col__link" data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Address */}
              <div className="mk-footer-col">
                <h4 className="mk-footer-col__heading">Address</h4>
                <address className="mk-footer-col__address">
                  <p>OriginTrace Ltd.</p>
                  <p>Lagos, Nigeria</p>
                  <p style={{ marginTop: '0.5rem' }}>Serving West Africa,</p>
                  <p>East Africa &amp; Europe</p>
                </address>
              </div>

              {/* Contact */}
              <div className="mk-footer-col">
                <h4 className="mk-footer-col__heading">Contact</h4>
                <ul className="mk-footer-col__list">
                  <li>
                    <a href="mailto:hello@origintrace.trade" className="mk-footer-col__link" data-testid="footer-link-email">
                      hello@origintrace.trade
                    </a>
                  </li>
                  <li>
                    <a href="mailto:support@origintrace.trade" className="mk-footer-col__link" data-testid="footer-link-support">
                      support@origintrace.trade
                    </a>
                  </li>
                  <li style={{ marginTop: '0.75rem' }}>
                    <Link href="/legal/privacy" className="mk-footer-col__link">Privacy Policy</Link>
                  </li>
                  <li>
                    <Link href="/legal/terms" className="mk-footer-col__link">Terms of Service</Link>
                  </li>
                </ul>
              </div>

              {/* Social */}
              <div className="mk-footer-col">
                <h4 className="mk-footer-col__heading">Social Media</h4>
                <div className="mk-footer-socials">
                  {socialLinks.map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mk-footer-social-icon"
                      aria-label={s.label}
                    >
                      {s.icon}
                    </a>
                  ))}
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </footer>
  );
}
