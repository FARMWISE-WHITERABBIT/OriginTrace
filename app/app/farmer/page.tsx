'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Scale, Leaf, Globe, Award, TrendingUp, TrendingDown, Minus, Package, Lightbulb, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import Link from 'next/link';

interface FarmerData {
  farm: any;
  organization: any;
  batches: any[];
  certifications: any[];
  inputs: any[];
  exportDestinations: string[];
}

export default function FarmerHomePage() {
  const [data, setData] = useState<FarmerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [yieldData, setYieldData] = useState<any>(null);
  const [predictionData, setPredictionData] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/farmer').then(r => r.json()),
      fetch('/api/farmer/yield').then(r => r.json()),
      fetch('/api/farmer/predictions').then(r => r.ok ? r.json() : null),
    ]).then(([farmer, y, pred]) => {
      setData(farmer);
      setYieldData(y);
      setPredictionData(pred);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading your farm...</div>;
  }

  if (!data?.farm) {
    return <div className="text-center py-12 text-muted-foreground">Farm data not available.</div>;
  }

  const farm = data.farm;
  const complianceColor = farm.compliance_status === 'approved' ? 'text-green-600' : farm.compliance_status === 'flagged' ? 'text-amber-600' : 'text-gray-500';

  return (
    <div className="space-y-4">
      <Card className="border-[#2E7D6B]/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2" data-testid="text-farm-name">
            <Leaf className="h-5 w-5 text-[#2E7D6B]" />
            {farm.farmer_name}'s Farm
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-muted-foreground flex items-center gap-1"><Scale className="h-3 w-3" /> Area</div>
              <div className="font-bold text-lg" data-testid="text-farm-area">{farm.area_hectares || '—'} ha</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Community</div>
              <div className="font-medium" data-testid="text-farm-community">{farm.community || '—'}</div>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Compliance</span>
            <Badge variant="outline" className={complianceColor} data-testid="badge-compliance-status">
              {farm.compliance_status || 'Pending'}
            </Badge>
          </div>
          {farm.boundary && (
            <div className="bg-[#2E7D6B]/5 rounded-lg p-3 text-sm">
              <span className="text-[#2E7D6B] font-medium flex items-center gap-1">
                <MapPin className="h-3 w-3" /> GPS boundary recorded
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {data.exportDestinations.length > 0 && (
        <Card className="bg-gradient-to-r from-[#2E7D6B]/5 to-[#6FB8A8]/5 border-[#2E7D6B]/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-sm font-medium text-[#1F5F52] mb-2">
              <Globe className="h-4 w-4" />
              Your produce is exported to:
            </div>
            <div className="flex flex-wrap gap-2">
              {data.exportDestinations.map(country => (
                <Badge key={country} variant="secondary" className="bg-white" data-testid={`badge-destination-${country}`}>
                  {country}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {yieldData && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#2E7D6B]" />
              Yield Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-muted-foreground">Your Yield</div>
                <div className="font-bold text-lg text-[#2E7D6B]" data-testid="text-actual-yield">{yieldData.actualYield} kg/ha</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-muted-foreground">Total Delivered</div>
                <div className="font-bold text-lg" data-testid="text-total-weight">{(yieldData.totalWeight / 1000).toFixed(1)} t</div>
              </div>
            </div>
            {yieldData.benchmarks?.length > 0 && (
              <div className="mt-3 text-xs text-muted-foreground">
                Regional average: {yieldData.benchmarks[0].avg_yield_per_hectare} kg/ha ({yieldData.benchmarks[0].commodity})
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {predictionData && predictionData.predictedYieldKg > 0 && (
        <Card className="border-[#2E7D6B]/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-[#2E7D6B]" />
              Yield Forecast
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-muted-foreground">Predicted Yield</div>
                <div className="font-bold text-lg text-[#2E7D6B]" data-testid="text-predicted-yield">
                  {(predictionData.predictedYieldKg / 1000).toFixed(1)} t
                </div>
                <div className="text-xs text-muted-foreground" data-testid="text-confidence-range">
                  {(predictionData.confidenceRange.low / 1000).toFixed(1)} – {(predictionData.confidenceRange.high / 1000).toFixed(1)} t range
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-muted-foreground">Trend</div>
                <div className="font-bold text-lg flex items-center gap-1" data-testid="text-yield-trend">
                  {predictionData.trend === 'improving' && (
                    <>
                      <ArrowUpRight className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">Improving</span>
                    </>
                  )}
                  {predictionData.trend === 'declining' && (
                    <>
                      <ArrowDownRight className="h-4 w-4 text-red-600" />
                      <span className="text-red-600">Declining</span>
                    </>
                  )}
                  {predictionData.trend === 'stable' && (
                    <>
                      <Minus className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Stable</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            {predictionData.recommendations && predictionData.recommendations.length > 0 && (
              <div className="bg-[#2E7D6B]/5 rounded-lg p-3 space-y-1">
                <div className="text-xs font-medium text-[#1F5F52] mb-1">Recommendations</div>
                {predictionData.recommendations.slice(0, 3).map((rec: string, i: number) => (
                  <div key={i} className="text-xs text-muted-foreground flex items-start gap-1" data-testid={`text-recommendation-${i}`}>
                    <span className="text-[#2E7D6B] mt-0.5">•</span>
                    {rec}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {data.certifications.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="h-4 w-4 text-[#2E7D6B]" />
              Certifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.certifications.map((cert: any) => (
                <div key={cert.id} className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded" data-testid={`cert-${cert.id}`}>
                  <span className="font-medium capitalize">{cert.certification_body?.replace(/_/g, ' ')}</span>
                  <Badge variant={cert.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                    {cert.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link href="/app/farmer/deliveries">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="py-4 text-center">
              <Package className="h-6 w-6 text-[#2E7D6B] mx-auto mb-1" />
              <div className="font-medium text-sm">Deliveries</div>
              <div className="text-xs text-muted-foreground">{data.batches.length} records</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/app/farmer/inputs">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="py-4 text-center">
              <Leaf className="h-6 w-6 text-[#2E7D6B] mx-auto mb-1" />
              <div className="font-medium text-sm">Inputs</div>
              <div className="text-xs text-muted-foreground">{data.inputs.length} recorded</div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
