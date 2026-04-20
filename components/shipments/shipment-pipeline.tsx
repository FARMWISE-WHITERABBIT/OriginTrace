'use client';

/**
 * ShipmentPipeline — 9-stage shipment pipeline UI
 *
 * Replaces the legacy 6-stage `ShipmentTimeline`. Shows all pipeline stages as
 * collapsible sections with per-stage logistics forms and the "Advance Stage"
 * action gated by the same conditions enforced server-side.
 */

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2,
  Lock,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Ship,
  ClipboardList,
  FlaskConical,
  FileText,
  Truck,
  Package,
  PackageCheck,
  MapPin,
  CircleCheckBig,
  Save,
  XCircle,
  CheckSquare,
  Square,
} from 'lucide-react';
import { STAGE_DEFINITIONS } from '@/lib/services/shipment-stages';
import { ContainerStuffingRecord } from '@/components/shipments/container-stuffing';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ShipmentPipelineProps {
  /** Full shipment row from the API (select *). */
  shipment: Record<string, any>;
  /** Callback to re-fetch parent shipment state after a save or advance. */
  onRefresh: () => void;
  /** False for roles that cannot advance stages (e.g. compliance_officer). */
  canAdvance?: boolean;
}

// ─── Icon map (stage index → icon) ───────────────────────────────────────────

const STAGE_ICONS = [
  ClipboardList, // 1 Preparation
  FlaskConical,  // 2 Quality & Certification
  FileText,      // 3 Documentation
  Truck,         // 4 Customs & Clearance
  Ship,          // 5 Freight & Vessel
  Package,       // 6 Container Stuffing
  PackageCheck,  // 7 Departure
  MapPin,        // 8 Arrival & Clearance
  CircleCheckBig,// 9 Close
];

// ─── Field row helper ─────────────────────────────────────────────────────────

