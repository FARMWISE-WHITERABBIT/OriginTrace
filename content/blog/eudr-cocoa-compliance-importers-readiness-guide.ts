import type { BlogPost } from '@/lib/blog';

export const post: BlogPost = {
  slug: 'eudr-cocoa-compliance-importers-readiness-guide',
  title: 'EUDR Cocoa Compliance for Importers: A Readiness Guide',
  description: 'If you import cocoa into the EU, EUDR makes you directly responsible for verifying deforestation-free origin — not just your suppliers. This guide explains your obligations, what to demand from suppliers, and how to prepare your due diligence system.',
  date: 'February 10, 2026',
  dateISO: '2026-02-10',
  category: 'EUDR',
  readingTime: '10 min read',
  author: 'OriginTrace Compliance Team',
  authorRole: 'Supply Chain Compliance',
  coverGradient: 'from-amber-800/20 to-slate-800/50',
  tags: ['EUDR', 'Cocoa', 'Importers', 'Due Diligence', 'EU Compliance', 'Supply Chain'],
  content: [
    {
      type: 'paragraph',
      text: 'Most of the discussion around the EU Deforestation Regulation focuses on exporters in producing countries — the farmers, cooperatives, and trading companies in Ghana, Ivory Coast, or Nigeria who are scrambling to collect GPS data. But the regulation places equally significant obligations on the other end of the supply chain: the companies that import cocoa into the European Union.',
    },
    {
      type: 'paragraph',
      text: 'If your business brings cocoa beans, cocoa butter, cocoa powder, chocolate, or any other cocoa-derived product into the EU, you are an "operator" under EUDR. That means the legal responsibility for verifying deforestation-free origin rests with you — not just with your supplier.',
    },
    {
      type: 'callout',
      variant: 'info',
      title: 'Operators vs Traders under EUDR',
      text: 'Under EUDR, an "operator" is any business that places covered commodities on the EU market for the first time or exports them. A "trader" is any business further down the supply chain that makes the product available. Both have obligations — operators face the heaviest requirements, traders have lighter but still real obligations.',
    },
    {
      type: 'h2',
      text: 'What EUDR Requires from Cocoa Importers Specifically',
    },
    {
      type: 'paragraph',
      text: 'The regulation requires you to conduct due diligence before each import and to be able to demonstrate that you have done so. The three-step due diligence process is:',
    },
    {
      type: 'numbered',
      items: [
        'Information collection: gather all relevant information about the cocoa — geolocation of all farms in the supply chain, documentation confirming legal production in the country of origin, and information about the supply chain entities involved.',
        'Risk assessment: evaluate the risk that the cocoa does not comply with EUDR requirements, based on country and region of production, complexity of the supply chain, and any concerns about the reliability of the information provided.',
        'Risk mitigation: if the risk assessment identifies non-negligible risk, implement measures to mitigate it before proceeding with the import — or do not import.',
      ],
    },
    {
      type: 'h2',
      text: 'The Due Diligence Statement: Your Primary Compliance Document',
    },
    {
      type: 'paragraph',
      text: 'For each shipment of covered cocoa products you import, you must submit a due diligence statement (DDS) to the EU Information System (EU TRACES) before the goods are placed on the market. This statement references the GPS data from the source farms, the supply chain entities involved, and your assessment that the cocoa is deforestation-free and legally produced.',
    },
    {
      type: 'paragraph',
      text: 'The DDS is the document that Customs authorities check when your container arrives at a European port. If a DDS is missing, the shipment cannot be cleared. If the DDS contains inaccurate data, you are exposed to enforcement action — including fines of up to 4% of annual EU turnover under the most serious provisions.',
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'You Cannot Simply Pass Responsibility to Your Supplier',
      text: 'EUDR explicitly makes the importer responsible for conducting their own due diligence. Receiving a certificate from your supplier is not sufficient — you must independently assess the risk and verify the information. If your supplier provides false data and you import based on it, you bear legal exposure unless you can demonstrate you took reasonable steps to verify the information.',
    },
    {
      type: 'h2',
      text: 'What You Must Demand from Your Cocoa Suppliers',
    },
    {
      type: 'paragraph',
      text: 'Your supplier is your primary source of the GPS and supply chain data you need to complete your due diligence. The minimum you should require from any cocoa supplier selling to your EU business is:',
    },
    {
      type: 'bullets',
      items: [
        'GPS coordinates (preferably polygon coordinates) for every farm that contributed to the shipment volume',
        'Farmer identity data linked to each set of GPS coordinates — names and ID numbers',
        'A batch-level traceability report showing how the cocoa moved from farms through collection, processing, and export',
        'A statement from the supplier confirming the land was not deforested after 31 December 2020',
        'Supporting evidence that the cocoa was legally produced under the laws of the country of origin',
        'The supplier\'s own due diligence documentation',
      ],
    },
    {
      type: 'paragraph',
      text: 'In practice, the best suppliers are now providing this data through a supplier portal or as a data export from their traceability platform — a structured file that you can use directly in your own due diligence system rather than manually reviewing hundreds of paper documents.',
    },
    {
      type: 'h2',
      text: 'How to Assess Cocoa Origin Risk',
    },
    {
      type: 'paragraph',
      text: 'EUDR\'s risk classification system divides countries into three tiers: low, standard, and high risk. Currently, most West African cocoa-producing countries fall into the standard risk category, meaning you must conduct full due diligence but are not subject to enhanced scrutiny. If a country is classified as high risk, you face more intensive obligations including potential on-site checks.',
    },
    {
      type: 'paragraph',
      text: 'Beyond country-level risk, you also need to assess supply chain risk — which means asking yourself:',
    },
    {
      type: 'bullets',
      items: [
        'How many intermediaries are between the farm and the export? Each additional step increases the risk of data loss or misrepresentation.',
        'Does the supplier have a digital traceability system, or are they relying on paper records?',
        'What is the GPS polygon coverage rate — what percentage of farms in the supply base are mapped?',
        'Has the supplier previously had issues with deforestation flags or regulatory non-compliance?',
        'Is the origin region known to have active deforestation pressure?',
      ],
    },
    {
      type: 'h2',
      text: 'Building Your Internal Due Diligence System',
    },
    {
      type: 'paragraph',
      text: 'EUDR compliance for importers requires an internal system, not just a set of documents. The system needs to:',
    },
    {
      type: 'numbered',
      items: [
        'Track each shipment from origin country through to EU market placement',
        'Store the GPS data and supply chain documentation for each shipment, accessible for audit',
        'Record your risk assessment reasoning for each shipment',
        'Generate and submit DDS to EU TRACES',
        'Maintain records for a minimum of 5 years',
        'Alert you when documentation is missing or expiring',
      ],
    },
    {
      type: 'paragraph',
      text: 'Large commodity traders and chocolate manufacturers have compliance teams and enterprise software platforms for this. Mid-sized importers often lack these resources, which is where purpose-built compliance platforms can provide the structure at a fraction of the cost of a custom enterprise solution.',
    },
    {
      type: 'h2',
      text: 'Due Diligence Record Keeping: What to Keep and for How Long',
    },
    {
      type: 'table',
      headers: ['Document', 'What It Contains', 'Retention Period'],
      rows: [
        ['Due diligence statement', 'DDS reference, GPS data, supply chain entities', '5 years minimum'],
        ['GPS polygon data', 'Coordinates of each source farm', '5 years minimum'],
        ['Supplier traceability report', 'Batch-level data from farm to export', '5 years minimum'],
        ['Risk assessment record', 'Your documented assessment and conclusion', '5 years minimum'],
        ['Risk mitigation evidence', 'Actions taken where risk was identified', '5 years minimum'],
        ['Certificates of origin', 'Issued by competent authority in producing country', '5 years minimum'],
      ],
    },
    {
      type: 'h2',
      text: 'Supplier Qualification and Ongoing Monitoring',
    },
    {
      type: 'paragraph',
      text: 'EUDR is not a one-time compliance exercise. Each shipment requires a fresh due diligence process. However, you can streamline ongoing compliance by pre-qualifying your suppliers and establishing a monitoring framework:',
    },
    {
      type: 'bullets',
      items: [
        'Conduct a detailed initial assessment of each supplier\'s traceability system before the first purchase',
        'Require suppliers to maintain a digital traceability platform that gives you access to their supply chain data',
        'Establish a data format agreement — agree upfront what format the supplier will provide GPS and supply chain data in, so you can process it systematically',
        'Set up periodic reviews — at least annually — of each supplier\'s GPS coverage rate, system integrity, and any new deforestation concerns in their origin areas',
        'Require notification if any supplier changes their sourcing geography — new areas bring new deforestation risk profiles',
      ],
    },
    {
      type: 'h2',
      text: 'Preparing for EUDR Audits',
    },
    {
      type: 'paragraph',
      text: 'EU Member State competent authorities have the power to conduct checks on operators and traders. While the enforcement mechanism is still being fully established, the direction of travel is clear: compliance documentation will be checked, and businesses that cannot produce their due diligence records face consequences.',
    },
    {
      type: 'paragraph',
      text: 'When an auditor asks to see your EUDR compliance records for a specific cocoa shipment, you should be able to produce: the DDS reference number and submission confirmation, the GPS data underlying the DDS, your risk assessment record, and the supplier documentation you relied on. If this data is scattered across email attachments, spreadsheets, and shared drives, assembling it under audit pressure is difficult. Centralised storage from the point of the first import is the only reliable approach.',
    },
    {
      type: 'cta',
      heading: 'Give Your Buyers Full Traceability Access',
      text: 'OriginTrace includes a Buyer Portal that gives your EU customers direct access to supply chain data, GPS evidence, and DDS documentation — exactly what their compliance teams need.',
      buttonText: 'See the Buyer Portal',
      href: '/demo',
    },
  ],
};
