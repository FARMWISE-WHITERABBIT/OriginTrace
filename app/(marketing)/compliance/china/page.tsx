import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import HeroBackground from '@/components/marketing/hero-background';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/marketing/motion';
import { FAQSchema } from '@/components/marketing/faq-schema';
import { ChinaRegulatoryTabs, ChinaFAQList } from '@/components/marketing/china-interactive';
import {
  Shield,
  FileText,
  Building2,
  ClipboardCheck,
  Search,
  Globe,
  ChevronRight,
  Tag,
  Microscope,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Lock,
  Truck,
  BookOpen,
} from 'lucide-react';

const registrationRequirements = [
  {
    title: 'Overseas Facility Registration',
    icon: Building2,
    description: 'All overseas food production, processing, and storage facilities must register with GACC before exporting to China. Decree 248 (effective Jan 2022) expanded this to cover all food categories.',
    details: [
      'Applies to all 18 categories of food products',
      'Valid for 5 years, renewable 3-6 months before expiry',
      'Facilities must meet Chinese food safety standards',
      'Some categories require competent authority recommendation',
    ],
  },
  {
    title: 'Exporter & Importer Registration',
    icon: FileText,
    description: 'Both overseas exporters and Chinese importers must be registered in the GACC system. Exporters need to be recorded in the exporting country\'s competent authority registry.',
    details: [
      'Exporters must register with home country authorities',
      'Chinese importers must hold valid import licenses',
      'Record-keeping requirements for both parties',
      'Annual compliance verification',
    ],
  },
  {
    title: 'Product Category Approvals',
    icon: ClipboardCheck,
    description: 'Certain product categories require bilateral agreements and protocols between China and the exporting country before trade can begin.',
    details: [
      'Market access protocols for meat, dairy, and aquatic products',
      'Phytosanitary certificates for plant-based products',
      'Bilateral veterinary agreements required for animal products',
      'Country-specific risk assessments may apply',
    ],
  },
];

const labelingStandards = [
  {
    title: 'Chinese Language Labels',
    icon: Tag,
    description: 'All pre-packaged foods must display Chinese-language labels compliant with GB 7718 (general foods) and GB 28050 (nutrition labeling).',
  },
  {
    title: 'Mandatory Information',
    icon: BookOpen,
    description: 'Labels must include: product name, ingredient list, net content, production date, shelf life, storage conditions, origin country, manufacturer/importer details.',
  },
  {
    title: 'Nutrition Facts Panel',
    icon: FileText,
    description: 'Required nutrition facts panel showing energy, protein, fat, carbohydrates, and sodium per 100g/100ml, compliant with GB 28050 standards.',
  },
  {
    title: 'Import-Specific Markings',
    icon: Globe,
    description: 'Imported products must display the country of origin, overseas manufacturer name, Chinese importer name, address, and contact information.',
  },
];

const inspectionProtocols = [
  {
    title: 'Pre-Arrival Documentation',
    icon: FileText,
    description: 'Submit health certificates, phytosanitary certificates, and origin certificates through the Single Window system before goods arrive at Chinese ports.',
  },
  {
    title: 'Port Inspection & Sampling',
    icon: Microscope,
    description: 'GACC conducts visual inspection, document verification, and may take samples for laboratory testing including pesticide residues, heavy metals, and microbiological analysis.',
  },
  {
    title: 'Quarantine Procedures',
    icon: AlertTriangle,
    description: 'Products from new origins or flagged shipments undergo enhanced quarantine inspection, which can include isolation storage and extended testing protocols.',
  },
  {
    title: 'Release & Clearance',
    icon: CheckCircle2,
    description: 'Upon passing inspection, goods receive a clearance certificate. Failed inspections result in treatment, re-export, or destruction at the importer\'s expense.',
  },
];

