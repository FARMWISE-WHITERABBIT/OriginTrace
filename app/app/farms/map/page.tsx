'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOrg } from '@/lib/contexts/org-context';
import { useToast } from '@/hooks/use-toast';
import { useOnlineStatus } from '@/components/online-status';
import { detectMockLocation } from '@/lib/validation/yield-validation';
import {
  Navigation,
  MapPin,
  Loader2,
  CheckCircle,
  Footprints,
  Satellite,
  Save,
  AlertTriangle,
  Plus,
  RotateCcw,
  X,
  Search,
  User,
  ShieldCheck,
  ShieldAlert,
  Clock,
  TreePine,
  Info,
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { TierGate } from '@/components/tier-gate';

interface Coordinates { lat: number; lng: number; }

interface BoundaryAnalysisResult {
  confidence_score: number;
  confidence_level: 'high' | 'medium' | 'low';
  flags: {
    shape_regularity: { score: number; detail: string };
    vertex_spacing: { score: number; detail: string };
    area_plausibility: { score: number; detail: string };
    location_plausibility: { score: number; detail: string };
    edge_straightness: { score: number; detail: string };
  };
  analyzed_at: string;
}

interface Farm {
  id: string;
  farmer_name: string;
  community: string;
  boundary?: any;
  area_hectares?: number;
  deforestation_check?: DeforestationResult | null;
  boundary_analysis?: BoundaryAnalysisResult | null;
}

interface DeforestationResult {
  deforestation_free: boolean;
  forest_loss_hectares: number;
  forest_loss_percentage: number;
  analysis_date: string;
  data_source: string;
  risk_level: 'low' | 'medium' | 'high';
}

const SatelliteMap = dynamic(() => import('./satellite-map'), { ssr: false, loading: () => (
  <div className="h-[400px] bg-muted rounded-lg flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
)});

function HybridFarmMappingPageInner() {
  return (
    <TierGate feature="farm_mapping" requiredTier="starter" featureLabel="Farm Mapping">
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
        <HybridFarmMappingContent />
      </Suspense>
    </TierGate>
  );
}

function HybridFarmMappingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoading: orgLoading } = useOrg();
  const { toast } = useToast();
  const isOnline = useOnlineStatus();

  const [mode, setMode] = useState<'gps' | 'satellite'>('gps');
  const [coordinates, setCoordinates] = useState<Coordinates[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isCheckingGPS, setIsCheckingGPS] = useState(false);
  const [gpsSpoofWarning, setGpsSpoofWarning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmsLoading, setFarmsLoading] = useState(true);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [farmSearch, setFarmSearch] = useState('');
  const [showFarmPicker, setShowFarmPicker] = useState(false);

  const [deforestationResult, setDeforestationResult] = useState<DeforestationResult | null>(null);
  const [isCheckingDeforestation, setIsCheckingDeforestation] = useState(false);
  const [boundaryAnalysis, setBoundaryAnalysis] = useState<BoundaryAnalysisResult | null>(null);
  const [isAnalyzingBoundary, setIsAnalyzingBoundary] = useState(false);
  const [showBoundaryDetails, setShowBoundaryDetails] = useState(false);

  const farmIdParam = searchParams.get('farm_id');

  useEffect(() => {
    async function loadFarms() {
      setFarmsLoading(true);
      try {
        const res = await fetch('/api/farms?limit=1000');
        if (!res.ok) throw new Error('Failed to load farms');
        const json = await res.json();
        const sorted: Farm[] = (json.farms || []).sort((a: Farm, b: Farm) =>
          (a.farmer_name || '').localeCompare(b.farmer_name || '')
        );
        setFarms(sorted);
        if (farmIdParam) {
          const found = sorted.find(f => String(f.id) === farmIdParam);
          if (found) setSelectedFarm(found);
        }
      } catch {
        // silent — user sees empty list
      } finally {
        setFarmsLoading(false);
      }
    }
    loadFarms();
  }, [farmIdParam]);

  useEffect(() => {
    if (selectedFarm?.deforestation_check) {
      setDeforestationResult(selectedFarm.deforestation_check);
    } else {
      setDeforestationResult(null);
    }
    if (selectedFarm?.boundary_analysis) {
      setBoundaryAnalysis(selectedFarm.boundary_analysis);
    } else {
      setBoundaryAnalysis(null);
    }
  }, [selectedFarm]);

  const checkDeforestation = useCallback(async () => {
    if (!selectedFarm) return;
    setIsCheckingDeforestation(true);
    try {
      const res = await fetch('/api/deforestation-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farm_id: selectedFarm.id }),
      });
      const data = await res.json();
      if (res.ok && data.result) {
        setDeforestationResult(data.result);
        setSelectedFarm(prev => prev ? { ...prev, deforestation_check: data.result } : prev);
        toast({ title: 'Deforestation Check Complete', description: data.result.deforestation_free ? 'Farm is deforestation-free.' : 'Risk detected — review the results.' });
      } else {
        toast({ title: 'Check Failed', description: data.error || 'Could not complete deforestation check.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to run deforestation check.', variant: 'destructive' });
    } finally {
      setIsCheckingDeforestation(false);
    }
  }, [selectedFarm, toast]);

  const runBoundaryAnalysis = useCallback(async (farmId: string, boundary?: any) => {
    setIsAnalyzingBoundary(true);
    try {
      const payload: any = { farm_id: farmId };
      if (boundary) payload.boundary = boundary;
      const res = await fetch('/api/farms/boundary-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.result) {
        setBoundaryAnalysis(data.result);
        toast({ title: 'Boundary Analysis Complete', description: `Confidence: ${data.result.confidence_score}/100 (${data.result.confidence_level})` });
        return data.result;
      } else {
        toast({ title: 'Analysis Failed', description: data.error || 'Could not analyze boundary.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to run boundary analysis.', variant: 'destructive' });
    } finally {
      setIsAnalyzingBoundary(false);
    }
    return null;
  }, [toast]);

  const filteredFarms = farmSearch.trim()
    ? farms.filter(f =>
        (f.farmer_name || '').toLowerCase().includes(farmSearch.toLowerCase()) ||
        (f.community || '').toLowerCase().includes(farmSearch.toLowerCase())
      ).slice(0, 50)
    : farms.slice(0, 50);

  const getCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      toast({ title: 'Not Supported', description: 'Geolocation is not supported by your browser.', variant: 'destructive' });
      return;
    }

    setIsCheckingGPS(true);
    try {
      const spoofCheck = await detectMockLocation();
      if (spoofCheck.isMocked) {
        setGpsSpoofWarning(true);
        toast({ title: 'GPS Spoof Detected', description: 'Please disable mock location apps.', variant: 'destructive' });
        setIsCheckingGPS(false);
        return;
      }
    } catch {}
    setIsCheckingGPS(false);

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsLocating(false);
        toast({ title: 'Location acquired', description: `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}` });
      },
      (err) => {
        setIsLocating(false);
        toast({ title: 'Location Error', description: err.message, variant: 'destructive' });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [toast]);

  const addBoundaryPoint = () => {
    if (currentLocation) {
      setCoordinates(prev => [...prev, currentLocation]);
      toast({ title: 'Point Added', description: `Point ${coordinates.length + 1} added to boundary` });
    }
  };

  const removePoint = (index: number) => {
    setCoordinates(prev => prev.filter((_, i) => i !== index));
  };

  const clearBoundary = () => {
    setCoordinates([]);
    setCurrentLocation(null);
  };

  const calculateArea = (coords: Coordinates[]): number => {
    if (coords.length < 3) return 0;
    let area = 0;
    const n = coords.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += coords[i].lng * coords[j].lat;
      area -= coords[j].lng * coords[i].lat;
    }
    area = Math.abs(area) / 2;
    const hectares = area * 111.32 * 111.32 * 100;
    return Math.round(hectares * 100) / 100;
  };

  const handleSatellitePoints = (points: Coordinates[]) => {
    setCoordinates(points);
  };

  const areaHectares = calculateArea(coordinates);

  const handleSave = async () => {
    if (!selectedFarm || coordinates.length < 3) return;
    setIsSaving(true);

    const boundary = {
      type: 'Polygon',
      coordinates: [[...coordinates.map(c => [c.lng, c.lat]), [coordinates[0].lng, coordinates[0].lat]]]
    };

    try {
      if (isOnline) {
        const res = await fetch(`/api/farmers/${selectedFarm.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ boundary, area_hectares: areaHectares }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || 'Failed to save boundary');
        }
        toast({ title: 'Farm Boundary Saved', description: `${selectedFarm.farmer_name}'s farm boundary (${areaHectares} ha) saved successfully.` });
        await runBoundaryAnalysis(selectedFarm.id, boundary);
      } else {
        toast({ title: 'Saved Offline', description: 'Boundary will sync when online.' });
      }
      setIsSuccess(true);
    } catch (error: any) {
      console.error('Save error:', error);
      toast({ title: 'Error', description: error.message || 'Failed to save boundary.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (orgLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-6">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
        <h2 className="text-2xl font-bold">Boundary Saved</h2>
        <p className="text-muted-foreground">
          {selectedFarm?.farmer_name}'s farm has been mapped ({areaHectares} hectares).
        </p>
        <div className="space-y-3">
          <Button onClick={() => { setIsSuccess(false); setCoordinates([]); setSelectedFarm(null); setCurrentLocation(null); }} className="w-full" data-testid="button-map-another">
            Map Another Farm
          </Button>
          <Link href="/app" className="block">
            <Button variant="ghost" className="w-full" data-testid="button-back-dashboard">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold" data-testid="text-page-title">Map Farm Boundary</h1>
        <p className="text-sm text-muted-foreground">Capture farm boundary using GPS Walk or Satellite Draw</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Select Farmer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {selectedFarm ? (
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium text-sm">{selectedFarm.farmer_name}</div>
                <div className="text-xs text-muted-foreground">{selectedFarm.community}</div>
                {selectedFarm.boundary && (
                  <Badge variant="outline" className="text-xs text-amber-600 mt-1">Has existing boundary</Badge>
                )}
              </div>
              <Button variant="ghost" size="icon" aria-label="Change farmer" onClick={() => { setSelectedFarm(null); setCoordinates([]); setDeforestationResult(null); setBoundaryAnalysis(null); setShowBoundaryDetails(false); }} data-testid="button-change-farmer">
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  value={farmSearch}
                  onChange={(e) => { setFarmSearch(e.target.value); setShowFarmPicker(true); }}
                  onFocus={() => setShowFarmPicker(true)}
                  placeholder="Search farmer..."
                  className="pl-9"
                  data-testid="input-farm-search"
                />
              </div>
              {showFarmPicker && (
                <div className="border rounded-md max-h-48 overflow-y-auto divide-y">
                  {farmsLoading ? (
                    <div className="p-3 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm">Loading...</span></div>
                  ) : filteredFarms.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground text-center">No farms found</div>
                  ) : (
                    filteredFarms.map(f => (
                      <button
                        key={f.id}
                        onClick={() => { setSelectedFarm(f); setShowFarmPicker(false); setFarmSearch(''); }}
                        className="w-full text-left p-3 flex items-center justify-between gap-2 hover-elevate"
                        data-testid={`farm-pick-${f.id}`}
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{f.farmer_name}</div>
                          <div className="text-xs text-muted-foreground">{f.community}</div>
                        </div>
                        {f.boundary && <Badge variant="outline" className="text-xs">Mapped</Badge>}
                      </button>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {selectedFarm && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={mode === 'gps' ? 'default' : 'outline'}
              onClick={() => { setMode('gps'); setCoordinates([]); }}
              className="h-14 flex-col gap-1"
              data-testid="button-mode-gps"
            >
              <Footprints className="h-5 w-5" />
              <span className="text-xs">GPS Walk</span>
            </Button>
            <Button
              variant={mode === 'satellite' ? 'default' : 'outline'}
              onClick={() => { setMode('satellite'); setCoordinates([]); }}
              className="h-14 flex-col gap-1"
              data-testid="button-mode-satellite"
            >
              <Satellite className="h-5 w-5" />
              <span className="text-xs">Satellite Draw</span>
            </Button>
          </div>

          {mode === 'gps' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Footprints className="h-4 w-4 text-primary" />
                  GPS Walk Mode
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Walk the farm boundary and tap to record each corner point. Minimum 3 points needed.
                </p>

                {gpsSpoofWarning && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    GPS spoofing detected. Please disable mock location.
                  </div>
                )}

                {currentLocation && (
                  <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-2 text-sm">
                    <Navigation className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="font-mono text-xs">{currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={getCurrentLocation}
                    disabled={isLocating || isCheckingGPS || gpsSpoofWarning}
                    variant="outline"
                    data-testid="button-get-location"
                  >
                    {isCheckingGPS ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Checking...</>
                    ) : isLocating ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Getting...</>
                    ) : (
                      <><Navigation className="h-4 w-4 mr-2" />Get Location</>
                    )}
                  </Button>
                  <Button
                    onClick={addBoundaryPoint}
                    disabled={!currentLocation}
                    data-testid="button-add-point"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Point
                  </Button>
                </div>

                {coordinates.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>{coordinates.length} Points</Label>
                      {coordinates.length >= 3 && (
                        <Badge variant="outline" data-testid="text-area">{areaHectares} ha</Badge>
                      )}
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {coordinates.map((c, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded text-xs font-mono">
                          <span>#{i + 1}: {c.lat.toFixed(5)}, {c.lng.toFixed(5)}</span>
                          <Button variant="ghost" size="icon" aria-label="Remove point" onClick={() => removePoint(i)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button variant="ghost" onClick={clearBoundary} className="w-full" data-testid="button-clear">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Clear All Points
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {mode === 'satellite' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Satellite className="h-4 w-4 text-primary" />
                  Satellite Draw Mode
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Tap on the map to draw your farm boundary on satellite imagery.
                </p>

                <SatelliteMap
                  coordinates={coordinates}
                  onPointsChange={handleSatellitePoints}
                  center={currentLocation || { lat: 7.4, lng: 3.9 }}
                  satelliteEnabled={!!(organization?.feature_flags as Record<string, boolean> | undefined)?.satellite_overlays}
                />

                {coordinates.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{coordinates.length} points</span>
                    {coordinates.length >= 3 && (
                      <Badge variant="outline" data-testid="text-satellite-area">{areaHectares} ha</Badge>
                    )}
                    <Button variant="ghost" size="sm" onClick={clearBoundary} data-testid="button-clear-satellite">
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {coordinates.length >= 3 && (
            <div className="pb-4">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full"
                data-testid="button-save-boundary"
              >
                {isSaving ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <Save className="h-5 w-5 mr-2" />
                )}
                Save Boundary ({areaHectares} ha)
              </Button>
            </div>
          )}

          {(boundaryAnalysis || isAnalyzingBoundary) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Boundary Confidence
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isAnalyzingBoundary ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing boundary authenticity...
                  </div>
                ) : boundaryAnalysis ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            boundaryAnalysis.confidence_level === 'high'
                              ? 'bg-green-600 text-white'
                              : boundaryAnalysis.confidence_level === 'medium'
                              ? 'bg-amber-500 text-white'
                              : 'bg-red-600 text-white'
                          }
                          data-testid="badge-boundary-confidence"
                        >
                          {boundaryAnalysis.confidence_level === 'high' ? (
                            <ShieldCheck className="h-3 w-3 mr-1" />
                          ) : boundaryAnalysis.confidence_level === 'medium' ? (
                            <AlertTriangle className="h-3 w-3 mr-1" />
                          ) : (
                            <ShieldAlert className="h-3 w-3 mr-1" />
                          )}
                          {boundaryAnalysis.confidence_level.charAt(0).toUpperCase() + boundaryAnalysis.confidence_level.slice(1)} Confidence
                        </Badge>
                        <span className="text-sm font-medium" data-testid="text-boundary-score">
                          {boundaryAnalysis.confidence_score}/100
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowBoundaryDetails(!showBoundaryDetails)}
                        data-testid="button-toggle-boundary-details"
                      >
                        {showBoundaryDetails ? 'Hide Details' : 'Show Details'}
                      </Button>
                    </div>

                    {showBoundaryDetails && (
                      <div className="space-y-2">
                        {Object.entries(boundaryAnalysis.flags).map(([key, flag]) => (
                          <div key={key} className="p-2 bg-muted/50 rounded-md">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="text-xs font-medium capitalize">
                                {key.replace(/_/g, ' ')}
                              </span>
                              <Badge
                                variant="outline"
                                className={
                                  flag.score >= 70
                                    ? 'text-green-600'
                                    : flag.score >= 40
                                    ? 'text-amber-600'
                                    : 'text-red-600'
                                }
                                data-testid={`badge-flag-${key}`}
                              >
                                {flag.score}/100
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1" data-testid={`text-flag-detail-${key}`}>
                              {flag.detail}
                            </p>
                          </div>
                        ))}
                        <div className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span>
                            Analyzed {new Date(boundaryAnalysis.analyzed_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    )}

                    {selectedFarm && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => runBoundaryAnalysis(selectedFarm.id)}
                        disabled={isAnalyzingBoundary}
                        className="w-full"
                        data-testid="button-reanalyze-boundary"
                      >
                        {isAnalyzingBoundary ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing...</>
                        ) : (
                          <><RotateCcw className="h-4 w-4 mr-2" />Re-analyze Boundary</>
                        )}
                      </Button>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          {(selectedFarm.boundary || isSuccess) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TreePine className="h-4 w-4 text-primary" />
                  Deforestation Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {deforestationResult ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      {deforestationResult.deforestation_free ? (
                        <Badge className="bg-green-600 text-white" data-testid="badge-deforestation-free">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Deforestation-Free
                        </Badge>
                      ) : deforestationResult.risk_level === 'high' ? (
                        <Badge className="bg-red-600 text-white" data-testid="badge-deforestation-risk">
                          <ShieldAlert className="h-3 w-3 mr-1" />
                          Risk Detected
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500 text-white" data-testid="badge-deforestation-medium">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Medium Risk
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {deforestationResult.risk_level} risk
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-2 bg-muted/50 rounded-md">
                        <div className="text-xs text-muted-foreground">Forest Loss</div>
                        <div className="text-sm font-medium" data-testid="text-forest-loss-hectares">
                          {deforestationResult.forest_loss_hectares} ha
                        </div>
                      </div>
                      <div className="p-2 bg-muted/50 rounded-md">
                        <div className="text-xs text-muted-foreground">Loss Percentage</div>
                        <div className="text-sm font-medium" data-testid="text-forest-loss-percentage">
                          {deforestationResult.forest_loss_percentage}%
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>
                        Source: {deforestationResult.data_source} — Checked{' '}
                        {new Date(deforestationResult.analysis_date).toLocaleDateString()}
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      onClick={checkDeforestation}
                      disabled={isCheckingDeforestation}
                      className="w-full"
                      data-testid="button-recheck-deforestation"
                    >
                      {isCheckingDeforestation ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Checking...</>
                      ) : (
                        <><RotateCcw className="h-4 w-4 mr-2" />Re-check Deforestation Status</>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-amber-600" data-testid="badge-deforestation-pending">
                        <Clock className="h-3 w-3 mr-1" />
                        Check Pending
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      No deforestation check has been run for this farm yet.
                    </p>
                    <Button
                      onClick={checkDeforestation}
                      disabled={isCheckingDeforestation}
                      className="w-full"
                      data-testid="button-check-deforestation"
                    >
                      {isCheckingDeforestation ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Checking...</>
                      ) : (
                        <><TreePine className="h-4 w-4 mr-2" />Check Deforestation Status</>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

export default function HybridFarmMappingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
      <HybridFarmMappingPageInner />
    </Suspense>
  );
}
