'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  XCircle,
  Loader2,
  MapPin,
  Package,
  ShieldCheck,
  Clock,
  Wheat,
  Scale,
  TreePine,
  Users,
  Globe,
} from 'lucide-react';
import Image from 'next/image';

interface VerificationData {
  verified: boolean;
  type?: 'bag' | 'batch' | 'finished_good';
  code?: string;
  commodity?: string;
  status?: string;
  weight_kg?: number;
  total_weight?: number;
  bag_count?: number;
  grade?: string;
  net_weight?: number;
  product_name?: string;
  production_date?: string;
  expiry_date?: string;
  message?: string;
  gps?: { lat: number; lng: number };
  origin?: {
    state?: string;
    lga?: string;
    community?: string;
    farmer?: string;
    compliance_status?: string;
    area_hectares?: number;
    has_boundary?: boolean;
    boundary?: any;
  };
  batch?: {
    batch_id?: string;
    commodity?: string;
    collected_at?: string;
  };
  contributors?: Array<{
    farmer_name: string;
    weight_kg: number;
    bag_count: number;
  }>;
  timeline?: Array<{
    event: string;
    date?: string;
    status?: string;
    batch_id?: string;
  }>;
  verified_by?: string;
  platform?: string;
}

export default function PublicVerifyPage() {
  const params = useParams();
  const code = params.code as string;
  const [data, setData] = useState<VerificationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verify() {
      try {
        const res = await fetch(`/api/public/verify?code=${encodeURIComponent(code)}`);
        if (!res.ok) {
          setError('Verification service is currently unavailable.');
          return;
        }
        const result = await res.json();
        setData(result);
      } catch {
        setError('Unable to connect to verification service.');
      } finally {
        setIsLoading(false);
      }
    }
    if (code) verify();
  }, [code]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-[#2E7D6B] mx-auto" />
          <p className="text-[#4B5563]">Verifying...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <XCircle className="h-12 w-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-[#111827]">Verification Error</h2>
            <p className="text-[#4B5563]">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data?.verified) {
    return (
      <div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6">
          <Header />
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <XCircle className="h-12 w-12 text-red-500 mx-auto" />
              <h2 className="text-xl font-bold text-[#111827]">Not Found</h2>
              <p className="text-[#4B5563]">
                {data?.message || 'No record was found for this verification code.'}
              </p>
              <p className="text-xs text-[#9CA3AF]">Code: {code}</p>
            </CardContent>
          </Card>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAF9] p-4">
      <div className="max-w-lg mx-auto space-y-4 py-6">
        <Header />

        <Card className="border-[#2E7D6B]/30 border-2">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-7 w-7 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#111827]" data-testid="text-verified-status">Verified</h2>
                <p className="text-sm text-[#4B5563]">
                  {data.type === 'bag' ? 'Bag' : data.type === 'batch' ? 'Batch' : 'Product'} Traceability Confirmed
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <InfoItem icon={Package} label="Code" value={data.code || code} mono data-testid="text-verify-code" />
              <InfoItem icon={Wheat} label="Commodity" value={data.commodity || 'N/A'} capitalize data-testid="text-verify-commodity" />
              {data.total_weight && (
                <InfoItem icon={Scale} label="Total Weight" value={`${Number(data.total_weight).toLocaleString()} kg`} data-testid="text-verify-weight" />
              )}
              {data.weight_kg && (
                <InfoItem icon={Scale} label="Weight" value={`${Number(data.weight_kg).toLocaleString()} kg`} data-testid="text-verify-weight" />
              )}
              {data.bag_count && (
                <InfoItem icon={Package} label="Bags" value={data.bag_count.toString()} data-testid="text-verify-bags" />
              )}
              {data.grade && (
                <InfoItem icon={ShieldCheck} label="Grade" value={data.grade} />
              )}
              {data.product_name && (
                <InfoItem icon={Package} label="Product" value={data.product_name} />
              )}
              {data.net_weight && (
                <InfoItem icon={Scale} label="Net Weight" value={`${data.net_weight} kg`} />
              )}
            </div>
          </CardContent>
        </Card>

        {data.origin && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-[#111827]">
                <MapPin className="h-4 w-4 text-[#2E7D6B]" />
                Origin
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.origin.state && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#4B5563]">State</span>
                  <span className="font-medium text-[#111827]" data-testid="text-origin-state">{data.origin.state}</span>
                </div>
              )}
              {data.origin.lga && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#4B5563]">LGA</span>
                  <span className="font-medium text-[#111827]" data-testid="text-origin-lga">{data.origin.lga}</span>
                </div>
              )}
              {data.origin.community && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#4B5563]">Community</span>
                  <span className="font-medium text-[#111827]" data-testid="text-origin-community">{data.origin.community}</span>
                </div>
              )}
              {data.origin.farmer && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#4B5563]">Farmer</span>
                  <span className="font-medium text-[#111827]">{data.origin.farmer}</span>
                </div>
              )}
              {data.origin.compliance_status && (
                <div className="flex justify-between text-sm items-center">
                  <span className="text-[#4B5563]">Compliance</span>
                  <ComplianceBadge status={data.origin.compliance_status} />
                </div>
              )}
              {data.origin.area_hectares && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#4B5563]">Farm Area</span>
                  <span className="font-medium text-[#111827]">{data.origin.area_hectares} ha</span>
                </div>
              )}
              {data.origin.has_boundary && (
                <div className="flex items-center gap-2 text-sm text-green-600 mt-2">
                  <TreePine className="h-4 w-4" />
                  <span>GPS farm boundary mapped</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {data.contributors && data.contributors.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-[#111827]">
                <Users className="h-4 w-4 text-[#2E7D6B]" />
                Contributing Farmers ({data.contributors.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.contributors.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                    <span className="font-medium text-[#111827]">{c.farmer_name}</span>
                    <div className="flex items-center gap-3 text-[#4B5563]">
                      <span>{c.bag_count} bags</span>
                      <span>{Number(c.weight_kg).toLocaleString()} kg</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {data.timeline && data.timeline.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-[#111827]">
                <Clock className="h-4 w-4 text-[#2E7D6B]" />
                Custody Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.timeline.map((entry, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-[#2E7D6B] flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-[#111827]">{entry.event}</div>
                      {entry.date && (
                        <div className="text-xs text-[#9CA3AF]">
                          {new Date(entry.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      )}
                      {entry.batch_id && (
                        <div className="text-xs text-[#4B5563] font-mono">{entry.batch_id}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Footer verifiedBy={data.verified_by} />
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="text-center space-y-2">
      <Image
        src="/images/logo-green.png"
        alt="OriginTrace"
        width={140}
        height={40}
        className="mx-auto"
      />
      <p className="text-xs text-[#9CA3AF]">Agricultural Supply Chain Verification</p>
    </div>
  );
}

function Footer({ verifiedBy }: { verifiedBy?: string }) {
  return (
    <div className="text-center space-y-2 pt-4 pb-8">
      <div className="flex items-center justify-center gap-2 text-sm text-[#2E7D6B] font-medium">
        <ShieldCheck className="h-4 w-4" />
        Verified by OriginTrace
      </div>
      {verifiedBy && (
        <p className="text-xs text-[#9CA3AF]">Sourced by {verifiedBy}</p>
      )}
      <p className="text-xs text-[#9CA3AF]">
        <Globe className="h-3 w-3 inline mr-1" />
        origintrace.trade
      </p>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value, mono, capitalize, ...props }: {
  icon: any;
  label: string;
  value: string;
  mono?: boolean;
  capitalize?: boolean;
  [key: string]: any;
}) {
  return (
    <div className="space-y-1" {...props}>
      <div className="flex items-center gap-1.5 text-xs text-[#9CA3AF]">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className={`text-sm font-medium text-[#111827] ${mono ? 'font-mono' : ''} ${capitalize ? 'capitalize' : ''}`}>
        {value}
      </div>
    </div>
  );
}

function ComplianceBadge({ status }: { status: string }) {
  switch (status) {
    case 'approved':
      return <Badge variant="outline" className="text-green-600 border-green-300">Approved</Badge>;
    case 'pending':
      return <Badge variant="outline" className="text-amber-600 border-amber-300">Pending</Badge>;
    case 'rejected':
      return <Badge variant="outline" className="text-red-600 border-red-300">Rejected</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
