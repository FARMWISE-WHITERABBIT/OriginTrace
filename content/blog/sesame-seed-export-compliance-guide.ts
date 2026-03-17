import type { BlogPost } from '@/lib/blog';

export const post: BlogPost = {
  slug: 'sesame-seed-eudr-export-compliance-guide',
  title: 'Sesame Seed Export Compliance: Navigating EUDR, GACC, and Traceability Requirements',
  description: 'Nigeria and Ethiopia are two of the world\'s largest sesame exporters. As EUDR and China GACC requirements tighten, here is what sesame exporters and importers need to know about traceability, GPS origin documentation, and staying competitive in global markets.',
  date: 'January 20, 2026',
  dateISO: '2026-01-20',
  category: 'Compliance',
  readingTime: '9 min read',
  author: 'OriginTrace Compliance Team',
  authorRole: 'Supply Chain Compliance',
  coverGradient: 'from-amber-700/20 to-slate-800/50',
  tags: ['Sesame', 'EUDR', 'GACC', 'Nigeria', 'Ethiopia', 'Export Compliance', 'Traceability'],
  content: [
    {
      type: 'paragraph',
      text: 'Sesame is one of Africa\'s most important export commodities. Nigeria is consistently ranked among the top five sesame producers globally, and Ethiopia is the continent\'s largest sesame exporter. The crop is grown by millions of smallholder farmers across the savannah belt and exported primarily to China, Japan, South Korea, Turkey, and increasingly to European and Middle Eastern food manufacturers.',
    },
    {
      type: 'paragraph',
      text: 'In 2026, sesame exporters face a convergence of compliance pressures that are reshaping what buyers require before they will purchase a container. Understanding these requirements — and having the traceability infrastructure to meet them — is the difference between being a preferred supplier and losing market access.',
    },
    {
      type: 'h2',
      text: 'The Regulatory Landscape for Sesame Exporters',
    },
    {
      type: 'h3',
      text: 'China GACC Registration',
    },
    {
      type: 'paragraph',
      text: 'China is the world\'s largest importer of sesame seed. Sesame is one of the categories covered by GACC Decree 248, meaning all sesame processing, storage, and export facilities must be registered with GACC. The 1 June 2026 deadline for facility registration applies. Without a GACC registration number, your sesame cannot legally enter China.',
    },
    {
      type: 'callout',
      variant: 'deadline',
      title: 'GACC Deadline: 1 June 2026',
      text: 'Sesame exporters selling to China must have completed GACC facility registration by 1 June 2026. Shipments from unregistered facilities will be refused at Chinese ports of entry.',
    },
    {
      type: 'h3',
      text: 'EUDR and Sesame',
    },
    {
      type: 'paragraph',
      text: 'Sesame is not currently on the EUDR mandatory commodity list. However, European buyers of sesame — food manufacturers, tahini producers, oil processors — are voluntarily applying EUDR-equivalent standards to their agricultural procurement. This means asking for GPS origin data, farmer registration, and deforestation evidence even when it is not legally required.',
    },
    {
      type: 'paragraph',
      text: 'Additionally, the European Commission is reviewing whether to expand EUDR\'s commodity scope. Given that sesame cultivation in some origin areas has historically expanded into forested or bush land, it is not impossible that sesame will be formally brought within scope in future regulatory cycles.',
    },
    {
      type: 'h3',
      text: 'Japan and South Korea Food Safety Requirements',
    },
    {
      type: 'paragraph',
      text: 'Japan and South Korea both have strict food safety controls for sesame. Japan\'s Ministry of Health, Labour and Welfare publishes Maximum Residue Limits for pesticides in sesame that are often stricter than EU or US limits. South Korea similarly applies rigorous pesticide residue testing to imported sesame. Both markets require phytosanitary certificates and may request additional lab test documentation for specific pesticides of concern.',
    },
    {
      type: 'h2',
      text: 'The Traceability Challenge in Sesame Supply Chains',
    },
    {
      type: 'paragraph',
      text: 'Sesame supply chains share the same fundamental challenge as ginger and cocoa: the production is dominated by smallholders. In Nigeria\'s northern growing belt (Borno, Yobe, Jigawa, Kano, Katsina), a typical sesame exporter sources from hundreds or thousands of small farms of 1–5 hectares. In Ethiopia\'s Tigray, Amhara, and Benishangul-Gumuz regions, the structure is similar.',
    },
    {
      type: 'paragraph',
      text: 'The result is that meaningful farm-level traceability requires the same kind of mobile-first, offline-capable field operations that are now standard practice in cocoa — but have not yet been widely adopted in sesame. Exporters who build this infrastructure now will have a significant competitive advantage as buyer requirements tighten.',
    },
    {
      type: 'h2',
      text: 'What Chinese Buyers Want Beyond GACC Registration',
    },
    {
      type: 'paragraph',
      text: 'Getting your GACC registration number is necessary but not sufficient for maintaining a strong China supply relationship. Chinese sesame buyers — particularly for food-grade and organic sesame — are increasingly asking for:',
    },
    {
      type: 'bullets',
      items: [
        'Pesticide residue test certificates (MRL compliance for China\'s standards, which are evolving)',
        'Certificate of origin from the national competent authority',
        'Fumigation certificates confirming pest treatment of stored sesame',
        'Traceability documentation linking the exported volume to source farms or cooperatives',
        'For organic sesame: valid organic certification from an accredited body',
        'Lab certificates confirming salmonella-free status — this has become a significant issue for sesame globally following contamination scares',
      ],
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'Sesame and Salmonella',
      text: 'Since 2020, sesame has been the subject of multiple international food safety alerts related to salmonella contamination. Several large shipments from African origins were rejected or recalled in EU, US, and Asian markets. Buyers are now routinely requiring salmonella testing alongside standard MRL certificates. Ensure your processing and storage facilities have documented hygiene controls.',
    },
    {
      type: 'h2',
      text: 'Building Farm-Level Traceability for Sesame',
    },
    {
      type: 'paragraph',
      text: 'The workflow for sesame traceability mirrors what is now standard in cocoa and ginger supply chains:',
    },
    {
      type: 'numbered',
      items: [
        'Farmer registration: register each farmer supplying to you with their name, national ID, community, and GPS location. For larger farms, map the GPS polygon boundary.',
        'Collection batch records: every time sesame is collected from a farmer or a buying point, create a digital batch record linking the weight and grade to the farmers whose sesame it includes.',
        'Aggregation and lot management: as sesame from multiple batches is combined in storage, maintain the chain of custody through your lot management system.',
        'Processing records: if you clean, sort, hull, or process sesame, link the processing run to the input batches so the traceability chain is not broken.',
        'Export lot to origin mapping: when you ship a container, you should be able to generate a document showing the farms and collection events that contributed to that specific lot.',
      ],
    },
    {
      type: 'h2',
      text: 'The Competitive Advantage of Traceable Sesame',
    },
    {
      type: 'paragraph',
      text: 'In a commodity market, traceability increasingly differentiates suppliers. Japanese tahini manufacturers and European food companies that have made "clean label" commitments are actively seeking sesame suppliers who can provide origin documentation. This is not charity — it is commercial preference. Suppliers who can demonstrate GPS-verified, traceable origin are winning contracts at better prices than those who cannot.',
    },
    {
      type: 'paragraph',
      text: 'For Nigerian sesame exporters in particular, the combination of scale (Nigeria is a large, consistent producer) and improved traceability infrastructure could position Nigerian sesame as a premium-grade origin in key markets. This is already happening for fair trade and organic sesame, where Nigerian-origin product has attracted significant buyer interest. Conventional sesame is moving in the same direction.',
    },
    {
      type: 'h2',
      text: 'Action Plan for Sesame Exporters in 2026',
    },
    {
      type: 'table',
      headers: ['Priority', 'Action', 'Deadline'],
      rows: [
        ['Urgent', 'Complete GACC facility registration if selling to China', '1 June 2026'],
        ['High', 'Obtain or renew NAFDAC/SON certificates for current season', 'Before season'],
        ['High', 'Commission MRL and salmonella testing for current inventory', 'Before export'],
        ['Medium', 'Begin GPS mapping of top-50 farmer supply base', 'Q2 2026'],
        ['Medium', 'Implement digital collection batch records', 'Q2 2026'],
        ['Ongoing', 'Review buyer questionnaires and update documentation', 'Quarterly'],
      ],
    },
    {
      type: 'cta',
      heading: 'Traceable Sesame Starts With Your Field Operations',
      text: 'OriginTrace helps sesame exporters build GPS-verified supply chains that meet China GACC, EU buyer, and Japanese food safety documentation requirements.',
      buttonText: 'Learn How',
      href: '/demo',
    },
  ],
};
