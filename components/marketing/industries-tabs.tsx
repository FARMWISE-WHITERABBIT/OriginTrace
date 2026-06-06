'use client';

import { useState } from 'react';

const commodityTabs = [
  {
    id: 'cocoa',
    label: 'Cocoa',
    icon: '🍫',
    image: '/images/farmer in field.jpg',
    description: 'End-to-end traceability for cocoa from smallholder farms to EU port clearance — GPS mapping, EUDR compliance, and deforestation-free certification.',
    features: [
      'GPS polygon farm boundary mapping with anti-spoofing',
      'EUDR geolocation & deforestation-risk scoring',
      'Cooperative batch aggregation with mass balance',
      'Export documentation & phytosanitary records',
      'Buyer portal access with QR-linked pedigree',
    ],
    tag: 'EUDR Ready',
  },
  {
    id: 'coffee',
    label: 'Coffee',
    icon: '☕',
    image: '/images/farmer in field.jpg',
    description: 'Track every coffee lot from farm to roaster. Verify altitude, varietal, processing method, and sustainability certifications in a single audit-ready package.',
    features: [
      'Farm-level GPS traceability with variety metadata',
      'Multi-certification tracking (Rainforest Alliance, Fairtrade, Organic)',
      'Dry/wet processing chain documentation',
      'Export license and ICO certificate management',
      'Digital Product Passport for specialty buyers',
    ],
    tag: 'Certification Ready',
  },
  {
    id: 'cashew',
    label: 'Cashew',
    icon: '🥜',
    image: '/images/baged product in wareouse.jpg',
    description: 'Capture cashew origin data across fragmented smallholder networks in West Africa. Link raw nuts to processed kernels with verifiable mass balance.',
    features: [
      'Smallholder aggregation with GPS verification',
      'Raw nut to kernel mass balance tracking',
      'GACC registration and China export compliance',
      'Aflatoxin & pesticide residue documentation',
      'Exporter-to-buyer digital product passports',
    ],
    tag: 'GACC Compliant',
  },
  {
    id: 'timber',
    label: 'Timber',
    icon: '🌲',
    image: '/images/lagos apapa port.jpg',
    description: 'Prove legal origin and EUDR compliance for tropical timber exports. Track species, harvest location, and forest concession records from stump to shipment.',
    features: [
      'Species identification and CITES documentation',
      'Forest concession GPS boundary mapping',
      'Chain of custody from forest to sawmill to port',
      'EUDR & UK Forest Risk Commodities compliance',
      'Lacey Act due care documentation for US buyers',
    ],
    tag: 'EUDR / Lacey Act',
  },
  {
    id: 'shea',
    label: 'Shea & Sesame',
    icon: '🌿',
    image: '/images/farmer in field.jpg',
    description: 'Document sustainable wild collection and processing for shea butter and sesame, meeting buyer requirements for natural ingredients with verified provenance.',
    features: [
      'Wild collection zone GPS mapping',
      'Women collector group documentation',
      'Processing site and temperature records',
      'Organic and fair trade certification support',
      'EU cosmetic and food-grade compliance exports',
    ],
    tag: 'Organic Ready',
  },
];

export function IndustriesTabsClient() {
  const [active, setActive] = useState(0);
  const tab = commodityTabs[active];

  return (
    <div className="mk-industries-tabs">
      {/* Tab menu */}
      <div className="mk-industries-tab-menu" role="tablist">
        {commodityTabs.map((t, i) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={i === active}
            aria-controls={`tab-panel-${t.id}`}
            className="mk-industries-link-wrap"
            data-active={i === active || undefined}
            onClick={() => setActive(i)}
          >
            <span className="mk-tab-text">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab panel — white rounded card */}
      <div
        id={`tab-panel-${tab.id}`}
        role="tabpanel"
        key={tab.id}
        className="mk-industries-tab-card"
      >
        {/* LEFT — image */}
        <div
          className="mk-industries-tab-image"
          style={{
            backgroundImage: `url('${tab.image}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <span className="mk-industries-tag">{tab.tag}</span>
        </div>

        {/* RIGHT — info */}
        <div className="mk-industries-tab-info">
          <h3 className="mk-industries-tab-title">{tab.label}</h3>
          <p className="mk-industries-tab-desc">{tab.description}</p>
          <ul className="mk-industries-feature-list">
            {tab.features.map((f) => (
              <li key={f} className="mk-list-item">
                <span className="mk-list-item__icon mk-list-item__dot" aria-hidden>•</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