const howOriginTraceHelps = [
  {
    title: 'Documentation Vault',
    icon: Lock,
    description: 'Centralized, tamper-evident storage of all export documentation — health certificates, facility registrations, lab reports, and compliance records ready for GACC review.',
  },
  {
    title: 'Traceability Infrastructure',
    icon: Search,
    description: 'Complete chain-of-custody from farm to port, with GPS-verified origin data and batch-level tracking that satisfies Chinese traceability requirements.',
  },
  {
    title: 'Origin Verification',
    icon: Globe,
    description: 'Geospatial verification of production origins with polygon mapping, ensuring accurate origin declarations and preventing mislabeling compliance violations.',
  },
  {
    title: 'Compliance Profiles',
    icon: Shield,
    description: 'Pre-configured compliance profiles for China-bound shipments that validate documentation completeness, labeling requirements, and regulatory alignment before dispatch.',
  },
  {
    title: 'Pre-Shipment Scoring',
    icon: ClipboardCheck,
    description: 'Real-time readiness scores for China-bound shipments, identifying documentation gaps and compliance risks before goods leave your warehouse.',
  },
  {
    title: 'Shipment Tracking',
    icon: Truck,
    description: 'End-to-end shipment visibility with cold chain monitoring, transit documentation, and automated alerts for inspection scheduling at destination ports.',
  },
];

const faqItems = [
  {
    question: 'What is GACC Decree 248 and how does it affect food exporters?',
    answer: 'GACC Decree 248, effective January 1, 2022, requires all overseas food production, processing, and storage facilities to register with China\'s General Administration of Customs before exporting food products to China. This expanded previous requirements to cover all 18 categories of food products, not just high-risk categories. Registration is valid for 5 years and must be renewed 3-6 months before expiry.',
  },
  {
    question: 'Which food products require facility registration with GACC?',
    answer: 'All 18 categories of food products now require GACC facility registration, including meat and meat products, aquatic products, dairy products, bird\'s nest and related products, bee products, eggs, edible oils and fats, cereals, flour products, fresh and dried fruits and vegetables, seasonings, nuts and seeds, dried beans, spices, beverages, and alcoholic beverages. Some categories require recommendation from the exporting country\'s competent authority.',
  },
  {
    question: 'What labeling requirements apply to food imported into China?',
    answer: 'Imported foods must comply with GB 7718 (general pre-packaged food labeling) and GB 28050 (nutrition labeling). Labels must be in Chinese and include product name, ingredient list, net content, production date, shelf life, storage conditions, country of origin, and Chinese importer details. A nutrition facts panel showing energy, protein, fat, carbohydrates, and sodium is mandatory.',
  },
  {
    question: 'How long does the GACC registration process take?',
    answer: 'The timeline varies by product category. For products requiring competent authority recommendation, the process typically takes 3-6 months including review periods. For self-registered categories (e.g., grains, oils, dried fruits), registration can be completed in 1-3 months. It is advisable to begin the process well in advance of planned shipments.',
  },
  {
    question: 'What happens if a shipment fails inspection at a Chinese port?',
    answer: 'Failed inspections can result in several outcomes: the goods may be treated or reprocessed to meet standards, returned to the country of origin at the importer\'s expense, or destroyed. Repeated failures can trigger enhanced inspection rates for future shipments from the same facility or exporter, and in severe cases, the facility\'s GACC registration may be suspended or revoked.',
  },
  {
    question: 'Does China require traceability documentation for imported food?',
    answer: 'Yes. China\'s Food Safety Law requires importers to maintain records of the origin, inspection and quarantine certificates, purchase and sale records, and delivery records for imported foods. These records must be retained for at least 6 months beyond the shelf life of the product, or at least 2 years for products without a specified shelf life. OriginTrace automates this traceability documentation.',
  },
  {
    question: 'How does OriginTrace help with China food import compliance?',
    answer: 'OriginTrace provides a comprehensive compliance platform that centralizes documentation management, automates traceability from farm to port, verifies product origins with GPS data, and scores shipment readiness before dispatch. The platform maintains audit-ready documentation vaults, generates compliance reports aligned with GACC requirements, and provides real-time alerts for documentation gaps or regulatory changes.',
  },
  {
    question: 'Are there specific requirements for agricultural commodities like cocoa or coffee?',
    answer: 'Yes. Agricultural commodities are subject to phytosanitary requirements, pesticide residue limits (per GB 2763), and may require specific bilateral protocols between China and the exporting country. Products must meet maximum residue limits (MRLs) for pesticides and contaminants as defined by Chinese national standards. OriginTrace tracks these commodity-specific requirements and validates compliance before shipment.',
  },
];

