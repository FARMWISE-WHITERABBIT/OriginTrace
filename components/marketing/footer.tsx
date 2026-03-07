import Link from 'next/link';
import Image from 'next/image';

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-4 gap-10">
          <div className="md:col-span-1">
            <Image 
              src="/images/logo-green.png" 
              alt="OriginTrace" 
              width={100} 
              height={28}
              className="dark:hidden mb-5"
              style={{ width: 'auto', height: '24px' }}
            />
            <Image 
              src="/images/logo-white.png" 
              alt="OriginTrace" 
              width={100} 
              height={28}
              className="hidden dark:block mb-5"
              style={{ width: 'auto', height: '24px' }}
            />
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Trust infrastructure for origin-sensitive supply chains. EUDR, FSMA 204, UK Environment Act compliance.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <a href="#" className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" aria-label="LinkedIn" data-testid="link-social-linkedin">
                <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
              <a href="#" className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" aria-label="X (Twitter)" data-testid="link-social-twitter">
                <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold mb-4 text-slate-900 dark:text-white">Platform</h4>
            <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
              <li><Link href="/solutions" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Solutions</Link></li>
              <li><Link href="/pedigree" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Pedigree</Link></li>
              <li><Link href="/processors" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">For Processors</Link></li>
              <li><Link href="/verify" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors" data-testid="link-verify">Verify Product</Link></li>
              <li><Link href="/api-docs" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">API Documentation</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold mb-4 text-slate-900 dark:text-white">Company</h4>
            <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
              <li><Link href="/demo" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Request Demo</Link></li>
              <li><Link href="/auth/login" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Sign In</Link></li>
              <li><Link href="/auth/buyer-register" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Buyer Portal</Link></li>
              <li><a href="#" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Terms of Service</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-4 text-slate-900 dark:text-white">Contact</h4>
            <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
              <li>
                <a href="mailto:hello@origintrace.trade" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  hello@origintrace.trade
                </a>
              </li>
              <li>
                <a href="mailto:support@origintrace.trade" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  support@origintrace.trade
                </a>
              </li>
              <li className="text-slate-400 dark:text-slate-500 text-xs leading-relaxed pt-2">
                Serving exporters across West Africa, East Africa, Southeast Asia, and Latin America.
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-slate-200 dark:border-slate-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            &copy; 2026 OriginTrace. All rights reserved.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Trust Infrastructure for Origin-Sensitive Supply Chains
          </p>
        </div>
      </div>
    </footer>
  );
}
