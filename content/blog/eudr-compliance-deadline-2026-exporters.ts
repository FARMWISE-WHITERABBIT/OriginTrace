import type { BlogPost } from '@/lib/blog';

export const post: BlogPost = {
  slug: 'eudr-compliance-deadline-2026-exporters-guide',
  title: 'EUDR Deadline: December 2026 — Your 6-Month Exporter Plan',
  description: 'EUDR now applies from 30 December 2026 — roughly six months away. Here\'s what changed, what data you need, and where exporters are still falling short.',
  date: 'February 28, 2026',
  dateISO: '2026-02-28',
  dateModifiedISO: '2026-07-09',
  category: 'Regulatory',
  readingTime: '7 min read',
  author: 'OriginTrace Compliance Team',
  authorRole: 'Supply Chain Compliance',
  coverImage: '/images/pexels-rafael-de-campos-2705062-4256976.jpg',
  coverImageAlt: 'Aerial view of a busy cargo port with shipping containers',
  coverGradient: 'from-emerald-900/20 to-slate-800/50',
  tags: ['EUDR', 'Deadline', 'Exporters', 'Compliance', 'EU Regulations', 'December 2026'],
  content: [
    {
      type: 'paragraph',
      text: 'If you export cocoa, coffee, or rubber to Europe, you\'ve now heard this news twice: the [EU Deforestation Regulation](/blog/eudr-regulation-complete-guide) (EUDR, Regulation (EU) 2023/1115) has been delayed again. Regulation (EU) 2025/2650, published in December 2025, moved the compliance date to 30 December 2026 for large and medium operators — and 30 June 2027 for micro and small enterprises.',
    },
    {
      type: 'paragraph',
      text: 'Here\'s the thing: a delay isn\'t a reprieve. It\'s a countdown you can actually see. As of July 2026, you\'ve got roughly six months — and farm mapping alone can eat most of that. This guide walks you through what changed, what the regulation still demands, and exactly what to do with the time you have left.',
    },
    {
      type: 'callout',
      variant: 'deadline',
      title: 'The Real EUDR Dates',
      text: '30 December 2026: large and medium operators must comply. 30 June 2027: micro and small enterprises. Both set by Regulation (EU) 2025/2650 — the second postponement. If your buyers are large EU importers, their deadline is effectively yours.',
    },
    {
      type: 'cta',
      heading: 'Every EUDR Requirement in One Place',
      text: 'Our EUDR compliance hub breaks down the geolocation, traceability, and documentation requirements — and shows how OriginTrace covers each one.',
      buttonText: 'Open the EUDR Compliance Hub',
      href: '/compliance/eudr',
    },
    {
      type: 'h2',
      text: 'What Changed in December 2025 (Besides the Date)?',
    },
    {
      type: 'paragraph',
      text: 'The December 2025 revision didn\'t just move the deadline. It simplified how compliance actually works — and some of these changes genuinely help exporters:',
    },
    {
      type: 'bullets',
      items: [
        'One DDS, filed once. Only the first operator placing a product on the EU market files a due diligence statement. Downstream operators and traders just pass the DDS reference number along — they no longer file their own.',
        'Annual filing. A DDS can now cover expected volumes for a year instead of being submitted per shipment. For a regular trade lane, that\'s a big cut in paperwork.',
        'Postal addresses for the smallest producers — but only in low-risk countries. A new "micro and small primary operator" category may use a postal address instead of GPS coordinates. Ghana qualifies as low risk; Nigeria doesn\'t.',
      ],
    },
    {
      type: 'paragraph',
      text: 'That last point matters. If your supply chain sits in Nigeria or Côte d\'Ivoire — both standard risk — nothing about the geolocation requirement has softened for you. Points and polygons are still the job.',
    },
    {
      type: 'h2',
      text: 'Which Commodities Does EUDR Cover?',
    },
    {
      type: 'paragraph',
      text: 'EUDR Annex I covers seven commodities and their derived products:',
    },
    {
      type: 'bullets',
      items: [
        'Cocoa — beans, butter, powder, paste, chocolate',
        'Coffee — roasted, ground, instant, extracts',
        'Oil palm — crude and refined palm oil, fractions, palm kernel products',
        'Rubber — natural rubber and products made from it, including tyres',
        'Soya — soybeans, meal, oil, flour, lecithin',
        'Cattle — live animals, meat, leather, hides',
        'Wood — all wood and wood products including paper, pulp, and printed products',
      ],
    },
    {
      type: 'paragraph',
      text: 'Coverage extends to processed products — a chocolate bar is covered, so are leather shoes. But it\'s just as important to know what\'s not covered: sesame, ginger, cashew, and shea sit entirely outside EUDR. If those are your commodities, your EU compliance burden lives elsewhere — food safety controls, not deforestation rules.',
    },
    {
      type: 'h2',
      text: 'The Core Requirement: Prove Your Land Wasn\'t Deforested',
    },
    {
      type: 'paragraph',
      text: 'At the heart of EUDR is one principle: the product must not come from land deforested after 31 December 2020. Proving that takes geolocation data — a GPS point for every plot under 4 hectares, and a full polygon (the plot\'s perimeter coordinates) for plots of 4 hectares or more. A general statement that your product is "deforestation-free" doesn\'t count. The coordinates get checked against satellite deforestation maps.',
    },
    {
      type: 'h2',
      text: 'The Three Steps of Due Diligence',
    },
    {
      type: 'numbered',
      items: [
        'Collect information: GPS coordinates for all source plots, documentation confirming legal production, and supply chain records identifying who produced, traded, and transported the commodity.',
        'Assess risk: does anything in that information suggest a non-negligible risk of deforestation? Country classification, supply chain complexity, and data reliability all feed in.',
        'Mitigate risk: if the risk isn\'t negligible, address it — extra documentation, independent audits, on-site checks — before the product goes to market. If it can\'t be mitigated, the shipment doesn\'t go.',
      ],
    },
    {
      type: 'h2',
      text: 'The DDS and the EU Information System',
    },
    {
      type: 'paragraph',
      text: 'The output of due diligence is a due diligence statement (DDS) — basically a signed declaration to the EU that your product didn\'t come from deforested land — submitted through the EU\'s Information System. Customs authorities check the DDS reference when the shipment arrives. No DDS, no clearance. Under the revised rules, the first operator placing the product on the market files it, and it can cover a year\'s expected volumes.',
    },
    {
      type: 'paragraph',
      text: 'One operational note: the EUDR Information System reportedly paused new DDS submissions from around February 2026 while the Commission rebuilt it around the simplified rules, with a relaunch expected around June 2026. Check the Commission\'s Green Forum for the current status before you plan a submission — don\'t rely on secondhand timelines.',
    },
    {
      type: 'cta',
      heading: 'See How Ready Your Next Shipment Is',
      text: 'OriginTrace maps your farms, links every lot to its source, and packages the exact data your EU buyer needs for their DDS. See it running on your own supply chain.',
      buttonText: 'Book a Demo',
      href: '/demo',
    },
    {
      type: 'h2',
      text: 'Country Risk: Where Ghana, Nigeria and Côte d\'Ivoire Landed',
    },
    {
      type: 'paragraph',
      text: 'The Commission published its country benchmarking in May 2025 (Commission Implementing Regulation (EU) 2025/1093). Your production country\'s tier decides how hard authorities look at shipments from it:',
    },
    {
      type: 'table',
      headers: ['Risk Tier', 'Minimum Share of Operators Checked', 'West African Examples'],
      rows: [
        ['Low risk', '1% — plus simplified due diligence', 'Ghana'],
        ['Standard risk', '3% — full due diligence required', 'Nigeria, Côte d\'Ivoire'],
        ['High risk', '9% — enhanced scrutiny', 'No West African producer countries currently listed'],
      ],
    },
    {
      type: 'paragraph',
      text: 'Ghana\'s low-risk rating is a genuine commercial advantage: simplified due diligence and the lightest check rate. Nigeria and Côte d\'Ivoire at standard risk means full due diligence — GPS data, complete legality documentation, and a 3% check rate. Classifications get reviewed, so keep an eye on updates.',
    },
    {
      type: 'h2',
      text: 'What Most Exporters Are Still Getting Wrong',
    },
    {
      type: 'bullets',
      items: [
        'Collecting GPS points instead of polygons for plots of 4 hectares or more — a single coordinate doesn\'t satisfy the polygon requirement',
        'GPS data not linked to individual farmer identities — coordinates must tie back to a named, identifiable producer',
        'Traceability breaking at the processing step — farm GPS data exists, but the link between those farms and a specific export lot isn\'t maintained through processing',
        'Documents living in email attachments and folders instead of a system that tracks expiry dates',
        'Treating the delay as permission to pause — mapping a few thousand smallholder farms takes months, not weeks',
        'Assuming the buyer handles everything — the DDS obligation sits with the first operator in the EU, but they cannot file it without your data',
      ],
    },
    {
      type: 'h2',
      text: 'What Non-Compliance Actually Costs',
    },
    {
      type: 'paragraph',
      text: 'Article 25 sets the penalty floor: for the most serious violations, the maximum fine must be at least 4% of the operator\'s total annual EU-wide turnover. Add confiscation of products and revenues, and exclusion from the EU market. Those penalties hit your EU buyer directly — which means your real risk as an exporter is commercial. Importers facing 4% fines drop suppliers who can\'t produce clean data. Quietly, and fast.',
    },
    {
      type: 'h2',
      text: 'Your Six-Month Plan (July to December 2026)',
    },
    {
      type: 'numbered',
      items: [
        'July: list every covered commodity in your portfolio and every EU buyer. Ask each buyer exactly what data format they need for their DDS.',
        'July–September: map your farms — GPS points for plots under 4 hectares, polygons for 4 hectares or more. This is the longest task on the list. Start it first.',
        'August: link every mapped plot to a registered, named farmer. Unattributed coordinates won\'t pass a buyer\'s review.',
        'September–October: build lot-level traceability through processing, so each export lot traces back to its mapped source farms.',
        'October: consolidate compliance documents — certificates of origin, legality evidence, phytosanitary certificates — into one library with expiry tracking.',
        'November: run a dry-run data package for one consignment and have your EU buyer review it against their DDS requirements.',
        'December: close the gaps the dry run exposed. You want zero surprises on the 30th.',
      ],
    },
    {
      type: 'paragraph',
      text: 'If cocoa is what you export, our [practical guide to EUDR compliance tools for cocoa exporters](/blog/eudr-compliance-tools-cocoa-exporters-practical-guide) turns each item on this timeline into an actual field workflow — polygon mapping, batch traceability, and the DDS data pack your buyer needs.',
    },
    {
      type: 'faq',
      items: [
        {
          q: 'When does EUDR actually apply now?',
          a: 'From 30 December 2026 for large and medium operators, and 30 June 2027 for micro and small enterprises. Those dates were set by Regulation (EU) 2025/2650, the second postponement, published in December 2025.',
        },
        {
          q: 'Will EUDR be delayed a third time?',
          a: 'There\'s no sign of it. The December 2025 revision paired the delay with simplifications precisely so the rules could stick. A further Commission simplification package was reportedly expected in mid-2026 — check the Commission\'s Green Forum for the latest — but plan for 30 December 2026 as final.',
        },
        {
          q: 'Does EUDR cover sesame or ginger?',
          a: 'No. EUDR covers exactly seven commodities — cattle, cocoa, coffee, oil palm, rubber, soya, and wood — plus their derived products. Sesame, ginger, cashew, and shea are not covered.',
        },
        {
          q: 'Can Nigerian smallholders use the new postal-address exemption?',
          a: 'No. The micro and small primary operator relief only applies in low-risk countries. Nigeria is classified standard risk under CIR (EU) 2025/1093, so Nigerian plots still need GPS points or polygons. Ghana, rated low risk, is a different story.',
        },
        {
          q: 'Who files the DDS — me or my EU buyer?',
          a: 'Under the revised rules, only the first operator placing the product on the EU market files the DDS — usually your EU importer. Everyone downstream passes the reference number along. But your buyer can\'t file without your geolocation and supply chain data, so the data burden is still yours.',
        },
      ],
    },
    {
      type: 'cta',
      heading: 'Six Months Is Enough — If You Start Now',
      text: 'Get your farms mapped, your lots traced, and your documents in one place before December. OriginTrace was built for exactly this sprint.',
      buttonText: 'Get Your Farms Mapped',
      href: '/demo',
    },
    {
      type: 'references',
      items: [
        { label: 'Regulation (EU) 2023/1115 — EU Deforestation Regulation', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32023R1115', publisher: 'EUR-Lex' },
        { label: 'Regulation (EU) 2025/2650 — second postponement and simplification of EUDR application dates', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32025R2650', publisher: 'EUR-Lex' },
        { label: 'Commission Implementing Regulation (EU) 2025/1093 — EUDR country benchmarking', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32025R1093', publisher: 'EUR-Lex' },
        { label: 'European Commission — EUDR implementation and Green Forum updates', url: 'https://green-business.ec.europa.eu/deforestation-regulation_en', publisher: 'European Commission' },
      ],
    },
  ],
};
