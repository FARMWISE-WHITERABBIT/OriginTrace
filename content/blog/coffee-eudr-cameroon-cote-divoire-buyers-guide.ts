import type { BlogPost } from '@/lib/blog';

export const post: BlogPost = {
  slug: 'coffee-eudr-cameroon-cote-divoire-buyers-guide',
  title: 'Buying African Robusta? Cameroon and Côte d\'Ivoire Are Racing to Be EUDR-Ready',
  description: 'EU coffee buyers sourcing Cameroonian or Ivorian robusta face a shrinking supplier pool and a December 2026 deadline. Here\'s what\'s actually changed on the ground — and how to verify it.',
  date: 'September 2, 2026',
  dateISO: '2026-09-02',
  category: 'EUDR',
  readingTime: '9 min read',
  author: 'OriginTrace Compliance Team',
  authorRole: 'Supply Chain Compliance',
  coverImage: '/images/pexels-1500mcoffee-28314458.jpg',
  coverImageAlt: 'Coffee cherries and parchment drying on raised beds under the sun',
  coverGradient: 'from-amber-900/30 to-slate-800/50',
  tags: ['Coffee', 'EUDR', 'Cameroon', "Côte d'Ivoire", 'Importers', 'Robusta', 'Due Diligence'],
  content: [
    {
      type: 'paragraph',
      text: 'You\'re contracting robusta for delivery after 30 December 2026, and somewhere in the back of your mind is the question you haven\'t fully answered yet: can this specific supplier actually get you a due diligence statement, or are you about to find out the hard way in Q1 2027? Coffee sits alongside cocoa on the [EUDR Annex I list](/blog/eudr-regulation-complete-guide) — cattle, cocoa, coffee, oil palm, rubber, soya, wood — so everything that applies to a cocoa shipment applies to yours: GPS plot data, a deforestation check against the 31 December 2020 cutoff, and a due diligence statement you file as the first operator placing it on the EU market.',
    },
    {
      type: 'paragraph',
      text: 'What\'s different about coffee right now isn\'t the regulation. It\'s the supply. Combined EU27 green coffee deliveries from Côte d\'Ivoire and Cameroon — Central and West Africa\'s two biggest robusta origins — fell from around 59,000 tonnes in 2016 to under 21,000 tonnes in 2024. That\'s not a rounding error; it\'s a supplier pool that\'s shrunk by roughly two-thirds in under a decade, for reasons that predate EUDR entirely (aging trees, competition from Vietnam and Brazil, years of low farmgate prices). Which means the cost of disqualifying a supplier over a shaky compliance claim is higher than it used to be. You have less room to just move on to the next one.',
    },
    {
      type: 'callout',
      variant: 'deadline',
      title: 'The Dates Haven\'t Moved',
      text: '30 December 2026 for large and medium operators, 30 June 2027 for micro and small ones — set by Regulation (EU) 2025/2650, the second postponement. Coffee gets no special treatment; it\'s bound by the same Annex I clock as cocoa.',
    },
    {
      type: 'h2',
      text: 'Cameroon Is Positioning Itself as the "Safe Haven" Origin',
    },
    {
      type: 'paragraph',
      text: 'In August 2026, Cameroon\'s Trade Ministry met with around 20 coffee exporters and processors specifically to assess EUDR readiness ahead of the 2026/27 season. Industry commentary (StoneX\'s Africa coffee analysis, among others) has framed Cameroon\'s 2025–2026 harvest as being in full alignment with EUDR — worth reading as the position Cameroon\'s government and exporters are actively building toward, not an independently audited fact about every farm in the country. Cameroon is Central Africa\'s largest coffee producer, historically robusta-heavy with a smaller arabica segment, and it has an obvious commercial incentive to be the origin buyers trust when everyone else\'s paperwork is in question.',
    },
    {
      type: 'paragraph',
      text: 'That incentive cuts both ways for you as a buyer. A "safe haven" narrative is exactly what a good marketing effort produces regardless of what\'s actually mapped on the ground — which is precisely why it\'s worth verifying rather than taking at face value, the same way you would any supplier claim.',
    },
    {
      type: 'h2',
      text: "Côte d'Ivoire's New Producer Card — What It Does and Doesn't Prove",
    },
    {
      type: 'paragraph',
      text: 'On 1 September 2026, Côte d\'Ivoire\'s Coffee and Cocoa Council made a producer card compulsory across the country — a credential tied to individual farmers, aimed at securing financial transactions and enforcing compliance with the official farmgate price. It\'s part of a broader push, alongside Ghana and Cameroon, to expand national coffee and cocoa traceability infrastructure, and it\'s a genuinely useful building block: a registered producer identity is one of the things EUDR due diligence needs.',
    },
    {
      type: 'paragraph',
      text: 'But a producer card is not GPS polygon data, and it\'s not a deforestation check. It tells you who the farmer is and that they\'re registered in a national system — it doesn\'t tell you where their plot sits relative to the forest cover baseline, or whether that plot has already been mapped to EUDR\'s standard. Don\'t let "our farmers all have producer cards now" substitute for the geolocation question in your supplier conversations.',
    },
    {
      type: 'h2',
      text: 'What Your Due Diligence Statement Still Needs',
    },
    {
      type: 'paragraph',
      text: 'None of this changes the underlying mechanics, which are identical to cocoa\'s: GPS points for plots under 4 hectares, full polygons for plots at or above that threshold, a deforestation check against the 31 December 2020 cutoff, and legality evidence — all filed by you, as the first operator, through the EU\'s Information System. Côte d\'Ivoire sits at standard risk under the country benchmarking (CIR (EU) 2025/1093), same as Nigeria; Cameroon\'s classification is worth confirming directly against the current annex before you plan around it, since benchmarking gets reviewed periodically.',
    },
    {
      type: 'table',
      headers: ['Where EU27 robusta imports actually land', 'Volume (2024, all origins)'],
      rows: [
        ['Germany', '~251,000 tonnes'],
        ['Italy', '~243,000 tonnes'],
        ['Spain', '~142,000 tonnes'],
        ['Netherlands', '~55,000 tonnes'],
        ['Belgium', '~46,000 tonnes'],
        ['United Kingdom', '~35,000 tonnes'],
      ],
    },
    {
      type: 'paragraph',
      text: 'Belgium has historically been Cameroon\'s single largest robusta buyer, taking close to 30% of exports, with France a distant second — worth knowing if you\'re trying to understand who else is already buying from a given exporter and what standard they\'ve been held to.',
    },
    {
      type: 'cta',
      heading: 'Verify Before You Commit the Contract',
      text: 'The same verification workflow that works for cocoa works for coffee: request a sample data pack, cross-check the coordinates against satellite deforestation data, and look for the red flags that separate a mapped plot from a desk-drawn polygon.',
      buttonText: 'Request a Supplier Risk Snapshot',
      href: '/demo?role=buyer',
    },
    {
      type: 'h2',
      text: 'Verifying a Cameroon or Côte d\'Ivoire Coffee Supplier\'s Claim',
    },
    {
      type: 'paragraph',
      text: 'The workflow doesn\'t change by commodity. Our [full guide to verifying a supplier\'s "EUDR-ready" claim](/blog/how-to-verify-supplier-eudr-claims) walks through the five-step process in detail — confirm the company can legally export, request a sample data pack for one real shipment, cross-check the coordinates against Global Forest Watch and JRC forest-cover data, confirm the geodata meets the legal format (points vs. polygons), and run internal-consistency checks on the data itself. The red flags are the same too: perfect rectangular plots, coordinates that land in rivers or village centres, one reference point stamped across a whole farmer registry.',
    },
    {
      type: 'bullets',
      intro: 'Two questions specific to coffee are worth adding to that checklist:',
      items: [
        'Ask whether the polygon data was collected for coffee plots specifically, or inherited from a cocoa mapping project on the same farm. Mixed-crop smallholder plots are common in both countries, and a supplier\'s cocoa GPS coverage doesn\'t automatically mean their coffee rows were separately mapped.',
        'Ask how a producer card (Côte d\'Ivoire) or a national registration number (Cameroon) links to the actual plot geometry in the exporter\'s system — a farmer ID with no geospatial record attached is a registry, not a traceability chain.',
      ],
    },
    {
      type: 'h2',
      text: 'Bringing Coffee Suppliers Onto a Standing Record',
    },
    {
      type: 'paragraph',
      text: 'A point-in-time data pack tells you a supplier looked credible the week you checked. Given how thin the Cameroon and Côte d\'Ivoire supplier pool already is, the stronger position for a longer-term buying relationship is standing visibility — the exporter maintaining farm polygons, batch-to-plot mapping, and legality documentation inside OriginTrace as they operate, with you seeing the same records from your buyer workspace shipment by shipment. Verification stops being a one-off audit and becomes the default state of the relationship, which matters more on a shrinking origin list than it does on a commodity where you have twenty suppliers to choose from.',
    },
    {
      type: 'faq',
      items: [
        {
          q: 'Is coffee covered by EUDR the same way as cocoa?',
          a: 'Yes. Coffee is one of the seven commodities in EUDR\'s Annex I — cattle, cocoa, coffee, oil palm, rubber, soya, and wood — and the due diligence requirements (geolocation, deforestation check, due diligence statement) apply identically regardless of which of the seven you\'re importing.',
        },
        {
          q: 'Is Cameroon actually EUDR-compliant, or is that a marketing claim?',
          a: 'It\'s a positioning effort by Cameroon\'s government and exporters, backed by real steps — a Trade Ministry readiness assessment with exporters in August 2026 and industry commentary describing the 2025–26 harvest as aligned with EUDR. That\'s not the same as an independent, farm-by-farm audit. Treat it as a reason to look closer at a specific supplier\'s actual polygon data, not a reason to skip the check.',
        },
        {
          q: "Does Côte d'Ivoire's new producer card satisfy EUDR geolocation requirements?",
          a: 'No. The producer card (compulsory from 1 September 2026) registers farmer identity for financial-transaction and farmgate-price purposes. It doesn\'t contain GPS polygon data or a deforestation check on its own — ask your supplier separately how the card links to mapped plot geometry.',
        },
        {
          q: 'What risk tier are Cameroon and Côte d\'Ivoire under EUDR?',
          a: "Côte d'Ivoire is standard risk under the country benchmarking (CIR (EU) 2025/1093), the same tier as Nigeria — full due diligence, 3% minimum check rate. Confirm Cameroon's current classification directly against the published annex before you rely on it, since benchmarking is reviewed periodically and can change.",
        },
      ],
    },
    {
      type: 'cta',
      heading: 'Bring Your Coffee Suppliers Onto OriginTrace',
      text: 'Onboard your Cameroonian or Ivorian coffee suppliers and see their farm polygons, batch-to-plot mapping, and compliance documents from your buyer workspace — maintained at origin, visible before every shipment.',
      buttonText: 'Bring Your Suppliers Onto OriginTrace',
      href: '/importers',
    },
    {
      type: 'references',
      items: [
        { label: 'Regulation (EU) 2023/1115 — EU Deforestation Regulation', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32023R1115', publisher: 'EUR-Lex' },
        { label: 'Regulation (EU) 2025/2650 — second postponement and simplification of EUDR application dates', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32025R2650', publisher: 'EUR-Lex' },
        { label: 'Commission Implementing Regulation (EU) 2025/1093 — EUDR country benchmarking', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32025R1093', publisher: 'EUR-Lex' },
        { label: "Africa's Coffee in 2026: Supply Is Growing, Routes Are Shifting, and Price Still Answers to Risk", url: 'https://www.stonex.com/en-gb/insights/africa-s-coffee-in-2026-supply-is-growing-routes-are-shifting-and-price-still-answers-to-risk/', publisher: 'StoneX' },
        { label: 'From Farms to Ports, African Countries Are Rewiring How Agricultural Exports Are Tracked', url: 'https://www.ecofinagency.com/news/2708-58400-from-farms-to-ports-african-countries-are-rewiring-how-agricultural-exports-are-tracked', publisher: 'Ecofin Agency' },
      ],
    },
  ],
};
