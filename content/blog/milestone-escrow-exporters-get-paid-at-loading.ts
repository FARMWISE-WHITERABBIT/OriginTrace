import type { BlogPost } from '@/lib/blog';

export const post: BlogPost = {
  slug: 'milestone-escrow-exporters-get-paid-at-loading',
  title: 'Get Paid at Loading, Not Arrival: Milestone Escrow for Exporters',
  description: 'Your cocoa shipped in November; the cash lands in March. Milestone escrow releases most of a shipment\'s value at loading — against verified carrier events.',
  date: 'July 10, 2026',
  dateISO: '2026-07-10',
  category: 'Best Practices',
  readingTime: '7 min read',
  author: 'OriginTrace Compliance Team',
  authorRole: 'Supply Chain Compliance',
  coverImage: '/images/pexels-tomfisk-2231744.jpg',
  coverImageAlt: 'Aerial view of a cargo vessel being loaded with containers by cranes at a port berth',
  coverGradient: 'from-teal-900/40 to-slate-900/60',
  tags: ['Export Payments', 'Escrow', 'Letters of Credit', 'Working Capital', 'Nigeria', 'Ghana'],
  content: [
    {
      type: 'paragraph',
      text: 'Your cocoa left Tin Can Island in November. The vessel sailed, the bill of lading is in hand, the buyer is happy — and the money lands in March. Meanwhile it\'s December, the main crop is still coming in, and every farmer and aggregator you work with wants paying now. In cash. This week.',
    },
    {
      type: 'paragraph',
      text: 'That gap is the quiet tax on African commodity exporters. Not fraud, not rejections, not compliance — just waiting. This post is about closing it: how milestone escrow releases most of your shipment\'s value when the container is loaded, not when it lands, and why serious buyers are happy to pay that way. If you\'ve already survived [a buyer\'s verification checklist](/blog/verify-nigerian-exporter-legitimacy), this is the payoff.',
    },
    {
      type: 'h2',
      text: 'What Waiting 120 Days Actually Costs You',
    },
    {
      type: 'paragraph',
      text: 'On open-account terms, an Africa-to-Europe or Africa-to-Asia commodity shipment commonly takes three to four months from loading to cash. Transit is only part of it. Add discharge, inland delivery, the buyer\'s quality checks, and their payment run, and 90 to 120 days is a normal cycle — not a horror story.',
    },
    {
      type: 'paragraph',
      text: 'The problem isn\'t the calendar. It\'s what the calendar does to your working capital. The money tied up on the water is exactly the money you need to buy next season\'s crop. Sesame doesn\'t wait for your receivable. Neither do the aggregators who\'ll happily sell to your competitor for cash on delivery.',
    },
    {
      type: 'bullets',
      intro: 'So exporters bridge the gap, and every bridge has a toll:',
      items: [
        'Overdrafts and bridge loans — exporters in Nigeria and Ghana routinely borrow at rates that eat a painful slice of the margin on the very shipment they\'re bridging',
        'Invoice discounting — selling the receivable for less than it\'s worth, when you can find a financier willing to touch a cross-border commodity invoice at all',
        'Shrinking the business — taking fewer contracts than you could fill, because each one locks capital for a full quarter',
      ],
    },
    {
      type: 'paragraph',
      text: 'Run that across a season and the waiting costs more than most quality claims ever will. Which raises the obvious question: isn\'t this exactly what letters of credit are for?',
    },
    {
      type: 'h2',
      text: 'Why a Letter of Credit Doesn\'t Fix This',
    },
    {
      type: 'paragraph',
      text: 'A letter of credit (LC) — a bank\'s promise to pay you against conforming documents, governed by the ICC\'s UCP 600 rules — is genuinely good at one thing: replacing trust in the buyer with trust in a bank. Nigerian and Ghanaian banks issue and advise LCs every day, at sight or deferred. For a large contract with a counterparty you\'ve never met, an LC still earns its place.',
    },
    {
      type: 'paragraph',
      text: 'But for an SME exporter\'s cash flow, the LC fails quietly. It\'s expensive — issuance, confirmation, and discrepancy fees stack up, and it often needs confirmation by a second bank at extra cost before anyone treats it as solid. It\'s slow — negotiating the LC text can take weeks a shipment window doesn\'t have. And even a sight LC pays against documents late in the cycle: you present after shipment, banks examine, discrepancies get raised (they usually are), and more days disappear before value lands. A deferred LC just walks you back toward the open-account wait — with the fees on top.',
    },
    {
      type: 'table',
      headers: ['What matters to you', 'Open account', 'Letter of credit', 'Milestone escrow'],
      rows: [
        ['When cash arrives', 'After arrival — commonly three to four months from loading', 'Against documents, late in the cycle, after examination and discrepancy rounds', 'Majority at loading, against the bill of lading'],
        ['Cost to you', 'Cheap on paper, expensive in bridge financing', 'Issuance, confirmation, and discrepancy fees stack up', 'No issuing bank, no confirming bank, no discrepancy game'],
        ['Setup time', 'A contract and a handshake', 'Weeks of LC text negotiation between banks', 'Milestone schedule agreed in the contract; buyer funds escrow at signing'],
        ['What triggers payment', 'The buyer deciding to pay', 'Conforming paper documents', 'Carrier-confirmed shipping events, logged immutably'],
      ],
    },
    {
      type: 'paragraph',
      text: 'The short version: LC-grade assurance, milestone-speed cash flow. Money that\'s already funded replaces the bank\'s promise; events the carrier confirms actually happened replace the document examination.',
    },
    {
      type: 'cta',
      heading: 'What Would Loading-Day Payment Change?',
      text: 'Get paid when the container is on the water — not when it lands. See your payment timeline on a milestone escrow deal, mapped against your next shipment.',
      buttonText: 'See Your Payment Timeline',
      href: '/demo',
    },
    {
      type: 'h2',
      text: 'How Milestone Escrow Works, Step by Step',
    },
    {
      type: 'paragraph',
      text: 'Here\'s the exporter\'s view of a milestone escrow deal on OriginTrace, from signature to final release:',
    },
    {
      type: 'numbered',
      items: [
        'You agree the contract and the milestone schedule. You and the buyer decide what percentage releases at each shipping event — the typical shape puts most of the value at loading and holds a final tranche for delivery.',
        'The buyer funds the escrow at contract signing. The full amount sits in a shared-ledger escrow account both sides can see. You\'re no longer shipping against a promise — the money exists before your first truck moves.',
        'Your container gates in at the origin terminal. The carrier confirms the gate-in event, and the first milestone releases. You\'re being paid while the container is still in the stack.',
        'The container is loaded on board and the bill of lading is issued. This is the big one — the loading milestone releases, and most of the shipment\'s value is on its way to you while the vessel is still at berth.',
        'The vessel departs, then discharges at the destination port. Carrier-confirmed departure and discharge events release the next tranches on your schedule.',
        'Both sides confirm delivery, and the final tranche releases. The buyer keeps this last slice behind their own confirmation — that\'s their protection, and it\'s a big part of why they\'ll agree to everything above.',
      ],
    },
    {
      type: 'paragraph',
      text: 'Every release is logged immutably on the shared ledger, so there\'s never an argument later about what released, when, and against which event. If either side raises a dispute, releases freeze until it\'s resolved.',
    },
    {
      type: 'callout',
      variant: 'tip',
      title: 'Estimated Events Never Move Money',
      text: 'Releases fire only on carrier-confirmed actual events — a gate-in, a loading, a discharge the carrier has reported as happened, not projected. There\'s also a short settlement window between the confirmed event and funds moving, so a mis-reported event doesn\'t cost anyone real money.',
    },
    {
      type: 'image',
      src: '/images/lagos-apapa-port.jpg',
      alt: 'Container stacks and vessels at Apapa port in Lagos, Nigeria, where loading milestones trigger exporter payments',
      caption: 'The loading milestone means your payment cycle starts here — at the origin port — not at a warehouse in Rotterdam.',
    },
    {
      type: 'h2',
      text: 'What You Have to Be Able to Prove',
    },
    {
      type: 'paragraph',
      text: 'Milestone escrow isn\'t free money — it\'s a deal, and your side of it is evidence. The buyer agrees to pay early because the release triggers are verifiable. That means the shipment behind them has to be verifiable too:',
    },
    {
      type: 'bullets',
      items: [
        'A traceable product — farm records, collection batches, and lot history showing exactly what went into the container',
        'A clean document pack — invoice, packing list, certificate of origin, phytosanitary and quality certificates, all consistent with the batch data',
        'A tracked container — the booking linked to the escrow, so carrier events flow through to milestone releases automatically',
      ],
    },
    {
      type: 'paragraph',
      text: 'Here\'s the part exporters tend to like: it\'s the same work, used twice. The traceability records you\'re already building for compliance — the farm-level data that clears EU and other market requirements — are the same records that make you escrow-ready. On [OriginTrace](/solutions), that\'s one system: the batch data behind your due diligence paperwork is the batch data sitting behind your milestone releases. You don\'t build a second evidence trail to get paid faster. You get paid faster because the evidence trail already exists.',
    },
    {
      type: 'h2',
      text: 'Will Buyers Actually Agree to This?',
    },
    {
      type: 'paragraph',
      text: 'Fair question — you\'re asking a buyer to part with most of the money months before the goods land. Sit on their side of the table and it\'s less strange than it sounds:',
    },
    {
      type: 'bullets',
      items: [
        'They pay against proof, not trust. Every release is triggered by a carrier-confirmed event — the container really gated in, the bill of lading really exists. That\'s a harder standard than most open-account relationships ever reach.',
        'They keep the last word. The final tranche only releases when both sides confirm delivery.',
        'Disputes freeze everything. If something\'s wrong, no further money moves until it\'s resolved.',
        'Verified suppliers are suppliers they keep. A counterparty whose farms, batches, and shipments are documented on-platform can be reordered from without re-running due diligence. Buyers pay early for suppliers they don\'t want to lose.',
      ],
    },
    {
      type: 'paragraph',
      text: 'And escrow doesn\'t have to replace the formal machinery. An enterprise deal can still run an LC alongside it where the contract demands one. But on SME lanes — a few containers of cocoa, sesame, ginger, or cashew per contract — milestone escrow does the job the LC was pretending to do, without the 90-to-120-day wait.',
    },
    {
      type: 'faq',
      items: [
        {
          q: 'How fast do I get paid with milestone escrow?',
          a: 'Most of the shipment\'s value releases at the loading milestone — container loaded on board, bill of lading issued — with earlier value at gate-in and the balance through discharge and delivery confirmation. Each carrier-confirmed event has a short settlement window before funds move. Compare that with the three to four months open-account terms commonly take from loading to cash.',
        },
        {
          q: 'Is milestone escrow a loan?',
          a: 'No. It\'s your own contract money, released earlier. The buyer funds the full amount into escrow at signing, and milestones release it as verified shipping events happen. No interest, no repayment, no debt on your books — unlike the overdrafts and invoice discounting exporters use to bridge open-account terms.',
        },
        {
          q: 'What happens if the buyer disputes the shipment?',
          a: 'Releases freeze. No further tranches move until the dispute is resolved, and every release that already happened is logged immutably against the carrier event that triggered it — both sides argue from the same record. The final tranche always needs confirmation from both parties.',
        },
        {
          q: 'Can I still use a letter of credit?',
          a: 'Yes. Escrow complements formal payment terms — an enterprise contract can run an LC alongside a milestone schedule. On SME trade lanes, though, milestone escrow replaces the wait an LC doesn\'t solve: even a sight LC pays against documents late in the cycle.',
        },
        {
          q: 'What shipping events trigger an escrow release?',
          a: 'Gate-in at the origin terminal, loaded on board with the bill of lading issued, vessel departure, and discharge at the destination port — all carrier-confirmed. Estimated events never release funds; only confirmed actuals do. The final tranche releases on delivery confirmation by both sides.',
        },
      ],
    },
    {
      type: 'cta',
      heading: 'Get Paid at Loading, Not Arrival',
      text: 'The traceability records you already keep are what unlock milestone payments. See what your next shipment\'s payment timeline looks like — gate-in, loading, discharge, done.',
      buttonText: 'Map Your Next Shipment',
      href: '/demo',
    },
  ],
};
