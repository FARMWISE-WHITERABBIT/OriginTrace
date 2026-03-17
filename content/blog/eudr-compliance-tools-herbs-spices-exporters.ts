import type { BlogPost } from '@/lib/blog';

export const post: BlogPost = {
  slug: 'eudr-compliance-tools-herbs-spices-exporters-practical-guide',
  title: 'EUDR Compliance for Herbs & Spice Exporters: A Practical Guide for Ginger, Turmeric, and More',
  description: 'Herbs and spices like ginger, turmeric, and pepper are now under EUDR scrutiny if they come from areas with deforestation risk. This guide explains what exporters need to do, what data they need to collect, and what tools make it manageable.',
  date: 'February 20, 2026',
  dateISO: '2026-02-20',
  category: 'EUDR',
  readingTime: '9 min read',
  author: 'OriginTrace Compliance Team',
  authorRole: 'Supply Chain Compliance',
  coverGradient: 'from-yellow-900/20 to-emerald-900/20',
  tags: ['EUDR', 'Ginger', 'Herbs', 'Spices', 'Turmeric', 'Exporters', 'Traceability'],
  content: [
    {
      type: 'paragraph',
      text: 'When people first hear about the EU Deforestation Regulation, they think of cocoa, soy, and palm oil. Ginger, turmeric, pepper, and other herbs and spices are less obvious targets — but that does not mean they are exempt. If your herbs or spices come from growing regions that overlap with forest land or have a history of agricultural expansion into forested areas, EUDR applies to you. And for many of West Africa\'s most important export commodities, that is exactly the situation.',
    },
    {
      type: 'callout',
      variant: 'info',
      title: 'Does EUDR Apply to Your Herb or Spice?',
      text: 'EUDR applies to any commodity listed in Annex I of the regulation AND products derived from those commodities. Ginger, turmeric, and pepper are not on the core EUDR commodity list — but they can still be affected if they are grown in areas where deforestation occurs or if EU buyers treat them as high-risk origins. Additionally, the regulation\'s scope is being reviewed and future expansion to additional commodities is likely.',
    },
    {
      type: 'paragraph',
      text: 'Even for herbs and spices that are not yet on the formal EUDR list, the practical reality is that European buyers are applying the same due diligence expectations across their entire agricultural supply chain. If you supply a European food company or trader, they will increasingly ask you for GPS origin data and traceability documentation regardless of whether your specific product is legally mandated under EUDR.',
    },
    {
      type: 'h2',
      text: 'The Ginger Export Context',
    },
    {
      type: 'paragraph',
      text: 'Nigeria is the world\'s largest producer of ginger, with the majority of production concentrated in Kaduna, Nassarawa, and Benue states. Nigerian ginger is exported to Europe, the United States, China, and the Middle East. The production is almost entirely smallholder — hundreds of thousands of individual farmers growing ginger on small plots, often in areas that adjoin forested land or secondary bush.',
    },
    {
      type: 'paragraph',
      text: 'This geography is exactly what European buyers are now scrutinising. When a European spice trader or food manufacturer\'s compliance team reviews your supply chain, they want to see that your ginger comes from verified farm locations — not just "from Nigeria" or "from Kaduna State." GPS data and traceability documentation are becoming standard requirements for maintaining contracts in the European market.',
    },
    {
      type: 'h2',
      text: 'The Turmeric and Pepper Situation',
    },
    {
      type: 'paragraph',
      text: 'Similar dynamics apply to turmeric (produced in Nigeria, Ghana, and across Southeast Asia) and black pepper (Nigeria, India, Vietnam). European buyers of these commodities are applying voluntary EUDR-equivalent standards to their procurement, and some major buyers have explicitly stated they will require GPS origin data from all herb and spice suppliers by 2026 regardless of legal mandate.',
    },
    {
      type: 'h2',
      text: 'What Data You Need to Collect',
    },
    {
      type: 'paragraph',
      text: 'Whether you are complying with a legal mandate or responding to buyer expectations, the data requirements are essentially the same. Here is what you need for each farm in your supply chain:',
    },
    {
      type: 'table',
      headers: ['Data Point', 'Why It Is Needed', 'How to Collect It'],
      rows: [
        ['Farm GPS coordinates', 'Links your commodity to a specific location that can be checked against deforestation maps', 'Field agent with GPS-enabled phone or mapping app'],
        ['Farm boundary polygon', 'Required for plots over 4 hectares; best practice for all plots', 'Field agent walks the boundary with GPS mapping tool'],
        ['Farmer identity', 'Creates the chain of custody from farm to export', 'Farmer registration with national ID number'],
        ['Farm area in hectares', 'Used for yield verification — unusually high yields per hectare can flag issues', 'Calculated from polygon or self-reported'],
        ['Land use history', 'Supports the deforestation-free claim', 'Local knowledge, satellite history check'],
        ['Production dates', 'Establishes harvest season and timing', 'Recorded at collection point'],
      ],
    },
    {
      type: 'h2',
      text: 'The Practical Challenge: Smallholder Farmers',
    },
    {
      type: 'paragraph',
      text: 'The core challenge for herbs and spice exporters is identical to what cocoa exporters face: your supply base is made up of many small farmers, not a few large plantation operations. A typical ginger exporter might source from 500 to 2,000 individual farmers across multiple states. Mapping each of those farms, registering each farmer, and maintaining the traceability chain from each farm to each export shipment is a significant operational undertaking.',
    },
    {
      type: 'paragraph',
      text: 'The exporters who succeed with EUDR and buyer traceability requirements are those who build this data collection into their normal field operations rather than treating it as a one-time exercise. Field agents who are already visiting farms to assess crop quality and negotiate prices can simultaneously do the GPS mapping and farmer registration on the same visit.',
    },
    {
      type: 'h3',
      text: 'Working With Cooperatives',
    },
    {
      type: 'paragraph',
      text: 'Many herb and spice exporters source through cooperatives or producer groups. This is actually an advantage for traceability — if you work with a structured cooperative, you can approach GACC and EUDR compliance at the cooperative level. Map the farms of cooperative members, register the cooperative and its members, and treat the cooperative as a verified origin source. This reduces the number of individual touchpoints and makes compliance management more tractable.',
    },
    {
      type: 'h2',
      text: 'Tools and Systems That Work for Herbs and Spice Exporters',
    },
    {
      type: 'h3',
      text: 'Mobile-First Farm Mapping',
    },
    {
      type: 'paragraph',
      text: 'The tool your field agents use to map farms must work offline. Rural ginger and turmeric growing areas in Kaduna, Nassarawa, or Eastern Nigeria have inconsistent mobile data coverage. An offline-capable GPS mapping app that syncs data when connectivity is available is essential — otherwise your agents are either carrying paper forms or wasting time waiting for a connection.',
    },
    {
      type: 'h3',
      text: 'Farmer Registration and ID Verification',
    },
    {
      type: 'paragraph',
      text: 'Your farmer registry should capture the farmer\'s full name, national ID number (NIN in Nigeria), phone number, community, and the GPS polygon of their farm. This registry is your primary evidence base for any compliance audit and for generating due diligence documentation for buyers.',
    },
    {
      type: 'h3',
      text: 'Collection Batch Tracking',
    },
    {
      type: 'paragraph',
      text: 'Each collection event — when you or your agent receives ginger or turmeric from a farmer or cooperative — should be logged as a batch with a unique identifier. That batch record should link to the farmers and farms it came from, the weight collected, the grade, and the date. This creates the traceability chain that connects your export shipment to the source farms.',
    },
    {
      type: 'h3',
      text: 'Document Management',
    },
    {
      type: 'paragraph',
      text: 'Beyond GPS data, you also need to manage the document set for your herb and spice exports. This includes phytosanitary certificates (required for all plant products), lab test results for pesticide residues (MRL certificates), certificates of origin, fumigation certificates for stored products, and — for EU buyers — any additional origin declarations they require. These documents have expiry dates and must be renewed for each shipment cycle.',
    },
    {
      type: 'h2',
      text: 'Responding to Buyer Questionnaires',
    },
    {
      type: 'paragraph',
      text: 'If you supply herbs and spices to European buyers, you have probably already received a sustainability or traceability questionnaire from at least one customer. These questionnaires are becoming longer and more specific, and your answers directly affect whether buyers renew your contract. Common questions include:',
    },
    {
      type: 'bullets',
      items: [
        'What percentage of your supply base is GPS-mapped?',
        'How do you verify that farms are not on deforested land?',
        'Can you provide GPS coordinates for the farms supplying this specific shipment?',
        'Do you have a farmer registration system? What data does it capture?',
        'How do you track the volume from farm to export — what is your mass balance approach?',
        'What food safety certifications do you hold (HACCP, GlobalGAP, Rainforest Alliance, etc.)?',
      ],
    },
    {
      type: 'paragraph',
      text: 'Exporters who have implemented a digital traceability system can answer these questions with data exports from their platform. Those still working with paper records or spreadsheets typically struggle to demonstrate the level of traceability that buyers now expect.',
    },
    {
      type: 'h2',
      text: 'Priority Actions for Herbs and Spice Exporters in 2026',
    },
    {
      type: 'numbered',
      items: [
        'Map your current supplier base. How many farmers do you source from? How many are currently GPS-mapped?',
        'Prioritise your highest-volume suppliers for GPS mapping first — start with the farms that contribute the most to your annual export volume.',
        'Set up a digital farmer registry linked to your GPS data.',
        'Implement batch-level collection records for every collection event.',
        'Audit your document management — do you have a centralised place to track expiry dates for phytosanitary certificates, lab results, and other compliance documents?',
        'Proactively contact your European buyers to understand their specific 2026 documentation requirements before shipment season.',
      ],
    },
    {
      type: 'cta',
      heading: 'Built for Smallholder Herb and Spice Supply Chains',
      text: 'OriginTrace is designed for the reality of rural West African supply chains — offline-first GPS mapping, cooperative management, and export documentation in one platform.',
      buttonText: 'See a Demo',
      href: '/demo',
    },
  ],
};
