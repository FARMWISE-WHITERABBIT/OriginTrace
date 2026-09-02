import type { BlogPost } from '@/lib/blog';

export const post: BlogPost = {
  slug: 'uk-forest-risk-commodities-not-in-force-buyers-guide',
  title: 'Is the UK\'s Deforestation Law Actually in Force? No — Here\'s What Buyers Need to Know',
  description: 'The UK\'s forest-risk commodity due diligence law isn\'t in force yet, despite what a lot of compliance content — including our own — has implied. Here\'s the real status.',
  date: 'September 2, 2026',
  dateISO: '2026-09-02',
  category: 'Regulatory',
  readingTime: '7 min read',
  author: 'OriginTrace Compliance Team',
  authorRole: 'Supply Chain Compliance',
  coverImage: '/images/pexels-tomfisk-1427107.jpg',
  coverImageAlt: 'Overhead aerial of a large port terminal with multicolored shipping containers',
  coverGradient: 'from-slate-800/40 to-emerald-900/30',
  tags: ['UK', 'Environment Act', 'Forest Risk Commodities', 'Importers', 'Buyer Due Diligence', 'EUDR'],
  content: [
    {
      type: 'paragraph',
      text: 'If you\'ve read anything about UK forest-risk commodity due diligence — including, until recently, our own compliance page — you could reasonably come away thinking large UK businesses have been legally required to run due diligence on cocoa, coffee, and other forest-risk commodities since 2024, with penalties active since 2025. That\'s not correct. As of today, none of it is in force. Nothing has "taken effect." There\'s no penalty regime running. We got this wrong on our own site and have corrected it — which is exactly why it\'s worth writing about: this is a genuinely easy thing to get wrong, and a lot of compliance content out there still has it wrong.',
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'We Corrected Our Own Page',
      text: 'Our UK compliance page previously stated large-business obligations "took effect" in 2024 and penalties were "active" in 2025. Neither is true. We\'ve fixed it. If you\'ve seen similar claims elsewhere — including from us before this correction — don\'t rely on them.',
    },
    {
      type: 'h2',
      text: 'What\'s Actually True Right Now',
    },
    {
      type: 'paragraph',
      text: 'Schedule 17 of the UK Environment Act 2021 — the provision that would introduce forest-risk commodity due diligence — received Royal Assent in November 2021. But Schedule 17 doesn\'t work on its own. It requires secondary legislation to actually commence, and that secondary legislation has never been made. The government ran a first consultation in 2023 under the previous administration. Then the process effectively stalled.',
    },
    {
      type: 'paragraph',
      text: 'In June 2026, the current government reopened it: DEFRA announced plans to introduce new GB deforestation due diligence rules, with a further consultation expected later in the year. That\'s the actual state of play as of today — a policy relaunch and a promised consultation, not a live legal obligation. No commencement date has been set. No penalty regime is in force. If someone tells you their UK due diligence obligations are already live, ask them which secondary legislation they think brought Schedule 17 into force — because as of now, none has.',
    },
    {
      type: 'h2',
      text: 'Why This Still Matters Even Though It\'s Not Law Yet',
    },
    {
      type: 'paragraph',
      text: 'None of this means UK buyers of cocoa, coffee, or other forest-risk commodities can ignore the question. Three reasons it\'s still worth acting on now, ahead of any legal deadline:',
    },
    {
      type: 'bullets',
      items: [
        'Private retailer requirements already exist independently of the law. UK supermarkets — Tesco, Sainsbury\'s, Waitrose — have deforestation-free sourcing built into their own supplier codes of conduct, contractually, regardless of what Schedule 17 does or doesn\'t require. Our [guide to Rainforest Alliance certification](/blog/rainforest-alliance-certification-nigerian-ghanaian-exporters) covers this dynamic in more detail.',
        'Most serious UK buyers already overlap with EU sourcing. If you buy the same cocoa or coffee lots that also move into the EU, your supplier already needs to produce EUDR-grade geolocation and legality data for that buyer relationship — there\'s little practical reason not to hold your own UK-only lots to the same standard.',
        'When the rules do land, they\'ll likely track EUDR closely enough that the data you\'d need is the same data. Building the GPS, batch, and legality evidence chain now means you\'re not doing it under deadline pressure once secondary legislation is actually made.',
      ],
    },
    {
      type: 'h2',
      text: 'What Would the Proposed UK Rules Actually Cover?',
    },
    {
      type: 'paragraph',
      text: 'The scope under discussion has stayed fairly consistent across the 2023 consultation and the June 2026 relaunch: businesses above a turnover threshold that use forest-risk commodities or products derived from them in their UK operations would need to run due diligence and report annually. Coverage would track the same seven commodity groups as EUDR — cattle, cocoa, coffee, oil palm, rubber, soya, and wood — since the UK\'s framing has consistently aimed at alignment with the EU regime rather than a divergent standard. Reporting around the June 2026 announcement cited a proposed turnover threshold of £1 million for in-scope GB businesses — treat that as the figure attached to the current proposal, not a confirmed final number, since it hasn\'t been through the consultation DEFRA says is still coming.',
    },
    {
      type: 'table',
      headers: ['', 'EU EUDR (in force from Dec 2026/Jun 2027)', 'UK Forest Risk Commodities (not yet in force)'],
      rows: [
        ['Legal status', 'Adopted, with a confirmed application date', 'Enacted in principle (2021), secondary legislation not made'],
        ['Commodities (proposed/actual)', 'Cattle, cocoa, coffee, oil palm, rubber, soya, wood', 'Same seven, as proposed'],
        ['Core mechanism', 'GPS geolocation, deforestation check, due diligence statement filed to TRACES', 'Due diligence system + annual report (mechanism not finalised)'],
        ['Enforcement', 'Fines from 4% of EU-wide turnover, confiscation, market exclusion', 'Not yet defined — earlier 2023 proposal figures should not be treated as current'],
      ],
    },
    {
      type: 'cta',
      heading: 'Get Ahead of a Rule That\'s Still Being Written',
      text: 'Verify a supplier\'s geolocation and legality evidence now — the same data EUDR requires and UK rules are likely to mirror — instead of waiting for a commencement date to force the issue.',
      buttonText: 'Request a Supplier Risk Snapshot',
      href: '/demo?role=buyer',
    },
    {
      type: 'h2',
      text: 'What to Ask Your Supplier Today, Regardless',
    },
    {
      type: 'paragraph',
      text: 'Since the UK regime\'s proposed shape mirrors EUDR closely, the practical move for a UK buyer is to ask for the same evidence an EU buyer would: GPS points or polygons for source plots, a deforestation check against a 2020-era cutoff, and documentation confirming legal production under the origin country\'s laws. Our [guide to verifying a supplier\'s "EUDR-ready" claim](/blog/how-to-verify-supplier-eudr-claims) covers the verification workflow step by step — it applies just as well to a UK-only lot as it does to an EU-bound one, since the underlying data doesn\'t change based on which regulator eventually asks for it.',
    },
    {
      type: 'h2',
      text: 'Bringing Suppliers Onto a Standing Record',
    },
    {
      type: 'paragraph',
      text: 'Waiting for a commencement date means building this evidence chain under deadline pressure later, on top of whatever else is happening in your supply chain that quarter. The stronger position is standing visibility now: your supplier maintaining farm polygons, legality documentation, and batch traceability inside OriginTrace as they operate, with you seeing the same records from your buyer workspace — ready for a UK requirement whenever it actually lands, and already satisfying the private retailer standards that apply today regardless.',
    },
    {
      type: 'faq',
      items: [
        {
          q: 'Is the UK Environment Act\'s forest-risk commodity rule in force?',
          a: 'No. Schedule 17 was enacted in November 2021 but requires secondary legislation to commence, and none has been made. The government reopened the policy process in June 2026 with a promise of new rules and a further consultation expected later in the year — there is still no commencement date, and no penalty regime is currently active.',
        },
        {
          q: 'Which commodities would the UK rules cover?',
          a: 'As proposed, the same seven groups as EUDR: cattle, cocoa, coffee, oil palm, rubber, soya, and wood, plus derived products. The UK\'s approach has consistently aimed at rough alignment with the EU regime.',
        },
        {
          q: 'What turnover threshold would apply to UK businesses?',
          a: 'Reporting tied to the June 2026 announcement cited a proposed £1 million turnover threshold for in-scope GB businesses. This hasn\'t been confirmed through DEFRA\'s promised consultation — treat any specific figure, including this one, as provisional until the rules are finalised.',
        },
        {
          q: 'If the law isn\'t in force, why should I bother verifying supplier data now?',
          a: 'Because private buyer requirements from UK supermarkets and major brands already demand deforestation-free sourcing contractually, independent of the law. And if you also buy EU-bound lots from the same suppliers, that data already needs to exist — extending the same standard to UK-only lots avoids maintaining two different evidence tracks.',
        },
      ],
    },
    {
      type: 'cta',
      heading: 'Bring Your Suppliers Onto OriginTrace',
      text: 'Onboard your suppliers now and see their farm polygons, legality documentation, and batch traceability from your buyer workspace — ready for UK requirements whenever they commence, and for the private standards that already apply.',
      buttonText: 'Bring Your Suppliers Onto OriginTrace',
      href: '/importers',
    },
    {
      type: 'references',
      items: [
        { label: 'Environment Act 2021 — Schedule 17', url: 'https://www.legislation.gov.uk/ukpga/2021/30/schedule/17', publisher: 'legislation.gov.uk' },
        { label: 'UK deforestation rules take step forward after a long delay', url: 'https://news.mongabay.com/short-article/2026/07/uk-deforestation-rules-take-step-forward-after-a-long-delay/', publisher: 'Mongabay' },
        { label: 'Forest Risk Commodities consultation outcome published', url: 'https://cms.law/en/gbr/legal-updates/Forest-Risk-Commodities-consultation-outcome-published', publisher: 'CMS Law' },
        { label: 'Implementing due diligence on forest risk commodities — DEFRA consultation', url: 'https://consult.defra.gov.uk/international-biodiversity-and-climate/implementing-due-diligence-forest-risk-commodities', publisher: 'DEFRA' },
      ],
    },
  ],
};