function FieldRow({
  label,
  done,
  children,
}: {
  label: string;
  done: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        {done ? (
          <CheckSquare className="h-3.5 w-3.5 text-green-600 shrink-0" />
        ) : (
          <Square className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        <Label className="text-xs font-medium leading-none">{label}</Label>
      </div>
      {children}
    </div>
  );
}

// ─── Per-stage form components ────────────────────────────────────────────────

function Stage1Form({
  shipment,
  draft,
  setDraft,
}: {
  shipment: Record<string, any>;
  draft: Record<string, any>;
  setDraft: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
}) {
  const v = (f: string) => (f in draft ? draft[f] : shipment[f]) ?? '';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <FieldRow label="Purchase Order Number" done={!!shipment.purchase_order_number}>
        <Input
          placeholder="e.g. PO-2026-001"
          value={v('purchase_order_number')}
          onChange={(e) => setDraft((p) => ({ ...p, purchase_order_number: e.target.value }))}
          className="h-8 text-sm"
        />
      </FieldRow>
      <FieldRow label="PO Date" done={!!shipment.purchase_order_date}>
        <Input
          type="date"
          value={v('purchase_order_date')}
          onChange={(e) => setDraft((p) => ({ ...p, purchase_order_date: e.target.value }))}
          className="h-8 text-sm"
        />
      </FieldRow>
      <FieldRow label="Contract Price per MT (USD)" done={!!shipment.contract_price_per_mt}>
        <Input
          type="number"
          min="0"
          step="0.01"
          placeholder="e.g. 2800"
          value={v('contract_price_per_mt')}
          onChange={(e) =>
            setDraft((p) => ({ ...p, contract_price_per_mt: parseFloat(e.target.value) || '' }))
          }
          className="h-8 text-sm"
        />
      </FieldRow>
      <FieldRow label="Total Shipment Value (USD)" done={!!shipment.total_shipment_value_usd}>
        <Input
          type="number"
          min="0"
          step="0.01"
          placeholder="e.g. 560000"
          value={v('total_shipment_value_usd')}
          onChange={(e) =>
            setDraft((p) => ({ ...p, total_shipment_value_usd: parseFloat(e.target.value) || '' }))
          }
          className="h-8 text-sm"
        />
      </FieldRow>
    </div>
  );
}

function Stage2Form({
  shipment,
  draft,
  setDraft,
}: {
  shipment: Record<string, any>;
  draft: Record<string, any>;
  setDraft: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
}) {
  const v = (f: string) => (f in draft ? draft[f] : shipment[f]) ?? '';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <FieldRow label="Inspection Body" done={!!shipment.inspection_body}>
        <Input
          placeholder="e.g. BIVAC, SGS, Bureau Veritas"
          value={v('inspection_body')}
          onChange={(e) => setDraft((p) => ({ ...p, inspection_body: e.target.value }))}
          className="h-8 text-sm"
        />
      </FieldRow>
      <FieldRow label="Inspection Date" done={!!shipment.inspection_date}>
        <Input
          type="date"
          value={v('inspection_date')}
          onChange={(e) => setDraft((p) => ({ ...p, inspection_date: e.target.value }))}
          className="h-8 text-sm"
        />
      </FieldRow>
      <FieldRow label="Inspection Certificate No." done={!!shipment.inspection_certificate_number}>
        <Input
          placeholder="Certificate number"
          value={v('inspection_certificate_number')}
          onChange={(e) =>
            setDraft((p) => ({ ...p, inspection_certificate_number: e.target.value }))
          }
          className="h-8 text-sm"
        />
      </FieldRow>
      <FieldRow
        label="Inspection Result"
        done={!!shipment.inspection_result && shipment.inspection_result !== 'fail'}
      >
        <Select
          value={v('inspection_result') || '__none'}
          onValueChange={(val) =>
            setDraft((p) => ({ ...p, inspection_result: val === '__none' ? '' : val }))
          }
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Select result" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">Not yet recorded</SelectItem>
            <SelectItem value="pass">Pass</SelectItem>
            <SelectItem value="conditional">Conditional</SelectItem>
            <SelectItem value="fail">Fail</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
      <FieldRow label="Inspection Fees (NGN)" done={!!shipment.inspection_fees_ngn}>
        <Input
          type="number"
          min="0"
          placeholder="0"
          value={v('inspection_fees_ngn')}
          onChange={(e) =>
            setDraft((p) => ({ ...p, inspection_fees_ngn: parseFloat(e.target.value) || '' }))
          }
          className="h-8 text-sm"
        />
      </FieldRow>
      <FieldRow label="Phyto / Lab Costs (NGN)" done={!!shipment.phyto_lab_costs_ngn}>
        <Input
          type="number"
          min="0"
          placeholder="0"
          value={v('phyto_lab_costs_ngn')}
          onChange={(e) =>
            setDraft((p) => ({ ...p, phyto_lab_costs_ngn: parseFloat(e.target.value) || '' }))
          }
          className="h-8 text-sm"
        />
      </FieldRow>
    </div>
  );
}

