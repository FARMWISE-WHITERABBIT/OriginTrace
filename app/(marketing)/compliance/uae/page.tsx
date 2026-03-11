import { CardFAQList } from '@/components/marketing/faq-accordion';
import Link from 'next/link';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/marketing/motion';
import { FAQSchema } from '@/components/marketing/faq-schema';
import HeroBackground from '@/components/marketing/hero-background';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Shield,
  FileCheck,
  Globe,
  ChevronDown,
  CheckCircle2,
  ArrowRight,
  Building2,
  Languages,
  Award,
  ClipboardCheck,
  FileText,
  Lock,
  Landmark,
  Search,
} from 'lucide-react';

const esmaStandards = [
  {
    title: 'Emirates Authority for Standardization & Metrology (ESMA)',
    description: 'ESMA sets the mandatory national standards for imported food products, covering safety, labeling, and quality benchmarks aligned with Gulf Standards Organization (GSO) requirements.',
    icon: Shield,
  },
  {
    title: 'Municipality Import Permits',
    description: 'Each emirate\'s municipality (e.g., Dubai Municipality, Abu Dhabi Agriculture & Food Safety Authority) issues import permits and conducts port inspections for food safety compliance.',
    icon: Landmark,
  },
  {
    title: 'Ministry of Climate Change & Environment (MOCCAE)',
    description: 'MOCCAE oversees phytosanitary and veterinary import requirements, issuing import permits for plant and animal products entering the UAE.',
    icon: Globe,
  },
];

const halalRequirements = [
  {
    title: 'Mandatory Halal Certification',
    description: 'All meat, poultry, and related products must carry halal certification from a UAE-recognized accreditation body. Certificates must be authenticated by the UAE embassy in the country of origin.',
  },
  {
    title: 'Accredited Certification Bodies',
    description: 'Halal certificates must be issued by bodies accredited by the Emirates International Accreditation Centre (EIAC) or recognized under ESMA\'s approved list.',
  },
  {
    title: 'Slaughter & Processing Standards',
    description: 'Halal slaughter methods must comply with UAE.S GSO 993 and UAE.S 2055 standards, with full documentation of slaughter processes and supervision records.',
  },
  {
    title: 'Supply Chain Integrity',
    description: 'Halal products must maintain segregation from non-halal items throughout the supply chain — from processing, storage, and transport to final delivery.',
  },
];

const labelingRequirements = [
  {
    title: 'Arabic Language Labeling',
    description: 'All food labels must include Arabic text. Product name, ingredients, nutritional information, allergen warnings, and country of origin must be displayed in Arabic alongside English or other languages.',
  },
  {
    title: 'Nutritional Information Panel',
    description: 'Labels must display energy (kcal/kJ), protein, total fat, saturated fat, carbohydrates, sugars, sodium/salt per 100g or per serving, following GSO 2233 standard format.',
  },
  {
    title: 'Country of Origin & Manufacturer',
    description: 'Clear declaration of the country of origin, manufacturer name and address, importer details, and UAE agent information is mandatory on all imported food products.',
  },
  {
    title: 'Expiry Date & Storage Conditions',
    description: 'Production date, expiry date (or best-before date), batch/lot number, and storage instructions must be clearly printed. Dates must follow the DD/MM/YYYY format.',
  },
];

const municipalityPermits = [
  {
    step: '01',
    title: 'Importer Registration',
    description: 'Register with the relevant emirate\'s municipality food control department. Obtain a valid trade license with food import activity codes.',
  },
  {
    step: '02',
    title: 'Product Registration',
    description: 'Submit product details, lab analysis certificates, and sample labels for pre-approval. Each product SKU must be registered before the first import shipment.',
  },
  {
    step: '03',
    title: 'Import Permit Application',
    description: 'Apply for an import permit (No Objection Certificate) for each shipment, specifying product type, quantity, origin country, and vessel details.',
  },
  {
    step: '04',
    title: 'Port Inspection & Release',
    description: 'Shipments undergo document verification, visual inspection, and random laboratory testing at port. Products meeting all requirements receive a release certificate.',
  },
];

