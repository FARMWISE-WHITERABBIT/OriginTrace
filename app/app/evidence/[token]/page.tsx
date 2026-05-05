/**
 * /evidence/[token] — Public read-only evidence view
 *
 * No login required. Fetches evidence data via the public API token endpoint
 * and renders a clean, official-looking traceability package for border
 * officers, buyers, or regulators.
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface EvidenceData {
  orgName: string;
  shipment: {
    id: string;
    shipment_code?: string;
    destination_country: string;
    status: string;
    total_weight_kg?: number;
    commodity?: string;
    container_number?: string;
    vessel_name?: string;
    bill_of_lading_number?: string;
    port_of_loading?: string;
    port_of_discharge?: string;
    etd?: string;
    eta?: string;
    prenotif_eu_traces: string;
    prenotif_eu_traces_ref?: string;
    created_at: string;
  };
  farms: Array<{
    id: string;
    farmer_name: string;
    community: string;
    state: string;
    compliance_status: string;
    boundary_geo: boolean;
  }>;
  batches: Array<{
    id: string;
    batch_code: string;
    collection_date: string;
    total_weight: number;
    bag_count: number;
    farmer_name?: string;
  }>;
  labResults: Array<{
    lab_provider: string;
    test_type: string;
    test_date: string;
    result: string;
    certificate_number?: string;
    certificate_expiry_date?: string;
  }>;
  documents: Array<{
    doc_type: string;
    file_name: string;
    status: string;
    expiry_date?: string;
  }>;
  package: {
    token: string;
    expiresAt: string;
    views: number;
  };
}

type PageState = 'loading' | 'loaded' | 'expired' | 'not_found' | 'error';

export default function EvidencePackagePage() {
  const params = useParams();
  const token = params?.token as string;

  const [state, setState] = useState<PageState>('loading');
  const [data, setData] = useState<EvidenceData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch(`/api/evidence/${token}`)
      .then(async (res) => {
        if (res.status === 410) { setState('expired'); return; }
        if (res.status === 404) { setState('not_found'); return; }
        if (!res.ok) { setState('error'); return; }
        const json = await res.json();
        setData(json);
        setState('loaded');
      })
      .catch(() => setState('error'));
  }, [token]);

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading evidence package…</p>
        </div>
      </div>
    );
  }

  if (state === 'expired') {
    return <StatusPage title="Package Expired" message="This evidence package has expired. Please contact the exporter to request a new package." color="amber" />;
  }

  if (state === 'not_found') {
    return <StatusPage title="Not Found" message="This evidence package does not exist or the link is invalid." color="red" />;
  }

  if (state === 'error' || !data) {
    return <StatusPage title="Error" message="Unable to load evidence package. Please try again later." color="red" />;
  }

  const s = data.shipment;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <div className="bg-green-800 text-white px-6 py-5">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs text-green-200 mb-1">OriginTrace — Traceability Evidence Package</p>
          <h1 className="text-xl font-bold mb-0.5">Border Detention Evidence Package</h1>
          <p className="text-sm text-green-100">{data.orgName}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Package validity notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 flex gap-2 items-start">
          <span className="font-semibold shrink-0">Valid until:</span>
          <span>{new Date(data.package.expiresAt).toLocaleString('en-GB', { timeZone: 'UTC' })} UTC</span>
          <span className="ml-auto text-xs text-amber-600">{data.package.views} view{data.package.views !== 1 ? 's' : ''}</span>
        </div>

        {/* Shipment overview */}
        <Section title="Shipment Details">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <DetailRow label="Shipment Code" value={s.shipment_code ?? s.id.slice(0, 12)} />
            <DetailRow label="Destination"   value={s.destination_country} />
            <DetailRow label="Commodity"     value={s.commodity ?? '—'} />
            <DetailRow label="Weight"        value={s.total_weight_kg ? `${s.total_weight_kg.toLocaleString()} kg` : '—'} />
            <DetailRow label="Container No." value={s.container_number ?? '—'} />
            <DetailRow label="Vessel"        value={s.vessel_name ?? '—'} />
            <DetailRow label="B/L Number"    value={s.bill_of_lading_number ?? '—'} />
            <DetailRow label="Port of Loading"    value={s.port_of_loading ?? '—'} />
            <DetailRow label="Port of Discharge"  value={s.port_of_discharge ?? '—'} />
            <DetailRow label="ETD"           value={s.etd ?? '—'} />
            <DetailRow label="ETA"           value={s.eta ?? '—'} />
            <DetailRow label="EU TRACES"     value={
              s.prenotif_eu_traces_ref
                ? `${s.prenotif_eu_traces_ref} (${s.prenotif_eu_traces})`
                : s.prenotif_eu_traces === 'not_filed' ? 'Not filed' : s.prenotif_eu_traces
            } />
          </dl>
        </Section>

        {/* Farms */}
        <Section title={`Farm Traceability (${data.farms.length} farms)`}>
          {data.farms.length === 0
            ? <p className="text-sm text-gray-500 italic">No farms linked to this shipment.</p>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-green-800 text-white">
                      <Th>Farmer</Th><Th>Community</Th><Th>State</Th>
                      <Th>GPS Boundary</Th><Th>Compliance</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.farms.map((f, i) => (
                      <tr key={f.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <Td>{f.farmer_name}</Td>
                        <Td>{f.community}</Td>
                        <Td>{f.state}</Td>
                        <Td>{f.boundary_geo ? '✓ On file' : '✗ Missing'}</Td>
                        <Td>
                          <StatusBadge status={f.compliance_status} />
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </Section>

        {/* Batches */}
        <Section title={`Collection Batches (${data.batches.length})`}>
          {data.batches.length === 0
            ? <p className="text-sm text-gray-500 italic">No batch manifests on file.</p>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-green-800 text-white">
                      <Th>Batch Code</Th><Th>Date</Th><Th>Farmer</Th>
                      <Th>Weight (kg)</Th><Th>Bags</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.batches.map((b, i) => (
                      <tr key={b.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <Td>{b.batch_code}</Td>
                        <Td>{b.collection_date}</Td>
                        <Td>{b.farmer_name ?? '—'}</Td>
                        <Td>{b.total_weight.toLocaleString()}</Td>
                        <Td>{b.bag_count}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </Section>

        {/* Lab Results */}
        <Section title={`Laboratory Test Results (${data.labResults.length})`}>
          {data.labResults.length === 0
            ? <p className="text-sm text-gray-500 italic">No lab results on file for this shipment.</p>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-green-800 text-white">
                      <Th>Lab</Th><Th>Test Type</Th><Th>Date</Th>
                      <Th>Result</Th><Th>Certificate</Th><Th>Expiry</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.labResults.map((r, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <Td>{r.lab_provider}</Td>
                        <Td>{r.test_type.replace('_', ' ')}</Td>
                        <Td>{r.test_date}</Td>
                        <Td><LabResultBadge result={r.result} /></Td>
                        <Td>{r.certificate_number ?? '—'}</Td>
                        <Td>{r.certificate_expiry_date ?? '—'}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </Section>

        {/* Documents */}
        <Section title={`Compliance Documents (${data.documents.length})`}>
          {data.documents.length === 0
            ? <p className="text-sm text-gray-500 italic">No compliance documents uploaded.</p>
            : (
              <div className="space-y-2">
                {data.documents.map((d, i) => (
                  <div key={i} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-800">
                        {d.doc_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                      <span className="text-gray-500 ml-2 text-xs">{d.file_name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {d.expiry_date && <span>Expires {d.expiry_date}</span>}
                      <StatusBadge status={d.status} />
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </Section>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 pb-8 pt-2 border-t border-gray-200">
          <p>This evidence package was generated by <strong>OriginTrace</strong> on behalf of {data.orgName}.</p>
          <p className="mt-1">Package token: {data.package.token}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Small presentational sub-components ─────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="bg-green-800 text-white px-4 py-2.5">
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-gray-500 font-medium">{label}</dt>
      <dd className="text-gray-900">{value}</dd>
    </>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-left font-semibold">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2 border-b border-gray-100">{children}</td>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved:  'bg-green-100 text-green-800',
    active:    'bg-green-100 text-green-800',
    pending:   'bg-amber-100 text-amber-800',
    rejected:  'bg-red-100 text-red-800',
    expired:   'bg-red-100 text-red-800',
    conditional: 'bg-amber-100 text-amber-800',
  };
  const cls = map[status.toLowerCase()] ?? 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function LabResultBadge({ result }: { result: string }) {
  const map: Record<string, string> = {
    pass:        'bg-green-100 text-green-800',
    fail:        'bg-red-100 text-red-800',
    conditional: 'bg-amber-100 text-amber-800',
  };
  const cls = map[result.toLowerCase()] ?? 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {result.charAt(0).toUpperCase() + result.slice(1)}
    </span>
  );
}

function StatusPage({
  title,
  message,
  color,
}: {
  title: string;
  message: string;
  color: 'red' | 'amber';
}) {
  const bgClass = color === 'red' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-800';
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className={`max-w-md w-full border rounded-xl p-8 text-center ${bgClass}`}>
        <h1 className="text-xl font-bold mb-3">{title}</h1>
        <p className="text-sm">{message}</p>
        <p className="mt-6 text-xs text-gray-500">Powered by OriginTrace</p>
      </div>
    </div>
  );
}
