import type { BlogPost } from '@/lib/blog';

export const post: BlogPost = {
  slug: 'dubai-reexport-eu-rules-african-commodities',
  title: 'Re-Exporting From Dubai to the EU? You Inherit the EU\'s Rules',
  description: 'Routing African sesame, ginger or cocoa through Dubai doesn\'t reset origin. Here\'s which EU rules follow your re-export — and how to keep the channel open.',
  date: 'July 9, 2026',
  dateISO: '2026-07-09',
  category: 'Regulatory',
  readingTime: '8 min read',
  author: 'OriginTrace Compliance Team',
  authorRole: 'Supply Chain Compliance',
  coverImage: '/images/pexels-tomfisk-2231744.jpg',
  coverImageAlt: 'Aerial view of a red cargo ship being loaded at a container port',
  coverGradient: 'from-amber-900/30 to-emerald-900/40',
  tags: ['UAE', 'Dubai', 'Re-Export', 'EUDR', 'Sesame', 'Ginger', 'Cocoa', 'EU Market Access', 'Trade Compliance'],
  content: [
    {
      type: 'paragraph',
      text: 'Here\'s a deal that dies quietly in Dubai every month. A trader buys 200 tonnes of Nigerian sesame at a sharp price, lands it at Jebel Ali, cleans and rebags it, and lines up a European buyer at a margin that makes the whole quarter. Then the container reaches Rotterdam. Border control asks for the official certificate and accredited lab results tied to the sesame\'s Nigerian origin. The trader has a UAE re-export declaration, a certificate of origin, and a clean warehouse record — but no lab trail back to Nigeria. The consignment sits, the testing and demurrage bills stack up, and the buyer walks.',
    },
    {
      type: 'paragraph',
      text: 'The mistake wasn\'t the paperwork. It was the assumption underneath it: that shipping from Dubai makes the goods Dubai goods. It doesn\'t. The moment your re-export is destined for the EU, the EU\'s rules apply to it — and those rules key off where the commodity was grown, not where it was last warehoused. This post walks through exactly what that means for the three African commodities Dubai traders move most — sesame, ginger, and cocoa — and what data you need in hand to keep the EU channel open.',
    },
    {
      type: 'paragraph',
      text: 'Dubai earned its position honestly. The UAE imports the vast majority of its food, and the emirate\'s infrastructure — the DMCC Agro ecosystem, the Dubai Trade / ATLP single window, Jebel Ali\'s transshipment capacity — makes it the natural redistribution point for African commodities heading to the GCC and Asia. Nigerian ginger, for instance, arrives in bulk at low unit prices precisely because re-export is the business model. We cover the UAE side of the trade on our [UAE compliance page](/compliance/uae), and our step-by-step [FIRS registration walkthrough](/blog/dubai-food-import-firs-registration-guide) covers the import direction. This piece is about the other direction: what happens when the goods leave Dubai for Europe.',
    },
    {
      type: 'h2',
      text: 'The Inheritance Principle: Why Your Re-Export Carries Africa\'s Rules',
    },
    {
      type: 'paragraph',
      text: 'EU import rules are written around two anchors: the country of origin (where the commodity was produced) and the operator placing the product on the EU market. Neither anchor moves when goods transit a third country. A consignment of Nigerian sesame that spends six months in a Jebel Ali warehouse is still, in the eyes of an EU border control post, Nigerian sesame. Ghanaian cocoa railed through Dubai is still Ghanaian cocoa. The dispatch country on your bill of lading changes; the origin doesn\'t.',
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'Transit Doesn\'t Reset Origin',
      text: 'No amount of warehousing, rebagging, or UAE re-export documentation converts African-origin goods into UAE-origin goods for EU regulatory purposes. Origin-linked controls — deforestation due diligence, increased Salmonella checks, contaminant limits — follow the goods from the farm to the EU border, whatever route they take.',
    },
    {
      type: 'paragraph',
      text: 'This inverts the local logic, which is why it catches traders off guard. In the UAE, compliance is about the consignment in front of you: registered, labelled, fit for the market. The EU asks a different question: can you prove where this came from and what happened to it before you ever touched it? If the origin data didn\'t come with the goods, you can\'t answer — and no document issued in Dubai can answer for you.',
    },
    {
      type: 'h2',
      text: 'What Follows Each Commodity to the EU',
    },
    {
      type: 'table',
      headers: ['Commodity', 'What follows it to the EU', 'What Dubai paperwork can\'t fix'],
      rows: [
        ['Cocoa', 'EUDR (Reg (EU) 2023/1115): due diligence statement with plot-level farm geolocation, deforestation-free proof', 'Missing farm coordinates from Ghana, Nigeria, or Côte d\'Ivoire — the DDS traces to the farm, not the warehouse'],
        ['Sesame (Nigerian origin)', 'Increased official controls (CIR (EU) 2019/1793): 50% Salmonella check rate, accredited lab analysis and official certificate per consignment', 'A missing lab trail from origin — re-routing through Jebel Ali doesn\'t change the check rate'],
        ['Ginger', 'MRLs (Reg (EC) 396/2005), aflatoxin B1 limit of 5 µg/kg, phytosanitary certificate incl. the Ralstonia pseudosolanacearum declaration', 'Blended or repacked lots with no records — origin and lot integrity become unprovable'],
      ],
    },
    {
      type: 'h3',
      text: 'Cocoa: The DDS Traces to the Farm, Not to Jebel Ali',
    },
    {
      type: 'paragraph',
      text: 'The EU Deforestation Regulation — Reg (EU) 2023/1115 — applies to placing cocoa on the EU market, full stop. The shipping route is irrelevant. Whoever first places the cocoa on the EU market — your European counterparty, or your own EU entity if you sell direct — must file a due diligence statement (DDS): a signed declaration, backed by plot-level geolocation coordinates, that the cocoa wasn\'t grown on deforested land. Those coordinates point at farms in Ghana or Nigeria or Côte d\'Ivoire. Transiting Dubai doesn\'t reset that, and an EU buyer who can\'t get the geolocation data from you can\'t file — which means they can\'t buy.',
    },
    {
      type: 'paragraph',
      text: 'The country benchmarking under CIR 2025/1093 makes the point even sharper: Ghana is rated low risk, while Nigeria and Côte d\'Ivoire are standard risk. That rating follows the country of production, not the country of dispatch. Cocoa shipped from the UAE is assessed on where it grew. And the penalties for getting it wrong sit with the EU operator: fines with a maximum of at least 4% of EU turnover, confiscation of goods, and market bans — which is exactly why EU buyers are ruthless about supplier data.',
    },
    {
      type: 'callout',
      variant: 'deadline',
      title: 'EUDR Dates After the Second Delay',
      text: 'Under Reg (EU) 2025/2650, EUDR obligations apply to large and medium operators from 30 December 2026, and to micro and small operators from 30 June 2027. If you hold cocoa in Dubai today that you hope to sell into Europe next year, the geolocation data needs to exist now — you can\'t reconstruct farm coordinates after the fact.',
    },
    {
      type: 'h3',
      text: 'Sesame: The Checks Attach to Nigeria, Not to Your Warehouse',
    },
    {
      type: 'paragraph',
      text: 'Nigerian sesame entering the EU is subject to increased official controls under CIR (EU) 2019/1793: a 50% physical check rate for Salmonella, plus a requirement that each consignment travel with an official certificate and analysis results from an ISO/IEC 17025-accredited laboratory. The listing attaches to the origin — Nigeria — not the dispatch point. Send it via Jebel Ali, via Singapore, via anywhere: it\'s still Nigerian sesame and it still faces the same regime at the EU border. One caveat worth acting on: the regulation\'s annexes are revised periodically, most recently in the January 2026 update — check the current annex entry for your commodity and origin before you fix a price, not after.',
    },
    {
      type: 'h3',
      text: 'Ginger: No EUDR, Lighter Checks — But Blending Still Kills the Deal',
    },
    {
      type: 'paragraph',
      text: 'Ginger looks like the easy one. It\'s not an EUDR commodity, and as of the sources we can verify it isn\'t on the increased-controls list either. But it still has to clear the EU\'s baseline: pesticide residue limits under Reg (EC) 396/2005, an aflatoxin B1 limit of 5 µg/kg, and a phytosanitary certificate — which now includes the additional declaration for Ralstonia pseudosolanacearum. Here\'s where re-export practice bites: blend Nigerian ginger with other origins in a Dubai warehouse, or repack it without lot records, and you can no longer prove what any given bag is. That\'s what kills EU ginger deals — not the rules, but the inability to prove anything about the goods.',
    },
    {
      type: 'paragraph',
      text: 'Notice the pattern. Re-export-grade and EU-grade are different products, and the difference isn\'t quality — it\'s data. Two lots of sesame from the same Nigerian aggregator can sit side by side in your warehouse; the one with farm records and a lab trail can go to Hamburg, and the one bought blind can only go where nobody asks. If you bought on price without origin data, the EU channel is closed to you no matter what paperwork Dubai issues.',
    },
    {
      type: 'cta',
      heading: 'One Data Pack for Dubai, the GCC, and the EU — See It Live',
      text: 'OriginTrace links your African supply to farm records, lot-level traceability, and lab documents — so the same consignment can clear FIRS in Dubai and due diligence in Rotterdam. See what an origin-complete data pack looks like on a real shipment.',
      buttonText: 'Request a Demo',
      href: '/demo',
    },
    {
      type: 'h2',
      text: 'What "Origin-Complete Data" Actually Means',
    },
    {
      type: 'paragraph',
      text: 'It\'s tempting to treat this as a documents problem — collect more PDFs. It isn\'t. It\'s a data problem that starts at the farm gate in Africa, months before you ever see the goods. When we say a lot is origin-complete, we mean four things:',
    },
    {
      type: 'bullets',
      items: [
        'Farm-level records: registered farmers and farms behind every lot — and for EUDR commodities like cocoa, plot geolocation coordinates captured at the farm, not estimated later from a district name',
        'Lot mapping: an unbroken chain from farm collection through aggregation, export, and your Dubai warehouse, so any bag can be traced back to the farms that filled it',
        'A lab trail: analysis results from accredited laboratories tied to specific lots at origin — the certificate the EU border asks for on Nigerian sesame is built on this, and it can\'t be created retroactively',
        'No blind blending: if you consolidate or repack in Dubai, records that preserve lot identity through the operation — blend two lots without records and you\'ve destroyed the provability of both',
      ],
    },
    {
      type: 'paragraph',
      text: 'The practical move is to make origin data a purchasing condition, not an afterthought. Ask your African supplier for the farm register, the lot references, and the lab certificates before you agree the price. Suppliers who run digital traceability can hand you all of it in a day. Suppliers who can\'t are selling you re-export-grade goods — price them accordingly and don\'t promise them to Europe.',
    },
    {
      type: 'h2',
      text: 'The Upside: One Book, Three Markets',
    },
    {
      type: 'paragraph',
      text: 'Everything above sounds like cost. It\'s actually the arbitrage. Most Dubai traders in African commodities compete in the same crowded lane: buy on price, sell to buyers who don\'t ask questions. The EU lane is far less crowded, precisely because the data bar filters almost everyone out. A trader who buys origin-complete African supply can serve the GCC, Asia, and EU premium buyers from the same book — pivoting each lot to whichever market bids best, instead of having the decision made by missing paperwork. One data pack, three markets. The goods don\'t change; your optionality does.',
    },
    {
      type: 'image',
      src: '/images/pexels-tomfisk-1427107.jpg',
      alt: 'Overhead aerial of a large port terminal with multicolored shipping containers',
      caption: 'Transshipment hubs move the goods — but EU controls follow the origin, not the route.',
    },
    {
      type: 'faq',
      items: [
        {
          q: 'Does EUDR apply if the cocoa ships to the EU via Dubai?',
          a: 'Yes. EUDR (Reg (EU) 2023/1115) applies to placing cocoa on the EU market regardless of the shipping route. The EU operator — your European buyer, or your own EU entity — must file a due diligence statement with plot-level geolocation back to the farms in Africa. Transit through the UAE doesn\'t reset origin or remove the obligation.',
        },
        {
          q: 'Can re-routing Nigerian sesame through the UAE avoid the EU\'s increased checks?',
          a: 'No. The increased controls under CIR (EU) 2019/1793 attach to the country of origin — Nigeria — not the country of dispatch. Nigerian sesame arriving from Jebel Ali faces the same 50% Salmonella check rate and the same certificate and accredited-lab requirements as sesame shipped direct from Lagos.',
        },
        {
          q: 'What data do I need from my African supplier before I can sell into the EU?',
          a: 'Farm-level records (with plot geolocation for EUDR commodities like cocoa), lot mapping that links each consignment back to specific farms, and lab analysis from accredited laboratories tied to those lots. Ask for it before you agree the price — none of it can be reconstructed after the goods are in your warehouse.',
        },
        {
          q: 'Do UAE authorities enforce EU rules on my re-exports?',
          a: 'No. UAE authorities enforce UAE requirements — Dubai Municipality\'s FIRS handles food import and re-export declarations, and your goods leave Dubai on that basis. EU rules are enforced at the EU border, by EU authorities, against the EU operator. That\'s exactly why a clean Dubai file offers no protection at Rotterdam.',
        },
        {
          q: 'When do the EUDR obligations actually start?',
          a: 'After the second delay under Reg (EU) 2025/2650: 30 December 2026 for large and medium operators, 30 June 2027 for micro and small operators. Cocoa you plan to sell into the EU after those dates needs farm geolocation data collected now.',
        },
      ],
    },
    {
      type: 'cta',
      heading: 'Stop Selling EU-Grade Goods at Re-Export Prices',
      text: 'If your African supply arrives with farm records, lot traceability, and a lab trail already attached, every market is open to you. OriginTrace builds that data pack from the farm up — see it live on your own commodity flow.',
      buttonText: 'Book a Demo',
      href: '/demo',
    },
    {
      type: 'references',
      items: [
        { label: 'Regulation (EU) 2023/1115 (EUDR) — Official Text', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32023R1115', publisher: 'EUR-Lex' },
        { label: 'Regulation (EU) 2025/2650 — EUDR Application Date Amendment', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32025R2650', publisher: 'EUR-Lex' },
        { label: 'Commission Implementing Regulation (EU) 2019/1793 — Increased Official Controls', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32019R1793', publisher: 'EUR-Lex' },
        { label: 'Commission Implementing Regulation (EU) 2025/1093 — EUDR Country Benchmarking', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32025R1093', publisher: 'EUR-Lex' },
        { label: 'Regulation (EC) No 396/2005 — Maximum Residue Levels', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32005R0396', publisher: 'EUR-Lex' },
      ],
    },
  ],
};