export default function ChinaCompliancePage() {
  return (
    <>
      <MarketingNav />

      <FAQSchema faqs={faqItems} />
      <main className="min-h-screen">
        <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden" data-testid="section-hero">
          <HeroBackground />
          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <FadeIn>
              <div className="text-center max-w-4xl mx-auto">
                <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-emerald-600 dark:text-emerald-400 mb-6" data-testid="text-section-label-hero">
                  [ China Import Compliance ]
                </span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6" data-testid="text-hero-heading">
                  China Food Safety Import Requirements
                </h1>
                <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl mx-auto mb-8" data-testid="text-hero-description">
                  China maintains one of the world&apos;s most rigorous food import regulatory frameworks. GACC, SAMR, and NHC collectively enforce facility registration, labeling standards, and inspection protocols that every exporter must navigate.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link href="/demo">
                    <Button className="bg-emerald-600 text-white" data-testid="button-hero-demo">
                      Get Compliance Support
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/solutions">
                    <Button variant="outline" data-testid="button-hero-solutions">
                      Explore Platform
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        <section className="py-16 md:py-20 border-t border-slate-200 dark:border-slate-800" data-testid="section-regulatory-bodies">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn>
              <div className="text-center mb-10">
                <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-emerald-600 dark:text-emerald-400 mb-4">
                  [ Regulatory Bodies ]
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
                  Three Agencies Governing Food Imports
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                  China&apos;s food import regime is overseen by GACC, SAMR, and NHC — each responsible for different aspects of food safety and market access.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.1}>
              <ChinaRegulatoryTabs />
            </FadeIn>
          </div>
        </section>

        <section className="py-16 md:py-20 bg-slate-50 dark:bg-slate-900/20 border-t border-slate-200 dark:border-slate-800" data-testid="section-registration">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn>
              <div className="text-center mb-16">
                <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-emerald-600 dark:text-emerald-400 mb-4">
                  [ Registration Requirements ]
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
                  Facility & Exporter Registration with GACC
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                  GACC Decree 248 requires all overseas food facilities to register before exporting to China — covering all 18 food product categories.
                </p>
              </div>
            </FadeIn>

            <StaggerContainer className="grid md:grid-cols-3 gap-6">
              {registrationRequirements.map((req) => (
                <StaggerItem key={req.title}>
                  <Card className="h-full" data-testid={`card-registration-${req.title.toLowerCase().replace(/\s+/g, '-')}`}>
                    <CardContent className="p-6">
                      <div className="w-10 h-10 rounded-md bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                        <req.icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{req.title}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                        {req.description}
                      </p>
                      <ul className="space-y-2">
                        {req.details.map((detail, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        <section className="py-16 md:py-20 border-t border-slate-200 dark:border-slate-800" data-testid="section-labeling">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn>
              <div className="text-center mb-16">
                <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-emerald-600 dark:text-emerald-400 mb-4">
                  [ Labeling & Packaging ]
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
                  Labeling and Packaging Standards
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                  China enforces strict Chinese-language labeling requirements under GB 7718 and GB 28050 — non-compliant labels are the leading cause of import rejections.
                </p>
              </div>
            </FadeIn>

            <StaggerContainer className="grid md:grid-cols-2 gap-6">
              {labelingStandards.map((standard) => (
                <StaggerItem key={standard.title}>
                  <Card className="h-full" data-testid={`card-labeling-${standard.title.toLowerCase().replace(/\s+/g, '-')}`}>
                    <CardContent className="p-6 flex items-start gap-4">
                      <div className="w-10 h-10 rounded-md bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                        <standard.icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{standard.title}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                          {standard.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        <section className="py-16 md:py-20 bg-slate-50 dark:bg-slate-900/20 border-t border-slate-200 dark:border-slate-800" data-testid="section-inspection">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn>
              <div className="mb-12">
                <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-emerald-600 dark:text-emerald-400 mb-4">
                  [ Inspection & Quarantine ]
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
                  Port Inspection and Quarantine Protocols
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl">
                  Every food shipment entering China undergoes GACC inspection. Understanding the process helps you prepare documentation and reduce clearance delays.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.1}>
              <div className="max-w-3xl">
                {inspectionProtocols.map((protocol, index) => (
                  <div key={protocol.title} className="flex gap-5 pb-8 last:pb-0" data-testid={`card-inspection-${index}`}>
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                        {index + 1}
                      </div>
                      {index < inspectionProtocols.length - 1 && (
                        <div className="w-px flex-1 bg-emerald-200 dark:bg-emerald-800 mt-3" />
                      )}
                    </div>
                    <div className="pt-1 pb-2">
                      <div className="flex items-center gap-2 mb-2">
                        <protocol.icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">{protocol.title}</h3>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        {protocol.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </section>

        <section className="py-16 md:py-20 border-t border-slate-200 dark:border-slate-800" data-testid="section-how-origintrace-helps">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn>
              <div className="text-center mb-16">
                <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-emerald-600 dark:text-emerald-400 mb-4">
                  [ How OriginTrace Helps ]
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
                  Streamline China Import Compliance
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                  OriginTrace provides the documentation, traceability, and origin verification infrastructure you need to meet GACC requirements and clear Chinese port inspections.
                </p>
              </div>
            </FadeIn>

            <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {howOriginTraceHelps.map((item) => (
                <StaggerItem key={item.title}>
                  <Card className="h-full" data-testid={`card-help-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                    <CardContent className="p-6">
                      <div className="w-10 h-10 rounded-md bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                        <item.icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">{item.title}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        {item.description}
                      </p>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>

            <FadeIn delay={0.3}>
              <div className="text-center mt-12">
                <Link href="/demo">
                  <Button className="bg-emerald-600 text-white" data-testid="button-help-demo">
                    See How It Works
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>

        <section className="py-16 md:py-20 bg-slate-50 dark:bg-slate-900/20 border-t border-slate-200 dark:border-slate-800" data-testid="section-faq">
          <div className="max-w-4xl mx-auto px-6">
            <FadeIn>
              <div className="text-center mb-16">
                <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-emerald-600 dark:text-emerald-400 mb-4">
                  [ FAQ ]
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
                  Frequently Asked Questions
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                  Common questions about exporting food products to China and navigating GACC, SAMR, and NHC requirements.
                </p>
              </div>
            </FadeIn>

            <ChinaFAQList items={faqItems} />
          </div>
        </section>

        <section className="py-16 md:py-20 bg-slate-900 dark:bg-slate-950 border-t border-slate-800" data-testid="section-cta">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <FadeIn>
              <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-emerald-400 mb-6">
                [ Get Started ]
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-6">
                Ready to Export to China with Confidence?
              </h2>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8 leading-relaxed">
                OriginTrace helps exporters navigate China&apos;s complex food import regulations with automated documentation, traceability infrastructure, and pre-shipment compliance scoring.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/demo">
                  <Button className="bg-emerald-600 text-white" data-testid="button-cta-demo">
                    Request a Demo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/compliance">
                  <Button variant="outline" className="border-slate-600 text-slate-300" data-testid="button-cta-compliance">
                    View All Regulations
                    <ChevronRight className="ml-1 h-4 w-4" />
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
