'use client';

import { MapPin, Package, Warehouse, ShieldCheck, Check, Clock, Factory, Ship, Box } from 'lucide-react';

interface TimelineStep {
  id: string;
  title: string;
  description: string;
  timestamp?: string;
  completed: boolean;
  icon: typeof MapPin;
  details?: Record<string, string>;
}

interface TraceabilityTimelineProps {
  bagId: string;
  farmData?: {
    farmerName: string;
    community: string;
    mappedAt: string;
    mappedBy: string;
    coordinates?: number;
  };
  collectionData?: {
    weight: number;
    grade: string;
    collectedAt: string;
    agentName: string;
  };
  aggregationData?: {
    warehouse?: string;
    aggregatorName?: string;
    receivedAt?: string;
  };
  processingData?: {
    processingType?: string;
    outputCode?: string;
    processedAt?: string;
    processedBy?: string;
    facilityName?: string;
    inputWeightKg?: number;
    outputWeightKg?: number;
  };
  finishedGoodData?: {
    pedigreeCode?: string;
    productName?: string;
    productType?: string;
    weightKg?: number;
    productionDate?: string;
    buyerCompany?: string;
  };
  shipmentData?: {
    shipmentCode?: string;
    status?: string;
    destinationCountry?: string;
    estimatedShipDate?: string;
  };
  verificationData?: {
    verifiedAt?: string;
    verifiedBy?: string;
    complianceStatus: string;
  };
}

