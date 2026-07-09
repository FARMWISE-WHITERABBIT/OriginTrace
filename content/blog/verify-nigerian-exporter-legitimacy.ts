import type { BlogPost } from '@/lib/blog';

export const post: BlogPost = {
  slug: 'verify-nigerian-exporter-legitimacy',
  title: 'How to Verify a Nigerian Exporter Before You Pay',
  description: 'That Nigerian supplier with the great price — real or a scam? A 48-hour checklist: CAC, NEPC, export documents, inspection, and safer payment terms.',
  date: 'July 9, 2026',
  dateISO: '2026-07-09',
  category: 'Best Practices',
  readingTime: '8 min read',
  author: 'OriginTrace Compliance Team',
  authorRole: 'Supply Chain Compliance',
  coverImage: '/images/lagos-apapa-port.jpg',
  coverImageAlt: 'Aerial view of container stacks and bulk vessels at Apapa port in Lagos, Nigeria',
  coverGradient: 'from-emerald-900/30 to-slate-800/50',
  tags: ['Supplier Verification', 'Nigeria', 'Buyer Due Diligence', 'Export Fraud Prevention', 'Sourcing'],
  content: [
    {
      type: 'paragraph',
      text: 'You found a Nigerian sesame supplier on a B2B marketplace. The price sits comfortably below every other quote you\'ve had, the warehouse photos look right, and they say they can load next month. Before you get excited, one question matters more than the price: is this company real?',
    },
    {
      type: 'paragraph',
      text: 'The good news: you can answer most of it within 48 hours, without leaving your desk. Nigeria exports serious volumes of sesame, cocoa, ginger, and cashew through well-run, properly registered companies — and alongside them operates a smaller crowd whose entire business is a website and a WhatsApp number. Here\'s a three-layer verification model, a step-by-step checklist, and the red flags that should end a conversation. It protects you, and it protects the legitimate exporters who lose contracts every time a buyer gets burned by someone pretending to be them.',
    },
    {
      type: 'h2',
      text: 'The Three-Layer Verification Model',
    },
    {
      type: 'paragraph',
      text: 'Most supplier fraud works because the buyer checks only one thing — usually a certificate PDF — and stops there. A useful verification runs three layers deep, and each layer answers a different question:',
    },
    {
      type: 'bullets',
      items: [
        'Layer 1 — the company exists: government registrations you can check independently',
        'Layer 2 — the company actually exports: process knowledge and documents that only come from real shipments',
        'Layer 3 — the goods exist: physical inspection and traceability data for the actual product',
      ],
    },
    {
      type: 'paragraph',
      text: 'A determined fraudster can fake one layer. Faking all three, against a buyer who checks with the issuing bodies rather than the supplier, is close to impossible.',
    },
    {
      type: 'h2',
      text: 'Layer 1: Does the Company Exist on Paper?',
    },
    {
      type: 'paragraph',
      text: 'Start with the Corporate Affairs Commission (CAC) — Nigeria\'s company registry. Its public search at search.cac.gov.ng is free and takes two minutes. Search the exact company name from the supplier\'s documents. You\'re checking three things: the company exists, its status is active, and the registration date fits the story. A company registered eight months ago claiming twenty years of export experience has some explaining to do.',
    },
    {
      type: 'paragraph',
      text: 'Next, the Nigerian Export Promotion Council (NEPC). Commercial exporters register with NEPC and hold an exporter certificate through its e-registration system. Ask your supplier for their NEPC certificate number — not a scan, the number — and verify it with NEPC directly. Don\'t rely on a PDF the supplier sends you; contact the council and confirm the number belongs to the company you\'re dealing with.',
    },
    {
      type: 'callout',
      variant: 'tip',
      title: 'Verify With the Issuer, Never the Supplier',
      text: 'This rule covers every certificate in this article — CAC, NEPC, phytosanitary, lab reports. A forged PDF survives a glance. It rarely survives a phone call to the issuing body with the certificate number in hand.',
    },
    {
      type: 'h2',
      text: 'Layer 2: Does the Company Actually Export?',
    },
    {
      type: 'paragraph',
      text: 'Plenty of registered Nigerian companies have never exported anything. This layer tests for real shipment experience, and the fastest probe is the NXP form. Every commercial export from Nigeria is processed on an NXP through an authorized dealer bank, which captures the export proceeds. So ask a simple question: which bank handles your NXP forms? A real exporter answers instantly — it\'s their working relationship, they live in that process. A fake one gets vague, changes the subject, or asks why you need to know.',
    },
    {
      type: 'paragraph',
      text: 'Then ask for the document pack from a previous shipment, with commercial terms redacted if they like. A genuine exporter can produce this within a day:',
    },
    {
      type: 'bullets',
      items: [
        'Commercial invoice and packing list',
        'Certificate of origin, issued via NACCIMA (the Nigerian chambers of commerce association)',
        'Phytosanitary certificate from FMARD, the federal agriculture ministry',
        'Fumigation certificate',
        'For semi-processed food products: a NAFDAC health certificate',
      ],
    },
    {
      type: 'paragraph',
      text: 'Read the pack like an auditor: company name, address, and signatures should match perfectly across every document. And if you\'re buying sesame for Europe, there\'s a sharper test. Under Regulation (EU) 2019/1793, Nigerian sesame faces increased official controls at the EU border — around half of consignments get pulled for Salmonella checks. A serious sesame exporter already tests every lot at an ISO/IEC 17025-accredited lab and can show you a recent analysis certificate. If they\'ve never heard of this requirement, they haven\'t shipped sesame to Europe, whatever the website says. [Our sesame export compliance guide](/blog/sesame-seed-eudr-export-compliance-guide) covers those border checks in detail.',
    },
    {
      type: 'paragraph',
      text: 'Finish this layer with references: ask for two previous buyers and actually contact them. Legitimate exporters are proud of their track record. Silence or excuses here tells you plenty.',
    },
    {
      type: 'h2',
      text: 'Layer 3: Do the Goods Actually Exist?',
    },
    {
      type: 'paragraph',
      text: 'A company can be registered, experienced, and still not have your cargo. Layer 3 is about the physical product. Start cheap: a live video call from the warehouse or processing site. Ask them to walk the stacks, show marked bags, zoom in on lot numbers. It costs nothing and takes twenty minutes to arrange. A supplier who refuses a video call at their own warehouse is telling you something.',
    },
    {
      type: 'image',
      src: '/images/baged product in wareouse.jpg',
      alt: 'Stacked jute bags of agricultural commodity on wooden pallets in a warehouse',
      caption: 'A warehouse video call costs nothing — ask to see the actual stacks and lot markings before you commit.',
    },
    {
      type: 'paragraph',
      text: 'Before money moves, upgrade to pre-shipment inspection. SGS, Bureau Veritas, and Cotecna all operate in Nigeria and will inspect quantity, quality, and loading for a few hundred dollars. Legitimate exporters expect this — it\'s standard in the trade. A refusal is a conversation-ender.',
    },
    {
      type: 'paragraph',
      text: 'And here\'s what ties the three layers together: documents prove a company exists, but traceability data proves the goods exist. A supplier who can show farm-level records, batch history, and shipment provenance — which farms, which collection dates, which lots went into which container — is structurally harder to fake than one who can only send PDFs. A PDF can be forged in an afternoon; a consistent, timestamped data trail from hundreds of smallholder farms can\'t. That\'s the kind of record suppliers build on platforms like OriginTrace, and it\'s a fair thing for buyers to ask about.',
    },
    {
      type: 'h2',
      text: 'The 48-Hour Verification Checklist',
    },
    {
      type: 'numbered',
      intro: 'Run these in order. Steps 1–7 are desk work; 8 and 9 involve the supplier\'s cooperation — which is itself part of the test.',
      items: [
        'Search the exact company name at search.cac.gov.ng — confirm active registration and note the registration date',
        'Ask for the NEPC exporter certificate number and verify it with NEPC directly',
        'Ask which authorized dealer bank processes their NXP forms — the answer should be immediate and specific',
        'Request a document pack from a previous shipment: invoice, packing list, certificate of origin, phytosanitary and fumigation certificates',
        'Cross-check company name, address, and signatures for consistency across every document',
        'For sesame to the EU: ask for a recent Salmonella analysis from an ISO/IEC 17025-accredited lab',
        'Ask for two buyer references and actually call or email them',
        'Do a live video call at the warehouse or processing site',
        'Book a pre-shipment inspection (SGS, Bureau Veritas, or Cotecna) before any major payment',
        'Agree payment terms that don\'t require blind trust — more on that below',
      ],
    },
    {
      type: 'h2',
      text: 'Red Flags That Should End the Conversation',
    },
    {
      type: 'paragraph',
      text: 'None of these alone proves fraud — legitimate businesses occasionally trip one for innocent reasons. But these are the recurring patterns in commodity trade scams, and two or more together means walk away:',
    },
    {
      type: 'table',
      headers: ['Red flag', 'Why it matters'],
      rows: [
        ['Price meaningfully below market', 'Real exporters price off the same FOB market as everyone else. A too-good price is the bait, not the bargain.'],
        ['Pressure to pay 100% upfront to a personal account', 'Corporate exporters are paid through corporate accounts, and established ones rarely demand full prepayment.'],
        ['Refuses inspection or a warehouse video call', 'If you can\'t see the goods, work on the assumption there\'s nothing to see.'],
        ['Company names or addresses inconsistent across documents', 'Genuine document packs match perfectly. Forgers slip on details.'],
        ['Newly registered company claiming decades of experience', 'The CAC registration date doesn\'t lie. The story should fit it.'],
        ['Free-email-only contact, no verifiable office or landline', 'A thin footprint is cheap to create and cheap to abandon.'],
        ['Discourages you from verifying certificate numbers', 'Genuine certificates survive a call to the issuing body. Ask yourself why they\'d mind.'],
      ],
    },
    {
      type: 'paragraph',
      text: 'This isn\'t hypothetical. The US Commercial Service publishes scam alerts on trade.gov covering commodity trade, including West Africa — official warnings exist because the pattern repeats often enough to warn about. Which is why verification helps honest Nigerian exporters too: every check on this list is one a genuine company passes easily, and passing it is how they separate themselves from imposters trading on their country\'s name.',
    },
    {
      type: 'cta',
      heading: 'Not Sure About a Supplier?',
      text: 'Verify a supplier before you commit. OriginTrace can pull together a supplier risk snapshot — registration signals, document consistency, and farm-level traceability — before you wire anything.',
      buttonText: 'Request a Supplier Risk Snapshot',
      href: '/demo',
    },
    {
      type: 'h2',
      text: 'How to Pay Without Losing Sleep',
    },
    {
      type: 'paragraph',
      text: 'Even a supplier who passes every check deserves payment terms that don\'t depend on trust alone. The mechanics that keep both sides honest:',
    },
    {
      type: 'bullets',
      items: [
        'Start with a trial container, inspected before loading — small enough to survive losing, big enough to test the relationship',
        'Use a letter of credit under UCP 600 through the exporter\'s bank — funds release against conforming documents, not promises. Their LC bank is usually the same authorized dealer bank running their NXP forms, so a real exporter handles this routinely',
        'Write pre-shipment inspection into the contract as a condition of payment',
        'Use escrow where a credible service is available for your trade lane',
        'If you agree a partial advance, pay only to a corporate account whose name matches the CAC registration — never a personal account',
      ],
    },
    {
      type: 'paragraph',
      text: 'Blind telegraphic transfers — especially full prepayment — are how nearly every commodity scam ends. An exporter who won\'t work with an LC or inspection-linked terms on a first deal isn\'t offering you a deal at all. The best Nigerian exporters have worked this out: they volunteer certificate numbers, inspection access, and traceability records upfront, because being easy to verify wins contracts.',
    },
    {
      type: 'faq',
      items: [
        {
          q: 'How do I check if a Nigerian company is registered?',
          a: 'Use the Corporate Affairs Commission\'s free public search at search.cac.gov.ng. Search the exact company name or RC number and check that the registration is active and the registration date fits what the supplier claims about their history.',
        },
        {
          q: 'What is an NEPC certificate?',
          a: 'It\'s the exporter registration issued by the Nigerian Export Promotion Council through its e-registration system — legitimate commercial exporters hold one. Ask the supplier for their certificate number and confirm it with NEPC directly rather than relying on a scanned copy.',
        },
        {
          q: 'Should I pay a Nigerian supplier upfront?',
          a: 'Not blindly, and never 100% upfront to a personal account — that\'s the single most common scam pattern. Use a letter of credit under UCP 600, payment linked to pre-shipment inspection, or escrow, and start with a trial container before committing to volume.',
        },
        {
          q: 'What documents should a Nigerian sesame exporter have?',
          a: 'Commercial invoice, packing list, NACCIMA-issued certificate of origin, FMARD phytosanitary certificate, and a fumigation certificate. For EU shipments, add a Salmonella analysis from an ISO/IEC 17025-accredited lab — Nigerian sesame faces increased EU border controls under Regulation (EU) 2019/1793. Semi-processed food products also need a NAFDAC health certificate.',
        },
        {
          q: 'How long does it take to verify a Nigerian exporter?',
          a: 'The desk checks — CAC search, NEPC confirmation, document review, references — fit inside 48 hours. A warehouse video call adds a day, and a pre-shipment inspection adds a few more. All of it is faster and cheaper than recovering a payment that\'s already gone.',
        },
      ],
    },
    {
      type: 'cta',
      heading: 'Commit With Evidence, Not Hope',
      text: 'Documents prove a company exists — traceability proves the goods do. Request a supplier risk snapshot and see what a verifiable, farm-to-shipment supply chain looks like before you sign.',
      buttonText: 'Get a Supplier Risk Snapshot',
      href: '/demo',
    },
    {
      type: 'references',
      items: [
        {
          label: 'CAC Public Search — Nigerian company registry',
          url: 'https://search.cac.gov.ng',
          publisher: 'Corporate Affairs Commission, Nigeria',
        },
        {
          label: 'Nigerian Export Promotion Council — exporter registration',
          url: 'https://nepc.gov.ng',
          publisher: 'NEPC',
        },
        {
          label: 'Commission Implementing Regulation (EU) 2019/1793 — increased official controls on certain goods',
          url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32019R1793',
          publisher: 'EUR-Lex',
        },
        {
          label: 'Market intelligence and trade scam alerts',
          url: 'https://www.trade.gov',
          publisher: 'U.S. Department of Commerce, International Trade Administration',
        },
      ],
    },
  ],
};
