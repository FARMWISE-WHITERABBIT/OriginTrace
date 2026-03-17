import type { BlogPost } from '@/lib/blog';

export const post: BlogPost = {
  slug: 'pre-shipment-compliance-scoring-prevent-rejection',
  title: 'Pre-Shipment Scoring: How to Prevent Cargo Rejection Before It Happens',
  description: 'Cargo rejection at a European, US, or Chinese port is expensive, disruptive, and often avoidable. Pre-shipment compliance scoring checks your documentation and supply chain data before the container leaves port — catching problems when they can still be fixed.',
  date: 'February 15, 2026',
  dateISO: '2026-02-15',
  category: 'Best Practices',
  readingTime: '7 min read',
  author: 'OriginTrace Compliance Team',
  authorRole: 'Supply Chain Compliance',
  coverGradient: 'from-violet-900/20 to-slate-800/50',
  tags: ['Pre-Shipment', 'Compliance Scoring', 'Cargo Rejection', 'Export Readiness', 'Risk Management'],
  content: [
    {
      type: 'paragraph',
      text: 'A container of agricultural commodities turned away at a European or Chinese port is not a compliance problem — it is a business crisis. By that point, you have paid for the freight, the insurance, and the logistics to move the cargo halfway around the world. Rerouting or disposing of a refused container costs tens of thousands of dollars and can permanently damage your relationship with the buyer.',
    },
    {
      type: 'paragraph',
      text: 'The frustrating reality is that most cargo rejections are preventable. The documentation gaps, missing certificates, and traceability failures that trigger refusals at the destination port almost always existed before the container was loaded. They were just not checked systematically before departure.',
    },
    {
      type: 'h2',
      text: 'Why Cargo Gets Rejected',
    },
    {
      type: 'paragraph',
      text: 'Port authorities and customs inspectors check specific things when a shipment arrives. The most common reasons agricultural commodity shipments are rejected or detained include:',
    },
    {
      type: 'bullets',
      items: [
        'Missing or expired phytosanitary certificate',
        'Missing or invalid certificate of origin',
        'Lab test results showing pesticide residues above MRL (Maximum Residue Limits)',
        'Fumigation certificate absent or issued by an unapproved body',
        'No due diligence statement submitted to EU TRACES (for EUDR-covered commodities going to the EU)',
        'GACC registration number missing from packaging or documentation (for shipments to China)',
        'Moisture content exceeds the importing country\'s maximum',
        'Declared weight or volume does not match inspection findings',
        'Contamination detected during physical inspection',
        'Incorrect HS code or commodity description on shipping documents',
      ],
    },
    {
      type: 'paragraph',
      text: 'Notice that the first six of these are documentation issues — not product quality issues. The commodity may be perfectly good, but it is rejected because the paperwork is wrong, missing, or expired. This is where pre-shipment scoring addresses the problem.',
    },
    {
      type: 'h2',
      text: 'What Pre-Shipment Compliance Scoring Is',
    },
    {
      type: 'paragraph',
      text: 'Pre-shipment compliance scoring is the systematic review of all documentation and traceability requirements for a specific shipment, conducted before the cargo is loaded or before a ship is called. It evaluates each requirement — does this shipment have a valid phytosanitary certificate? Is the due diligence statement ready for submission? Are all source farms GPS-mapped? — and produces a score and a list of outstanding issues.',
    },
    {
      type: 'callout',
      variant: 'tip',
      title: 'The Go / Conditional / No-Go Framework',
      text: 'Effective pre-shipment scoring produces one of three verdicts: Go (all requirements met, ship as planned), Conditional (minor issues that can be resolved before departure), or No-Go (blocking issues that must be resolved before this shipment can proceed). The No-Go verdict is only useful if it is delivered early enough to act on.',
    },
    {
      type: 'h2',
      text: 'The Five Dimensions of Export Compliance',
    },
    {
      type: 'paragraph',
      text: 'A robust pre-shipment compliance check covers five distinct areas. Missing any one of them is enough to cause problems at the destination:',
    },
    {
      type: 'h3',
      text: '1. Regulatory Compliance',
    },
    {
      type: 'paragraph',
      text: 'Does this shipment meet the requirements of the destination country\'s import regulations? For the EU, this means EUDR compliance for covered commodities — GPS origin data, deforestation check, DDS submission. For China, it means GACC registration and the associated documentation. For the US, it may mean FSMA 204 traceability records. For each target market, the regulatory checklist is different.',
    },
    {
      type: 'h3',
      text: '2. Documentation Completeness',
    },
    {
      type: 'paragraph',
      text: 'Is every required document present, valid, and not expired? This includes certificates (phytosanitary, origin, fumigation, organic), lab results, buyer-specific declarations, and DDS references. Each document has a validity period — a phytosanitary certificate issued for a previous shipment cannot be reused.',
    },
    {
      type: 'h3',
      text: '3. Traceability Chain Integrity',
    },
    {
      type: 'paragraph',
      text: 'Can you trace every kilogram in this container back to its source farms? Is the chain of custody unbroken from farm to export lot? Are the farm GPS coordinates linked to the batch records that link to this shipment? A traceability gap — even a partial one — can create problems if the shipment is selected for enhanced inspection.',
    },
    {
      type: 'h3',
      text: '4. Product Quality and Safety',
    },
    {
      type: 'paragraph',
      text: 'Do the lab test results for this specific lot confirm it meets the destination market\'s MRL and contaminant standards? Is the moisture content within the acceptable range? Were the tests conducted by an approved laboratory?',
    },
    {
      type: 'h3',
      text: '5. Logistics and Physical Compliance',
    },
    {
      type: 'paragraph',
      text: 'Does the declared weight match what was actually loaded? Is the packaging correctly labelled with the required information (GACC registration number, country of origin, product description)? Is the container seal intact?',
    },
    {
      type: 'h2',
      text: 'When to Conduct the Pre-Shipment Check',
    },
    {
      type: 'paragraph',
      text: 'The answer seems obvious — before the ship sails — but timing matters in practice. A pre-shipment check done the night before departure gives you no time to obtain a missing certificate or collect a replacement lab result. The checks should happen in stages:',
    },
    {
      type: 'table',
      headers: ['Stage', 'What to Check', 'Time Before Departure'],
      rows: [
        ['Contract review', 'Confirm buyer\'s documentation requirements, confirm market regulations', '4–6 weeks'],
        ['Pre-loading check', 'GPS coverage of source farms, traceability chain integrity, lab results status', '2–3 weeks'],
        ['Document assembly', 'All certificates gathered, DDS draft prepared, phyto certificate applied for', '1–2 weeks'],
        ['Final pre-clearance', 'All documents reviewed, DDS submitted, GACC number on packaging confirmed', '48–72 hours before loading'],
      ],
    },
    {
      type: 'h2',
      text: 'The Cost of Getting This Wrong',
    },
    {
      type: 'paragraph',
      text: 'To understand why pre-shipment compliance scoring matters, it helps to quantify what a rejection actually costs. For a 20-foot container of agricultural commodity:',
    },
    {
      type: 'bullets',
      items: [
        'Return freight from EU or Chinese port to origin: $3,000–$8,000',
        'Port storage and demurrage: $500–$2,000 per week',
        'Re-inspection fees if the cargo is quarantined: $500–$2,000',
        'Commodity deterioration during extended storage: variable but potentially total loss for perishables',
        'Lost sale value: $20,000–$80,000+ depending on commodity and volume',
        'Contract penalties or loss of buyer relationship: hard to quantify but often the most damaging long-term consequence',
      ],
    },
    {
      type: 'paragraph',
      text: 'A pre-shipment compliance system that costs a few hundred dollars per shipment to operate — and catches even one container refusal per year — pays for itself many times over.',
    },
    {
      type: 'h2',
      text: 'Building a Pre-Shipment Compliance System',
    },
    {
      type: 'paragraph',
      text: 'You do not need a large team or expensive software to implement pre-shipment compliance scoring. What you do need is:',
    },
    {
      type: 'numbered',
      items: [
        'A clear checklist of all documentation requirements for each destination market you export to',
        'A centralised document management system that tracks certificate validity and expiry dates',
        'A traceability system that can generate a per-shipment origin report',
        'A named person responsible for completing the pre-shipment check for every container',
        'A clear go/no-go decision rule — the shipment does not load until the checklist is complete',
      ],
    },
    {
      type: 'cta',
      heading: 'Pre-Shipment Scoring Built In',
      text: 'OriginTrace scores every shipment across five compliance dimensions before you commit to freight. See how it works in a live demo.',
      buttonText: 'See Pre-Shipment Scoring',
      href: '/demo',
    },
  ],
};
