import type { BlogPost } from '@/lib/blog';

export const post: BlogPost = {
  slug: 'escrow-vs-letter-of-credit-commodity-imports',
  title: 'Escrow vs Letter of Credit for African Commodity Imports',
  description: 'Blind prepayment or LC bureaucracy? An honest comparison of letters of credit and milestone escrow for importers buying commodities from Africa.',
  date: 'July 10, 2026',
  dateISO: '2026-07-10',
  category: 'Best Practices',
  readingTime: '7 min read',
  author: 'OriginTrace Compliance Team',
  authorRole: 'Supply Chain Compliance',
  coverImage: '/images/pexels-tomfisk-2231744.jpg',
  coverImageAlt: 'Aerial view of a red cargo ship being loaded at port',
  coverGradient: 'from-slate-900/40 to-emerald-900/40',
  tags: ['Letters of Credit', 'Escrow', 'Trade Finance', 'Importers', 'Payments', 'Risk Management'],
  content: [
    {
      type: 'paragraph',
      text: 'Every importer buying from a new African supplier hits the same fork in the road. Option one: wire money upfront by bank transfer and trust that a container actually shows up — which is where every trade-fraud story you\'ve ever heard begins (see our [guide to verifying a Nigerian exporter](/blog/verify-nigerian-exporter-legitimacy) before you get anywhere near that decision). Option two: open a letter of credit and watch a straightforward commodity deal disappear into bank paperwork, fees, and weeks of back-and-forth. Neither feels right, because neither is.',
    },
    {
      type: 'paragraph',
      text: 'This is an honest comparison of the two instruments most importers actually weigh — the letter of credit and milestone escrow — including the cases where the LC is still the better call. If you\'re building longer-term supply relationships, it\'s also the payment layer behind the move to [bring your suppliers onto OriginTrace](/importers). But payment structure comes first, so let\'s take it seriously.',
    },
    {
      type: 'h2',
      text: 'What a Letter of Credit Actually Does — and Does Well',
    },
    {
      type: 'paragraph',
      text: 'Credit where it\'s due: the letter of credit is one of the most successful risk instruments in trade history. Your bank promises to pay the supplier\'s bank when a defined set of documents — bill of lading, invoice, certificates — is presented in exact conformity with the LC\'s terms. The whole thing runs on UCP 600, the International Chamber of Commerce rulebook that banks almost everywhere follow. You get a bank\'s balance sheet standing between you and a supplier you\'ve never met. For large enterprise contracts, it remains the standard, and deservedly so.',
    },
    {
      type: 'paragraph',
      text: 'The problems show up when you run an LC on the kind of lane most readers of this post are running: SME-sized commodity shipments — cocoa, cashew, sesame, hibiscus — from an African exporter who isn\'t a multinational.',
    },
    {
      type: 'h2',
      text: 'Where the LC Hurts on SME Commodity Lanes',
    },
    {
      type: 'bullets',
      intro: 'Four weaknesses come up again and again:',
      items: [
        'The fee stack. Issuance fees, amendment fees every time a shipment detail changes, discrepancy fees when documents don\'t match, and — because many African exporters\' banks aren\'t trusted by yours — confirmation fees for a second bank to guarantee the first. Most of the stack lands even when nothing goes wrong.',
        'Speed. Negotiating the LC text, issuing it, and checking documents at each presentation all take time. On seasonal goods with a short price window, weeks matter.',
        'Discrepancy disputes. Banks apply the strict compliance doctrine: documents must conform to the LC terms essentially to the letter. A misspelled consignee, a date one day off, a description that doesn\'t match the invoice — any of these can trigger a discrepancy notice, a fee, and a payment stalled while banks exchange correspondence.',
        'The blind spot: an LC verifies documents, not goods. This is by design — under UCP 600, banks deal in documents, not in the goods those documents may relate to. If the paperwork conforms, the bank pays, whatever is actually in the container. If the paperwork doesn\'t conform, the bank can refuse, however perfect the cargo.',
      ],
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'The line worth remembering',
      text: 'Banks deal in documents, not goods. A letter of credit can pay in full against conforming paperwork on a defective shipment, and refuse payment on a perfect shipment with imperfect paperwork. Every LC decision should start from that fact.',
    },
    {
      type: 'h2',
      text: 'Escrow vs Letter of Credit: Side by Side',
    },
    {
      type: 'table',
      headers: ['What matters to you', 'Letter of credit', 'Milestone escrow'],
      rows: [
        ['Cost profile', 'A stack of bank fees — issuance, confirmation, amendments, discrepancies — accruing even on clean deals', 'A platform arrangement priced for the transaction, with no correspondent-banking fee stack'],
        ['Speed', 'Slow to negotiate and issue; document checking adds delay at every presentation', 'Funded once at contract; releases trigger automatically as carrier events are confirmed'],
        ['What it verifies', 'Documents only — conforming paperwork gets paid regardless of the goods', 'Verified physical events (loading, discharge) plus the supplier\'s traceability record — evidence about the goods themselves'],
        ['Dispute handling', 'Discrepancy notices and bank-to-bank correspondence under strict compliance rules', 'One raised dispute freezes every remaining release until it\'s resolved'],
        ['SME accessibility', 'Depends on your credit line and your supplier\'s bank being acceptable — or expensively confirmed', 'No bank credit line needed on either side; built for exactly these lanes'],
      ],
    },
    {
      type: 'h2',
      text: 'When a Letter of Credit Is Still the Right Call',
    },
    {
      type: 'paragraph',
      text: 'Here\'s the part a payments platform isn\'t supposed to say: sometimes you should use the LC. If the contract is large enough that you want a bank formally underwriting performance, use an LC. If you already have cheap LC lines and a trade-finance desk that handles the paperwork, the cost argument mostly evaporates. If your treasury policy, your lenders, or your regulators require bank instruments for cross-border purchases, that\'s not a debate — comply. And some corridors simply expect a confirmed LC as table stakes; fighting that convention on a first deal is rarely worth it.',
    },
    {
      type: 'paragraph',
      text: 'What an LC won\'t ever do, at any contract size, is tell you anything about the goods. It secures the payment mechanics. The origin, quality, and traceability questions stay entirely yours.',
    },
    {
      type: 'cta',
      heading: 'Pay on Proof, Not Promises',
      text: 'See how milestone escrow works on a real shipment — funding at contract, releases against carrier-confirmed loading and discharge, final tranche on your say-so. A 30-minute walkthrough with a live supply chain in it.',
      buttonText: 'See Milestone Escrow on a Real Shipment',
      href: '/demo?role=buyer',
    },
    {
      type: 'h2',
      text: 'How Milestone Escrow Works From the Buyer\'s Seat',
    },
    {
      type: 'numbered',
      items: [
        'You fund the escrow at contract. The money leaves your account once — into the escrow arrangement, not the supplier\'s account. Your supplier can see it\'s funded, so nobody is shipping on faith.',
        'The supplier ships. The carrier confirms the container is loaded on board and the bill of lading is issued. These are events reported by the carrier — not claims typed in by the supplier.',
        'After a settlement window — a short buffer in which you can see the confirmed event and the documents behind it — the loading tranche releases to the supplier.',
        'The vessel discharges at your port, again carrier-confirmed, and the next tranche releases after its own window.',
        'The final tranche moves only when you confirm — after inspection, quantity check, quality check, whatever your contract specifies. No confirmation, no release.',
        'If anything looks wrong at any point, you raise a dispute — and every remaining release freezes until it\'s resolved. Nothing moves while the question is open.',
      ],
    },
    {
      type: 'paragraph',
      text: 'One thing to be straight about: milestone escrow is a platform-held arrangement, not a bank instrument. There\'s no UCP 600 behind it and no bank guaranteeing payment against documents. What you get instead is the thing the LC structurally can\'t give you — releases tied to verified physical events and the supplier\'s traceability record, so you\'re paying against evidence about the goods, not just conforming paperwork. Different instrument, different protection. Pick based on which risk you\'re actually pricing.',
    },
    {
      type: 'image',
      src: '/images/pexels-tomfisk-1427107.jpg',
      alt: 'Overhead aerial of a large port terminal with multicolored shipping containers',
      caption: 'Loading and discharge are carrier-confirmed events — which is what makes them safe to release money against.',
    },
    {
      type: 'h2',
      text: 'The Part Buyers Underrate: Your Supplier\'s Cash Flow',
    },
    {
      type: 'paragraph',
      text: 'Most comparisons stop at your own risk. The stronger argument for escrow is on the other side of the ocean — see the exporter\'s side of this same story in [Get Paid at Loading, Not Arrival](/blog/milestone-escrow-exporters-get-paid-at-loading). On open-account terms, an African exporter commonly waits three to four months — from the day the container leaves the farm gate until your payment clears — to see their money. That entire time, their working capital is sitting on the water. They can\'t buy the next season\'s crop, can\'t pay farmers promptly, and can\'t afford to say no to a faster-paying buyer than you.',
    },
    {
      type: 'paragraph',
      text: 'With milestone escrow, the same exporter receives most of the shipment\'s value at loading instead of at arrival. That\'s not charity — it\'s leverage that flows back to you. A supplier who isn\'t capital-starved can fund the next crop, hold quality instead of cutting corners, and prioritize the buyer whose money releases at verified milestones. That buyer is you. It\'s the whole idea in one line: LC-grade assurance, milestone-speed cash flow.',
    },
    {
      type: 'h2',
      text: 'You Don\'t Have to Pick Just One',
    },
    {
      type: 'paragraph',
      text: 'This isn\'t either/or. Enterprise deals often keep the LC as the formal backbone while escrow governs the pre-arrival tranches — the loading and discharge releases that decide whether your supplier stays liquid through the voyage. And plenty of buyers pilot escrow on a single lane before deciding anything bigger.',
    },
    {
      type: 'faq',
      items: [
        {
          q: 'Is escrow safer than a letter of credit?',
          a: 'It\'s a different kind of safe. An LC gives you a bank\'s credit standing behind the payment, applied strictly against documents. Milestone escrow ties releases to verified physical events, with the final tranche held until you confirm — but it\'s not a bank guarantee and isn\'t regulated like one. If your worry is bank-grade assurance on a very large contract, the LC wins. If your worry is whether the goods actually shipped and what they are, escrow verifies things the LC never looks at.',
        },
        {
          q: 'Who holds the money?',
          a: 'The funds sit in the platform-held escrow arrangement from the moment you fund at contract. Neither you nor the supplier can move them unilaterally — money only leaves when a milestone\'s release conditions are met, or back to you under the dispute and refund terms of the contract. Your supplier can verify the escrow is funded before shipping; you can verify nothing releases without a confirmed event.',
        },
        {
          q: 'What triggers a release?',
          a: 'Carrier-confirmed shipping events. The loading tranche releases after the container is confirmed loaded on board and the bill of lading is issued, once a settlement window passes. The discharge tranche follows the same pattern at the destination port. The final tranche releases only on your explicit confirmation. No event, no release — a supplier\'s own say-so triggers nothing.',
        },
        {
          q: 'What happens in a dispute?',
          a: 'Everything freezes. The moment a dispute is raised, all remaining releases stop until it\'s resolved — no tranche moves while the question is open. Compare that with an LC discrepancy dispute, which plays out as correspondence between banks under strict compliance rules while you wait for a determination about paperwork.',
        },
        {
          q: 'Can I use both an LC and escrow?',
          a: 'Yes, and larger deals often should. A common structure keeps the LC as the formal instrument the contract requires while milestone escrow governs the pre-arrival tranches, so the supplier gets paid at loading rather than months later. They solve different problems — the LC secures payment mechanics, escrow ties money to verified events — so they stack rather than conflict.',
        },
      ],
    },
    {
      type: 'cta',
      heading: 'See It Working Before You Commit a Contract to It',
      text: 'Pay on proof — see how milestone escrow works on a real shipment, from funding at contract to the final tranche you control, with the supplier\'s traceability record behind every release.',
      buttonText: 'Book a Buyer Demo',
      href: '/demo?role=buyer',
    },
  ],
};