const howOriginTraceHelps = [
  {
    title: 'Documentation Vault',
    description: 'Centralized, tamper-evident storage for halal certificates, health certificates, lab analysis reports, phytosanitary certificates, and commercial invoices — all accessible instantly during port inspections.',
    icon: FileText,
  },
  {
    title: 'Compliance Profiles',
    description: 'Pre-configured UAE compliance profiles that automatically check your shipment documentation against ESMA standards, halal requirements, and municipality-specific rules before dispatch.',
    icon: ClipboardCheck,
  },
  {
    title: 'Origin Traceability',
    description: 'End-to-end supply chain traceability from farm to port, with GPS-verified sourcing data, processing records, and chain-of-custody documentation that satisfies UAE import authority requirements.',
    icon: Search,
  },
  {
    title: 'Arabic Label Generation',
    description: 'Generate compliant Arabic-language labels with proper nutritional panels, ingredient lists, and regulatory declarations formatted to GSO and ESMA labeling standards.',
    icon: Languages,
  },
  {
    title: 'Halal Chain-of-Custody',
    description: 'Track halal certification status across the entire supply chain, ensuring segregation compliance and maintaining an auditable trail from certified slaughterhouse to UAE port of entry.',
    icon: Award,
  },
  {
    title: 'Pre-Shipment Compliance Scoring',
    description: 'Automated compliance scoring evaluates every shipment against UAE import requirements before cargo leaves origin — preventing costly rejections and demurrage charges at UAE ports.',
    icon: Shield,
  },
];

const faqs = [
  {
    question: 'What food products require halal certification for UAE import?',
    answer: 'All meat, poultry, and their derivatives require mandatory halal certification from a UAE-recognized accreditation body. This includes fresh, frozen, and processed meat products. While non-meat food products don\'t require halal certification by law, having certification can significantly improve market acceptance and retailer willingness to stock products.',
  },
  {
    question: 'Which regulatory body oversees food imports into the UAE?',
    answer: 'Food imports are regulated by multiple authorities. ESMA (Emirates Authority for Standardization & Metrology) sets national standards. Each emirate\'s municipality handles import permits and inspections — Dubai Municipality, Abu Dhabi\'s ADAFSA, and Sharjah Municipality are the largest. MOCCAE oversees phytosanitary and veterinary permits. Exporters must comply with all relevant authorities based on the port of entry.',
  },
  {
    question: 'Is Arabic labeling mandatory for all food products imported into the UAE?',
    answer: 'Yes. UAE Federal Law and GSO standards require that all food product labels include Arabic text for the product name, ingredients list, nutritional information, allergen declarations, country of origin, manufacturer details, production and expiry dates, and storage conditions. Labels can be bilingual (Arabic + English) but Arabic is mandatory.',
  },
  {
    question: 'What is the process for registering a food product for UAE import?',
    answer: 'The process involves: (1) obtaining a UAE trade license with food import activity, (2) registering with the relevant municipality\'s food control department, (3) submitting product details and lab certificates for pre-approval, (4) applying for an import permit (NOC) for each shipment, and (5) passing port inspection upon arrival. Processing times vary by emirate but typically take 5-15 business days for initial registration.',
  },
  {
    question: 'What laboratory certificates are required for food imports?',
    answer: 'Required certificates vary by product type but commonly include: microbiological analysis, chemical contaminant analysis (heavy metals, pesticide residues), nutritional composition analysis, and product-specific tests (e.g., aflatoxin levels for nuts and grains). Certificates must be from accredited laboratories and typically must be dated within 6 months of the shipment date.',
  },
  {
    question: 'How does OriginTrace help exporters comply with UAE food import regulations?',
    answer: 'OriginTrace provides a centralized compliance platform that stores all required documentation (halal certificates, health certificates, lab reports), runs automated pre-shipment compliance checks against UAE/ESMA standards, generates Arabic-compliant labels, tracks halal chain-of-custody, and provides a compliance score before cargo ships — reducing the risk of port rejections and associated costs.',
  },
  {
    question: 'Are there specific packaging requirements for the UAE market?',
    answer: 'Yes. Packaging must protect product integrity during transport in high-temperature conditions common in the UAE. Materials must be food-grade and free from banned substances. Packaging for meat products must clearly indicate halal status. Additionally, products containing pork or alcohol derivatives must have prominent warning labels, and GMO-containing products require specific declarations.',
  },
  {
    question: 'What happens if a food shipment is rejected at a UAE port?',
    answer: 'Rejected shipments may be re-exported at the importer\'s expense, destroyed (if deemed unsafe), or held for re-testing/re-labeling if deficiencies are minor and correctable. Rejections incur significant costs including demurrage, storage fees, re-export shipping, and potential blacklisting of the product or exporter. OriginTrace\'s pre-shipment compliance scoring is specifically designed to prevent these costly outcomes.',
  },
];

