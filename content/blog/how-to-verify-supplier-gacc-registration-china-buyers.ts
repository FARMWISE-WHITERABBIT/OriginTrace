import type { BlogPost } from '@/lib/blog';

export const post: BlogPost = {
  slug: 'how-to-verify-supplier-gacc-registration-china-buyers',
  title: 'How to Check a Nigerian or Ghanaian Supplier\'s GACC Registration Before You Pay',
  description: 'A Nigerian or Ghanaian exporter says they\'re GACC registered. Here\'s the public lookup that confirms it — and what to check beyond the registration number.',
  date: 'September 2, 2026',
  dateISO: '2026-09-02',
  category: 'Compliance',
  readingTime: '7 min read',
  author: 'OriginTrace Compliance Team',
  authorRole: 'Supply Chain Compliance',
  coverImage: '/images/pexels-stephanefabricebass-10319259.jpg',
  coverImageAlt: 'Two workers in safety gear examine crops in a field',
  coverGradient: 'from-red-900/20 to-slate-800/50',
  tags: ['GACC', 'China', 'Buyer Due Diligence', 'CIFER', 'Importers', 'Sesame', 'Cocoa'],
  content: [
    {
      type: 'paragraph',
      text: 'A West African exporter quotes you a good price on sesame, cocoa, or gum arabic and tells you their facility is GACC registered. Their invoice has a registration number printed on it. Do you take that at face value, or check it?',
    },
    {
      type: 'paragraph',
      text: 'You should check it — and you can, in about two minutes, without asking the supplier for anything. China\'s General Administration of Customs publishes a public registry of every enterprise approved under Decree 248. It costs nothing to search and requires no account. Most buyers simply don\'t know it exists.',
    },
    {
      type: 'h2',
      text: 'GACC Registration Is Public Record',
    },
    {
      type: 'paragraph',
      text: 'The China Import Food Enterprise Registration system — CIFER — is where facilities apply for and hold their registration. A separate, public-facing query site, ciferquery.singlewindow.cn, lets anyone look up the current status of a registered enterprise: the product category it\'s approved for, its overseas registration number, and the expiry date. You don\'t need a CIFER account, and the supplier doesn\'t need to send you anything for you to check.',
    },
    {
      type: 'numbered',
      intro: 'To check a supplier before you commit:',
      items: [
        'Go to the public CIFER query site (ciferquery.singlewindow.cn) rather than the registration/application portal (cifer.singlewindow.cn) — the query site is the read-only lookup; the other is where facilities apply.',
        'Search by the registration number printed on the supplier\'s invoice or certificate, or by the company name if you don\'t have a number yet.',
        'Confirm three things independently: the facility name matches who you\'re actually paying, the product category matches what you\'re buying (sesame and cocoa are different categories — a registration for one doesn\'t cover the other), and the registration hasn\'t expired.',
        'If the supplier gave you a number and it doesn\'t appear in the query results at all, that\'s not a technical glitch to explain away — treat it as a hard stop until it\'s resolved.',
      ],
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'A Registration Number Isn\'t Proof of a Match',
      text: 'The single most common gap isn\'t a fake number — it\'s a real registration for the wrong thing. A facility registered as a grain and oilseed processor may not be approved for the specific product category you\'re importing. Confirm the product category in the query result matches your purchase order, not just that a registration exists.',
    },
    {
      type: 'h2',
      text: 'What "Registered" Actually Means',
    },
    {
      type: 'paragraph',
      text: 'GACC registration under Decree 248 is facility-level, not company-level — a point worth understanding before you assume a supplier\'s claim covers their whole operation. Our [full GACC registration walkthrough](/blog/how-to-export-to-china-gacc-registration-guide) covers this from the exporter\'s side, and our [sesame- and gum-arabic-specific guide](/blog/gacc-compliance-traceability-sesame-gum-arabic-nigeria) goes deeper on what Chinese buyers of those specific commodities are already asking for. The short version: the cleaning plant, the storage warehouse, and the export packaging facility can each need their own registration. A trading company with no physical facility of its own is only as compliant as the specific upstream facility that actually touched your product — so "our company is GACC registered" is a claim worth breaking down into "which facility, registered for which category, valid until when."',
    },
    {
      type: 'table',
      headers: ['What you see', 'What it likely means'],
      rows: [
        ['No result for the number provided', 'The number is invalid, mistyped, or never existed — get a corrected number before proceeding, not an explanation'],
        ['Result found, but expired', 'Registration lapsed and hasn\'t been renewed (valid period is five years) — this shipment cannot legally clear customs until it\'s current'],
        ['Result found, product category doesn\'t match', 'The facility is registered for a different commodity — your specific product may not actually be covered'],
        ['Facility name doesn\'t match your paying entity', 'You may be dealing with a trader whose upstream facility is registered, not the entity you\'re contracting with — ask which facility actually processes your goods'],
        ['Everything matches and is current', 'The registration checks out — this confirms customs eligibility, not quality or traceability, which still need their own checks'],
      ],
    },
    {
      type: 'cta',
      heading: 'Verify a Supplier Before You Commit',
      text: 'OriginTrace runs registration, documentation, and batch-traceability checks together and turns them into a supplier risk snapshot you can act on before the contract is signed.',
      buttonText: 'Request a Supplier Risk Snapshot',
      href: '/demo?role=buyer',
    },
    {
      type: 'h2',
      text: 'Beyond Registration: What a Serious Supplier Should Also Show You',
    },
    {
      type: 'paragraph',
      text: 'A clean CIFER result confirms your supplier is legally allowed to sell into China. It says nothing about whether the specific consignment in front of you is what they claim it is. For that, ask for what Chinese buyers of Nigerian sesame and gum arabic are increasingly requiring as standard practice: lab test results referencing the specific batch (Salmonella absence, pesticide MRLs to Chinese GB standards, aflatoxin), a phytosanitary certificate from NAQS, and batch-level traceability showing which aggregation points and farmer groups fed this specific shipment — not a general statement that "all our product is traceable."',
    },
    {
      type: 'h2',
      text: 'Bringing Suppliers Onto a Standing Record',
    },
    {
      type: 'paragraph',
      text: 'A CIFER lookup and a document request are point-in-time checks — accurate the day you run them, silent about everything after. The stronger position for a repeat buying relationship is standing visibility: your supplier maintaining their registration status, batch records, and lab results inside OriginTrace as they operate, with you seeing the same records from your buyer workspace before every shipment. If a registration lapses or a batch fails a test, you see it as it happens rather than discovering it when a container is already refused at port.',
    },
    {
      type: 'faq',
      items: [
        {
          q: 'Where do I check if a Nigerian or Ghanaian supplier is really GACC registered?',
          a: 'At the public CIFER query site, ciferquery.singlewindow.cn — not the registration portal at cifer.singlewindow.cn, which is for applications. The query site is free, requires no account, and shows the registration\'s product category, overseas registration number, and expiry date for any approved facility.',
        },
        {
          q: 'Is GACC registration company-wide or facility-specific?',
          a: 'Facility-specific. A single trading company can source from multiple processing or storage facilities, each of which needs its own registration for the relevant product category. A supplier telling you "we\'re registered" doesn\'t confirm that the specific facility handling your order is the one that\'s registered.',
        },
        {
          q: 'How long does a GACC registration stay valid?',
          a: 'Five years from approval, after which it must be renewed. The public query site shows the expiry date — check it every time, not just on your first order with a supplier, since registrations lapse mid-relationship.',
        },
        {
          q: 'What if the registration number a supplier gave me doesn\'t show up in the query system?',
          a: 'Treat that as a hard stop, not a detail to clarify by email. It usually means the number is mistyped, invalid, or was never actually issued. Ask for a corrected number and re-check before you commit to payment or shipment.',
        },
      ],
    },
    {
      type: 'cta',
      heading: 'Bring Your Suppliers Onto OriginTrace',
      text: 'Onboard your Nigerian and Ghanaian suppliers and see their GACC status, batch records, and lab results from your buyer workspace — maintained at origin, visible before every shipment.',
      buttonText: 'Bring Your Suppliers Onto OriginTrace',
      href: '/importers',
    },
    {
      type: 'references',
      items: [
        { label: 'CIFER — China Import Food Enterprise Registration public query system', url: 'https://ciferquery.singlewindow.cn', publisher: 'GACC' },
        { label: 'GACC Decree 248 — Measures for Registration Administration of Overseas Manufacturers of Imported Food', url: 'http://www.customs.gov.cn/customs/302249/302266/302268/3630845/index.html', publisher: 'GACC' },
        { label: 'China Import Food Enterprise Registration (CIFER) — guidance for industry', url: 'https://inspection.canada.ca/en/exporting-food-plants-animals/food-exports/requirements-library/peoples-republic-china-cifer', publisher: 'Canadian Food Inspection Agency' },
      ],
    },
  ],
};