export function TraceabilityTimeline({
  bagId,
  farmData,
  collectionData,
  aggregationData,
  processingData,
  finishedGoodData,
  shipmentData,
  verificationData
}: TraceabilityTimelineProps) {
  const steps: TimelineStep[] = [
    {
      id: 'mapped',
      title: 'Farm Mapped',
      description: farmData ? `${farmData.farmerName} - ${farmData.community}` : 'Awaiting farm mapping',
      timestamp: farmData?.mappedAt,
      completed: !!farmData,
      icon: MapPin,
      details: farmData ? {
        'Farmer': farmData.farmerName,
        'Community': farmData.community,
        'Mapped By': farmData.mappedBy,
        'Boundary Points': farmData.coordinates ? `${farmData.coordinates} points` : 'Not recorded'
      } : undefined
    },
    {
      id: 'bagged',
      title: 'Produce Collected',
      description: collectionData ? `${collectionData.weight}kg - Grade ${collectionData.grade}` : 'Awaiting collection',
      timestamp: collectionData?.collectedAt,
      completed: !!collectionData,
      icon: Package,
      details: collectionData ? {
        'Weight': `${collectionData.weight} kg`,
        'Grade': collectionData.grade,
        'Collected By': collectionData.agentName
      } : undefined
    },
    {
      id: 'aggregated',
      title: 'Warehouse Check-in',
      description: aggregationData?.warehouse ? `Received at ${aggregationData.warehouse}` : 'Awaiting warehouse check-in',
      timestamp: aggregationData?.receivedAt,
      completed: !!aggregationData?.receivedAt,
      icon: Warehouse,
      details: aggregationData?.receivedAt ? {
        'Warehouse': aggregationData.warehouse || 'Main Warehouse',
        'Received By': aggregationData.aggregatorName || 'Aggregator'
      } : undefined
    },
    {
      id: 'processed',
      title: 'Processing Run',
      description: processingData?.processedAt ? `Processed — ${processingData.processingType || 'Standard'}` : 'Awaiting processing',
      timestamp: processingData?.processedAt,
      completed: !!processingData?.processedAt,
      icon: Factory,
      details: processingData?.processedAt ? {
        ...(processingData.facilityName ? { 'Facility': processingData.facilityName } : {}),
        ...(processingData.processingType ? { 'Commodity': processingData.processingType } : {}),
        ...(processingData.outputCode ? { 'Run Code': processingData.outputCode } : {}),
        ...(processingData.inputWeightKg != null ? { 'Input Weight': `${processingData.inputWeightKg} kg` } : {}),
        ...(processingData.outputWeightKg != null ? { 'Output Weight': `${processingData.outputWeightKg} kg` } : {}),
        ...(processingData.processedBy ? { 'Processed By': processingData.processedBy } : {}),
      } : undefined
    },
    {
      id: 'finished_good',
      title: 'Finished Good',
      description: finishedGoodData?.productionDate ? `${finishedGoodData.productName || finishedGoodData.productType || 'Processed product'} — ${finishedGoodData.pedigreeCode || ''}` : 'Awaiting production',
      timestamp: finishedGoodData?.productionDate,
      completed: !!finishedGoodData?.productionDate,
      icon: Box,
      details: finishedGoodData?.productionDate ? {
        ...(finishedGoodData.productName ? { 'Product': finishedGoodData.productName } : {}),
        ...(finishedGoodData.productType ? { 'Type': finishedGoodData.productType } : {}),
        ...(finishedGoodData.pedigreeCode ? { 'Pedigree Code': finishedGoodData.pedigreeCode } : {}),
        ...(finishedGoodData.weightKg ? { 'Weight': `${finishedGoodData.weightKg} kg` } : {}),
        ...(finishedGoodData.buyerCompany ? { 'Buyer': finishedGoodData.buyerCompany } : {}),
      } : undefined
    },
    {
      id: 'shipment',
      title: 'Shipment',
      description: shipmentData?.shipmentCode ? `${shipmentData.shipmentCode}${shipmentData.destinationCountry ? ` → ${shipmentData.destinationCountry}` : ''}` : 'Awaiting shipment',
      timestamp: shipmentData?.estimatedShipDate,
      completed: shipmentData?.status === 'shipped',
      icon: Ship,
      details: shipmentData?.shipmentCode ? {
        'Shipment Code': shipmentData.shipmentCode,
        'Status': shipmentData.status || 'draft',
        ...(shipmentData.destinationCountry ? { 'Destination': shipmentData.destinationCountry } : {}),
        ...(shipmentData.estimatedShipDate ? { 'Est. Ship Date': new Date(shipmentData.estimatedShipDate).toLocaleDateString() } : {}),
      } : undefined
    },
    {
      id: 'verified',
      title: 'Compliance Verified',
      description: verificationData?.verifiedAt ? 'Audit-ready for export' : 'Awaiting verification',
      timestamp: verificationData?.verifiedAt,
      completed: verificationData?.complianceStatus === 'approved',
      icon: ShieldCheck,
      details: verificationData?.verifiedAt ? {
        'Verified By': verificationData.verifiedBy || 'Admin',
        'Status': verificationData.complianceStatus
      } : undefined
    }
  ];

  return (
    <div className="space-y-4">
      <div className="text-center pb-4 border-b">
        <p className="text-sm text-muted-foreground">Bag ID</p>
        <p className="text-2xl font-bold font-mono">{bagId}</p>
      </div>

      <div className="relative">
        {steps.map((step, index) => (
          <div key={step.id} className="relative flex gap-4 pb-8 last:pb-0">
            {index < steps.length - 1 && (
              <div 
                className={`absolute left-[19px] top-10 w-0.5 h-[calc(100%-2.5rem)] ${
                  step.completed ? 'bg-primary' : 'bg-muted'
                }`}
              />
            )}
            
            <div 
              className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                step.completed 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {step.completed ? (
                <Check className="h-5 w-5" />
              ) : (
                <step.icon className="h-5 w-5" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className={`font-medium ${step.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {step.title}
                  </h4>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
                {step.timestamp && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                    <Clock className="h-3 w-3" />
                    {new Date(step.timestamp).toLocaleDateString()}
                  </div>
                )}
              </div>

              {step.details && step.completed && (
                <div className="mt-2 p-3 rounded-lg bg-muted/50 space-y-1">
                  {Object.entries(step.details).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{key}</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
