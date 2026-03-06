'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { driver, DriveStep, Driver } from 'driver.js';
import 'driver.js/dist/driver.css';

interface OnboardingContextType {
  hasSeenAgentTour: boolean;
  hasSeenAggregatorTour: boolean;
  hasSeenAdminTour: boolean;
  startAgentTour: () => void;
  startAggregatorTour: () => void;
  startAdminTour: () => void;
  markAgentTourComplete: () => void;
  markAggregatorTourComplete: () => void;
  markAdminTourComplete: () => void;
  resetTours: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

const AGENT_TOUR_KEY = 'origintrace_agent_tour_seen';
const AGGREGATOR_TOUR_KEY = 'origintrace_aggregator_tour_seen';
const ADMIN_TOUR_KEY = 'origintrace_admin_tour_seen';

const agentTourSteps: DriveStep[] = [
  {
    element: '[data-tour="nav-farms"]',
    popover: {
      title: 'Step 1: Draw Farm Boundaries',
      description: 'Start by mapping farm boundaries using GPS. Navigate to Farms to register a new farm and capture its polygon coordinates.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="nav-collect"]',
    popover: {
      title: 'Step 2: Start a Collection Batch',
      description: 'After mapping farms, create collection batches. Each batch groups multiple bags from one collection session.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-testid="connectivity-indicator"]',
    popover: {
      title: 'Step 3: Check Sync Status',
      description: 'Watch this indicator to see your connection status. Green means synced, orange means pending uploads, red means offline.',
      side: 'bottom',
      align: 'end'
    }
  },
  {
    element: '[data-tour="help-button"]',
    popover: {
      title: 'Need Help?',
      description: 'Click this icon anytime to restart the tour or access help resources.',
      side: 'bottom',
      align: 'end'
    }
  }
];

const aggregatorTourSteps: DriveStep[] = [
  {
    element: '[data-tour="nav-verify"]',
    popover: {
      title: 'Step 1: Verify Incoming Shipments',
      description: 'When trucks arrive, scan bag IDs to verify the incoming shipment against expected collections.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="nav-inventory"]',
    popover: {
      title: 'Step 2: Digital Grading & Quality Check',
      description: 'Review batch details and perform quality grading. Update grades and weights as needed.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="nav-dashboard"]',
    popover: {
      title: 'Step 3: Approve for Warehouse Storage',
      description: 'Once verified and graded, approved batches are ready for warehouse storage and export processing.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="help-button"]',
    popover: {
      title: 'Need Help?',
      description: 'Click this icon anytime to restart the tour or access help resources.',
      side: 'bottom',
      align: 'end'
    }
  }
];

const adminTourSteps: DriveStep[] = [
  {
    element: '[data-tour="nav-dashboard"]',
    popover: {
      title: 'Your Admin Dashboard',
      description: 'Get an overview of your organization: collection stats, agent activity, and compliance status at a glance.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="nav-bags"]',
    popover: {
      title: 'Step 1: Generate Bag IDs',
      description: 'Start here to generate unique bag serial numbers. Your field agents will use these to tag produce during collections.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="nav-compliance"]',
    popover: {
      title: 'Step 2: Review Farm Compliance',
      description: 'When agents register farms, review their boundaries and documentation here. Approve compliant farms to enable collections.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="nav-traceability"]',
    popover: {
      title: 'Step 3: Track Bags & Batches',
      description: 'Search any bag serial to see its full journey from farm to warehouse. Complete chain of custody for every collection.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="nav-dds"]',
    popover: {
      title: 'Step 4: Export for EU TRACES',
      description: 'Generate Due Diligence Statements with farm GeoJSON for EUDR compliance. Always audit-ready.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="nav-pedigree"]',
    popover: {
      title: 'Step 5: Create QR Pedigrees',
      description: 'Link finished goods to source farm GPS coordinates with QR codes. Auditors verify compliance in seconds.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="help-button"]',
    popover: {
      title: 'Need Help?',
      description: 'Click this icon anytime to restart the tour or view the getting started guide.',
      side: 'bottom',
      align: 'end'
    }
  }
];

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [hasSeenAgentTour, setHasSeenAgentTour] = useState(true);
  const [hasSeenAggregatorTour, setHasSeenAggregatorTour] = useState(true);
  const [hasSeenAdminTour, setHasSeenAdminTour] = useState(true);
  const [driverInstance, setDriverInstance] = useState<Driver | null>(null);

  useEffect(() => {
    const agentSeen = localStorage.getItem(AGENT_TOUR_KEY) === 'true';
    const aggregatorSeen = localStorage.getItem(AGGREGATOR_TOUR_KEY) === 'true';
    const adminSeen = localStorage.getItem(ADMIN_TOUR_KEY) === 'true';
    setHasSeenAgentTour(agentSeen);
    setHasSeenAggregatorTour(aggregatorSeen);
    setHasSeenAdminTour(adminSeen);
  }, []);

  const startTour = useCallback((steps: DriveStep[], markComplete: () => void) => {
    if (driverInstance) {
      driverInstance.destroy();
    }
    const instance = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayOpacity: 0.7,
      stagePadding: 8,
      popoverClass: 'origintrace-tour-popover',
      nextBtnText: 'Next',
      prevBtnText: 'Back',
      doneBtnText: 'Done',
      progressText: '{{current}} of {{total}}',
      onDestroyStarted: () => {
        markComplete();
        instance.destroy();
      },
    });
    setDriverInstance(instance);

    setTimeout(() => {
      instance.setSteps(steps);
      instance.drive();
    }, 500);
  }, [driverInstance]);

  const markAgentTourComplete = useCallback(() => {
    localStorage.setItem(AGENT_TOUR_KEY, 'true');
    setHasSeenAgentTour(true);
  }, []);

  const markAggregatorTourComplete = useCallback(() => {
    localStorage.setItem(AGGREGATOR_TOUR_KEY, 'true');
    setHasSeenAggregatorTour(true);
  }, []);

  const markAdminTourComplete = useCallback(() => {
    localStorage.setItem(ADMIN_TOUR_KEY, 'true');
    setHasSeenAdminTour(true);
  }, []);

  const startAgentTour = useCallback(() => {
    startTour(agentTourSteps, markAgentTourComplete);
  }, [startTour, markAgentTourComplete]);

  const startAggregatorTour = useCallback(() => {
    startTour(aggregatorTourSteps, markAggregatorTourComplete);
  }, [startTour, markAggregatorTourComplete]);

  const startAdminTour = useCallback(() => {
    startTour(adminTourSteps, markAdminTourComplete);
  }, [startTour, markAdminTourComplete]);

  const resetTours = useCallback(() => {
    localStorage.removeItem(AGENT_TOUR_KEY);
    localStorage.removeItem(AGGREGATOR_TOUR_KEY);
    localStorage.removeItem(ADMIN_TOUR_KEY);
    setHasSeenAgentTour(false);
    setHasSeenAggregatorTour(false);
    setHasSeenAdminTour(false);
  }, []);

  return (
    <OnboardingContext.Provider value={{
      hasSeenAgentTour,
      hasSeenAggregatorTour,
      hasSeenAdminTour,
      startAgentTour,
      startAggregatorTour,
      startAdminTour,
      markAgentTourComplete,
      markAggregatorTourComplete,
      markAdminTourComplete,
      resetTours
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
