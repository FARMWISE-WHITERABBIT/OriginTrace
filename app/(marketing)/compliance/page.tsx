import Link from 'next/link';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/marketing/motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Globe, Shield, FileCheck, Scale, Landmark } from 'lucide-react';

const regulations = [
  {
    href: '/compliance/eudr',
    icon: Globe,
    flag: '🇪🇺',
    title: 'EU Deforestation Regulation (EUDR)',
    description: 'Zero-deforestation supply chains for 7 commodities entering the EU market. Requires GPS polygon mapping, due diligence statements, and deforestation-free proof.',
    deadline: 'Dec 30, 2026',
    status: 'Enforcement approaching',
    statusColor: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
    commodities: ['Cocoa', 'Coffee', 'Soy', 'Palm Oil', 'Rubber', 'Cattle', 'Wood'],
  },
  {
    href: '/compliance/usa',
    icon: FileCheck,
    flag: '🇺🇸',
    title: 'FSMA 204 Food Traceability Rule (USA)',
    description: 'FDA\'s traceability requirements for high-risk foods. Mandates Key Data Elements (KDEs), Critical Tracking Events (CTEs), and lot-level recordkeeping.',
    deadline: 'July 20, 2028',
    status: 'Extended deadline',
    statusColor: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
    commodities: ['Fresh Produce', 'Seafood', 'Cheese', 'Eggs', 'Nut Butter', 'Herbs'],
  },
  {
    href: '/compliance/uk',
    icon: Shield,
    flag: '🇬🇧',
    title: 'UK Environment Act — Forest Risk Commodities',
    description: 'Due diligence obligations for large businesses using forest risk commodities. £50M+ turnover threshold with annual reporting requirements.',
    deadline: 'TBD (Pending)',
    status: 'Secondary legislation pending',
    statusColor: 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50',
    commodities: ['Cocoa', 'Palm Oil', 'Soy', 'Beef', 'Rubber', 'Coffee', 'Wood'],
  },
  {
    href: '/compliance/china',
    icon: Landmark,
    flag: '🇨🇳',
    title: 'China Food Safety Import Requirements',
    description: 'GACC facility registration (Decree 248), SAMR labeling standards, inspection & quarantine protocols, and product category approvals for food imports.',
    deadline: 'Active',
    status: 'Currently enforced',
    statusColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
    commodities: ['Meat', 'Dairy', 'Grains', 'Seafood', 'Fruits', 'Nuts'],
  },
  {
    href: '/compliance/uae',
    icon: Scale,
    flag: '🇦🇪',
    title: 'UAE Food Safety & Import Compliance',
    description: 'ESMA standards, mandatory Halal certification, municipality import permits, Arabic labeling requirements, and origin declaration for food products.',
    deadline: 'Active',
    status: 'Currently enforced',
    statusColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
    commodities: ['All Food Products', 'Meat (Halal)', 'Dairy', 'Processed Foods'],
  },
];

export default function ComplianceHubPage() {
  return (
    <>
<MarketingNav />
      <main className="min-h-screen bg-background">
        <section className="pt-28 pb-20 md:pt-36 md:pb-28 text-center">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn>
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]" data-testid="label-compliance-hub">[ Global Compliance ]</span>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1] mt-4 mb-6 text-slate-900 dark:text-white" data-testid="text-compliance-headline">
                One Platform, Every Market
              </h1>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto mb-6">
                OriginTrace provides compliance infrastructure for the world&apos;s most demanding 
                import regulations — from EU deforestation rules to FDA food traceability and beyond.
              </p>
            </FadeIn>
            <FadeIn delay={0.3}>
              <p className="text-sm text-slate-500 dark:text-slate-500 max-w-xl mx-auto">
                Select a regulation below to learn how OriginTrace helps you comply.
              </p>
            </FadeIn>
          </div>
        </section>

        <section className="pb-20 md:pb-28">
          <div className="max-w-5xl mx-auto px-6">
            <StaggerContainer className="space-y-6">
              {regulations.map((reg) => {
                const Icon = reg.icon;
                return (
                  <StaggerItem key={reg.href}>
                    <Link href={reg.href} className="block group" data-testid={`card-regulation-${reg.href.split('/').pop()}`}>
                      <Card className="transition-all duration-200 hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800">
                        <CardContent className="p-6 md:p-8">
                          <div className="flex flex-col md:flex-row md:items-start gap-6">
                            <div className="flex items-center gap-4 shrink-0">
                              <span className="text-3xl">{reg.flag}</span>
                              <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                                <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" data-testid={`text-regulation-title-${reg.href.split('/').pop()}`}>
                                  {reg.title}
                                </h2>
                                <span className={`text-xs font-medium px-2.5 py-1 rounded-full w-fit ${reg.statusColor}`}>
                                  {reg.status}
                                </span>
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                                {reg.description}
                              </p>
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="text-xs text-slate-500 dark:text-slate-500 font-medium">
                                  Deadline: {reg.deadline}
                                </span>
                                <span className="text-slate-300 dark:text-slate-700">·</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {reg.commodities.slice(0, 5).map((c) => (
                                    <span key={c} className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                      {c}
                                    </span>
                                  ))}
                                  {reg.commodities.length > 5 && (
                                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                      +{reg.commodities.length - 5} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="hidden md:flex items-center">
                              <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          </div>
        </section>

        <section className="py-20 md:py-28 bg-slate-50/80 dark:bg-slate-900/30 border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <FadeIn>
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 block">[ Get Started ]</span>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-slate-900 dark:text-white" data-testid="text-compliance-cta-headline">
                Not sure which regulations apply to you?
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-lg mx-auto">
                Our team will help you map your export destinations to the right compliance framework 
                — and show you how OriginTrace covers all of them from a single platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/demo">
                  <Button size="lg" className="bg-emerald-600 text-white" data-testid="button-compliance-cta-demo">
                    Request Demo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="outline" size="lg" data-testid="button-compliance-cta-explore">
                    Explore Platform
                  </Button>
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
