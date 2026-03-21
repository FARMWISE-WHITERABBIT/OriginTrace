'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOrg } from '@/lib/contexts/org-context';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOnlineStatus } from '@/components/online-status';
import {
  getCachedLocations,
  cacheLocations,
} from '@/lib/offline/offline-cache';
import { FarmerConsent } from '@/components/farmer-consent';
import {
  User,
  Phone,
  MapPin,
  Loader2,
  CheckCircle,
  Save,
  Camera,
  FileText,
  AlertTriangle,
  Upload,
  X,
  ImageIcon,
  Shield,
} from 'lucide-react';
import { useRef } from 'react';
import Link from 'next/link';
import { OCRCapture } from '@/components/ocr-capture';

interface LocationState { id: number; name: string; }
interface LocationLGA { id: number; name: string; state_id: number; }
interface LocationVillage { id: number; name: string; lga_id: number; }

export default function FarmerRegistrationPage() {
  const router = useRouter();
  const { organization, profile, isLoading: orgLoading } = useOrg();
  const { toast } = useToast();
  const supabase = createClient();
  const isOnline = useOnlineStatus();
  const [commodityList, setCommodityList] = useState<{name: string; slug: string}[]>([]);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [commodity, setCommodity] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedLGA, setSelectedLGA] = useState('');
  const [community, setCommunity] = useState('');
  const [communityMode, setCommunityMode] = useState<'select' | 'manual'>('select');
  const [hasConsent, setHasConsent] = useState(false);
  const [consentData, setConsentData] = useState<{ hasConsent: boolean; signature?: string; timestamp: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [farmerPhoto, setFarmerPhoto] = useState<File | null>(null);
  const [farmerPhotoPreview, setFarmerPhotoPreview] = useState<string | null>(null);
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [idDocPreview, setIdDocPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const idInputRef = useRef<HTMLInputElement>(null);
  const [complianceData, setComplianceData] = useState<Record<string, boolean | string>>({});
  const [showOcr, setShowOcr] = useState(true);

  const [states, setStates] = useState<LocationState[]>([]);
  const [lgas, setLgas] = useState<LocationLGA[]>([]);
  const [villages, setVillages] = useState<LocationVillage[]>([]);
  const [locLoading, setLocLoading] = useState(true);

  useEffect(() => {
    // Fetch commodities from master
    fetch('/api/commodities')
      .then(r => r.ok ? r.json() : { commodities: [] })
      .then(d => setCommodityList((d.commodities || []).map((c: any) => ({ name: c.name, slug: c.slug }))))
      .catch(() => {});

    async function loadLocations() {
      const cached = await getCachedLocations();
      if (cached) {
        setStates(cached.states || []);
        setLgas(cached.lgas || []);
        setVillages(cached.villages || []);
        setLocLoading(false);
      }
      if (isOnline) {
        try {
          const res = await fetch('/api/locations?all=true');
          if (res.ok) {
            const data = await res.json();
            setStates(data.states || []);
            setLgas(data.lgas || []);
            setVillages(data.villages || []);
            await cacheLocations(data.states || [], data.lgas || [], data.villages || []);
          }
        } catch {}
      }
      setLocLoading(false);
    }
    loadLocations();
  }, [isOnline]);

  const filteredLGAs = selectedState
    ? lgas.filter(l => {
        const stateObj = states.find(s => s.name === selectedState);
        return stateObj ? l.state_id === stateObj.id : false;
      })
    : [];

  const filteredVillages = selectedLGA
    ? villages.filter(v => {
        const lgaObj = lgas.find(l => l.name === selectedLGA);
        return lgaObj ? v.lga_id === lgaObj.id : false;
      })
    : [];

  const computeKycStatus = () => {
    if (!fullName.trim() || !selectedState || !selectedLGA || !community.trim() || !hasConsent) return 'incomplete';
    if (farmerPhoto && idDocument && phone) return 'verified';
    if (!phone) return 'basic';
    return 'basic';
  };

  const handleFileSelect = (file: File, type: 'photo' | 'id') => {
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: 'File too large', description: 'Maximum file size is 5MB.', variant: 'destructive' });
      return;
    }
    const url = URL.createObjectURL(file);
    if (type === 'photo') {
      setFarmerPhoto(file);
      setFarmerPhotoPreview(url);
    } else {
      setIdDocument(file);
      setIdDocPreview(url);
    }
  };

  const uploadKycFile = async (farmId: string, file: File, fileType: string) => {
    if (!organization || !supabase) return null;
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `kyc/${organization.id}/${farmId}/${fileType}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('compliance-files')
      .upload(path, file, { upsert: true });
    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }
    const { data: urlData } = supabase.storage
      .from('compliance-files')
      .getPublicUrl(path);
    return urlData?.publicUrl || path;
  };

  const canSave = fullName.trim().length >= 2 && selectedState && selectedLGA && community.trim() && hasConsent;
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSave = async () => {
    // Validate fields inline before submitting
    const errs: Record<string, string> = {};
    if (!fullName.trim() || fullName.trim().length < 2) errs.fullName = 'Full name must be at least 2 characters';
    if (!selectedState) errs.state = 'State is required';
    if (!selectedLGA) errs.lga = 'LGA is required';
    if (!community.trim()) errs.community = 'Community is required';
    if (!hasConsent) errs.consent = 'Farmer consent is required';
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setIsSaving(true);

    try {
      if (isOnline && organization && profile) {
        // Route through API layer for audit logging, webhook dispatch, and role enforcement
        const farmRes = await fetch('/api/farms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            farmer_name: fullName.trim(),
            phone_number: phone || null,
            commodity: commodity || null,
            community: community || selectedLGA || selectedState,
            state: selectedState,
            lga: selectedLGA || null,
            compliance_status: 'pending',
            kyc_status: computeKycStatus(),
            consent_data: consentData ? {
              has_consent: consentData.hasConsent,
              signature: consentData.signature,
              timestamp: consentData.timestamp,
            } : null,
          }),
        });
        if (!farmRes.ok) {
          const err = await farmRes.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to create farm');
        }
        const data: { id: string } | null = await farmRes.json().then(r => r.farm ?? r.data ?? null);
        const error = null;

        if (error) throw error;

        if (data?.id && Object.keys(complianceData).length > 0) {
          await fetch('/api/compliance-files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              farm_id: data.id,
              file_type: 'compliance_attestation',
              file_url: JSON.stringify(complianceData),
              verification_status: 'pending',
            }),
          });
        }

        if (data?.id && (farmerPhoto || idDocument)) {
          const farmId = String(data.id);
          if (farmerPhoto) {
            const photoUrl = await uploadKycFile(farmId, farmerPhoto, 'farmer_photo');
            if (photoUrl) {
              await fetch('/api/compliance-files', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  farm_id: data.id,
                  file_type: 'farmer_photo',
                  file_url: photoUrl,
                  verification_status: 'pending',
                }),
              });
            }
          }
          if (idDocument) {
            const idUrl = await uploadKycFile(farmId, idDocument, 'id_document');
            if (idUrl) {
              await fetch('/api/compliance-files', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  farm_id: data.id,
                  file_type: 'id_document',
                  file_url: idUrl,
                  verification_status: 'pending',
                }),
              });
            }
          }
        }

        toast({ title: 'Farmer Registered', description: `${fullName} has been registered successfully.` });
        setIsSuccess(true);
      } else {
        const { getCachedFarms, cacheFarms } = await import('@/lib/offline/sync-store');
        const existingFarms = await getCachedFarms();
        const offlineFarm = {
          id: `offline-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          farmer_name: fullName.trim(),
          community: community || selectedLGA || selectedState,
          commodity: commodity || null,
          compliance_status: 'pending',
        };
        await cacheFarms([...existingFarms, offlineFarm]);
        toast({ title: 'Saved Offline', description: `${fullName} will be synced when online.` });
        setIsSuccess(true);
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast({ title: 'Error', description: 'Failed to register farmer. Please try again.', variant: 'destructive' });
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
        <h2 className="text-2xl font-bold">Farmer Registered</h2>
        <p className="text-muted-foreground">{fullName} has been added to the system.</p>
        <div className="space-y-3">
          <Button onClick={() => { setIsSuccess(false); setFullName(''); setPhone(''); setCommodity(''); setCommunity(''); setCommunityMode('select'); setHasConsent(false); setConsentData(null); setFarmerPhoto(null); setFarmerPhotoPreview(null); setIdDocument(null); setIdDocPreview(null); }} className="w-full" data-testid="button-register-another">
            Register Another Farmer
          </Button>
          <Link href="/app/farms/map" className="block">
            <Button variant="outline" className="w-full" data-testid="button-map-farm">
              <MapPin className="h-4 w-4 mr-2" />
              Map This Farmer's Farm
            </Button>
          </Link>
          <Link href="/app" className="block">
            <Button variant="ghost" className="w-full" data-testid="button-back-dashboard">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold" data-testid="text-page-title">Register Farmer</h1>
        <p className="text-sm text-muted-foreground">Add a new farmer to your organization</p>
      </div>

      {showOcr && (
        <OCRCapture
          onResult={(result) => {
            if (result.farmerName) setFullName(result.farmerName);
            setShowOcr(false);
            toast({
              title: 'ID scanned successfully',
              description: `Extracted: ${result.farmerName || 'name'}${result.idNumber ? ` • ${result.idNumber}` : ''}`,
            });
          }}
          onCancel={() => setShowOcr(false)}
        />
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Personal Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); if (fieldErrors.fullName) setFieldErrors(fe => ({ ...fe, fullName: '' })); }}
                placeholder="Enter farmer's full name"
                className={fieldErrors.fullName ? 'border-destructive focus-visible:ring-destructive' : ''}
                aria-describedby={fieldErrors.fullName ? 'err-fullName' : undefined}
                data-testid="input-full-name"
              />
              {fieldErrors.fullName && <p id="err-fullName" className="text-xs text-destructive mt-1" role="alert">{fieldErrors.fullName}</p>}
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="08012345678"
                  type="tel"
                  className="pl-9"
                  data-testid="input-phone"
                />
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Primary Commodity</Label>
              <Select value={commodity} onValueChange={setCommodity}>
                <SelectTrigger data-testid="select-commodity">
                  <SelectValue placeholder="Select crop / commodity" />
                </SelectTrigger>
                <SelectContent>
                  {commodityList.length > 0
                    ? commodityList.map(c => (
                        <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
                      ))
                    : (
                      <>
                        <SelectItem value="cocoa">Cocoa</SelectItem>
                        <SelectItem value="cashew">Cashew</SelectItem>
                        <SelectItem value="ginger">Ginger</SelectItem>
                        <SelectItem value="sesame">Sesame</SelectItem>
                        <SelectItem value="hibiscus">Hibiscus</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </>
                    )
                  }
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>State *</Label>
            {locLoading ? (
              <div className="flex items-center gap-2 p-3 border rounded-md">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading...</span>
              </div>
            ) : (
              <select
                value={selectedState}
                onChange={(e) => { setSelectedState(e.target.value); setSelectedLGA(''); setCommunity(''); setCommunityMode('select'); if (fieldErrors.state) setFieldErrors(fe => ({ ...fe, state: '' })); }}
                className={`w-full h-9 px-3 border rounded-md bg-background text-sm ${fieldErrors.state ? 'border-destructive' : ''}`}
                aria-describedby={fieldErrors.state ? 'err-state' : undefined}
                data-testid="select-state"
              >
                <option value="">Select State</option>
                {states.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            )}
            {fieldErrors.state && <p id="err-state" className="text-xs text-destructive mt-1" role="alert">{fieldErrors.state}</p>}
          </div>

          <div className="space-y-2">
            <Label>LGA *</Label>
            <select
              value={selectedLGA}
              onChange={(e) => { setSelectedLGA(e.target.value); setCommunity(''); setCommunityMode('select'); if (fieldErrors.lga) setFieldErrors(fe => ({ ...fe, lga: '' })); }}
              disabled={!selectedState}
              className={`w-full h-9 px-3 border rounded-md bg-background text-sm disabled:opacity-50 ${fieldErrors.lga ? 'border-destructive' : ''}`}
              aria-describedby={fieldErrors.lga ? 'err-lga' : undefined}
              data-testid="select-lga"
            >
              <option value="">Select LGA</option>
              {filteredLGAs.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
            </select>
            {fieldErrors.lga && <p id="err-lga" className="text-xs text-destructive mt-1" role="alert">{fieldErrors.lga}</p>}
          </div>

          <div className="space-y-2">
            <Label>Community / Village *</Label>
            {filteredVillages.length > 0 && communityMode === 'select' ? (
              <div className="space-y-2">
                <select
                  value={community}
                  onChange={(e) => {
                    if (e.target.value === '__other__') {
                      setCommunityMode('manual');
                      setCommunity('');
                    } else {
                      setCommunity(e.target.value);
                    }
                  }}
                  className="w-full h-9 px-3 border rounded-md bg-background text-sm"
                  data-testid="select-community"
                >
                  <option value="">Select Community</option>
                  {filteredVillages.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                  <option value="__other__">Other (type manually)</option>
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  value={community}
                  onChange={(e) => { setCommunity(e.target.value); if (fieldErrors.community) setFieldErrors(fe => ({ ...fe, community: '' })); }}
                  placeholder="Enter community name"
                  className={fieldErrors.community ? 'border-destructive focus-visible:ring-destructive' : ''}
                  aria-describedby={fieldErrors.community ? 'err-community' : undefined}
                  data-testid="input-community"
                />
                {filteredVillages.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { setCommunityMode('select'); setCommunity(''); }}
                    data-testid="button-back-to-list"
                  >
                    Back to list
                  </Button>
                )}
              </div>
            )}
          </div>
          </div>{/* end grid */}
        </CardContent>
      </Card>

      {hasConsent ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg" data-testid="status-consent-captured">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-green-700 dark:text-green-400" data-testid="text-consent-status">Consent captured</div>
                <div className="text-xs text-green-600 dark:text-green-500" data-testid="text-consent-type">
                  {consentData?.signature ? 'With digital signature' : 'Verbal consent'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <FarmerConsent
          farmerName={fullName || 'the farmer'}
          requireSignature={true}
          onConsentComplete={(data) => {
            setConsentData(data);
            setHasConsent(true);
          }}
        />
      )}

      {(() => {
        const s = (organization?.settings || {}) as Record<string, boolean>;
        const hasOrganic = !!s.organic_certification_tracking;
        const hasCS3D = !!(s.cs3d_human_rights_assessment || s.cs3d_supplier_due_diligence);
        const hasRA = !!s.ra_certification;
        const hasFT = !!s.ft_certification;
        if (!hasOrganic && !hasCS3D && !hasRA && !hasFT) return null;
        return (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Compliance Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasOrganic && (
                <div className="space-y-2 p-3 rounded-md border bg-muted/20">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Label className="text-sm font-medium">Organic Certification</Label>
                    <Badge variant="outline" className="text-xs">EU Organic</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Upload valid organic certificate for this farmer/farm</p>
                  <Input type="file" accept="image/*,.pdf" data-testid="input-organic-cert" className="text-sm" />
                </div>
              )}
              {hasCS3D && (
                <div className="space-y-2 p-3 rounded-md border bg-muted/20">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Label className="text-sm font-medium">Human Rights & Due Diligence</Label>
                    <Badge variant="outline" className="text-xs">CS3D</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Confirm labor conditions and environmental assessment for this supplier</p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="rounded" data-testid="check-no-child-labor" checked={!!complianceData.no_child_labor} onChange={(e) => setComplianceData(prev => ({...prev, no_child_labor: e.target.checked}))} />
                      No child labor or forced labor observed
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="rounded" data-testid="check-fair-wages" checked={!!complianceData.fair_wages} onChange={(e) => setComplianceData(prev => ({...prev, fair_wages: e.target.checked}))} />
                      Fair wages and working conditions confirmed
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="rounded" data-testid="check-env-impact" checked={!!complianceData.env_impact} onChange={(e) => setComplianceData(prev => ({...prev, env_impact: e.target.checked}))} />
                      Environmental impact assessment completed
                    </label>
                  </div>
                </div>
              )}
              {hasRA && (
                <div className="space-y-2 p-3 rounded-md border bg-muted/20">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Label className="text-sm font-medium">Rainforest Alliance Certificate</Label>
                    <Badge variant="outline" className="text-xs">RA</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Upload RA certificate or group membership document</p>
                  <Input type="file" accept="image/*,.pdf" data-testid="input-ra-cert" className="text-sm" />
                </div>
              )}
              {hasFT && (
                <div className="space-y-2 p-3 rounded-md border bg-muted/20">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Label className="text-sm font-medium">Fairtrade Certification</Label>
                    <Badge variant="outline" className="text-xs">FT</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Upload Fairtrade certification or cooperative membership</p>
                  <Input type="file" accept="image/*,.pdf" data-testid="input-ft-cert" className="text-sm" />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            KYC Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0], 'photo'); }}
            data-testid="input-farmer-photo"
          />
          <div className="space-y-2">
            <Label className="text-sm">Farmer Photo</Label>
            {farmerPhotoPreview ? (
              <div className="relative w-full h-32 rounded-md overflow-hidden border">
                <img src={farmerPhotoPreview} alt="Farmer" className="w-full h-full object-cover" />
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={() => { setFarmerPhoto(null); setFarmerPhotoPreview(null); if (photoInputRef.current) photoInputRef.current.value = ''; }}
                  data-testid="button-remove-photo"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => photoInputRef.current?.click()}
                data-testid="button-capture-photo"
              >
                <Camera className="h-4 w-4 mr-2" />
                Capture / Upload Photo
              </Button>
            )}
          </div>

          <input
            ref={idInputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0], 'id'); }}
            data-testid="input-id-document"
          />
          <div className="space-y-2">
            <Label className="text-sm">ID Document</Label>
            {idDocPreview ? (
              <div className="relative w-full h-32 rounded-md overflow-hidden border">
                {idDocument?.type === 'application/pdf' ? (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">{idDocument.name}</span>
                  </div>
                ) : (
                  <img src={idDocPreview} alt="ID" className="w-full h-full object-cover" />
                )}
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={() => { setIdDocument(null); setIdDocPreview(null); if (idInputRef.current) idInputRef.current.value = ''; }}
                  data-testid="button-remove-id"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => idInputRef.current?.click()}
                data-testid="button-upload-id"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload ID Document
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Upload a farmer photo and ID document (max 5MB each). Files are stored securely and reviewed by an admin.
          </p>
        </CardContent>
      </Card>

      {!isOnline && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          You are offline. Farmer will be saved locally.
        </div>
      )}

      <div className="pb-4">
        <Button
          onClick={handleSave}
          disabled={!canSave || isSaving}
          className="w-full"
          data-testid="button-save-farmer"
        >
          {isSaving ? (
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
          ) : (
            <Save className="h-5 w-5 mr-2" />
          )}
          Save & Continue
        </Button>
      </div>
    </div>
  );
}
