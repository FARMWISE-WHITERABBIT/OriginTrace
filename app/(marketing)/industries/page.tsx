import Link from 'next/link';
import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/marketing/motion';
import { ChevronRight, TreePine, Wheat, Gem, Shirt } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Industries — Supply Chain Traceability by Sector',
  description: 'OriginTrace serves exporters and processors across agriculture, timber, minerals, and textiles. See how supply chain traceability and compliance works for your industry.',
  alternates: { canonical: 'https://origintrace.trade/industries' },
};

const industries = [
  {
    href: '/industries/agriculture',
    icon: Wheat,
    title: 'Agriculture',
    description: 'Farm-level GPS traceability, EUDR compliance, and export documentation for cocoa, coffee, ginger, sesame, soy, and other agricultural commodities.',
    gradient: 'from-emerald-900/20 to-slate-800/50',
    tags: ['EUDR', 'GACC', 'FSMA 204', 'GPS Mapping'],
  },
  {
    href: '/industries/timber',
    icon: TreePine,
    title: 'Timber & Wood',
    description: 'Species identification, chain of custody documentation, and deforestation verification for timber and wood products entering the EU and US markets.',
    gradient: 'from-amber-900/20 to-slate-800/50',
    tags: ['EUDR', 'FLEGT', 'Lacey Act', 'Chain of Custody'],
  },
  {
    href: '/industries/minerals',
    icon: Gem,
    title: 'Minerals',
    description: 'Conflict minerals documentation, responsible sourcing verification, and supply chain traceability for mining operations and mineral exporters.',
    gradient: 'from-slate-700/30 to-slate-900/50',
    tags: ['OECD Guidelines', 'Responsible Sourcing', 'Traceability'],
  },
  {
    href: '/industries/textiles',
    icon: Shirt,
    title: 'Textiles',
    description: 'Fibre origin traceability, forced labour compliance, and supply chain transparency for textile exporters and manufacturers supplying global brands.',
    gradient: 'from-violet-900/20 to-slate-800/50',
    tags: ['UFLPA', 'CS3D', 'Forced Labour', 'Origin Verification'],
  },
];

export default function IndustriesPage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <MarketingNav />

      <main className="pt-24 pb-20 md:pb-28">
        {/* Hero */}
        <section className="py-10 sm:py-16 md:py-24 border-b border-slate-100 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <FadeIn>
              <div className="max-w-2xl">
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 block">
                  [ Industries ]
                </span>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-5">
                  Built for Origin-Sensitive Supply Chains
                </h1>
                <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
                  Every industry has its own compliance landscape. OriginTrace is configured for the specific regulations, data requirements, and market expectations of each sector.
                </p>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* Industry cards */}
        <section className="py-10 sm:py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <StaggerContainer className="grid sm:grid-cols-2 gap-5 sm:gap-6">
              {industries.map((industry) => (
                <StaggerItem key={industry.href}>
                  <Link href={industry.href} className="group block h-full">
                    <Card className="h-full overflow-hidden border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-lg transition-all">
                      <div className={`h-40 bg-gradient-to-br ${industry.gradient} flex items-center justify-center`}>
                        <industry.icon className="h-12 w-12 text-white/10" />
                      </div>
                      <CardContent className="p-6">
                        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-3 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {industry.title}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                          {industry.description}
                        </p>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {industry.tags.map(tag => (
                            <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 group-hover:gap-2 transition-all">
                          Learn more <ChevronRight className="h-4 w-4" />
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-8">
          <FadeIn>
            <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-slate-50 dark:from-emerald-950/30 dark:to-slate-900/30 border border-emerald-100 dark:border-emerald-900/50 p-6 sm:p-8 md:p-12 text-center">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white mb-4">
                Don't see your exact sector?
              </h2>
              <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-lg mx-auto mb-6 sm:mb-8">
                If your business exports agricultural or natural resource commodities, OriginTrace can be configured for your supply chain. Talk to our team.
              </p>
              <Link href="/demo">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-8">
                  Request a Demo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </FadeIn>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
