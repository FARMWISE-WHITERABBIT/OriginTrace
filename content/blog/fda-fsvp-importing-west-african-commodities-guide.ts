import type { BlogPost } from '@/lib/blog';

export const post: BlogPost = {
  slug: 'fda-fsvp-importing-west-african-commodities-guide',
  title: 'Importing Cocoa, Coffee, or Sesame From West Africa? What FDA\'s FSVP Actually Requires From You',
  description: 'The US doesn\'t register your African supplier the way China or the EU do. It puts the compliance burden on you, the importer. Here\'s what FSVP actually demands.',
  date: 'September 2, 2026',
  dateISO: '2026-09-02',
  category: 'Compliance',
  readingTime: '8 min read',
  author: 'OriginTrace Compliance Team',
  authorRole: 'Supply Chain Compliance',
  coverImage: '/images/pexels-rafael-de-campos-2705062-4256976.jpg',
  coverImageAlt: 'Aerial view of a busy cargo port with shipping containers',
  coverGradient: 'from-blue-900/20 to-slate-800/50',
  tags: ['FSVP', 'FDA', 'USA', 'Importers', 'Buyer Due Diligence', 'Food Safety', 'Cocoa', 'Sesame'],
  content: [
    {
      type: 'paragraph',
      text: 'If you\'ve been reading about EUDR and GACC, the natural next question is: what does the US require? The honest answer surprises most first-time importers of West African commodities: there\'s no US registry your supplier applies to, no US due diligence statement you file per shipment, and no US equivalent of a facility registration number printed on your customs paperwork. That absence isn\'t a compliance gap. It\'s because the US puts the obligation on you, the importer, not on a registration system for the foreign facility.',
    },
    {
      type: 'paragraph',
      text: 'The rule that does this is the Foreign Supplier Verification Program — FSVP, one of the seven foundational rules under the FDA\'s Food Safety Modernization Act. If you\'re the US owner or consignee of a shipment of cocoa, coffee, sesame, or hibiscus from Nigeria, Ghana, Cameroon, or Côte d\'Ivoire, you are very likely the "FSVP importer" for that food — and the compliance work is yours, not something your supplier can hand you a certificate for.',
    },
    {
      type: 'h2',
      text: 'The US Doesn\'t Register Your Supplier. It Registers You.',
    },
    {
      type: 'paragraph',
      text: 'This is the structural difference that trips people up. Under EUDR, the operator placing goods on the EU market files a due diligence statement. Under GACC, the overseas facility itself registers with Chinese customs. Under FSVP, neither happens — there\'s no facility-level approval process for your Nigerian exporter to complete. Instead, you as the FSVP importer must develop, maintain, and follow a written FSVP for each food and each foreign supplier, and you must be identified by name, electronic mailing address, and a Unique Facility Identifier (UFI) when the entry is filed with US Customs and Border Protection.',
    },
    {
      type: 'callout',
      variant: 'info',
      title: 'FSVP Is Not FSMA 204 — Different Rule, Different Scope',
      text: 'Don\'t confuse FSVP with FSMA Section 204, the Food Traceability Rule. FSMA 204 applies lot-level Key Data Elements and Critical Tracking Events, but only to a specific "Food Traceability List" of high-risk foods — fresh produce, seafood, cheese, nut butters, herbs, and leafy greens are the categories most often cited. Cocoa, coffee, sesame, and hibiscus generally aren\'t on that list. FSVP is the rule that actually applies to your West African commodity imports, and it applies far more broadly — to essentially all imported food, not just a defined high-risk list.',
    },
    {
      type: 'h2',
      text: 'What FSVP Actually Requires From You',
    },
    {
      type: 'numbered',
      items: [
        'Conduct a hazard analysis for each imported food, identifying known or reasonably foreseeable hazards — biological (Salmonella, aflatoxin-producing moulds), chemical (pesticide residues, heavy metals), and physical.',
        'Evaluate the foreign supplier\'s food safety performance and the risk posed by the food, using that hazard analysis to decide what verification activities are actually warranted — this isn\'t a checkbox exercise, it\'s risk-scaled.',
        'Use a "qualified individual" — someone with the training or experience to do the job — to develop your FSVP and carry out its verification activities.',
        'Conduct supplier verification activities appropriate to the risk: this can mean onsite audits, sampling and testing, or review of the supplier\'s food safety records, depending on what the hazard analysis calls for.',
        'Re-evaluate the risk and the supplier\'s performance at least every three years, or sooner if new information about a hazard or the supplier surfaces.',
        'Keep records of all of this — FDA operates an Importer Portal specifically for FSVP records submission, and you need to be able to produce your records on request.',
      ],
    },
    {
      type: 'table',
      headers: ['What FSVP requires of you (the importer)', 'What your African supplier should actually provide'],
      rows: [
        ['A documented hazard analysis specific to the commodity', 'Their own food safety data — pest control records, HACCP or equivalent system documentation'],
        ['Risk-appropriate verification of the supplier', 'Lab test results for the specific hazards you identified — aflatoxin, pesticide MRLs, Salmonella where relevant'],
        ['A qualified individual overseeing the program', 'A named contact who can answer specific food-safety questions, not a generic sales contact'],
        ['Re-evaluation at least every 3 years', 'Willingness to update documentation and testing as your risk assessment evolves, not a static certificate issued once'],
        ['Records available for FDA request', 'Batch-level traceability linking their documentation to the specific shipment you received'],
      ],
    },
    {
      type: 'cta',
      heading: 'Verify a Supplier Before You Commit',
      text: 'OriginTrace turns supplier food-safety records, lab results, and batch traceability into a risk snapshot that supports your FSVP hazard analysis — before the contract is signed.',
      buttonText: 'Request a Supplier Risk Snapshot',
      href: '/demo?role=buyer',
    },
    {
      type: 'h2',
      text: 'The Compliance Gap This Actually Creates',
    },
    {
      type: 'paragraph',
      text: 'Because there\'s no public US registry to check — unlike GACC\'s CIFER lookup — the entire burden of proving your supplier is legitimate and food-safe sits with your own paperwork. If FDA asks for your FSVP records and your hazard analysis is thin, generic, or clearly copy-pasted across every supplier regardless of actual risk, that\'s a compliance failure that\'s entirely on you — there\'s no foreign registration number to point to as evidence someone else already checked. This is exactly the gap that catches new importers of West African commodities off guard: they assume "the US doesn\'t require much" because there\'s no visible registration step, when in fact the work is just less visible, not less real.',
    },
    {
      type: 'h2',
      text: 'Bringing Suppliers Onto a Standing Record',
    },
    {
      type: 'paragraph',
      text: 'A one-time supplier audit satisfies the letter of FSVP for the day you conduct it, but the three-year re-evaluation clock and the "reasonably foreseeable hazards" standard both assume ongoing awareness, not a certificate filed away and forgotten. The stronger position is standing visibility: your supplier maintaining lab results, food safety documentation, and batch traceability inside OriginTrace as they operate, with you seeing the same records from your buyer workspace before every shipment — the exact evidence base a hazard analysis and supplier verification file are supposed to be built on.',
    },
    {
      type: 'faq',
      items: [
        {
          q: 'Do West African exporters need to register with the FDA before shipping to the US?',
          a: 'Food facilities generally register under FDA\'s Food Facility Registration requirements, but this is a lighter-touch listing, not an approval process like GACC\'s. The substantive compliance burden under FSVP sits with the US importer, who must conduct hazard analysis and supplier verification — not with a foreign registration system.',
        },
        {
          q: 'Is FSVP the same as the FSMA 204 Food Traceability Rule?',
          a: 'No. FSMA 204 requires Key Data Elements and Critical Tracking Events, but only for foods on FDA\'s Food Traceability List — mostly fresh produce, seafood, cheese, nut butters, herbs, and leafy greens. Cocoa, coffee, sesame, and hibiscus generally fall outside that list. FSVP is the broader rule that actually governs importing these commodities.',
        },
        {
          q: 'Who is the "FSVP importer" for a shipment?',
          a: 'The US owner or consignee of the food at the time of entry — whoever owns it, has purchased it, or has agreed in writing to purchase it. That party must be identified by name, address, and Unique Facility Identifier when the entry is filed with US Customs and Border Protection.',
        },
        {
          q: 'How often do I need to re-check a supplier under FSVP?',
          a: 'At least once every three years, or sooner if new information emerges about a hazard in the food or a change in the supplier\'s performance. A single onboarding audit years ago doesn\'t satisfy an ongoing FSVP obligation.',
        },
      ],
    },
    {
      type: 'cta',
      heading: 'Bring Your Suppliers Onto OriginTrace',
      text: 'Onboard your West African suppliers and see their food-safety documentation, lab results, and batch traceability from your buyer workspace — the evidence base your FSVP hazard analysis actually needs.',
      buttonText: 'Bring Your Suppliers Onto OriginTrace',
      href: '/importers',
    },
    {
      type: 'references',
      items: [
        { label: 'FSMA Final Rule on Foreign Supplier Verification Programs (FSVP) for Importers of Food for Humans and Animals', url: 'https://www.fda.gov/food/food-safety-modernization-act-fsma/fsma-final-rule-foreign-supplier-verification-programs-fsvp-importers-food-humans-and-animals', publisher: 'US FDA' },
        { label: 'Foreign Supplier Verification Programs (FSVP) — List of Participants', url: 'https://www.fda.gov/food/importing-food-products-united-states/foreign-suppliers-verification-programs-fsvp-list-participants', publisher: 'US FDA' },
        { label: 'FDA FSMA 204 Food Traceability Rule', url: 'https://www.fda.gov/food/food-safety-modernization-act-fsma/fsma-final-rule-requirements-additional-traceability-records-certain-foods', publisher: 'US FDA' },
      ],
    },
  ],
};
