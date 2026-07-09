import type { BlogPost } from '@/lib/blog';

export const post: BlogPost = {
  slug: 'eudr-compliance-tools-herbs-spices-exporters-practical-guide',
  title: 'Ginger Isn\'t in EUDR. Here\'s What the EU Actually Checks',
  description: 'EUDR doesn\'t cover ginger or turmeric. What the EU checks instead: phytosanitary certificates, a new Ralstonia declaration, and strict aflatoxin limits.',
  date: 'February 20, 2026',
  dateISO: '2026-02-20',
  dateModifiedISO: '2026-07-09',
  category: 'EUDR',
  readingTime: '7 min read',
  author: 'OriginTrace Compliance Team',
  authorRole: 'Supply Chain Compliance',
  coverImage: '/images/pexels-masudar-37218946.jpg',
  coverImageAlt: 'Farmer spraying a bright green field',
  coverGradient: 'from-yellow-900/20 to-emerald-900/20',
  tags: ['EUDR', 'Ginger', 'Turmeric', 'Spices', 'Phytosanitary', 'Aflatoxin', 'Exporters', 'Traceability'],
  content: [
    {
      type: 'paragraph',
      text: 'If you export ginger, turmeric, or hibiscus and someone has told you to start preparing EUDR due diligence statements, take a breath. They\'re wrong. The EU Deforestation Regulation (Reg (EU) 2023/1115) has a closed list of commodities in Annex I: cattle, cocoa, coffee, oil palm, rubber, soya, and wood — plus products derived from them. Ginger isn\'t on it. Turmeric isn\'t on it. No herb or spice is.',
    },
    {
      type: 'paragraph',
      text: 'That\'s the good news. The bad news: the EU checks plenty of other things on a spice consignment, and they\'re the ones actually holding containers at Rotterdam. A phytosanitary certificate with a brand-new additional declaration most exporters have never heard of. An aflatoxin limit for ginger that\'s easy to fail if your drying discipline slips. Pesticide residue limits with a tightened sampling regime. This guide walks through that real requirement stack.',
    },
    {
      type: 'callout',
      variant: 'info',
      title: 'Correction: EUDR Does Not Cover Herbs and Spices',
      text: 'An earlier version of this guide treated ginger and turmeric as falling under EUDR-style deforestation rules. That was the wrong premise, and we\'re correcting it. EUDR\'s Annex I covers only cattle, cocoa, coffee, oil palm, rubber, soya, and wood (plus derived products). What actually governs your herb and spice exports to the EU: plant-health rules under Reg (EU) 2019/2072, food-safety limits on aflatoxins and pesticide residues, and your buyer\'s own quality requirements.',
    },
    {
      type: 'h2',
      text: 'What Does the EU Actually Check on a Spice Shipment?',
    },
    {
      type: 'paragraph',
      text: 'Here\'s the requirement stack for ginger, turmeric, and similar dried spices entering the EU — the things that genuinely decide whether your consignment clears:',
    },
    {
      type: 'table',
      headers: ['Requirement', 'Where It Comes From', 'What It Means for You'],
      rows: [
        ['Phytosanitary certificate', 'Reg (EU) 2019/2072', 'Issued in Nigeria by FMARD. Required for plant products; no certificate, no entry.'],
        ['Ralstonia additional declaration', 'EU plant-health rules (new)', 'Ginger and turmeric need an extra declaration on the phytosanitary certificate, with exact prescribed wording.'],
        ['Aflatoxin limits', 'EU contaminant limits for ginger', '5 µg/kg aflatoxin B1 and 10 µg/kg total aflatoxins. Driven by drying and storage discipline.'],
        ['Pesticide residues (MRLs)', 'Reg (EC) 396/2005', 'Residues must sit below the EU maximum for each substance — check the limits for your crop before you spray.'],
        ['Mycotoxin sampling at import', 'CIR (EU) 2023/2782 (since Aug 2025)', 'Prescribes how EU authorities sample and test consignments for mycotoxins — one bad section of a lot can fail the whole container.'],
        ['Buyer quality requirements', 'Private contracts', 'HACCP, moisture specs, accredited-lab certificates of analysis, often organic or FSSC 22000.'],
      ],
    },
    {
      type: 'cta',
      heading: 'One Page per Market, No Guesswork',
      text: 'The OriginTrace compliance hub breaks down what each destination market actually requires from African agricultural exporters — the EU, UK, US, China, and UAE — so you prepare for the rules that apply, not the ones that don\'t.',
      buttonText: 'Browse the Compliance Hub',
      href: '/compliance',
    },
    {
      type: 'h2',
      text: 'The Phytosanitary Certificate — and the Declaration That Trips People Up',
    },
    {
      type: 'paragraph',
      text: 'Every plant-product consignment into the EU needs a phytosanitary certificate under Reg (EU) 2019/2072. In Nigeria, the Federal Ministry of Agriculture (FMARD) issues it. Most exporters know this part. What\'s new — and catching people out — is that ginger and turmeric now need an additional declaration on that certificate addressing Ralstonia pseudosolanacearum, a bacterial plant pathogen the EU is worried about in these crops.',
    },
    {
      type: 'paragraph',
      text: 'The declaration isn\'t free text. The EU prescribes the exact wording, and it\'s obscure enough that certificates regularly go out without it or with a paraphrase that doesn\'t match. Border officers compare the text literally. A certificate that\'s perfect in every other way, but missing or misquoting this one line, can still get your consignment held or refused.',
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'Confirm the Wording Before the Certificate Is Issued',
      text: 'Get the current prescribed text for the Ralstonia pseudosolanacearum additional declaration from FMARD or your buyer\'s import agent before your certificate is drafted — and check it character by character when it comes back. This is the cheapest compliance check you\'ll ever do, and skipping it is one of the most expensive mistakes.',
    },
    {
      type: 'h2',
      text: 'Aflatoxins: The Limit That Fails Ginger Shipments',
    },
    {
      type: 'paragraph',
      text: 'For ginger, the EU limit is 5 µg/kg for aflatoxin B1 and 10 µg/kg for total aflatoxins. Those are small numbers, and they\'re unforgiving. Aflatoxins come from mould, and mould comes from moisture — ginger that\'s dried too slowly, dried on bare ground, or stored in a humid warehouse can blow past the limit before it ever reaches a port.',
    },
    {
      type: 'paragraph',
      text: 'Since August 2025, sampling and testing for mycotoxins at EU import follows CIR (EU) 2023/2782, which prescribes how a consignment is sampled. Practical consequence: you can\'t rely on your best bags carrying a mixed lot. If part of a consignment is contaminated, the sampling plan is designed to find it. The same shipment also has to sit below the EU\'s maximum residue limits (MRLs) for pesticides under Reg (EC) 396/2005 — so know what was sprayed on the crop and when, and test before you ship, not after.',
    },
    {
      type: 'image',
      src: '/images/baged product in wareouse.jpg',
      alt: 'Bagged agricultural produce stacked in a dry warehouse',
      caption: 'Drying and storage discipline — not paperwork — is where most aflatoxin failures are won or lost.',
    },
    {
      type: 'h2',
      text: 'What EU Buyers Ask For on Top of the Law',
    },
    {
      type: 'paragraph',
      text: 'Clearing the border is the floor, not the ceiling. European spice buyers layer their own requirements on top, and losing a contract hurts as much as losing a container. Expect to be asked for:',
    },
    {
      type: 'bullets',
      items: [
        'A documented HACCP system covering your processing and storage — most serious buyers won\'t onboard a supplier without one.',
        'Moisture specifications per lot, with your own measurements at collection and dispatch.',
        'Certificates of analysis from an accredited laboratory — aflatoxin and MRL results for the specific lot, not a generic annual test.',
        'Private certifications where the end market demands them: organic certification and FSSC 22000 are the two most commonly requested.',
        'Traceability data — increasingly, farm-level origin information as quality assurance, even though no deforestation law requires it for spices.',
      ],
    },
    {
      type: 'h2',
      text: 'Why Traceability Still Matters Without EUDR',
    },
    {
      type: 'paragraph',
      text: 'Here\'s the context making buyers cautious. Nigerian ginger production collapsed from over 800,000 tonnes in 2022 to under 100,000 tonnes in 2023 after blight tore through the growing belt, recovering only to around 160,000 tonnes in 2024. EU-bound exports fell from 8,470 tonnes in 2022 to 1,870 tonnes in 2024. Supply is scarce, buyers are burned, and everyone is asking harder questions about where product actually comes from and how it was handled.',
    },
    {
      type: 'paragraph',
      text: 'That\'s why the traceability practices from the original version of this guide still earn their keep — just for quality assurance rather than deforestation law. A farmer registry, batch-level collection records linking each export lot back to source farms, and a single place where phytosanitary certificates, lab results, and fumigation certificates live with their expiry dates. When a buyer questionnaire asks how you\'d trace a failed aflatoxin result back to its source, "we\'d check the batch record" is a contract-winning answer. "We\'d ask around" is not.',
    },
    {
      type: 'h2',
      text: 'If You Also Export Cocoa, EUDR Is Real for You',
    },
    {
      type: 'paragraph',
      text: 'One important exception. Cocoa is on the EUDR Annex I list, so if your business exports cocoa alongside ginger or hibiscus, the deforestation rules genuinely apply to that side of your book: farm geolocation, deforestation-free verification, and a due diligence statement. After the second delay under Reg (EU) 2025/2650, the deadlines are 30 December 2026 for large and medium operators and 30 June 2027 for micro and small enterprises. The farm-mapping and batch-tracking muscle you build for spice buyers transfers directly — see our EUDR compliance guide for the full picture.',
    },
    {
      type: 'h2',
      text: 'Priority Actions for Spice Exporters in 2026',
    },
    {
      type: 'numbered',
      items: [
        'Ask FMARD (or your clearing agent) for the current prescribed wording of the Ralstonia pseudosolanacearum additional declaration — before your next certificate is drafted.',
        'Get a lot-specific aflatoxin and MRL test from an accredited laboratory before every EU shipment. Budget it as a fixed cost of the trade.',
        'Audit your drying and storage: drying surfaces, moisture measurement at collection, and warehouse humidity are where the 5 µg/kg limit is won.',
        'Document your HACCP system if you haven\'t — it\'s the first question on every serious buyer\'s onboarding form.',
        'Keep batch-level records linking each export lot to its source farmers, so any failed test or buyer query can be traced in minutes.',
        'Ask each EU buyer for their current spec sheet — private requirements move faster than regulation, and guessing is how contracts get lost.',
      ],
    },
    {
      type: 'faq',
      items: [
        {
          q: 'Is ginger covered by EUDR?',
          a: 'No. EUDR\'s Annex I covers only cattle, cocoa, coffee, oil palm, rubber, soya, and wood, plus products derived from them. Ginger, turmeric, hibiscus, and other herbs and spices are out of scope. What applies to ginger instead: a phytosanitary certificate under Reg (EU) 2019/2072 (with a new Ralstonia additional declaration), EU aflatoxin limits, and pesticide MRLs under Reg (EC) 396/2005.',
        },
        {
          q: 'What is the Ralstonia declaration for ginger and turmeric?',
          a: 'It\'s an additional declaration the EU now requires on the phytosanitary certificate for ginger and turmeric, confirming the consignment\'s status regarding Ralstonia pseudosolanacearum, a bacterial plant pathogen. The wording is prescribed exactly — get the current text from FMARD or your buyer before the certificate is issued.',
        },
        {
          q: 'What is the aflatoxin limit for ginger exported to the EU?',
          a: '5 µg/kg for aflatoxin B1 and 10 µg/kg for total aflatoxins. Since August 2025, consignments are sampled and tested under CIR (EU) 2023/2782, so contamination in part of a lot is likely to be found.',
        },
        {
          q: 'Could EUDR expand to cover spices later?',
          a: 'The regulation provides for periodic reviews of its scope, so the list could change in future — but as of mid-2026 no herb or spice is covered, and no expansion has been adopted. Check the current annex before you plan compliance spending around a rumour.',
        },
        {
          q: 'Do EU buyers still ask ginger exporters for GPS and traceability data?',
          a: 'Increasingly, yes — but as quality assurance and supply-chain verification, not as a legal deforestation requirement. Exporters who can link each lot to registered farmers and mapped farms answer buyer questionnaires with data instead of promises, which is a real commercial edge in a tight supply market.',
        },
      ],
    },
    {
      type: 'cta',
      heading: 'See How Ready Your Next Shipment Is',
      text: 'OriginTrace puts your farmer registry, batch records, lab results, and export documents in one place — so the certificate wording, the test report, and the traceability answer are ready before the buyer asks.',
      buttonText: 'Request a Demo',
      href: '/demo',
    },
    {
      type: 'references',
      items: [
        { label: 'Commission Implementing Regulation (EU) 2019/2072 — plant-health import conditions (phytosanitary certificates)', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32019R2072', publisher: 'EUR-Lex' },
        { label: 'Regulation (EC) No 396/2005 — maximum residue levels of pesticides', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32005R0396', publisher: 'EUR-Lex' },
        { label: 'Commission Implementing Regulation (EU) 2023/2782 — sampling and analysis for mycotoxins in food', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32023R2782', publisher: 'EUR-Lex' },
        { label: 'Regulation (EU) 2023/1115 — EU Deforestation Regulation (Annex I commodity list)', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32023R1115', publisher: 'EUR-Lex' },
        { label: 'Regulation (EU) 2025/2650 — second postponement of EUDR application dates', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32025R2650', publisher: 'EUR-Lex' },
      ],
    },
  ],
};
