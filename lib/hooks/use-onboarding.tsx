'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { driver, DriveStep, Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useOrg } from '@/lib/contexts/org-context';

// ─── Tour storage keys ────────────────────────────────────────────────────────

const TOUR_KEYS: Record<string, string> = {
  agent:                'origintrace_tour_agent',
  aggregator:           'origintrace_tour_aggregator',
  warehouse_supervisor: 'origintrace_tour_aggregator',   // shares aggregator tour
  admin:                'origintrace_tour_admin',
  quality_manager:      'origintrace_tour_quality_manager',
  compliance_officer:   'origintrace_tour_compliance_officer',
  logistics_coordinator:'origintrace_tour_logistics_coordinator',
  buyer:                'origintrace_tour_buyer',
};

// ─── Agent Tour ───────────────────────────────────────────────────────────────
// Roles: agent
// Focus: farmer registration → farm mapping → collections → offline sync

const agentTourSteps: DriveStep[] = [
  {
    element: '[data-tour="nav-register"]',
    popover: {
      title: '1 of 6 · Register Farmers',
      description: 'Start here. Enter the farmer\'s name, phone number, and community, then capture their consent signature. A unique Farmer ID is auto-generated and stored in the profile.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-farm-polygons"]',
    popover: {
      title: '2 of 6 · Map Farm Boundaries',
      description: 'After registering a farmer, open their profile and click "Map Farm Boundary". Draw a GPS polygon around each farm. This is mandatory for EUDR deforestation-free declarations.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-collect"]',
    popover: {
      title: '3 of 6 · Record Collection Batches',
      description: 'Select the farmer, enter the number of bags, total weight, and quality grade, then submit. Collections work fully offline and sync automatically when you reconnect.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-sync"]',
    popover: {
      title: '4 of 6 · Sync Dashboard',
      description: 'Check here to see all your pending, syncing, and completed uploads. Tap "Sync Now" to push data to the server whenever you have connectivity.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-testid="connectivity-indicator"]',
    popover: {
      title: '5 of 6 · Connection Status',
      description: 'This indicator shows your live connection status. Green = fully synced. Orange = pending uploads queued. Red = offline — your data is safe and will sync when you reconnect.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="help-button"]',
    popover: {
      title: '6 of 6 · Help & Guide',
      description: 'Tap here at any time to restart this tour or open the full Getting Started Guide with step-by-step instructions for every workflow.',
      side: 'bottom',
      align: 'end',
    },
  },
];

// ─── Aggregator Tour ──────────────────────────────────────────────────────────
// Roles: aggregator, warehouse_supervisor
// Focus: farmer management → collections → inventory → payments → analytics

const aggregatorTourSteps: DriveStep[] = [
  {
    element: '[data-tour="nav-dashboard"]',
    popover: {
      title: '1 of 8 · Your Dashboard',
      description: 'Your command centre. See total collection volume, pending syncs, active farmer count, and compliance status across your buying centre at a glance.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-farmers"]',
    popover: {
      title: '2 of 8 · Manage Farmers',
      description: 'Register and manage all farmers in your catchment area. Each farmer profile tracks consent, GPS-mapped farms, agricultural inputs, and training records.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-collect"]',
    popover: {
      title: '3 of 8 · Record Collections',
      description: 'Select the farmer, enter bags and weight, assign a quality grade (A/B/C/D), and submit. The batch is immediately linked to the farmer\'s supply chain record.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-inventory"]',
    popover: {
      title: '4 of 8 · Review Inventory',
      description: 'All incoming batches land here. Update grades, adjust weights, and approve batches for warehouse storage. Only approved batches can move to processing.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-verify"]',
    popover: {
      title: '5 of 8 · Scan & Verify',
      description: 'When trucks arrive, scan bag QR codes to verify the incoming shipment against expected collection records. Flags any unregistered or mismatched bags instantly.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-payments"]',
    popover: {
      title: '6 of 8 · Farmer Payments',
      description: 'Track payments owed to farmers based on collected weights and agreed prices. Log disbursements, view payment history, and manage your wallet balance.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-analytics"]',
    popover: {
      title: '7 of 8 · Analytics',
      description: 'Monitor collection volumes by commodity, farmer, and time period. Track compliance rates, agent activity, and grade distribution across your operation.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="help-button"]',
    popover: {
      title: '8 of 8 · Help & Guide',
      description: 'Click here to restart this tour or access the full Getting Started Guide with detailed instructions for every workflow.',
      side: 'bottom',
      align: 'end',
    },
  },
];

// ─── Admin Tour ───────────────────────────────────────────────────────────────
// Roles: admin
// Focus: full platform overview — all 10 key modules

const adminTourSteps: DriveStep[] = [
  {
    element: '[data-tour="nav-dashboard"]',
    popover: {
      title: '1 of 10 · Organisation Dashboard',
      description: 'Your organisation overview: collection stats, compliance scores, agent activity, and pending actions. Everything critical surfaces here first.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-farmers"]',
    popover: {
      title: '2 of 10 · Farmer Registry',
      description: 'Every farmer in your supply chain is registered here. Each profile must have signed consent, a GPS-mapped farm boundary, and completed training records before export.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-farm-polygons"]',
    popover: {
      title: '3 of 10 · Farm Polygons',
      description: 'Review and approve GPS farm boundaries submitted by your field agents. Every farm must be mapped for EUDR deforestation-free compliance — no polygon, no export.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-inventory"]',
    popover: {
      title: '4 of 10 · Inventory & Batches',
      description: 'Track all collection batches from arrival through grading to warehouse storage. Approve batches to move them into the processing pipeline.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-payments"]',
    popover: {
      title: '5 of 10 · Farmer Payments',
      description: 'Record and track payments owed to farmers based on collected weight and agreed price per kg. Log disbursements, view per-farmer payment history, and manage your wallet balance. Set a default contract price per commodity in Settings so amounts are auto-calculated.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-shipments"]',
    popover: {
      title: '6 of 10 · Shipment Readiness',
      description: 'Create shipment records and run the 5-dimension compliance check: Farm Compliance, GPS Coverage, Document Completeness, Chain of Custody, and Certification Validity.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-traceability"]',
    popover: {
      title: '7 of 10 · Traceability',
      description: 'Search any bag serial number, batch ID, or farmer to see the complete chain of custody from GPS-mapped farm through collection, processing, and export.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-dds"]',
    popover: {
      title: '8 of 10 · DDS Export',
      description: 'Generate EU Due Diligence Statements with embedded farm GeoJSON polygons for submission to the EU TRACES system. Required for every shipment to the EU.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-analytics"]',
    popover: {
      title: '9 of 10 · Analytics',
      description: 'Monitor compliance rates, collection volumes, shipment scores, and training completion across your entire supply chain. Export reports for buyer audits.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="help-button"]',
    popover: {
      title: '10 of 10 · Help & Guide',
      description: 'Click here at any time to restart this tour or open the Getting Started Guide — detailed walkthroughs for every module and compliance workflow.',
      side: 'bottom',
      align: 'end',
    },
  },
];

// ─── Compliance Officer Tour ──────────────────────────────────────────────────
// Roles: compliance_officer
// Focus: farm approval → traceability → processing → pedigree → DDS → docs

const complianceTourSteps: DriveStep[] = [
  {
    element: '[data-tour="nav-dashboard"]',
    popover: {
      title: '1 of 8 · Compliance Dashboard',
      description: 'Your compliance overview. Monitor farm approval rates, pending document expirations, shipment readiness scores, and outstanding compliance actions.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-farm-polygons"]',
    popover: {
      title: '2 of 8 · Farm Boundary Review',
      description: 'Review GPS boundaries submitted by field agents. Approve farms with complete documentation and compliant land use. Rejected farms are blocked from export.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-traceability"]',
    popover: {
      title: '3 of 8 · Traceability Audit',
      description: 'Verify chain of custody for any product. Search a bag serial, batch ID, or farmer to generate an instant audit trail from GPS-mapped farm through to export lot.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-processing"]',
    popover: {
      title: '4 of 8 · Processing Runs',
      description: 'Log processing runs and track mass balance. Each run links farm-level collection data to finished goods. Mass balance must close within tolerance before marking complete.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-pedigree"]',
    popover: {
      title: '5 of 8 · Pedigree Records',
      description: 'Create finished good records linking processing runs to export lots. The pedigree code is used to generate the Digital Product Passport and appears on shipping documents.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-dpp"]',
    popover: {
      title: '6 of 8 · Digital Product Passport',
      description: 'Generate shareable, tamper-evident DPPs for export lots. Buyers and regulators verify supply chain compliance via a public URL — no login required.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-dds"]',
    popover: {
      title: '7 of 8 · DDS Export',
      description: 'Generate EU EUDR Due Diligence Statements with embedded farm GPS polygons. Submit to EU TRACES before shipping. Always audit-ready.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="help-button"]',
    popover: {
      title: '8 of 8 · Help & Guide',
      description: 'Click here to restart this tour or view the Getting Started Guide with full compliance workflow documentation.',
      side: 'bottom',
      align: 'end',
    },
  },
];

// ─── Logistics Coordinator Tour ───────────────────────────────────────────────
// Roles: logistics_coordinator
// Focus: inventory → dispatch → shipments → documents → service providers

const logisticsTourSteps: DriveStep[] = [
  {
    element: '[data-tour="nav-dashboard"]',
    popover: {
      title: '1 of 7 · Logistics Dashboard',
      description: 'Your operational overview: pending dispatches, shipment readiness scores, document expiry alerts, and active service providers.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-inventory"]',
    popover: {
      title: '2 of 7 · Inventory Review',
      description: 'Check warehouse stock levels and approved batch status before planning dispatches. Only batches with status "Approved" or "Aggregated" can be dispatched.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-dispatch"]',
    popover: {
      title: '3 of 7 · Dispatch Batches',
      description: 'Create dispatch records to move approved batches from the warehouse to the processing facility or port. Assign truck, driver, and destination per dispatch.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-shipments"]',
    popover: {
      title: '4 of 7 · Shipment Readiness',
      description: 'Create export shipment records, link DPPs and certificates, then run the 5-dimension readiness check to get a GO / CONDITIONAL / NO-GO decision before booking the vessel.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-documents"]',
    popover: {
      title: '5 of 7 · Document Vault',
      description: 'Upload and manage all export certificates: Phytosanitary, Fumigation, GACC registration, MRL lab results, Certificate of Origin, and insurance. Expiry dates are tracked with automatic alerts.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-lab-results"]',
    popover: {
      title: '6 of 7 · Lab Results',
      description: 'Upload MRL pesticide residue test results and quality lab reports. Results are linked to shipments and checked during the readiness score calculation.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="help-button"]',
    popover: {
      title: '7 of 7 · Help & Guide',
      description: 'Click here to restart this tour or access the Getting Started Guide for detailed logistics and export documentation workflows.',
      side: 'bottom',
      align: 'end',
    },
  },
];

// ─── Quality Manager Tour ─────────────────────────────────────────────────────
// Roles: quality_manager
// Focus: farmer compliance → yield alerts → traceability → analytics

const qualityManagerTourSteps: DriveStep[] = [
  {
    element: '[data-tour="nav-dashboard"]',
    popover: {
      title: '1 of 7 · Quality Dashboard',
      description: 'Monitor collection quality metrics, compliance rates, yield performance, and grade distribution across your organisation.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-farmers"]',
    popover: {
      title: '2 of 7 · Farmer Compliance',
      description: 'Review individual farmer compliance records: consent status, GPS farm coverage, agricultural inputs, and training completion. Flag non-compliant farmers before harvest.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-yield-alerts"]',
    popover: {
      title: '3 of 7 · Yield Alerts',
      description: 'Review flagged batches that fall outside configured yield tolerances. Unusual weight variances may indicate data quality issues, contamination, or fraud — investigate before approval.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-verify"]',
    popover: {
      title: '4 of 7 · Scan & Verify',
      description: 'Scan bag QR codes to instantly verify a bag\'s origin, farmer, collection date, and grade. Use during warehouse intake to catch mislabelled or unregistered bags.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-traceability"]',
    popover: {
      title: '5 of 7 · Traceability',
      description: 'Search any product through the full supply chain. Verify that every bag in an export lot traces back to a registered, GPS-mapped, compliant farm.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-analytics"]',
    popover: {
      title: '6 of 7 · Analytics',
      description: 'Track quality trends over time — grade distributions, yield rates, compliance scores, and training completion. Export reports for certification audits.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="help-button"]',
    popover: {
      title: '7 of 7 · Help & Guide',
      description: 'Click here to restart this tour or open the Getting Started Guide.',
      side: 'bottom',
      align: 'end',
    },
  },
];

// ─── Buyer Tour ───────────────────────────────────────────────────────────────
// Roles: buyer
// Focus: supplier onboarding → contracts → shipment tracking → traceability

const buyerTourSteps: DriveStep[] = [
  {
    element: '[data-tour="nav-buyer-dashboard"]',
    popover: {
      title: '1 of 6 · Buyer Dashboard',
      description: 'Your supplier overview: active contracts, incoming shipments, readiness scores, and document compliance status — all in one place.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-buyer-suppliers"]',
    popover: {
      title: '2 of 6 · Connect Suppliers',
      description: 'Invite exporter organisations to connect with you. Once accepted, they can link shipments and contracts to your account. Suspend or terminate links as needed.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-buyer-contracts"]',
    popover: {
      title: '3 of 6 · Contracts',
      description: 'Review and manage export contracts with your connected suppliers. Contracts define commodity, volume, price, and destination — and link directly to shipments.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-buyer-shipments"]',
    popover: {
      title: '4 of 6 · Track Shipments',
      description: 'Monitor all shipments linked to your contracts. View readiness scores, estimated ship dates, and document upload status. Proof of compliance is visible before the vessel departs.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-buyer-traceability"]',
    popover: {
      title: '5 of 6 · Verify Origin',
      description: 'Scan any product QR code or enter a DPP reference to see the full farm-to-port chain of custody. GPS farm maps, consent records, and lab results — all verifiable in seconds.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="help-button"]',
    popover: {
      title: '6 of 6 · Help & Guide',
      description: 'Click here to restart this tour or access full platform documentation.',
      side: 'bottom',
      align: 'end',
    },
  },
];

// ─── Steps map ────────────────────────────────────────────────────────────────

const TOUR_STEPS: Record<string, DriveStep[]> = {
  agent:                agentTourSteps,
  aggregator:           aggregatorTourSteps,
  warehouse_supervisor: aggregatorTourSteps,
  admin:                adminTourSteps,
  quality_manager:      qualityManagerTourSteps,
  compliance_officer:   complianceTourSteps,
  logistics_coordinator:logisticsTourSteps,
  buyer:                buyerTourSteps,
};

// ─── Context ──────────────────────────────────────────────────────────────────

interface OnboardingContextType {
  startTourForRole: (role: string) => void;
  hasSeenTourForRole: (role: string) => boolean;
  resetTours: () => void;
  // Legacy aliases kept for backward compat
  startAgentTour: () => void;
  startAggregatorTour: () => void;
  startAdminTour: () => void;
  hasSeenAgentTour: boolean;
  hasSeenAggregatorTour: boolean;
  hasSeenAdminTour: boolean;
  markAgentTourComplete: () => void;
  markAggregatorTourComplete: () => void;
  markAdminTourComplete: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [seenMap, setSeenMap] = useState<Record<string, boolean>>({});
  const driverRef = useRef<Driver | null>(null);
  const autoStartTriggered = useRef(false);
  const { profile, isLoading: isOrgLoading } = useOrg();

  // Load seen state from localStorage on mount
  useEffect(() => {
    const map: Record<string, boolean> = {};
    Object.entries(TOUR_KEYS).forEach(([role, key]) => {
      map[role] = localStorage.getItem(key) === 'true';
    });
    setSeenMap(map);
  }, []);

  const markSeenForRole = useCallback((role: string) => {
    const key = TOUR_KEYS[role];
    if (!key) return;
    localStorage.setItem(key, 'true');
    setSeenMap(prev => ({ ...prev, [role]: true }));
    // Also mark for roles sharing the same key
    Object.entries(TOUR_KEYS).forEach(([r, k]) => {
      if (k === key) {
        setSeenMap(prev => ({ ...prev, [r]: true }));
      }
    });
  }, []);

  const startTourForRole = useCallback((role: string) => {
    const steps = TOUR_STEPS[role];
    if (!steps) return;

    if (driverRef.current) {
      driverRef.current.destroy();
      driverRef.current = null;
    }

    const instance = driver({
      showProgress: false,   // we embed "X of Y" in each title instead
      animate: true,
      allowClose: true,
      overlayOpacity: 0.6,
      stagePadding: 10,
      stageRadius: 8,
      popoverClass: 'origintrace-tour-popover',
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: 'Done',
      onDestroyStarted: () => {
        markSeenForRole(role);
        instance.destroy();
        driverRef.current = null;
      },
    });
    driverRef.current = instance;

    // Small delay so the sidebar is fully rendered before highlighting
    setTimeout(() => {
      instance.setSteps(steps);
      instance.drive();
    }, 400);
  }, [markSeenForRole]);

  const hasSeenTourForRole = useCallback((role: string): boolean => {
    return seenMap[role] ?? true; // default true to avoid flicker
  }, [seenMap]);

  const resetTours = useCallback(() => {
    const allKeys = new Set(Object.values(TOUR_KEYS));
    allKeys.forEach(key => localStorage.removeItem(key));
    const reset: Record<string, boolean> = {};
    Object.keys(TOUR_KEYS).forEach(r => { reset[r] = false; });
    setSeenMap(reset);
    autoStartTriggered.current = false;
  }, []);

  // Auto-start tour for first-time users
  useEffect(() => {
    if (isOrgLoading || !profile || autoStartTriggered.current) return;
    const role = profile.role as string;
    const storageKey = TOUR_KEYS[role];
    if (!storageKey) return;
    const alreadySeen = localStorage.getItem(storageKey) === 'true';
    if (alreadySeen) return;

    autoStartTriggered.current = true;
    const timer = setTimeout(() => {
      startTourForRole(role);
    }, 1500);
    return () => clearTimeout(timer);
  }, [isOrgLoading, profile, startTourForRole]);

  // ── Legacy aliases ─────────────────────────────────────────────────────────
  const startAgentTour        = useCallback(() => startTourForRole('agent'), [startTourForRole]);
  const startAggregatorTour   = useCallback(() => startTourForRole('aggregator'), [startTourForRole]);
  const startAdminTour        = useCallback(() => startTourForRole('admin'), [startTourForRole]);
  const markAgentTourComplete      = useCallback(() => markSeenForRole('agent'), [markSeenForRole]);
  const markAggregatorTourComplete = useCallback(() => markSeenForRole('aggregator'), [markSeenForRole]);
  const markAdminTourComplete      = useCallback(() => markSeenForRole('admin'), [markSeenForRole]);

  return (
    <OnboardingContext.Provider value={{
      startTourForRole,
      hasSeenTourForRole,
      resetTours,
      startAgentTour,
      startAggregatorTour,
      startAdminTour,
      hasSeenAgentTour:      seenMap['agent'] ?? true,
      hasSeenAggregatorTour: seenMap['aggregator'] ?? true,
      hasSeenAdminTour:      seenMap['admin'] ?? true,
      markAgentTourComplete,
      markAggregatorTourComplete,
      markAdminTourComplete,
    }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
