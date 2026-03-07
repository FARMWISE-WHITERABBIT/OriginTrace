import Link from 'next/link';
import Image from 'next/image';

export function MarketingFooter() {
  return (
    <footer className="border-t bg-muted/20">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <Image 
              src="/images/logo-green.png" 
              alt="OriginTrace" 
              width={100} 
              height={28}
              className="dark:hidden mb-4"
              style={{ width: 'auto', height: '24px' }}
            />
            <Image 
              src="/images/logo-white.png" 
              alt="OriginTrace" 
              width={100} 
              height={28}
              className="hidden dark:block mb-4"
              style={{ width: 'auto', height: '24px' }}
            />
            <p className="text-sm text-muted-foreground max-w-xs">
              Trust infrastructure for origin-sensitive supply chains — helping exporters across agriculture, timber, minerals, and seafood meet EUDR, FSMA 204, UK Environment Act, and buyer-driven compliance requirements.
            </p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/solutions" className="hover:text-foreground transition-colors">Solutions</Link></li>
              <li><Link href="/pedigree" className="hover:text-foreground transition-colors">Pedigree</Link></li>
              <li><Link href="/processors" className="hover:text-foreground transition-colors">For Processors</Link></li>
              <li><Link href="/verify" className="hover:text-foreground transition-colors" data-testid="link-verify">Verify Product</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-sm font-medium mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/demo" className="hover:text-foreground transition-colors">Request Demo</Link></li>
              <li><Link href="/auth/login" className="hover:text-foreground transition-colors">Sign In</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; 2026 OriginTrace. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Trust Infrastructure for Origin-Sensitive Supply Chains
          </p>
        </div>
      </div>
    </footer>
  );
}
