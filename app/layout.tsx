import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/lib/contexts/theme-context';
import { OrgProvider } from '@/lib/contexts/org-context';
import { Toaster } from '@/components/ui/toaster';
import { LocaleProvider } from '@/lib/i18n/locale-provider';

const inter = Inter({ subsets: ['latin'] });
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://origintrace.trade'),
  title: 'OriginTrace — Trust Infrastructure for Origin-Sensitive Supply Chains',
  description: 'OriginTrace is the all-in-one platform for supply chain traceability, compliance verification, and export readiness. Prevent shipment rejections with pre-shipment compliance scoring.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'OriginTrace',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: 'OriginTrace — Trust Infrastructure for Origin-Sensitive Supply Chains',
    description: 'The all-in-one platform for supply chain traceability, compliance verification, and export readiness.',
    siteName: 'OriginTrace',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OriginTrace — Trust Infrastructure for Origin-Sensitive Supply Chains',
    description: 'The all-in-one platform for supply chain traceability, compliance verification, and export readiness.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#2E7D6B',
};
import QueryProvider from '@/components/providers/query-provider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={`${inter.className} ${jetbrainsMono.variable}`} suppressHydrationWarning>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('origintrace-theme');if(t==='dark'){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
        <QueryProvider>
          <ThemeProvider>
            <LocaleProvider>
              <OrgProvider>
                {children}
                <Toaster />
              </OrgProvider>
            </LocaleProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
