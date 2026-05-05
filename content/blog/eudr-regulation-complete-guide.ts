import type { BlogPost } from '@/lib/blog';

export const post: BlogPost = {
  slug: 'eudr-regulation-complete-guide',
  title: 'EUDR Regulation: The Complete Guide for Exporters',
  description: 'The EU Deforestation Regulation is the most significant change to agricultural trade with Europe in a generation. This complete guide covers what EUDR is, which commodities and companies it affects, what compliance looks like end-to-end, and how exporters can build the systems to meet its requirements.',
  date: 'March 29, 2026',
  dateISO: '2026-03-29',
  category: 'EUDR',
  readingTime: '11 min read',
  author: 'OriginTrace Compliance Team',
  authorRole: 'Supply Chain Compliance',
  coverGradient: 'from-emerald-900/20 to-slate-800/50',
  tags: ['EUDR', 'Deforestation', 'Regulation', 'Compliance', 'EU Market', 'Exporters'],
  content: [
    {
      type: 'paragraph',
      text: 'The EU Deforestation Regulation (EUDR), officially Regulation (EU) 2023/1115, is a landmark piece of environmental trade legislation that ties access to the European Union market to verified proof that products have not contributed to deforestation. For exporters of agricultural commodities — particularly those in West Africa, East Africa, Southeast Asia, and Latin America — it represents the most significant shift in EU import requirements in a generation.',
    },
    {
      type: 'paragraph',
      text: 'Unlike previous sustainability frameworks that operated on a voluntary basis or relied on industry self-certification, EUDR is mandatory, legally enforced, and backed by penalties that include fines of up to 4% of annual EU turnover and temporary exclusion from the EU market. This guide provides a complete overview: what the regulation is, where it came from, who it affects, what compliance requires, and how exporters can build the systems to meet it.',
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
        ['June 2023 – December 2024', 'Transition period for large operators and traders'],
        ['December 2024', 'Original enforcement deadline for large operators (subsequently delayed)'],
        ['January 2025', 'Country benchmarking system established by European Commission'],
        ['January 2026', 'Full enforcement applies to all operators, including SMEs'],
        ['2026 onwards', 'Active enforcement by EU Member State competent authorities; escalating inspection intensity'],
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
        'Coffee — raw and roasted coffee beans, ground coffee, soluble coffee, coffee extracts',
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
      text: '**Operators** are businesses that place covered commodities and products on the EU market for the first time (importers) or export them from the EU market. Operators bear the full due diligence obligation: they must collect information, assess risk, mitigate risk, and submit a due diligence statement (DDS) for each shipment. For exporters in producing countries, the direct obligation under EUDR falls on the EU-based importer — but that importer will require verified data from the exporter to fulfil their compliance obligation.',
    },
    {
      type: 'paragraph',
      text: '**Traders** are businesses that make covered products available on the EU market without being the first importer. Traders can rely on the due diligence statements of their upstream operators in many cases, but they bear responsibility for ensuring they only source from operators who have submitted compliant DDS references.',
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
      text: 'Proving non-deforestation requires GPS-based geographic data that can be checked against satellite deforestation maps. The standard requires GPS coordinates for every plot of land from which the commodity was sourced. For plots of 4 hectares or less, a single GPS point (latitude and longitude) is sufficient. For plots above 4 hectares, a polygon — a set of GPS coordinates defining the perimeter of the plot — is required. General regional or country-level origin claims are not sufficient.',
    },
    {
      type: 'callout',
      variant: 'deadline',
      title: 'EUDR Enforcement Is Live',
      text: 'EUDR enforcement is active for all operators as of January 2026. There is no longer a grace period for any size of business. All importers placing covered commodities on the EU market must have a functioning due diligence system, and must submit a due diligence statement (DDS) to EU TRACES NT for each shipment.',
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
      text: 'Each DDS includes: the commodity and HS code, the country of origin, geolocation data for source plots, the quantity, the supply chain entities involved, and the operator\'s attestation that due diligence was completed. The DDS must be submitted before the product arrives at the EU border — it cannot be submitted retroactively.',
    },
    {
      type: 'h2',
      text: 'Country Risk Classification',
    },
    {
      type: 'paragraph',
      text: 'The European Commission has established a country benchmarking system that classifies producing countries into three risk tiers. The tier determines how intensive the due diligence requirement is for products from that country:',
    },
    {
      type: 'table',
      headers: ['Risk Tier', 'Due Diligence Required', 'Implications for Exporters'],
      rows: [
        ['Low risk', 'Simplified due diligence — reduced data collection requirements', 'Currently no major African, Asian, or Latin American commodity-producing countries at low risk for covered commodities'],
        ['Standard risk', 'Full due diligence — GPS data, DDS, complete deforestation and legality check', 'Nigeria, Ghana, Ivory Coast, Cameroon, Uganda, Ethiopia, Indonesia, Vietnam, Brazil at standard risk for respective covered commodities'],
        ['High risk', 'Enhanced due diligence — additional scrutiny, possible on-site verification, heightened customs checks', 'Countries with active deforestation trends for covered commodities; list evolves based on Commission monitoring'],
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
        'Fines: Member States must impose fines of at least 4% of the operator\'s total annual EU turnover for serious violations, proportionate to the environmental damage caused',
        'Confiscation: non-compliant products and revenues derived from their sale can be confiscated',
        'Temporary exclusion from EU procurement: operators found in serious breach can be excluded from public procurement contracts',
        'Import bans: Member State authorities can prohibit the placing on the market or export of non-compliant products',
        'Reputational publication: decisions finding violations must be made public, including the identity of the operator and the nature of the violation',
      ],
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
        'Audit your current GPS coverage: what percentage of your sourcing farms have GPS data? For farms above 4 hectares, do you have polygons or only points?',
        'Build your farmer registry: ensure all farms in your supply chain are registered with a unique identifier, linked to GPS data and a named farmer identity',
        'Implement lot tracking through processing: establish the data trail that links incoming raw material lots (with GPS farm data) to outgoing processed and export lots',
        'Organise your compliance document library: ensure certificates of origin, phytosanitary certificates, legality evidence, and test certificates are stored digitally, linked to specific lots, and tracked for expiry',
        'Set up an EU TRACES NT account: your EU buyer will need this to submit DDS, but you should be familiar with the data it requires so your data package is ready',
        'Engage your EU buyers: understand exactly what data format they need to complete their DDS — coordinates, document references, supply chain entity information',
        'Run a compliance test shipment: before full-scale EUDR compliance is required for all your shipments, test the full process with a single consignment to identify and resolve gaps before they cause a customs hold',
      ],
    },
    {
      type: 'cta',
      heading: 'Assess Your EUDR Readiness',
      text: 'Use OriginTrace\'s EUDR compliance tools to assess your GPS coverage, traceability chain, and documentation readiness — and see exactly what needs to be in place for your next shipment to the EU.',
      buttonText: 'Explore EUDR Compliance',
      href: '/compliance/eudr',
    },
  ],
};