function Stage3Form({
  shipment,
  draft,
  setDraft,
}: {
  shipment: Record<string, any>;
  draft: Record<string, any>;
  setDraft: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
}) {
  const docStatus: Record<string, boolean> = {
    ...(shipment.doc_status || {}),
    ...(draft.doc_status || {}),
  };

  const toggleDoc = (key: string) => {
    const updated = { ...docStatus, [key]: !docStatus[key] };
    setDraft((p) => ({ ...p, doc_status: updated }));
  };

  const DOC_ITEMS = [
    { key: 'commercial_invoice', label: 'Commercial Invoice' },
    { key: 'packing_list', label: 'Packing List' },
    { key: 'coo', label: 'Certificate of Origin' },
    { key: 'phyto', label: 'Phytosanitary Certificate' },
    { key: 'export_permit', label: 'Export Permit / Licence' },
    { key: 'lab_cert', label: 'Lab Test Certificate' },
    { key: 'aflatoxin_test', label: 'Aflatoxin Test Results' },
    { key: 'dds', label: 'EUDR DDS Submission Reference' },
  ];

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-2">
        Check documents as they are obtained. Documents are uploaded separately via the Document Vault.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {DOC_ITEMS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => toggleDoc(key)}
            className="flex items-center gap-2 text-left p-2 rounded-md hover:bg-muted/50 transition-colors text-sm"
          >
            {docStatus[key] ? (
              <CheckSquare className="h-4 w-4 text-green-600 shrink-0" />
            ) : (
              <Square className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <span className={docStatus[key] ? 'text-foreground' : 'text-muted-foreground'}>
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Stage4Form({
  shipment,
  draft,
  setDraft,
}: {
  shipment: Record<string, any>;
  draft: Record<string, any>;
  setDraft: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
}) {
  const v = (f: string) => (f in draft ? draft[f] : shipment[f]) ?? '';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <FieldRow label="Clearing Agent Name" done={!!shipment.clearing_agent_name}>
        <Input
          placeholder="e.g. Bolaji Freight Ltd"
          value={v('clearing_agent_name')}
          onChange={(e) => setDraft((p) => ({ ...p, clearing_agent_name: e.target.value }))}
          className="h-8 text-sm"
        />
      </FieldRow>
      <FieldRow label="Clearing Agent Contact" done={!!shipment.clearing_agent_contact}>
        <Input
          placeholder="Phone or email"
          value={v('clearing_agent_contact')}
          onChange={(e) => setDraft((p) => ({ ...p, clearing_agent_contact: e.target.value }))}
          className="h-8 text-sm"
        />
      </FieldRow>
      <FieldRow label="Customs Declaration Number" done={!!shipment.customs_declaration_number}>
        <Input
          placeholder="NCS/NESS reference"
          value={v('customs_declaration_number')}
          onChange={(e) =>
            setDraft((p) => ({ ...p, customs_declaration_number: e.target.value }))
          }
          className="h-8 text-sm"
        />
      </FieldRow>
      <FieldRow label="Exit Certificate Number" done={!!shipment.exit_certificate_number}>
        <Input
          placeholder="Exit certificate ref"
          value={v('exit_certificate_number')}
          onChange={(e) => setDraft((p) => ({ ...p, exit_certificate_number: e.target.value }))}
          className="h-8 text-sm"
        />
      </FieldRow>
      <FieldRow label="Customs Fees (NGN)" done={!!shipment.customs_fees_ngn}>
        <Input
          type="number"
          min="0"
          placeholder="0"
          value={v('customs_fees_ngn')}
          onChange={(e) =>
            setDraft((p) => ({ ...p, customs_fees_ngn: parseFloat(e.target.value) || '' }))
          }
          className="h-8 text-sm"
        />
      </FieldRow>
      <FieldRow label="Port Handling Charges (NGN)" done={!!shipment.port_handling_charges_ngn}>
        <Input
          type="number"
          min="0"
          placeholder="0"
          value={v('port_handling_charges_ngn')}
          onChange={(e) =>
            setDraft((p) => ({ ...p, port_handling_charges_ngn: parseFloat(e.target.value) || '' }))
          }
          className="h-8 text-sm"
        />
      </FieldRow>
      <FieldRow label="Certification Costs (NGN)" done={!!shipment.certification_costs_ngn}>
        <Input
          type="number"
          min="0"
          placeholder="0"
          value={v('certification_costs_ngn')}
          onChange={(e) =>
            setDraft((p) => ({ ...p, certification_costs_ngn: parseFloat(e.target.value) || '' }))
          }
          className="h-8 text-sm"
        />
      </FieldRow>
    </div>
  );
}

function Stage5Form({
  shipment,
  draft,
  setDraft,
}: {
  shipment: Record<string, any>;
  draft: Record<string, any>;
  setDraft: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
}) {
  const v = (f: string) => (f in draft ? draft[f] : shipment[f]) ?? '';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <FieldRow label="Freight Forwarder Name" done={!!shipment.freight_forwarder_name}>
        <Input
          placeholder="e.g. Kuehne+Nagel Nigeria"
          value={v('freight_forwarder_name')}
          onChange={(e) => setDraft((p) => ({ ...p, freight_forwarder_name: e.target.value }))}
          className="h-8 text-sm"
        />
      </FieldRow>
      <FieldRow label="Freight Forwarder Contact" done={!!shipment.freight_forwarder_contact}>
        <Input
          placeholder="Phone or email"
          value={v('freight_forwarder_contact')}
          onChange={(e) =>
            setDraft((p) => ({ ...p, freight_forwarder_contact: e.target.value }))
          }
          className="h-8 text-sm"
        />
      </FieldRow>
      <FieldRow label="Shipping Line" done={!!shipment.shipping_line}>
        <Input
          placeholder="e.g. Maersk, MSC, CMA CGM"
          value={v('shipping_line')}
          onChange={(e) => setDraft((p) => ({ ...p, shipping_line: e.target.value }))}
          className="h-8 text-sm"
        />
      </FieldRow>
      <FieldRow label="Vessel Name" done={!!shipment.vessel_name}>
        <Input
          placeholder="e.g. MSC DIANA"
          value={v('vessel_name')}
          onChange={(e) => setDraft((p) => ({ ...p, vessel_name: e.target.value }))}
          className="h-8 text-sm"
        />
      </FieldRow>
      <FieldRow label="IMO Number" done={!!shipment.imo_number}>
        <Input
          placeholder="IMO 1234567"
          value={v('imo_number')}
          onChange={(e) => setDraft((p) => ({ ...p, imo_number: e.target.value }))}
          className="h-8 text-sm"
        />
      </FieldRow>
      <FieldRow label="Voyage Number" done={!!shipment.voyage_number}>
        <Input
          placeholder="e.g. 0WL6N"
          value={v('voyage_number')}
          onChange={(e) => setDraft((p) => ({ ...p, voyage_number: e.target.value }))}
          className="h-8 text-sm"
        />
      </FieldRow>
      <FieldRow label="Booking Reference" done={!!shipment.booking_reference}>
        <Input
          placeholder="Booking ref"
          value={v('booking_reference')}
          onChange={(e) => setDraft((p) => ({ ...p, booking_reference: e.target.value }))}
          className="h-8 text-sm"
        />
      </FieldRow>
      <FieldRow label="Port of Loading" done={!!shipment.port_of_loading}>
        <Input
          placeholder="e.g. Apapa, Lagos"
          value={v('port_of_loading')}
          onChange={(e) => setDraft((p) => ({ ...p, port_of_loading: e.target.value }))}
          className="h-8 text-sm"
        />
      </FieldRow>
      <FieldRow label="Port of Discharge" done={!!shipment.port_of_discharge}>
        <Input
          placeholder="e.g. Rotterdam"
          value={v('port_of_discharge')}
          onChange={(e) => setDraft((p) => ({ ...p, port_of_discharge: e.target.value }))}
          className="h-8 text-sm"
        />
      </FieldRow>
      <FieldRow label="ETD (Estimated Time of Departure)" done={!!shipment.etd}>
        <Input
          type="date"
          value={v('etd')}
          onChange={(e) => setDraft((p) => ({ ...p, etd: e.target.value }))}
          className="h-8 text-sm"
        />
      </FieldRow>
      <FieldRow label="ETA (Estimated Time of Arrival)" done={!!shipment.eta}>
        <Input
          type="date"
          value={v('eta')}
          onChange={(e) => setDraft((p) => ({ ...p, eta: e.target.value }))}
          className="h-8 text-sm"
        />
      </FieldRow>
      <FieldRow label="Freight Cost (USD)" done={!!shipment.freight_cost_usd}>
        <Input
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={v('freight_cost_usd')}
          onChange={(e) =>
            setDraft((p) => ({ ...p, freight_cost_usd: parseFloat(e.target.value) || '' }))
          }
          className="h-8 text-sm"
        />
      </FieldRow>
      <FieldRow label="Freight Insurance (USD)" done={!!shipment.freight_insurance_usd}>
        <Input
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={v('freight_insurance_usd')}
          onChange={(e) =>
            setDraft((p) => ({ ...p, freight_insurance_usd: parseFloat(e.target.value) || '' }))
          }
          className="h-8 text-sm"
        />
      </FieldRow>
    </div>
  );
}

function Stage6Form({
  shipment,
  draft,
  setDraft,
}: {
  shipment: Record<string, any>;
  draft: Record<string, any>;
  setDraft: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
}) {
  const v = (f: string) => (f in draft ? draft[f] : shipment[f]) ?? '';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <FieldRow label="Container Number" done={!!shipment.container_number}>
        <Input
          placeholder="e.g. MSCU1234567"
          value={v('container_number')}
          onChange={(e) => setDraft((p) => ({ ...p, container_number: e.target.value }))}
          className="h-8 text-sm"
        />
      </FieldRow>
      <FieldRow label="Container Seal Number" done={!!shipment.container_seal_number}>
        <Input
          placeholder="e.g. ML-0011929"
          value={v('container_seal_number')}
          onChange={(e) => setDraft((p) => ({ ...p, container_seal_number: e.target.value }))}
          className="h-8 text-sm"
        />
      </FieldRow>
      <FieldRow label="Container Type" done={!!shipment.container_type}>
        <Select
          value={v('container_type') || '__none'}
          onValueChange={(val) =>
            setDraft((p) => ({ ...p, container_type: val === '__none' ? '' : val }))
          }
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">Not specified</SelectItem>
            <SelectItem value="20FT">20FT Standard</SelectItem>
            <SelectItem value="40FT">40FT Standard</SelectItem>
            <SelectItem value="40HC">40HC High Cube</SelectItem>
            <SelectItem value="Reefer">Reefer (Refrigerated)</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
    </div>
  );
}

