import type { BlogPost } from '@/lib/blog';

export const post: BlogPost = {
  slug: 'eudr-regulation-complete-guide',
  title: 'EUDR Regulation: Complete 2026 Guide (New December Deadline)',
  description: 'EUDR was delayed again — the new deadline is 30 December 2026. Who files a DDS, what geolocation data you need, and how to get compliant in time.',
  date: 'March 29, 2026',
  dateISO: '2026-03-29',
  dateModifiedISO: '2026-07-09',
  category: 'EUDR',
  readingTime: '12 min read',
  author: 'OriginTrace Compliance Team',
  authorRole: 'Supply Chain Compliance',
  coverImage: '/images/pexels-tomfisk-2231744.jpg',
  coverImageAlt: 'Aerial view of a red cargo ship being loaded at port',
  coverGradient: 'from-emerald-900/20 to-slate-800/50',
  tags: ['EUDR', 'Deforestation', 'Regulation', 'Compliance', 'EU Market', 'Exporters'],
  content: [
    {
      type: 'paragraph',
      text: 'The EU Deforestation Regulation (EUDR), officially Regulation (EU) 2023/1115, is a landmark piece of environmental trade legislation that ties access to the European Union market to verified proof that products have not contributed to deforestation. For exporters of agricultural commodities — particularly those in West Africa, East Africa, Southeast Asia, and Latin America — it represents the most significant shift in EU import requirements in a generation.',
    },
    {
      type: 'paragraph',
      text: 'Unlike previous sustainability frameworks that operated on a voluntary basis or relied on industry self-certification, EUDR is mandatory, legally enforced, and backed by penalties that include maximum fines of at least 4% of annual EU-wide turnover and temporary exclusion from the EU market. This guide provides a complete overview: what the regulation is, where it came from, who it affects, what compliance requires, and how exporters can build the systems to meet it.',
    },
    {
      type: 'h2',
      text: 'What Changed in the December 2025 Revision',
    },
    {
      type: 'paragraph',
      text: 'Before anything else: the dates you may have read elsewhere are stale. Regulation (EU) 2025/2650, published in the Official Journal on 23 December 2025, postponed EUDR for a second time. Large and medium operators now comply from 30 December 2026. Micro and small enterprises get until 30 June 2027. As of mid-2026, that leaves large and medium supply chains roughly six months.',
    },
    {
      type: 'paragraph',
      text: 'The revision also simplified how compliance works. Only the first operator placing a product on the EU market files a due diligence statement (DDS) — downstream operators and traders simply pass the DDS reference number along instead of filing their own. A DDS can now be submitted annually to cover expected volumes, rather than one per shipment. And a new "micro and small primary operator" category may use a postal address instead of GPS coordinates — but only in countries classified as low risk. Nigeria is standard risk, so that relief doesn\'t reach Nigerian farmers; their plots still need real coordinates.',
    },
    {
      type: 'callout',
      variant: 'deadline',
      title: 'The Current EUDR Dates',
      text: '30 December 2026: large and medium operators must comply. 30 June 2027: micro and small enterprises. Set by Regulation (EU) 2025/2650 — the second postponement. Treat December 2026 as final.',
    },
    {
      type: 'cta',
      heading: 'Every EUDR Requirement, Mapped Step by Step',
      text: 'Our EUDR compliance hub breaks down the geolocation, traceability, and documentation requirements — and shows how OriginTrace covers each one.',
      buttonText: 'Open the EUDR Compliance Hub',
      href: '/compliance/eudr',
    },
    {
      type: 'h2',
      text: 'Background: Why the EU Created EUDR',
    },
    {
      type: 'paragraph',
      text: 'The European Union\'s demand for agricultural commodities has historically been a driver of tropical deforestation. Cocoa production in West Africa, soy cultivation in the Amazon, and palm oil expansion in Southeast Asia have all been linked to forest clearance — in many cases to supply European markets. The EUDR is the EU\'s legislative response to this dynamic: a recognition that market access to the world\'s largest trading bloc comes with environmental responsibility.',
    },
    {
      type: 'paragraph',
      text: 'The regulation was adopted in June 2023 and builds on the previous EU Timber Regulation (EUTR), which applied similar due diligence requirements to wood products. EUDR extends the framework to seven additional commodity categories and applies a far more rigorous data standard — requiring GPS-based farm-level origin verification rather than general documentary assurances.',
    },
    {
      type: 'h2',
      text: 'Legislative Timeline: From Proposal to Enforcement',
    },
    {
      type: 'table',
      headers: ['Date', 'Milestone'],
      rows: [
        ['November 2021', 'European Commission publishes legislative proposal for the EU Deforestation Regulation'],
        ['April 2023', 'Regulation adopted by European Parliament'],
        ['June 2023', 'Regulation enters into force (Regulation (EU) 2023/1115)'],
        ['December 2024', 'First postponement (Regulation (EU) 2024/3234): application moved from 30 December 2024 to 30 December 2025 (large operators) and 30 June 2026 (SMEs)'],
        ['22 May 2025', 'Country benchmarking published (CIR (EU) 2025/1093): Ghana rated low risk; Nigeria and Côte d\'Ivoire standard risk'],
        ['23 December 2025', 'Second postponement plus simplification (Regulation (EU) 2025/2650): first-operator-only DDS, annual DDS option, new dates below'],
        ['30 December 2026', 'EUDR applies to large and medium operators'],
        ['30 June 2027', 'EUDR applies to micro and small enterprises'],
      ],
    },
    {
      type: 'h2',
      text: 'The Seven Covered Commodities',
    },
    {
      type: 'paragraph',
      text: 'EUDR applies to seven commodity categories and a wide range of derived products. Coverage is deliberately broad: the regulation applies not only to raw commodities but to any product that contains, has been fed with, or has been made using a covered commodity:',
    },
    {
      type: 'bullets',
      items: [
        'Cattle — live animals, fresh and processed meat, leather and hides, gelatin, collagen',
        'Cocoa — raw cocoa beans, cocoa butter, cocoa powder, cocoa paste, chocolate and chocolate preparations',
        'Coffee — raw and roasted coffee beans, ground coffee, soluble coffee, coffee extracts (see our [buyer\'s guide to Cameroon and Côte d\'Ivoire robusta](/blog/coffee-eudr-cameroon-cote-divoire-buyers-guide))',
        'Palm oil — crude and refined palm oil, palm kernel oil, palm fatty acid distillates, products containing palm oil',
        'Soy — soybeans, soy meal, soy flour, soy protein, soy oil, lecithin, livestock products fed with soy',
        'Wood — all timber, wood-based panels, pulp, paper, printed products, furniture made from wood',
        'Rubber — natural rubber, sheets, crepe, compounded rubber, rubber products including tyres',
      ],
    },
    {
      type: 'paragraph',
      text: 'The EU maintains a list of covered products by their Harmonised System (HS) codes. When assessing whether your product is in scope, the starting point is identifying its HS code and checking it against the EUDR Annex I product list. If your product contains a covered commodity as a significant input — even if it is a processed or manufactured product — it is likely in scope.',
    },
    {
      type: 'h2',
      text: 'Who Has Obligations: Operators vs. Traders',
    },
    {
      type: 'paragraph',
      text: 'EUDR distinguishes between two categories of businesses with compliance obligations:',
    },
    {
      type: 'paragraph',
      text: 'Operators are businesses that place covered commodities and products on the EU market for the first time (importers) or export them from the EU market. Under the December 2025 revision, the full due diligence obligation — collect information, assess risk, mitigate risk, submit the due diligence statement (DDS) — sits with the first operator placing the product on the market. For exporters in producing countries, that\'s almost always your EU-based importer. But that importer can\'t complete their DDS without verified data from you.',
    },
    {
      type: 'paragraph',
      text: 'Traders and downstream operators — businesses handling covered products after that first placement — no longer file their own DDS. They pass the upstream DDS reference number along the chain, and they\'re responsible for only sourcing from operators who hold compliant references.',
    },
    {
      type: 'paragraph',
      text: 'In practice, for exporters in producing countries, the implication is direct: your EU buyer cannot complete their DDS without data you provide — GPS farm coordinates, documentary evidence of legal production, supply chain information. The compliance obligation is your buyer\'s, but the data burden is yours.',
    },
    {
      type: 'h2',
      text: 'The Core Principle: Proof of Non-Deforestation',
    },
    {
      type: 'paragraph',
      text: 'The central requirement of EUDR is proof that the covered commodity was not produced on land that was deforested or degraded after 31 December 2020. "Deforestation" under EUDR means conversion of forest to agricultural use. "Forest degradation" means structural changes that result in a reduction of forest cover or a change from primary forest or naturally regenerating forest to plantation forest.',
    },
    {
      type: 'paragraph',
      text: 'Proving non-deforestation requires GPS-based geographic data that can be checked against satellite deforestation maps. The standard requires GPS coordinates for every plot of land from which the commodity was sourced. For plots under 4 hectares, a single GPS point (latitude and longitude) is sufficient. For plots of 4 hectares or more, a polygon — a set of GPS coordinates defining the perimeter of the plot — is required. General regional or country-level origin claims are not sufficient.',
    },
    {
      type: 'callout',
      variant: 'deadline',
      title: 'Roughly Six Months to Go',
      text: 'EUDR applies from 30 December 2026 for large and medium operators, and from 30 June 2027 for micro and small enterprises (Regulation (EU) 2025/2650). Farm mapping is the slowest part of compliance — as of mid-2026, supply chains that haven\'t started are already tight on time.',
    },
    {
      type: 'h2',
      text: 'What Due Diligence Requires',
    },
    {
      type: 'paragraph',
      text: 'EUDR\'s due diligence process has three mandatory steps, all of which must be completed before a shipment is placed on the EU market:',
    },
    {
      type: 'numbered',
      items: [
        'Collect information. Gather all data required to evaluate the risk of deforestation: GPS coordinates for all source plots; documentation confirming the product was legally produced under the laws of the country of production; supply chain information identifying all operators and traders who handled the commodity between production and import.',
        'Assess risk. Evaluate whether the collected information indicates a non-negligible risk that the product originated from deforested or degraded land, or was produced in violation of relevant laws. Risk factors include the country classification (low, standard, or high risk), the complexity and transparency of the supply chain, and the reliability of the GPS data provided.',
        'Mitigate risk. If the risk assessment identifies non-negligible risk, take measures to mitigate it before importing. Mitigation may include obtaining independent audits, requesting additional information from suppliers, or conducting on-site inspections. If risk cannot be mitigated to a negligible level, the import must not proceed.',
      ],
    },
    {
      type: 'h2',
      text: 'The Due Diligence Statement: Submitting to TRACES NT',
    },
    {
      type: 'paragraph',
      text: 'After completing due diligence, operators must submit a due diligence statement (DDS) to the EU\'s TRACES NT (Trade Control and Expert System) information system. The DDS is the formal declaration that due diligence was conducted and the product meets EUDR requirements. EU Member State customs authorities check DDS references at ports of entry — a shipment arriving without a registered DDS will not be cleared.',
    },
    {
      type: 'paragraph',
      text: 'Each DDS includes: the commodity and HS code, the country of origin, geolocation data for source plots, the quantity, the supply chain entities involved, and the operator\'s attestation that due diligence was completed. The DDS must be submitted before the product is placed on the market — it cannot be submitted retroactively. Since the December 2025 revision, a DDS can also be filed annually to cover expected volumes, rather than one per shipment.',
    },
    {
      type: 'paragraph',
      text: 'One practical caveat: the EUDR Information System reportedly paused new DDS submissions from around February 2026 while the Commission rebuilt it around the simplified rules, with a relaunch expected around June 2026. Check the Commission\'s Green Forum for the current submission status before you plan around it.',
    },
    {
      type: 'h2',
      text: 'Country Risk Classification',
    },
    {
      type: 'paragraph',
      text: 'The European Commission published its country benchmarking on 22 May 2025 (Commission Implementing Regulation (EU) 2025/1093), classifying producing countries into three risk tiers. The tier determines how intensive due diligence must be — and what share of operators the authorities check each year:',
    },
    {
      type: 'table',
      headers: ['Risk Tier', 'Due Diligence Required', 'Minimum Check Rate', 'West African Examples'],
      rows: [
        ['Low risk', 'Simplified due diligence — reduced data collection requirements', '1% of operators', 'Ghana'],
        ['Standard risk', 'Full due diligence — GPS data, DDS, complete deforestation and legality check', '3% of operators', 'Nigeria, Côte d\'Ivoire'],
        ['High risk', 'Enhanced due diligence — additional scrutiny, possible on-site verification', '9% of operators', 'No West African producer countries currently listed'],
      ],
    },
    {
      type: 'paragraph',
      text: 'Country risk classifications are reviewed by the Commission and can change. Exporters and their EU buyers should monitor classification updates, as a change in classification affects the due diligence intensity required and may require changes to existing compliance systems.',
    },
    {
      type: 'h2',
      text: 'The Penalties for Non-Compliance',
    },
    {
      type: 'bullets',
      items: [
        'Fines: for the most serious violations, Article 25 requires the maximum fine to be set at no less than 4% of the operator\'s total annual EU-wide turnover, proportionate to the environmental damage caused',
        'Confiscation: non-compliant products and revenues derived from their sale can be confiscated',
        'Temporary exclusion from EU procurement: operators found in serious breach can be excluded from public procurement contracts',
        'Import bans: Member State authorities can prohibit the placing on the market or export of non-compliant products',
        'Reputational publication: decisions finding violations must be made public, including the identity of the operator and the nature of the violation',
      ],
    },
    {
      type: 'cta',
      heading: 'See How Ready Your Next Shipment Is',
      text: 'Those penalties land on your EU buyer — and buyers facing 4% fines drop suppliers who can\'t produce clean data. Get your farms mapped and your documents in one place before December.',
      buttonText: 'Book a Demo',
      href: '/demo',
    },
    {
      type: 'h2',
      text: 'How OriginTrace Supports EUDR Compliance',
    },
    {
      type: 'paragraph',
      text: 'OriginTrace was designed specifically to solve the data infrastructure challenge that EUDR creates for exporters operating through smallholder-based supply chains. The platform provides: GPS farm mapping and polygon capture through offline-capable mobile tools; farmer identity registration that links GPS plots to verified producers; lot-level chain-of-custody tracking from farm intake through processing to export; compliance document management with certificate expiry alerts; and automated generation of the GPS and supply chain data packages that EU importers need to complete their EUDR due diligence and DDS submissions.',
    },
    {
      type: 'paragraph',
      text: 'The practical result is that OriginTrace users can hand their EU buyer a complete, verified data package for each export consignment — GPS coordinates, producer records, chain-of-custody records, and compliance documents — rather than requiring the buyer to accept general assurances or conduct their own verification. This reduces the buyer\'s compliance burden, accelerates DDS submission, and makes your product demonstrably easier to source than a competitor\'s without traceability.',
    },
    {
      type: 'h2',
      text: 'Practical EUDR Compliance Roadmap',
    },
    {
      type: 'numbered',
      items: [
        'Map your covered commodity exposure: identify which of your export products fall under the seven EUDR categories and which EU markets you are shipping to',
        'Audit your current GPS coverage: what percentage of your sourcing farms have GPS data? For farms of 4 hectares or more, do you have polygons or only points?',
        'Build your farmer registry: ensure all farms in your supply chain are registered with a unique identifier, linked to GPS data and a named farmer identity',
        'Implement lot tracking through processing: establish the data trail that links incoming raw material lots (with GPS farm data) to outgoing processed and export lots',
        'Organise your compliance document library: ensure certificates of origin, phytosanitary certificates, legality evidence, and test certificates are stored digitally, linked to specific lots, and tracked for expiry',
        'Set up an EU TRACES NT account: your EU buyer will need this to submit DDS, but you should be familiar with the data it requires so your data package is ready',
        'Engage your EU buyers: understand exactly what data format they need to complete their DDS — coordinates, document references, supply chain entity information',
        'Run a compliance test shipment: before the 30 December 2026 deadline makes it mandatory, test the full process with a single consignment to identify and resolve gaps before they cause a customs hold',
      ],
    },
    {
      type: 'paragraph',
      text: 'If cocoa is your commodity, our [practical guide to EUDR compliance tools for cocoa exporters](/blog/eudr-compliance-tools-cocoa-exporters-practical-guide) turns this roadmap into a concrete field workflow — GPS polygon mapping, batch traceability, and DDS data packs. Importing cocoa into the EU rather than exporting it? Our [EUDR readiness guide for cocoa importers](/blog/eudr-cocoa-compliance-importers-readiness-guide) covers the operator-side obligations instead.',
    },
    {
      type: 'faq',
      items: [
        {
          q: 'Is EUDR delayed again?',
          a: 'Yes — twice now. Regulation (EU) 2024/3234 pushed the original December 2024 date back a year, and Regulation (EU) 2025/2650 (published 23 December 2025) pushed it again. The current dates are 30 December 2026 for large and medium operators and 30 June 2027 for micro and small enterprises. There\'s no indication of a third delay — plan for December 2026.',
        },
        {
          q: 'When does EUDR apply?',
          a: 'From 30 December 2026 if you\'re a large or medium operator (or supply one — most EU importers are), and from 30 June 2027 if you\'re a micro or small enterprise placing product on the EU market yourself.',
        },
        {
          q: 'Does EUDR apply to my product?',
          a: 'EUDR covers seven commodities — cattle, cocoa, coffee, oil palm, rubber, soya, and wood — plus derived products listed by HS code in Annex I: chocolate, leather, tyres, paper, furniture, and more. Sesame, ginger, cashew, and shea are not covered. Check your product\'s HS code against Annex I to be sure.',
        },
        {
          q: 'What is a DDS?',
          a: 'A due diligence statement — a formal declaration, submitted through the EU\'s Information System, that due diligence was carried out and the product is deforestation-free and legally produced. It carries the geolocation data for every source plot. Since December 2025, only the first operator placing the product on the EU market files it; everyone downstream passes the reference number along, and it can be filed annually rather than per shipment.',
        },
        {
          q: 'Is Nigeria or Ghana high risk under EUDR?',
          a: 'Neither. Under CIR (EU) 2025/1093, Ghana is low risk (simplified due diligence, 1% check rate) and Nigeria and Côte d\'Ivoire are standard risk (full due diligence, 3% check rate). No West African producer country is currently on the high-risk list.',
        },
      ],
    },
    {
      type: 'cta',
      heading: 'Assess Your EUDR Readiness',
      text: 'See how ready your next shipment is. OriginTrace assesses your GPS coverage, traceability chain, and documentation — and shows exactly what to fix before December 2026.',
      buttonText: 'Book a Demo',
      href: '/demo',
    },
    {
      type: 'references',
      items: [
        { label: 'Regulation (EU) 2023/1115 — EU Deforestation Regulation', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32023R1115', publisher: 'EUR-Lex' },
        { label: 'Regulation (EU) 2024/3234 — first postponement of EUDR application dates', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32024R3234', publisher: 'EUR-Lex' },
        { label: 'Regulation (EU) 2025/2650 — second postponement and simplification of EUDR application dates', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32025R2650', publisher: 'EUR-Lex' },
        { label: 'Commission Implementing Regulation (EU) 2025/1093 — EUDR country benchmarking', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32025R1093', publisher: 'EUR-Lex' },
        { label: 'European Commission — EUDR implementation and Green Forum updates', url: 'https://green-business.ec.europa.eu/deforestation-regulation_en', publisher: 'European Commission' },
      ],
    },
  ],
};
