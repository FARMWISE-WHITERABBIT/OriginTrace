import type { BlogPost } from '@/lib/blog';

export const post: BlogPost = {
  slug: 'how-to-verify-supplier-eudr-claims',
  title: 'How to Verify a Supplier\'s \'EUDR-Ready\' Claim',
  description: 'Every supplier says they\'re EUDR-ready. You carry the liability if they\'re wrong. A 5-step workflow to verify supplier claims before you sign.',
  date: 'July 9, 2026',
  dateISO: '2026-07-09',
  category: 'EUDR',
  readingTime: '8 min read',
  author: 'OriginTrace Compliance Team',
  authorRole: 'Supply Chain Compliance',
  coverImage: '/images/pexels-mikhail-nilov-8332326.jpg',
  coverImageAlt: 'Aerial top-down view of neatly divided green agricultural plots',
  coverGradient: 'from-emerald-900/30 to-slate-800/50',
  tags: ['EUDR', 'Supplier Due Diligence', 'Importers', 'Geolocation', 'Cocoa', 'Risk Assessment'],
  content: [
    {
      type: 'paragraph',
      text: 'Somewhere in your inbox right now there\'s a supplier pitch with the phrase "fully EUDR compliant" in it. Maybe a badge on their website. Maybe a one-page certificate PDF. And here\'s the uncomfortable part: you have no idea whether any of it is true — and if it isn\'t, the fine lands on you, not them.',
    },
    {
      type: 'paragraph',
      text: 'The EU Deforestation Regulation — Regulation (EU) 2023/1115 — makes the EU importer, not the origin supplier, legally responsible for proving that cocoa, coffee, and the other covered commodities are deforestation-free. After the second delay under Regulation (EU) 2025/2650 (published 23 December 2025), large and medium operators must comply from 30 December 2026. As of July 2026, that\'s roughly six months away. This guide gives you a practical workflow to test a supplier\'s claim before you commit a contract to it.',
    },
    {
      type: 'callout',
      variant: 'deadline',
      title: 'You\'re in the final window',
      text: 'Large and medium operators must comply with EUDR from 30 December 2026; micro and small enterprises from 30 June 2027 (Reg (EU) 2025/2650). Cocoa contracted now will very likely arrive under the live regime. Supplier verification is no longer a next-quarter task.',
    },
    {
      type: 'h2',
      text: 'Why "EUDR-Ready" Isn\'t Something a Supplier Can Promise You',
    },
    {
      type: 'paragraph',
      text: 'Under EUDR, the operator — the business that first places the goods on the EU market, which is usually you, the importer — files the due diligence statement (DDS) through the EU Information System (TRACES). A DDS is basically a signed declaration to the EU that the product didn\'t come from land deforested after 31 December 2020, backed by geolocation data for every plot of origin. Your supplier can hand you data. They cannot file your DDS, and their declaration alone does not discharge your duty to assess and mitigate risk yourself.',
    },
    {
      type: 'paragraph',
      text: 'So when a pitch deck says "EUDR compliant", read it as "we believe our data would let you comply". That belief is worth exactly as much as the data behind it. And the downside is real: under Article 25, penalties include fines of at least 4% of your EU-wide annual turnover, confiscation of the products and the revenues from them, and temporary exclusion from the EU market.',
    },
    {
      type: 'callout',
      variant: 'tip',
      title: 'New to the regulation itself?',
      text: 'This post assumes you know the basics of EUDR. If you want the full picture — commodities covered, the three-step due diligence process, what goes into a DDS — start with our [EUDR readiness guide for cocoa importers](/blog/eudr-cocoa-compliance-importers-readiness-guide), then come back here.',
    },
    {
      type: 'h2',
      text: 'Doesn\'t Ghana\'s Low-Risk Rating Cover Me?',
    },
    {
      type: 'paragraph',
      text: 'Partly — and this is the nuance suppliers love to blur. The EU\'s country benchmarking under Commission Implementing Regulation (EU) 2025/1093 (22 May 2025) classified Ghana as low risk, while Nigeria and Côte d\'Ivoire sit at standard risk. Low risk means authorities check just 1% of operators sourcing from that country and you can apply simplified due diligence. Standard risk means 3% checks and a full risk assessment plus mitigation on your side.',
    },
    {
      type: 'paragraph',
      text: 'But look closely at what low risk actually reduces: the frequency of authority checks and the depth of your risk assessment. It does not remove your duty to collect geolocation data, confirm legality, and file the DDS. A false claim in a DDS from Ghana is punished exactly like a false claim from anywhere else. "We\'re in a low-risk country, so don\'t worry about the coordinates" is a red flag, not reassurance.',
    },
    {
      type: 'h2',
      text: 'The 5-Step Supplier Verification Workflow',
    },
    {
      type: 'paragraph',
      text: 'You don\'t need a satellite team to test a supplier\'s claim. You need an afternoon, a sample of their data, and a healthy level of suspicion. This workflow checks whether the geodata is real — if you also need to confirm the company itself is legitimate before you wire a deposit, see our [guide to verifying a Nigerian exporter](/blog/verify-nigerian-exporter-legitimacy). Here\'s the workflow we recommend to importers:',
    },
    {
      type: 'numbered',
      items: [
        'Verify the company exists and can legally export. Check the corporate registry in the origin country, the export licence or registration with the relevant national authority (for cocoa in Ghana, that means a licence under COCOBOD\'s regime), and that the entity on the pitch deck matches the entity on the contract. You\'d be surprised how often it doesn\'t.',
        'Request a sample data pack — before you sign anything. Ask for plot geodata in GeoJSON format, a farmer registry, and a batch-to-plot mapping for one real, recent shipment. A supplier with genuine traceability can produce this in days. A supplier who asks "what\'s GeoJSON?" has answered your question.',
        'Cross-check the coordinates against public satellite data. Load the plots into Global Forest Watch, and compare against the JRC\'s global forest cover map and the Hansen/GLAD tree-cover-loss datasets. You\'re looking for tree-cover loss after 31 December 2020 inside or overlapping the plots. These tools are free and browser-based — there\'s no excuse to skip this.',
        'Check the geodata meets the legal format. EUDR requires a GPS point for plots under 4 hectares and full polygons for plots of 4 hectares or more. A "compliant" data pack that\'s all single points, including for large farms, won\'t survive contact with a competent authority.',
        'Run internal-consistency checks on the data itself. This is where fabricated data falls apart — see the red flags below. Then ask the supplier to walk you through how one specific batch maps back to specific plots. If the answer involves a long pause, keep reading.',
      ],
    },
    {
      type: 'h2',
      text: 'Geodata Red Flags You Can Spot in an Afternoon',
    },
    {
      type: 'paragraph',
      text: 'Fabricated or recycled plot data has a signature. None of these checks require GIS expertise — a spreadsheet and a free mapping tool will do.',
    },
    {
      type: 'table',
      headers: ['Red flag', 'What it usually means'],
      rows: [
        ['Plots that are perfect rectangles or identical shapes', 'Polygons drawn at a desk, not walked in the field. Real smallholder plots are irregular.'],
        ['Coordinates in the sea, on roads, or in village centres', 'Copy-paste errors or invented points — nobody grows cocoa in the Gulf of Guinea.'],
        ['One coordinate reused across many farmers', 'A single reference point stamped onto a whole registry. Plot-level traceability doesn\'t exist.'],
        ['Polygon areas wildly out of line with claimed volumes', 'Run a yield sanity check: 2 hectares of cocoa doesn\'t produce 40 tonnes. Inflated volumes mean untraced crop is entering the batch.'],
        ['No plot-level production or harvest dates', 'You can\'t evidence the 31 December 2020 cutoff without knowing when and where production happened.'],
        ['Points only, even for plots that are clearly 4+ hectares', 'The data was collected before (or without regard to) EUDR\'s polygon requirement.'],
      ],
    },
    {
      type: 'cta',
      heading: 'Verify a Supplier Before You Commit',
      text: 'OriginTrace runs these checks for you — plot geometry, satellite cross-reference, batch-to-plot consistency — and turns them into a supplier risk snapshot you can act on before the contract is signed.',
      buttonText: 'Request a Supplier Risk Snapshot',
      href: '/demo?role=buyer',
    },
    {
      type: 'h2',
      text: 'The Aggregation Problem: Where Most Claims Fall Apart',
    },
    {
      type: 'paragraph',
      text: 'Here\'s the structural issue behind most shaky "EUDR-ready" claims. West African cocoa is overwhelmingly smallholder-grown, and smallholder crop gets pooled — at the village buying station, at the cooperative warehouse, at the aggregator\'s depot — long before it\'s sold to you. Once beans from fifty farms sit in one heap, no amount of paperwork after the fact can tell you which plots your batch actually came from.',
    },
    {
      type: 'paragraph',
      text: 'That means the only chain of custody worth trusting is one built at the collection level: each farmer\'s delivery recorded against their registered plots at the moment of purchase, batches assembled from identified deliveries, and that linkage carried through to the export lot. Ask your supplier one question: "When your agent buys from a farmer, what gets recorded, and on what?" If the honest answer is a paper ledger reconciled monthly, the plot-to-batch mapping in their data pack was reconstructed afterwards — which is a polite word for guessed.',
    },
    {
      type: 'image',
      src: '/images/pexels-zeal-creative-studios-58866141-31283913.jpg',
      alt: 'Hands sorting and spreading drying cocoa beans',
      caption: 'Once smallholder deliveries are pooled, plot-to-batch traceability can\'t be reconstructed after the fact — it has to be captured at collection.',
    },
    {
      type: 'h2',
      text: 'What a Credible Supplier Data Pack Looks Like',
    },
    {
      type: 'paragraph',
      text: 'The sample data pack is your single best verification tool, so it\'s worth knowing what good looks like versus what a spreadsheet of copy-pasted points looks like.',
    },
    {
      type: 'table',
      headers: ['Component', 'Credible', 'Not credible'],
      rows: [
        ['Plot geodata', 'GeoJSON with irregular polygons for plots ≥4 ha, points for smaller plots, capture dates included', 'An Excel sheet of lat/long pairs, many suspiciously similar, no dates'],
        ['Farmer registry', 'Farmer IDs linked to specific plots, with names, ID numbers, and registration dates', 'A name list with one shared community coordinate'],
        ['Batch-to-plot mapping', 'Each batch traces to identified farmer deliveries with weights and collection dates', 'A statement that "all cocoa comes from our registered farmers"'],
        ['Volume coherence', 'Batch weights consistent with plot areas at plausible yields', 'Volumes that would need every farm to triple typical output'],
        ['Legality evidence', 'Licences, land-use documentation, and the supplier\'s own due diligence records', 'A self-signed "certificate of EUDR compliance"'],
      ],
    },
    {
      type: 'paragraph',
      text: 'One more tell: a credible supplier expects these questions and answers them quickly, because their system generates this data as a by-product of how they already buy cocoa. Defensiveness — "our data is confidential", "no buyer has ever asked for this" — is information too. Plenty of buyers are asking now, and every serious one will be by December.',
    },
    {
      type: 'h2',
      text: 'Make Verification Permanent: Put Your Suppliers on the Platform',
    },
    {
      type: 'paragraph',
      text: 'Everything in this guide is a point-in-time check. It tells you a supplier was credible the week you looked. The stronger position is standing visibility: importers on OriginTrace onboard their exporters onto the platform, and make on-platform documentation part of the order itself. [See how the buyer workspace works](/importers).',
    },
    {
      type: 'paragraph',
      text: 'What that changes in practice: the exporter maintains farm polygons, batch-to-plot mapping, lab results, and compliance documents inside OriginTrace as they operate — and you see the same records from your buyer workspace, shipment by shipment. You\'re no longer requesting a data pack and hoping it\'s honest; you\'re watching it accumulate. Verification stops being an audit and becomes the default state of the relationship.',
    },
    {
      type: 'faq',
      items: [
        {
          q: 'What does "EUDR-compliant supplier" actually mean?',
          a: 'Legally, nothing. EUDR places the due diligence obligation on the EU operator — usually the importer — who must file a due diligence statement via TRACES. A supplier can be EUDR-capable, meaning they can give you plot-level geolocation, legality evidence, and batch traceability good enough to base your DDS on. But there\'s no certification a supplier can hold that transfers your legal duty to them.',
        },
        {
          q: 'Who is liable if my supplier\'s data turns out to be wrong?',
          a: 'You are. The operator who files the DDS bears responsibility for its accuracy, and under Article 25 of Regulation (EU) 2023/1115 penalties include fines of at least 4% of EU-wide annual turnover, confiscation of products and revenues, and temporary market bans. Demonstrating that you took reasonable steps to verify supplier data is your main protection — which is exactly why this workflow matters.',
        },
        {
          q: 'Is Ghana low-risk under EUDR?',
          a: 'Yes. Under the country benchmarking in CIR (EU) 2025/1093, Ghana is classified as low risk, which means simplified due diligence and a 1% authority check rate. Nigeria and Côte d\'Ivoire are standard risk (3% checks, full risk assessment and mitigation). But low risk reduces authority scrutiny — it doesn\'t remove your obligation to collect geolocation data and file an accurate DDS.',
        },
        {
          q: 'Can I rely on Rainforest Alliance or similar certification?',
          a: 'It helps, but it doesn\'t replace your due diligence. Certification schemes can be useful supporting evidence in your risk assessment — they show a supplier has systems and audits. But EUDR explicitly requires the operator\'s own due diligence, and certification doesn\'t verify plot-level geolocation against the 31 December 2020 deforestation cutoff for your specific batches. Treat it as one input, not an answer.',
        },
        {
          q: 'When do I actually have to comply?',
          a: 'After the second postponement under Regulation (EU) 2025/2650, large and medium operators must comply from 30 December 2026, and micro and small enterprises from 30 June 2027. Cocoa you\'re contracting in mid-2026 will land under the live regime, so supplier verification needs to happen now, not at year-end.',
        },
      ],
    },
    {
      type: 'cta',
      heading: 'Six Months Is Enough — If You Start Now',
      text: 'Verification is step one. Step two is bringing your suppliers onto OriginTrace, so every future lot arrives with plot geometry, batch traceability, and DDS-ready evidence attached by default — maintained by the exporter, visible to you. Book a demo and see the importer workspace with a real supply chain in it.',
      buttonText: 'Bring Your Suppliers Onto OriginTrace',
      href: '/importers',
    },
    {
      type: 'references',
      items: [
        {
          label: 'Regulation (EU) 2023/1115 on deforestation-free products (EUDR)',
          url: 'https://eur-lex.europa.eu/eli/reg/2023/1115/oj',
          publisher: 'EUR-Lex, Official Journal of the European Union',
        },
        {
          label: 'Regulation (EU) 2025/2650 amending Regulation (EU) 2023/1115 as regards application dates',
          url: 'https://eur-lex.europa.eu/eli/reg/2025/2650/oj',
          publisher: 'EUR-Lex, Official Journal of the European Union, 23 December 2025',
        },
        {
          label: 'Commission Implementing Regulation (EU) 2025/1093 — country benchmarking (risk classification)',
          url: 'https://eur-lex.europa.eu/eli/reg_impl/2025/1093/oj',
          publisher: 'EUR-Lex, Official Journal of the European Union, 22 May 2025',
        },
        {
          label: 'Global Forest Watch — forest monitoring and tree-cover-loss data',
          url: 'https://www.globalforestwatch.org/',
          publisher: 'World Resources Institute',
        },
        {
          label: 'EU Observatory on Deforestation and Forest Degradation (JRC global forest maps)',
          url: 'https://forest-observatory.ec.europa.eu/',
          publisher: 'European Commission, Joint Research Centre',
        },
      ],
    },
  ],
};