function Stage7Form({
  shipment,
  draft,
  setDraft,
}: {
  shipment: Record<string, any>;
  draft: Record<string, any>;
  setDraft: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
}) {
  const v = (f: string) => (f in draft ? draft[f] : shipment[f]) ?? '';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <FieldRow label="Actual Departure Date" done={!!shipment.actual_departure_date}>
        <Input
          type="date"
          value={v('actual_departure_date')}
          onChange={(e) => setDraft((p) => ({ ...p, actual_departure_date: e.target.value }))}
          className="h-8 text-sm"
        />
      </FieldRow>
      <FieldRow label="Bill of Lading Number" done={!!shipment.bill_of_lading_number}>
        <Input
          placeholder="B/L number"
          value={v('bill_of_lading_number')}
          onChange={(e) => setDraft((p) => ({ ...p, bill_of_lading_number: e.target.value }))}
          className="h-8 text-sm"
        />
      </FieldRow>
    </div>
  );
}

function Stage8Form({
  shipment,
  draft,
  setDraft,
}: {
  shipment: Record<string, any>;
  draft: Record<string, any>;
  setDraft: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
}) {
  const v = (f: string) => (f in draft ? draft[f] : shipment[f]) ?? '';

  const PRENOTIF_ITEMS = [
    { key: 'prenotif_eu_traces', label: 'EU TRACES (EUDR DDS)', refKey: 'prenotif_eu_traces_ref' },
    { key: 'prenotif_uk_ipaffs', label: 'UK IPAFFS', refKey: 'prenotif_uk_ipaffs_ref' },
    { key: 'prenotif_us_fda', label: 'US FDA Prior Notice', refKey: 'prenotif_us_fda_ref' },
    { key: 'prenotif_cn_gacc', label: 'China GACC', refKey: 'prenotif_cn_gacc_ref' },
    { key: 'prenotif_uae_esma', label: 'UAE ESMA', refKey: 'prenotif_uae_esma_ref' },
  ];

  // Only show pre-notifications relevant to target regulations
  const targetRegs: string[] = shipment.target_regulations || [];
  const relevantPrenotifs = PRENOTIF_ITEMS.filter(({ key }) => {
    if (key === 'prenotif_eu_traces') return targetRegs.some((r) => r.toLowerCase().includes('eudr') || r.toLowerCase().includes('eu'));
    if (key === 'prenotif_uk_ipaffs') return targetRegs.some((r) => r.toLowerCase().includes('uk'));
    if (key === 'prenotif_us_fda') return targetRegs.some((r) => r.toLowerCase().includes('us') || r.toLowerCase().includes('fsma'));
    if (key === 'prenotif_cn_gacc') return targetRegs.some((r) => r.toLowerCase().includes('china') || r.toLowerCase().includes('cn') || r.toLowerCase().includes('gacc'));
    if (key === 'prenotif_uae_esma') return targetRegs.some((r) => r.toLowerCase().includes('uae') || r.toLowerCase().includes('esma'));
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FieldRow label="Actual Arrival Date" done={!!shipment.actual_arrival_date}>
          <Input
            type="date"
            value={v('actual_arrival_date')}
            onChange={(e) => setDraft((p) => ({ ...p, actual_arrival_date: e.target.value }))}
            className="h-8 text-sm"
          />
        </FieldRow>
      </div>
      {relevantPrenotifs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Pre-notification Status
          </p>
          {relevantPrenotifs.map(({ key, label, refKey }) => (
            <div key={key} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-start">
              <div className="flex items-center gap-1.5 text-xs font-medium pt-2">{label}</div>
              <Select
                value={v(key) || 'not_filed'}
                onValueChange={(val) => setDraft((p) => ({ ...p, [key]: val }))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_filed">Not Filed</SelectItem>
                  <SelectItem value="filed">Filed</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Reference number"
                value={v(refKey)}
                onChange={(e) => setDraft((p) => ({ ...p, [refKey]: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stage9Form({
  shipment,
  draft,
  setDraft,
}: {
  shipment: Record<string, any>;
  draft: Record<string, any>;
  setDraft: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
}) {
  const v = (f: string) => (f in draft ? draft[f] : shipment[f]) ?? '';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <FieldRow label="Shipment Outcome" done={!!shipment.shipment_outcome}>
        <Select
          value={v('shipment_outcome') || '__none'}
          onValueChange={(val) =>
            setDraft((p) => ({ ...p, shipment_outcome: val === '__none' ? '' : val }))
          }
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Record outcome" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">Not yet recorded</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="conditional">Conditional Release</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
      {(v('shipment_outcome') === 'rejected') && (
        <FieldRow label="Rejection Reason" done={!!shipment.rejection_reason}>
          <Input
            placeholder="Describe rejection reason"
            value={v('rejection_reason')}
            onChange={(e) => setDraft((p) => ({ ...p, rejection_reason: e.target.value }))}
            className="h-8 text-sm"
          />
        </FieldRow>
      )}
      <FieldRow label="USD/NGN Exchange Rate" done={!!shipment.usd_ngn_rate}>
        <Input
          type="number"
          min="0"
          step="1"
          placeholder="e.g. 1650"
          value={v('usd_ngn_rate')}
          onChange={(e) =>
            setDraft((p) => ({ ...p, usd_ngn_rate: parseFloat(e.target.value) || '' }))
          }
          className="h-8 text-sm"
        />
      </FieldRow>
    </div>
  );
}

// ─── Stage form dispatch ──────────────────────────────────────────────────────

function StageFormContent({
  stageNum,
  shipment,
  draft,
  setDraft,
}: {
  stageNum: number;
  shipment: Record<string, any>;
  draft: Record<string, any>;
  setDraft: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
}) {
  const props = { shipment, draft, setDraft };
  switch (stageNum) {
    case 1: return <Stage1Form {...props} />;
    case 2: return <Stage2Form {...props} />;
    case 3: return <Stage3Form {...props} />;
    case 4: return <Stage4Form {...props} />;
    case 5: return <Stage5Form {...props} />;
    case 6: return <Stage6Form {...props} />;
    case 7: return <Stage7Form {...props} />;
    case 8: return <Stage8Form {...props} />;
    case 9: return <Stage9Form {...props} />;
    default: return null;
  }
}

// ─── Stage completeness indicator ─────────────────────────────────────────────

function stageCompletionRatio(stageNum: number, shipment: Record<string, any>): number {
  const def = STAGE_DEFINITIONS.find((d) => d.stage === stageNum);
  if (!def) return 0;

  const required = [...def.requiredFields];
  if (!required.length && !def.requiredDocTypes?.length) return 1;

  let done = 0;
  let total = required.length + (def.requiredDocTypes?.length ?? 0);
  if (total === 0) return 1;

  for (const f of required) {
    const val = shipment[f as string];
    if (val !== null && val !== undefined && val !== '') done++;
  }
  for (const d of def.requiredDocTypes ?? []) {
    if (shipment.doc_status?.[d]) done++;
  }

  return total > 0 ? done / total : 1;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ShipmentPipeline({
  shipment,
  onRefresh,
  canAdvance = true,
}: ShipmentPipelineProps) {
  const { toast } = useToast();
  const currentStage: number = shipment.current_stage ?? 1;

  const [expandedStages, setExpandedStages] = useState<Set<number>>(
    new Set([currentStage])
  );
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [advanceBlockers, setAdvanceBlockers] = useState<string[]>([]);
  const [advanceWarnings, setAdvanceWarnings] = useState<string[]>([]);
  // Per-stage draft state — keyed by stage number
  const [stageDrafts, setStageDrafts] = useState<Record<number, Record<string, any>>>({});
  const [savingStage, setSavingStage] = useState<number | null>(null);

  const toggleStage = (stage: number) => {
    setExpandedStages((prev) => {
      const next = new Set(prev);
      if (next.has(stage)) {
        next.delete(stage);
      } else {
        next.add(stage);
      }
      return next;
    });
  };

  const setDraft = useCallback(
    (stageNum: number) =>
      (fn: (prev: Record<string, any>) => Record<string, any>) => {
        setStageDrafts((prev) => ({
          ...prev,
          [stageNum]: fn(prev[stageNum] ?? {}),
        }));
      },
    []
  );

  const hasDraft = (stageNum: number) =>
    Object.keys(stageDrafts[stageNum] ?? {}).length > 0;

  const saveStage = async (stageNum: number) => {
    const draft = stageDrafts[stageNum] ?? {};
    if (!Object.keys(draft).length) return;
    setSavingStage(stageNum);
    try {
      const res = await fetch(`/api/shipments/${shipment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to save');
      }
      toast({ title: 'Changes saved' });
      setStageDrafts((prev) => {
        const next = { ...prev };
        delete next[stageNum];
        return next;
      });
      onRefresh();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to save changes',
        variant: 'destructive',
      });
    } finally {
      setSavingStage(null);
    }
  };

  const advanceStage = async () => {
    setIsAdvancing(true);
    setAdvanceBlockers([]);
    setAdvanceWarnings([]);
    try {
      const res = await fetch(`/api/shipments/${shipment.id}/advance-stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setAdvanceBlockers(data.blockers || [data.error || 'Stage gate check failed.']);
        if (data.warnings?.length) setAdvanceWarnings(data.warnings);
        return;
      }
      if (data.warnings?.length) setAdvanceWarnings(data.warnings);
      toast({
        title: `Stage advanced`,
        description: `Now at Stage ${data.transition.to}: ${data.transition.stageName}`,
      });
      setExpandedStages(new Set([data.transition.to]));
      onRefresh();
    } catch {
      toast({ title: 'Error', description: 'Failed to advance stage', variant: 'destructive' });
    } finally {
      setIsAdvancing(false);
    }
  };

  const stageCompletedAt = (stage: number): string | null => {
    const sd = shipment.stage_data || {};
    return (sd[String(stage)]?.completed_at) ?? null;
  };

  return (
    <Card data-testid="card-shipment-pipeline">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Ship className="h-4 w-4" />
            Shipment Pipeline
          </CardTitle>
          <Badge variant="outline" className="font-mono text-xs">
            Stage {currentStage} / 9
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="divide-y">
          {STAGE_DEFINITIONS.map((stageDef, idx) => {
            const StageIcon = STAGE_ICONS[idx];
            const stageNum = stageDef.stage;
            const isCompleted = stageNum < currentStage;
            const isCurrent = stageNum === currentStage;
            const isFuture = stageNum > currentStage;
            const isExpanded = expandedStages.has(stageNum);
            const completedAt = stageCompletedAt(stageNum);
            const draft = stageDrafts[stageNum] ?? {};
            const ratio = stageCompletionRatio(stageNum, { ...shipment, ...draft });

            return (
              <div
                key={stageNum}
                data-testid={`pipeline-stage-${stageNum}`}
                className={isCurrent ? 'bg-primary/5' : ''}
              >
                {/* ── Header row ─────────────────────────────────────────── */}
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors disabled:cursor-default disabled:hover:bg-transparent"
                  onClick={() => !isFuture && toggleStage(stageNum)}
                  disabled={isFuture}
                  aria-expanded={isExpanded}
                  aria-label={`Stage ${stageNum}: ${stageDef.name}`}
                >
                  {/* Stage status dot */}
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                      isCompleted
                        ? 'bg-green-100 text-green-700 dark:bg-green-950/30'
                        : isCurrent
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : isFuture ? (
                      <Lock className="h-3.5 w-3.5" />
                    ) : (
                      <StageIcon className="h-3.5 w-3.5" />
                    )}
                  </div>

                  {/* Title + subtitle */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-sm font-medium ${isFuture ? 'text-muted-foreground' : ''}`}
                      >
                        Stage {stageNum}: {stageDef.name}
                      </span>
                      {isCurrent && (
                        <Badge variant="default" className="text-xs h-5">
                          Active
                        </Badge>
                      )}
                      {isCompleted && completedAt && (
                        <span className="text-xs text-muted-foreground">
                          Completed {new Date(completedAt).toLocaleDateString()}
                        </span>
                      )}
                      {/* Completion ratio for current + completed stages */}
                      {!isFuture && ratio < 1 && (
                        <span className="text-xs text-amber-600 font-medium">
                          {Math.round(ratio * 100)}% complete
                        </span>
                      )}
                    </div>
                    {!isExpanded && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {stageDef.description}
                      </p>
                    )}
                  </div>

                  {/* Chevron / lock */}
                  {isFuture ? (
                    <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  ) : isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </button>

                {/* ── Body ───────────────────────────────────────────────── */}
                {isExpanded && !isFuture && (
                  <div className="px-4 pb-4 space-y-4">
                    <p className="text-xs text-muted-foreground">{stageDef.description}</p>

                    {/* Stage-specific form */}
                    <StageFormContent
                      stageNum={stageNum}
                      shipment={shipment}
                      draft={draft}
                      setDraft={setDraft(stageNum)}
                    />

                    {/* Container stuffing load tally — Stage 6 only */}
                    {stageNum === 6 && (
                      <ContainerStuffingRecord shipmentId={shipment.id} />
                    )}

                    {/* Save button */}
                    {hasDraft(stageNum) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => saveStage(stageNum)}
                        disabled={savingStage === stageNum}
                        className="gap-1.5"
                        data-testid={`button-save-stage-${stageNum}`}
                      >
                        {savingStage === stageNum ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                        Save changes
                      </Button>
                    )}

                    {/* Advance stage (current stage only) */}
                    {isCurrent && stageNum < 9 && canAdvance && (
                      <div className="space-y-2 pt-1">
                        {/* Blockers */}
                        {advanceBlockers.length > 0 && (
                          <div className="rounded-md bg-red-50 dark:bg-red-950/20 p-3 space-y-1">
                            <p className="text-xs font-semibold text-red-800 dark:text-red-300 mb-1">
                              Cannot advance — resolve the following:
                            </p>
                            {advanceBlockers.map((b, i) => (
                              <div
                                key={i}
                                className="flex items-start gap-2 text-xs text-red-700 dark:text-red-300"
                              >
                                <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                <span>{b}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Warnings */}
                        {advanceWarnings.length > 0 && (
                          <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 p-3 space-y-1">
                            {advanceWarnings.map((w, i) => (
                              <div
                                key={i}
                                className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300"
                              >
                                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                <span>{w}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <Button
                          onClick={advanceStage}
                          disabled={isAdvancing || hasDraft(stageNum)}
                          className="w-full sm:w-auto gap-1.5"
                          data-testid="button-advance-stage"
                        >
                          {isAdvancing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ArrowRight className="h-4 w-4" />
                          )}
                          Advance to Stage {stageNum + 1}:{' '}
                          {STAGE_DEFINITIONS[idx + 1]?.name}
                        </Button>
                        {hasDraft(stageNum) && (
                          <p className="text-xs text-amber-600">
                            Save unsaved changes before advancing.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Stage 9 close note */}
                    {isCurrent && stageNum === 9 && (
                      <div className="flex items-center gap-2 text-sm text-green-700 font-medium pt-1">
                        <CheckCircle2 className="h-4 w-4" />
                        Final stage — record outcome above to close this shipment.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
