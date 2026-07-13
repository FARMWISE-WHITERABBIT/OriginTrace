import type { BlogPost } from '@/lib/blog';

export const post: BlogPost = {
  slug: 'eudr-herbs-spices-compliance-importers-readiness-guide',
  title: 'Buying African Ginger? EUDR Isn\'t the Rule to Worry About',
  description: 'Ginger isn\'t in EUDR. What EU spice importers actually need from African suppliers — phyto certs, aflatoxin results, traceability — and how to verify it.',
  date: 'January 30, 2026',
  dateISO: '2026-01-30',
  dateModifiedISO: '2026-07-09',
  category: 'EUDR',
  readingTime: '7 min read',
  author: 'OriginTrace Compliance Team',
  authorRole: 'Supply Chain Compliance',
  coverImage: '/images/pexels-pedrofurtadoo-28903100.jpg',
  coverImageAlt: 'Red tractor moving through rows of trees in an orchard',
  coverGradient: 'from-yellow-800/20 to-slate-800/50',
  tags: ['EUDR', 'Ginger', 'Spices', 'Importers', 'Food Safety', 'Phytosanitary', 'EU', 'Sourcing'],
  content: [
    {
      type: 'paragraph',
      text: 'If your sourcing checklist for African ginger or turmeric has an "EUDR due diligence statement" line on it, you can cross it off. The EU Deforestation Regulation (Reg (EU) 2023/1115) covers a closed list of commodities in Annex I — cattle, cocoa, coffee, oil palm, rubber, soya, and wood, plus derived products — and no herb or spice is on it. There is no DDS to file for ginger. No geolocation mandate. No deforestation cut-off date.',
    },
    {
      type: 'paragraph',
      text: 'Don\'t relax yet, though. The rules that do apply to spice imports are stricter than most procurement teams realise, and they\'re the ones actually stopping consignments at the border: a phytosanitary certificate with a new, exactly-worded declaration for ginger and turmeric, tight aflatoxin limits, and a mycotoxin sampling regime that took effect in August 2025. This guide covers what to require from suppliers — and how to verify it before you commit.',
    },
    {
      type: 'callout',
      variant: 'info',
      title: 'Correction: Spices Are Not in an EUDR "Grey Zone"',
      text: 'An earlier version of this guide described herbs and spices as a grey zone where EUDR-style requirements were effectively arriving anyway. Setting the record straight: ginger, turmeric, hibiscus, and other spices are simply out of EUDR\'s scope — there is no legal deforestation due diligence duty for them. What does bind you as an importer: EU plant-health rules (Reg (EU) 2019/2072), food-safety limits on aflatoxins and pesticide residues, and your own obligations as an EU food business.',
    },
    {
      type: 'h2',
      text: 'The Rules That Actually Apply to Spice Imports',
    },
    {
      type: 'paragraph',
      text: 'Here\'s the real compliance stack for ginger, turmeric, and similar dried spices from West Africa, and who\'s responsible for each piece:',
    },
    {
      type: 'table',
      headers: ['Requirement', 'Legal Basis', 'Who Delivers It'],
      rows: [
        ['Phytosanitary certificate', 'Reg (EU) 2019/2072', 'The exporter, issued by the origin-country plant-health authority (NAQS, under FMARD, in Nigeria).'],
        ['Ralstonia additional declaration', 'EU plant-health rules (new)', 'The exporter — ginger and turmeric need an extra declaration on the phytosanitary certificate with exact prescribed wording for Ralstonia pseudosolanacearum.'],
        ['Aflatoxin limits (ginger: 5 µg/kg B1, 10 µg/kg total)', 'EU contaminant limits', 'Both — the supplier controls drying and storage; you verify with accredited-lab results per lot.'],
        ['Pesticide residue limits (MRLs)', 'Reg (EC) 396/2005', 'Both — supplier spraying practice, importer verification testing.'],
        ['Mycotoxin sampling at import', 'CIR (EU) 2023/2782 (since Aug 2025)', 'EU border authorities — the prescribed sampling plan is designed to catch contamination in any part of a lot.'],
        ['HACCP and traceability (one step back, one step forward)', 'EU food law, your buyers', 'You — as an EU food business, you must know exactly where each lot came from.'],
      ],
    },
    {
      type: 'cta',
      heading: 'Know Which Rules Apply Before You Negotiate',
      text: 'The OriginTrace compliance hub maps the real requirement stack for each origin and destination market — so your supplier conversations start from the rules that exist, not the ones that don\'t.',
      buttonText: 'Browse the Compliance Hub',
      href: '/compliance',
    },
    {
      type: 'h2',
      text: 'The Supply Crunch You\'re Actually Exposed To',
    },
    {
      type: 'paragraph',
      text: 'While the deforestation question was a distraction, a real sourcing crisis happened. Nigerian ginger production collapsed from over 800,000 tonnes in 2022 to under 100,000 tonnes in 2023 after blight swept the growing belt, and has recovered only to around 160,000 tonnes in 2024. EU-bound exports tell the same story: 8,470 tonnes in 2022 down to 1,870 tonnes in 2024.',
    },
    {
      type: 'paragraph',
      text: 'Scarcity changes your risk profile. When volumes are tight, importers reach for new, unvetted suppliers — and that\'s exactly when quality failures happen: rushed drying, blended lots of mixed origin, certificates arranged after the fact. In a tight market, supplier verification isn\'t bureaucracy. It\'s how you avoid paying premium prices for a container that fails at the border.',
    },
    {
      type: 'image',
      src: '/images/lagos-apapa-port.jpg',
      alt: 'Container terminal at Apapa port in Lagos, Nigeria',
      caption: 'A consignment held at origin is a delay. One refused at an EU border is a write-off.',
    },
    {
      type: 'h2',
      text: 'What to Require From Suppliers Before You Commit',
    },
    {
      type: 'h3',
      text: 'Tier 1: Minimum Acceptable Standard',
    },
    {
      type: 'bullets',
      intro: 'Every ginger or spice supplier should meet these before you place an order:',
      items: [
        'A phytosanitary certificate for every consignment — and for ginger and turmeric, confirmation they know the prescribed Ralstonia pseudosolanacearum additional declaration and have shipped with it before.',
        'Lot-specific certificates of analysis from an accredited laboratory covering aflatoxins and pesticide residues — not a generic annual test.',
        'A documented HACCP system covering processing and storage.',
        'A moisture specification per lot, with measurements taken at collection and at dispatch.',
        'Basic traceability: the ability to say which aggregation points and farmer groups a given lot came from.',
      ],
    },
    {
      type: 'h3',
      text: 'Tier 2: Preferred Supplier Standard',
    },
    {
      type: 'bullets',
      intro: 'These qualify a supplier for larger volumes and longer contracts:',
      items: [
        'A digital farmer registry with farm-level GPS data behind each lot — valuable as quality assurance and origin verification, even though no deforestation law requires it for spices.',
        'Batch-level digital traceability from farm to container, with a per-shipment origin data export.',
        'Private certifications your end market demands — organic and FSSC 22000 are the most commonly requested in the EU spice trade.',
        'Buyer portal access, so you can verify lot data yourself instead of waiting for emailed spreadsheets.',
        'A named accredited laboratory relationship, so pre-shipment testing is routine rather than improvised.',
      ],
    },
    {
      type: 'h2',
      text: 'The Supplier Questionnaire: What to Ask',
    },
    {
      type: 'table',
      headers: ['Category', 'Key Questions'],
      rows: [
        ['Plant health', 'Have you shipped ginger or turmeric to the EU since the Ralstonia additional declaration was introduced? Can you share a recent certificate showing it?'],
        ['Drying and storage', 'How is the crop dried, and on what surfaces? How do you measure moisture at collection? What are your warehouse humidity controls?'],
        ['Testing', 'Which accredited laboratory do you use? Can you share aflatoxin and MRL results for your last three EU lots?'],
        ['Traceability', 'Can you link a specific lot back to its source farmers and collection dates? Digital system or paper?'],
        ['Food safety', 'Is your HACCP system documented and audited? What certifications do you hold, and when do they expire?'],
        ['Recall readiness', 'If we found a problem in a delivered lot, how fast could you identify the affected farms and other shipments from the same batch?'],
      ],
    },
    {
      type: 'h2',
      text: 'The One Commodity Where EUDR Does Apply: Cocoa',
    },
    {
      type: 'paragraph',
      text: 'If the same African suppliers also sell you cocoa, the deforestation rules genuinely apply to that trade. Cocoa is in Annex I, so cocoa lots need farm geolocation, deforestation-free verification, and a due diligence statement. After the second delay under Reg (EU) 2025/2650, the obligations bite on 30 December 2026 for large and medium operators and 30 June 2027 for micro and small enterprises. Under the EU\'s country benchmarking (CIR 2025/1093), Ghana is rated low risk while Nigeria and Côte d\'Ivoire are standard risk. Keep the two compliance tracks separate: EUDR diligence for cocoa, plant-health and food-safety diligence for spices.',
    },
    {
      type: 'h2',
      text: 'Traceability Still Pays — Just Not for the Reason You Thought',
    },
    {
      type: 'paragraph',
      text: 'The strongest argument for farm-level traceability in spices was never deforestation law. It\'s commercial. Verified origin supports premium shelf positioning, satisfies retailer questionnaires, and makes recalls surgical instead of catastrophic — one batch withdrawn instead of a season\'s inventory. And suppliers who invested in traceability for other reasons (organic certification already requires much of it) tend to be the same ones whose drying, testing, and documentation you can actually trust. Treat traceability capability as a proxy for overall supplier quality, because in practice that\'s what it is.',
    },
    {
      type: 'h2',
      text: 'Before Your Next Procurement Cycle',
    },
    {
      type: 'numbered',
      items: [
        'Remove EUDR requirements from your spice supplier documentation requests — asking for a DDS on ginger signals you don\'t know the rules, and wastes your suppliers\' time.',
        'Add the Ralstonia additional declaration to your ginger and turmeric checklist, and ask each supplier to evidence a recent certificate carrying it.',
        'Require lot-specific accredited-lab results for aflatoxins and MRLs as a condition of payment, not an afterthought.',
        'Score your current suppliers against the Tier 1 list above — in a supply market this tight, know which relationships to deepen and which to replace before the season starts.',
        'If you also buy cocoa, run its EUDR readiness as a separate track with its own deadline plan (30 December 2026 for most operators).',
      ],
    },
    {
      type: 'faq',
      items: [
        {
          q: 'Is ginger covered by the EU Deforestation Regulation?',
          a: 'No. EUDR\'s Annex I covers cattle, cocoa, coffee, oil palm, rubber, soya, and wood, plus derived products. Ginger, turmeric, hibiscus, and other herbs and spices are out of scope — no due diligence statement or geolocation is required for them. What applies instead: phytosanitary certification under Reg (EU) 2019/2072, EU aflatoxin limits, and pesticide MRLs under Reg (EC) 396/2005.',
        },
        {
          q: 'Do I need a due diligence statement to import turmeric or hibiscus into the EU?',
          a: 'No. A DDS is only required for EUDR Annex I commodities such as cocoa or coffee. For turmeric and hibiscus you need a valid phytosanitary certificate (turmeric also needs the Ralstonia additional declaration) and compliance with EU food-safety limits.',
        },
        {
          q: 'What documents should I require when importing Nigerian ginger?',
          a: 'A phytosanitary certificate issued by NAQS (under FMARD) carrying the prescribed Ralstonia pseudosolanacearum additional declaration, lot-specific accredited-lab results for aflatoxins (5 µg/kg B1, 10 µg/kg total for ginger) and pesticide residues, evidence of a HACCP system, and traceability records linking the lot to its origin.',
        },
        {
          q: 'What are the aflatoxin limits for ginger imported into the EU?',
          a: '5 µg/kg for aflatoxin B1 and 10 µg/kg for total aflatoxins. Since August 2025, border sampling and analysis for mycotoxins follows CIR (EU) 2023/2782, which is designed to detect contamination in any part of a consignment.',
        },
        {
          q: 'Will the EU add spices to EUDR in the future?',
          a: 'The regulation provides for periodic scope reviews, so the commodity list could change — but as of mid-2026, no herb or spice has been added and no expansion has been adopted. Check the current annex before building procurement policy on speculation.',
        },
      ],
    },
    {
      type: 'cta',
      heading: 'Verify a Supplier Before You Commit',
      text: 'OriginTrace works with commodity aggregators across West Africa to build verified, traceable supply chains. Request a supplier risk snapshot and see the farmer registry, batch records, and lab documentation behind a lot — before your money is on the water.',
      buttonText: 'Request a Supplier Risk Snapshot',
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
        { label: 'Commission Implementing Regulation (EU) 2025/1093 — EUDR country risk benchmarking', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32025R1093', publisher: 'EUR-Lex' },
      ],
    },
  ],
};
