import type { BlogPost } from '@/lib/blog';

export const post: BlogPost = {
  slug: 'sesame-seed-eudr-export-compliance-guide',
  title: 'Sesame Export Compliance: The EU\'s 50% Checks and China\'s GACC',
  description: 'Sesame isn\'t an EUDR commodity. The real hurdles: 50% Salmonella checks on Nigerian sesame at EU borders and China\'s GACC regime. Here\'s how to pass both.',
  date: 'January 20, 2026',
  dateISO: '2026-01-20',
  dateModifiedISO: '2026-07-09',
  category: 'Compliance',
  readingTime: '8 min read',
  author: 'OriginTrace Compliance Team',
  authorRole: 'Supply Chain Compliance',
  coverImage: '/images/lagos-apapa-port.jpg',
  coverImageAlt: 'Aerial view of container terminals and bulk vessels at Apapa port, Lagos',
  coverGradient: 'from-amber-700/20 to-slate-800/50',
  tags: ['Sesame', 'Nigeria', 'Salmonella', 'CIR 2019/1793', 'GACC', 'China Export', 'EU Export', 'Traceability'],
  content: [
    {
      type: 'paragraph',
      text: 'If you ship sesame from Nigeria to Europe, there\'s roughly a coin-flip chance your container gets pulled at the border for testing. EU rules set the check rate for Nigerian sesame at 50% — half of all consignments go through identity and physical checks, including lab sampling for Salmonella, before they clear. Not 5%. Fifty.',
    },
    {
      type: 'paragraph',
      text: 'Here\'s the part that surprises people: none of this has anything to do with deforestation. Sesame isn\'t covered by EUDR at all — [same story as ginger](/blog/eudr-compliance-tools-herbs-spices-exporters-practical-guide). The rules that decide whether your container clears Rotterdam or Piraeus are food safety rules — and if you sell to China, a completely separate facility registration regime. This guide walks through both stacks, and the traceability backbone that lets you pass them with the same data.',
    },
    {
      type: 'callout',
      variant: 'info',
      title: 'Sesame Is Not an EUDR Commodity',
      text: 'The EU Deforestation Regulation (Regulation (EU) 2023/1115) covers exactly seven commodities in Annex I: cattle, cocoa, coffee, oil palm, rubber, soya, and wood. Sesame isn\'t one of them. There\'s no due diligence statement to file for sesame and no EU law requiring GPS farm polygons for it — though some European buyers ask for origin data voluntarily. If anyone tells you sesame needs "EUDR compliance", they\'re wrong.',
    },
    {
      type: 'paragraph',
      text: 'Some context on why this matters so much. Sesame is Nigeria\'s number one agricultural export. Most of the volume goes to China, Japan, and Turkey — but the EU, entering mostly through Greece, Germany, and the Netherlands, is the premium channel. European tahini makers, bakeries, and oil processors pay well. They also sit behind the most compliance-heavy border of the three.',
    },
    {
      type: 'cta',
      heading: 'Which Rules Apply to Your Commodity and Market?',
      text: 'The OriginTrace compliance hub breaks down EU, China, UK, US, and UAE requirements market by market — so you\'re never guessing which regime actually applies to your product.',
      buttonText: 'Browse the Compliance Hub',
      href: '/compliance',
    },
    {
      type: 'h2',
      text: 'Why Is Nigerian Sesame Checked at EU Borders?',
    },
    {
      type: 'paragraph',
      text: 'The EU keeps a watchlist. Commission Implementing Regulation (EU) 2019/1793 lists foods from specific countries that face "increased official controls" at the border because of a known hazard. Sesame from Nigeria is on that list for Salmonella — with the check frequency set at 50%. In plain terms: half of all Nigerian sesame consignments arriving at an EU border control post get identity and physical checks, including sampling and laboratory analysis.',
    },
    {
      type: 'paragraph',
      text: 'The listing isn\'t arbitrary. RASFF — the EU\'s Rapid Alert System for Food and Feed, the database every border authority and serious buyer watches — shows repeated notifications on Nigerian sesame for Salmonella, plus pesticide findings: chlorpyrifos and chlorate above EU maximum residue limits. Every notification reinforces the case for keeping the controls in place.',
    },
    {
      type: 'paragraph',
      text: 'One caution: the Commission reviews these annexes regularly and refreshed them again with an Implementing Regulation of 28 January 2026. Entries move between annexes and check rates change. As of the January 2026 annex update, check the current listing for your exact product and origin before you ship — don\'t rely on last season\'s requirements.',
    },
    {
      type: 'h2',
      text: 'What Certificate Does Sesame Need to Enter the EU?',
    },
    {
      type: 'paragraph',
      text: 'For as long as Nigerian sesame sits in the stricter annex of 2019/1793, every consignment — not every supplier, every consignment — needs:',
    },
    {
      type: 'bullets',
      items: [
        'An official certificate, issued according to the model prescribed in the regulation and signed by the Nigerian competent authority, confirming the consignment was sampled and analysed.',
        'Laboratory results demonstrating absence of Salmonella in 25 g, with the sampling and analysis performed by a laboratory accredited to ISO/IEC 17025.',
        'Prior notification of the consignment\'s arrival by your EU importer through a Common Health Entry Document (CHED-D) in the EU\'s TRACES system — basically the border post\'s heads-up that your container is coming.',
        'And then, at the border: the 50% chance of identity and physical checks, with fresh sampling by the authorities themselves.',
      ],
    },
    {
      type: 'paragraph',
      text: 'One consignment, one lab report, one certificate. There\'s no annual version of this, and a certificate from a non-accredited lab doesn\'t count.',
    },
    {
      type: 'h2',
      text: 'What Failing a Check Actually Costs You',
    },
    {
      type: 'paragraph',
      text: 'While the border sample is at the lab, your container waits at the border control post — and the storage and demurrage clock runs on your account. If the result comes back positive for Salmonella, the consignment is refused: re-export or destruction, at your cost, on product you\'ve already paid farmers and truckers for.',
    },
    {
      type: 'paragraph',
      text: 'Then comes the part that hurts longer than the money. A refusal generates a RASFF notification visible to authorities across the EU — and to your buyer. European purchasers quietly drop origins and suppliers that show up in RASFF too often. Honestly, the reputational cost of a rejection usually outlasts the demurrage bill.',
    },
    {
      type: 'cta',
      heading: 'Stop Guessing Whether Your Container Will Clear',
      text: 'OriginTrace links your lab certificates, batch records, and export documents to every shipment — so you can see how ready your next consignment is before it leaves the warehouse.',
      buttonText: 'See How Ready Your Next Shipment Is',
      href: '/demo',
    },
    {
      type: 'h2',
      text: 'The China Track: GACC Registration Is Now Enforced',
    },
    {
      type: 'paragraph',
      text: 'China is the world\'s largest sesame buyer, and it runs a completely different gate. Under GACC Decree 248, overseas facilities that process, store, or export food to China must be registered with Chinese customs. That\'s facility-level, not company-level: your cleaning plant and your export warehouse each need their own registration. Our [sesame- and gum-arabic-specific GACC guide](/blog/gacc-compliance-traceability-sesame-gum-arabic-nigeria) goes deeper on what Chinese buyers are asking for beyond the registration number itself.',
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'The GACC Deadline Has Passed',
      text: 'Enforcement of Decree 248 has been live since 1 June 2026. If your processing or storage facility isn\'t registered, your sesame can\'t legally clear Chinese customs. Registration is still open — but sort it before you sign the next contract, not after the container is booked.',
    },
    {
      type: 'paragraph',
      text: 'If you\'re not yet registered, the route runs through your national competent authority — in Nigeria, primarily NAFDAC — which endorses your application before GACC reviews it through the CIFER portal. Once approved, your GACC registration number must appear on labels and shipping documents, and Chinese buyers now routinely ask for it before they\'ll even discuss price.',
    },
    {
      type: 'h2',
      text: 'One Traceability Backbone, Two Markets',
    },
    {
      type: 'paragraph',
      text: 'Here\'s the good news: the EU stack and the China stack ask different questions, but the same underlying data answers both. A Salmonella certificate is only credible if it references the exact batch in the container. A GACC facility registration is only useful if you can show which suppliers and lots moved through that facility. Both come down to batch-level traceability.',
    },
    {
      type: 'numbered',
      intro: 'The workflow that serves both markets:',
      items: [
        'Register every supplier and buying agent — name, location, and sourcing area, down to LGA or ward level in the northern producing states (Jigawa, Kano, Katsina, Borno, Yobe).',
        'Record each collection at the point it happens — weight, date, location, agent — using tools that work offline and sync later, because much of the sesame belt has no reliable data coverage.',
        'Assign a batch ID at warehouse or cleaning-plant intake, linked back to the collection records. This is the master trace ID that follows the lot to the port.',
        'Match lab samples to batch IDs. Your absence-of-Salmonella result must be drawn from — and reference — the specific batch you\'re exporting, or it proves nothing.',
        'Compile a shipment dossier per container: batch record, lab certificates, and either the official certificate and CHED-D reference (EU) or the GACC number plus health and phytosanitary certificates (China).',
      ],
    },
    {
      type: 'image',
      src: '/images/pexels-stephanefabricebass-10319259.jpg',
      alt: 'Two workers in safety gear examine crops in a field',
      caption: 'Traceability starts at the field — collection records made at the point of purchase, not reconstructed at the port.',
    },
    {
      type: 'table',
      headers: ['Requirement', 'EU (CIR 2019/1793)', 'China (GACC Decree 248)'],
      rows: [
        ['Registration', 'No facility registration — controls apply per consignment', 'Facility registration mandatory; enforcement live since 1 June 2026'],
        ['Salmonella', 'Absence in 25 g, tested by an ISO/IEC 17025-accredited lab, per consignment', 'Testing to Chinese (GB) standards, typically required by buyers and customs'],
        ['Certificate', 'Official certificate per the prescribed model, per consignment', 'Health and phytosanitary certificates; GACC number on labels and documents'],
        ['Border checks', '50% identity and physical checks (as of the January 2026 annex update — verify before shipping)', 'Customs inspection; consignments from unregistered facilities refused'],
      ],
    },
    {
      type: 'faq',
      items: [
        {
          q: 'Is sesame covered by EUDR?',
          a: 'No. EUDR\'s Annex I lists seven commodities — cattle, cocoa, coffee, oil palm, rubber, soya, and wood — and sesame isn\'t among them. No due diligence statement or GPS polygon requirement applies to sesame under EUDR, although some European buyers voluntarily ask suppliers for origin data.',
        },
        {
          q: 'Why is Nigerian sesame checked at EU borders?',
          a: 'Under Commission Implementing Regulation (EU) 2019/1793, sesame from Nigeria is subject to increased official controls for Salmonella, with identity and physical checks set at 50% of consignments. The listing reflects repeated RASFF notifications for Salmonella and pesticide residues such as chlorpyrifos and chlorate. The annexes were last refreshed in January 2026 — check the current entry before you ship.',
        },
        {
          q: 'What certificate do I need to export sesame to the EU?',
          a: 'Each consignment needs an official certificate issued per the model prescribed in CIR 2019/1793 by the Nigerian competent authority, backed by sampling and analysis from an ISO/IEC 17025-accredited laboratory showing absence of Salmonella in 25 g. Your EU importer also pre-notifies the arrival via a CHED-D in TRACES.',
        },
        {
          q: 'Do I still need GACC registration to sell sesame to China?',
          a: 'Yes. Registration under GACC Decree 248 is mandatory for facilities that process, store, or export food to China, and enforcement has been live since 1 June 2026. Unregistered facilities have their shipments refused at Chinese ports — but registration remains open, so start through NAFDAC and the CIFER portal before your next contract.',
        },
      ],
    },
    {
      type: 'cta',
      heading: 'One Dossier per Shipment, Ready Before the Vessel Loads',
      text: 'OriginTrace helps sesame exporters get farms mapped, batches tracked, and every lab certificate and export document in one place — whether the container is bound for Rotterdam, Piraeus, or Qingdao.',
      buttonText: 'Get Your Documents in One Place',
      href: '/demo',
    },
    {
      type: 'references',
      items: [
        { label: 'Commission Implementing Regulation (EU) 2019/1793 — increased official controls', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32019R1793', publisher: 'EUR-Lex' },
        { label: 'Regulation (EU) 2023/1115 (EUDR) — Annex I commodity list', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32023R1115', publisher: 'EUR-Lex' },
        { label: 'RASFF — Rapid Alert System for Food and Feed portal', url: 'https://webgate.ec.europa.eu/rasff-window/screen/search', publisher: 'European Commission' },
        { label: 'GACC Decree 248 — CIFER Registration Portal', url: 'http://cifer.singlewindow.cn', publisher: 'GACC' },
        { label: 'NAFDAC — Facility Registration and Export Certification', url: 'https://www.nafdac.gov.ng', publisher: 'NAFDAC' },
      ],
    },
  ],
};