export default function UAECompliancePage() {

  return (
    <>
      <MarketingNav />

      <FAQSchema faqs={faqs} />
      <main className="min-h-screen">
        <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden" data-testid="section-hero">
          <HeroBackground />
          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <FadeIn>
              <div className="text-center max-w-4xl mx-auto">
                <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-emerald-600 dark:text-emerald-400 mb-6" data-testid="text-section-label-hero">
                  [ UAE Compliance ]
                </span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6" data-testid="text-hero-title">
                  UAE Food Safety &amp; Import Compliance
                </h1>
                <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl mx-auto mb-4" data-testid="text-hero-subtitle">
                  The UAE is one of the world&apos;s largest food importers, sourcing over 90% of its food supply internationally. Meeting ESMA standards, halal requirements, and municipality-level regulations is essential for market access.
                </p>
                <p className="text-base text-slate-500 dark:text-slate-500 max-w-2xl mx-auto mb-10">
                  OriginTrace streamlines UAE import compliance with automated documentation management, pre-shipment compliance scoring, and end-to-end traceability.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link href="/demo">
                    <Button className="bg-emerald-600 text-white" data-testid="button-hero-demo">
                      Request Demo
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/solutions">
                    <Button variant="outline" data-testid="button-hero-solutions">
                      Explore Platform
                    </Button>
                  </Link>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        <section className="py-16 md:py-20 border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn>
              <div className="mb-12">
                <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-emerald-600 dark:text-emerald-400 mb-4" data-testid="text-section-label-halal">
                  [ Halal Certification ]
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4" data-testid="text-halal-title">
                  Halal Certification Requirements
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                  Halal compliance is a cornerstone of UAE food import regulations. Understanding and meeting these requirements is critical for market access.
                </p>
              </div>
            </FadeIn>

            <div className="grid lg:grid-cols-2 gap-8 items-start">
              <FadeIn direction="left">
                <div className="rounded-md bg-emerald-900 dark:bg-emerald-950 p-8 text-white relative overflow-visible" data-testid="card-halal-visual">
                  <div className="absolute top-4 right-4">
                    <Award className="h-20 w-20 text-emerald-500/15" />
                  </div>
                  <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-6">
                      <Award className="h-3.5 w-3.5" />
                      Halal Certified
                    </div>
                    <h3 className="text-2xl font-extrabold mb-4">Halal Compliance is Mandatory</h3>
                    <p className="text-emerald-200 text-sm leading-relaxed mb-6">
                      All meat, poultry, and related products entering the UAE must carry halal certification from a recognized accreditation body. This is non-negotiable for market access.
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span className="text-emerald-100">UAE embassy authentication required</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span className="text-emerald-100">EIAC-accredited certification bodies</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span className="text-emerald-100">Full supply chain segregation</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span className="text-emerald-100">UAE.S GSO 993 slaughter compliance</span>
                      </div>
                    </div>
                  </div>
                </div>
              </FadeIn>

              <StaggerContainer className="space-y-4">
                {halalRequirements.map((req, index) => (
                  <StaggerItem key={req.title}>
                    <div className="flex gap-4 p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950" data-testid={`card-halal-${index}`}>
                      <div className="shrink-0">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">{req.title}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{req.description}</p>
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20 bg-slate-50 dark:bg-slate-900/20 border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn>
              <div className="text-center mb-16">
                <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-emerald-600 dark:text-emerald-400 mb-4" data-testid="text-section-label-esma">
                  [ Regulatory Framework ]
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4" data-testid="text-esma-title">
                  UAE Food Import Regulatory Bodies
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                  Multiple federal and municipal authorities govern food imports into the UAE, each with specific requirements exporters must satisfy.
                </p>
              </div>
            </FadeIn>
            <StaggerContainer className="grid md:grid-cols-3 gap-8">
              {esmaStandards.map((item) => (
                <StaggerItem key={item.title}>
                  <Card className="h-full" data-testid={`card-regulatory-${item.title.toLowerCase().replace(/\s+/g, '-').slice(0, 20)}`}>
                    <CardContent className="p-8">
                      <div className="w-12 h-12 rounded-md bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-5">
                        <item.icon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">{item.title}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{item.description}</p>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        <section className="py-16 md:py-20 border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn>
              <div className="mb-12">
                <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-emerald-600 dark:text-emerald-400 mb-4" data-testid="text-section-label-labeling">
                  [ Labeling Standards ]
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4" data-testid="text-labeling-title">
                  Labeling Requirements (Arabic)
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                  UAE labeling standards, aligned with GSO requirements, mandate Arabic-language labels with comprehensive product information.
                </p>
              </div>
            </FadeIn>

            <div className="grid lg:grid-cols-2 gap-8 items-start">
              <StaggerContainer className="space-y-4">
                {labelingRequirements.map((req, index) => (
                  <StaggerItem key={req.title}>
                    <div className="flex gap-4 p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950" data-testid={`card-labeling-${index}`}>
                      <div className="shrink-0">
                        <Languages className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">{req.title}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{req.description}</p>
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>

              <FadeIn direction="right">
                <Card className="border-2 border-dashed border-slate-300 dark:border-slate-600" data-testid="card-label-example">
                  <CardContent className="p-6">
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-4">Label Example — Bilingual Format</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">English</p>
                        <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                          <p><span className="font-semibold">Product:</span> Roasted Coffee</p>
                          <p><span className="font-semibold">Origin:</span> Ethiopia</p>
                          <p><span className="font-semibold">Net Wt:</span> 250g</p>
                          <p><span className="font-semibold">Exp:</span> 15/03/2026</p>
                          <p><span className="font-semibold">Lot:</span> OT-2025-0847</p>
                          <p><span className="font-semibold">Importer:</span> UAE Foods LLC</p>
                        </div>
                      </div>
                      <div className="text-right" dir="rtl">
                        <p className="text-xs text-slate-400 uppercase tracking-wide mb-2" dir="ltr">Arabic</p>
                        <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                          <p>&#1602;&#1607;&#1608;&#1577; &#1605;&#1581;&#1605;&#1589;&#1577;</p>
                          <p>&#1573;&#1579;&#1610;&#1608;&#1576;&#1610;&#1575;</p>
                          <p>&#1634;&#1637;&#1632; &#1580;&#1585;&#1575;&#1605;</p>
                          <p>&#1633;&#1637;/&#1632;&#1635;/&#1634;&#1632;&#1634;&#1638;</p>
                          <p>OT-2025-0847</p>
                          <p>&#1588;&#1585;&#1603;&#1577; &#1575;&#1604;&#1571;&#1594;&#1584;&#1610;&#1577; &#1575;&#1604;&#1573;&#1605;&#1575;&#1585;&#1575;&#1578;&#1610;&#1577;</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        DD/MM/YYYY date format required. All mandatory fields must appear in both Arabic and English.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </FadeIn>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20 bg-slate-50 dark:bg-slate-900/20 border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn>
              <div className="text-center mb-16">
                <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-emerald-600 dark:text-emerald-400 mb-4" data-testid="text-section-label-permits">
                  [ Import Process ]
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4" data-testid="text-permits-title">
                  Municipality Import Permits
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                  Each emirate manages food import permits through its municipal authority. Here is the typical process for importing food products into the UAE.
                </p>
              </div>
            </FadeIn>
            <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {municipalityPermits.map((permit) => (
                <StaggerItem key={permit.step}>
                  <Card className="h-full" data-testid={`card-permit-step-${permit.step}`}>
                    <CardContent className="p-6">
                      <span className="text-3xl font-extrabold text-emerald-600/20 dark:text-emerald-400/20 block mb-3">
                        {permit.step}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">{permit.title}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{permit.description}</p>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        <section className="py-16 md:py-20 border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn>
              <div className="text-center mb-16">
                <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-emerald-600 dark:text-emerald-400 mb-4" data-testid="text-section-label-how">
                  [ How OriginTrace Helps ]
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4" data-testid="text-how-helps-title">
                  Your UAE Compliance Platform
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                  OriginTrace provides the tools exporters need to navigate UAE food import requirements with confidence and efficiency.
                </p>
              </div>
            </FadeIn>
            <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {howOriginTraceHelps.map((feature) => (
                <StaggerItem key={feature.title}>
                  <Card className="h-full" data-testid={`card-feature-${feature.title.toLowerCase().replace(/\s+/g, '-').slice(0, 20)}`}>
                    <CardContent className="p-8">
                      <div className="w-12 h-12 rounded-md bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-5">
                        <feature.icon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">{feature.title}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{feature.description}</p>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        <section className="py-10 md:py-12 border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn>
              <div className="text-center">
                <Link href="/demo">
                  <Button className="bg-emerald-600 text-white" data-testid="button-mid-cta-demo">
                    See How OriginTrace Works
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>

        <section className="py-16 md:py-20 bg-slate-50 dark:bg-slate-900/20 border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn>
              <div className="text-center mb-16">
                <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-emerald-600 dark:text-emerald-400 mb-4" data-testid="text-section-label-faq">
                  [ FAQ ]
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4" data-testid="text-faq-title">
                  Frequently Asked Questions
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                  Common questions about UAE food import compliance and how OriginTrace can help.
                </p>
              </div>
            </FadeIn>
            <div className="max-w-3xl mx-auto">
              <CardFAQList items={faqs} />
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20 border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn>
              <div className="text-center max-w-2xl mx-auto">
                <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-emerald-600 dark:text-emerald-400 mb-4" data-testid="text-section-label-cta">
                  [ Get Started ]
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4" data-testid="text-cta-title">
                  Ready to Export to the UAE with Confidence?
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
                  See how OriginTrace automates UAE compliance — from halal chain-of-custody tracking to Arabic label generation and pre-shipment scoring.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link href="/demo">
                    <Button className="bg-emerald-600 text-white" data-testid="button-cta-demo">
                      Request a Demo
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/compliance">
                    <Button variant="outline" data-testid="button-cta-compliance">
                      View All Regulations
                    </Button>
                  </Link>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </>
  );
}
