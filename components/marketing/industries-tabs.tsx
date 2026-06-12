'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Leaf, Sprout, Flower2, TreePine, Gem } from 'lucide-react';

const industryTabs = [
  {
    id: 'cocoa-coffee',
    label: 'Cocoa & Coffee',
    icon: Leaf,
    image: '/images/pexels-michael-burrows-7125465.jpg',
    imagePosition: 'center',
    tag: 'EUDR Ready',
    description:
      'Full traceability for EUDR-covered tree crops — from GPS-mapped farm plots to EU port clearance. Cover your due diligence statement before you book freight.',
    features: [
      'GPS polygon farm boundary mapping with anti-spoofing',
      'EUDR deforestation-risk scoring per plot',
      'Cooperative batch aggregation with mass balance',
      'Export documentation & phytosanitary records',
      'Buyer portal with QR-linked pedigree certificate',
    ],
  },
  {
    id: 'cashew-sesame',
    label: 'Cashew & Sesame',
    icon: Sprout,
    image: '/images/pexels-traveliving-4663476.jpg',
    imagePosition: 'center',
    tag: 'GACC & FSMA Ready',
    description:
      'Track raw nut and seed origin across fragmented smallholder networks. Link collection points to processed output with verifiable mass balance — for China, EU, and US buyers.',
    features: [
      'Smallholder GPS registration and identity verification',
      'Raw-to-processed mass balance tracking',
      'GACC facility registration documentation',
      'Aflatoxin & pesticide residue record management',
      'Multi-market compliance scoring before loading',
    ],
  },
  {
    id: 'shea-palm',
    label: 'Shea & Palm Oil',
    icon: Flower2,
    image: '/images/baged product in wareouse.jpg',
    imagePosition: 'center',
    tag: 'EU Cosmetics Ready',
    description:
      'Document sustainable wild collection and processing for natural ingredients. Meet buyer provenance requirements without manual paperwork across multiple systems.',
    features: [
      'Wild collection zone GPS mapping',
      'Women collector group identity and payment records',
      'Processing site, temperature, and batch logs',
      'Organic and fair trade certification support',
      'EU cosmetics and food-grade compliance exports',
    ],
  },
  {
    id: 'timber-rubber',
    label: 'Timber & Rubber',
    icon: TreePine,
    image: '/images/pexels-jan-van-der-wolf-11680885-15780139.jpg',
    imagePosition: 'center',
    tag: 'EUDR / Lacey Act',
    description:
      'Prove legal origin and zero-deforestation for forest-risk commodities. Species, harvest location, and forest concession records — from stump to shipment.',
    features: [
      'Species identification and CITES documentation',
      'Forest concession GPS boundary mapping',
      'Chain of custody from forest to sawmill to port',
      'EUDR & UK Forest Risk Commodities compliance',
      'Lacey Act due care documentation for US buyers',
    ],
  },
  {
    id: 'mining',
    label: 'Mining & Minerals',
    icon: Gem,
    image: '/images/pexels-tomfisk-2101135.jpg',
    imagePosition: 'center',
    tag: 'OECD / LBMA Ready',
    description:
      'Trace gold, coltan, lithium, and other minerals from extraction site to point of export. Satisfy international smelter and buyer due diligence requirements before your shipment moves.',
    features: [
      'Extraction site GPS registration and operator KYC',
      'Mine-to-export chain of custody documentation',
      'OECD Due Diligence Guidance compliance',
      'LBMA Responsible Gold Guidance support',
      'Conflict minerals declaration and audit trail',
    ],
  },
];

export function IndustriesTabsClient() {
  const [active, setActive] = useState(0);
  const tab = industryTabs[active];
  const Icon = tab.icon;

  return (
    <div>
      {/* Tab bar — pill row on desktop, vertical list on mobile */}
      <div className="mk-industries-tabbar" role="tablist">
        {industryTabs.map((t, i) => {
          const TabIcon = t.icon;
          const isActive = i === active;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tab-panel-${t.id}`}
              onClick={() => setActive(i)}
              className="mk-industries-tab-btn"
              data-active={isActive || undefined}
            >
              <span className="mk-industries-tab-icon-wrap">
                <TabIcon style={{ width: '1.1rem', height: '1.1rem', flexShrink: 0 }} strokeWidth={1.75} />
              </span>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content card */}
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
            backgroundPosition: tab.imagePosition,
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: '1.25rem',
              left: '1.25rem',
              fontSize: '0.6875rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              background: 'var(--mk-green)',
              color: '#fff',
              padding: '0.25rem 0.7rem',
              borderRadius: '9999px',
            }}
          >
            {tab.tag}
          </span>
        </div>

        {/* RIGHT — content */}
        <div
          className="mk-industries-tab-content"
        >
          <h3
            style={{
              fontSize: '1.375rem',
              fontWeight: 700,
              color: 'var(--mk-text-primary)',
              marginBottom: '0.875rem',
              lineHeight: 1.25,
            }}
          >
            {tab.label}
          </h3>
          <p
            style={{
              fontSize: '0.9375rem',
              color: 'var(--mk-text-secondary)',
              lineHeight: 1.7,
              marginBottom: '1.75rem',
            }}
          >
            {tab.description}
          </p>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', margin: 0, padding: 0, listStyle: 'none' }}>
            {tab.features.map((f) => (
              <li
                key={f}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.625rem',
                  fontSize: '0.9rem',
                  color: 'var(--mk-text-secondary)',
                  lineHeight: 1.55,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: '0.45rem',
                    height: '0.45rem',
                    borderRadius: '50%',
                    background: 'var(--mk-green)',
                    flexShrink: 0,
                    marginTop: '0.45rem',
                  }}
                />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
