'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Phone, MapPin, Award, GraduationCap, QrCode, Fingerprint } from 'lucide-react';

export default function FarmerProfilePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/farmer')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading profile...</div>;
  }

  if (!data?.farm) {
    return <div className="text-center py-12 text-muted-foreground">Profile not available.</div>;
  }

  const farm = data.farm;
  const account = data.account;
  const completedTraining = (data.training || []).filter((t: any) => t.status === 'completed').length;
  const totalTraining = (data.training || []).length;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2" data-testid="text-profile-title">
        <User className="h-5 w-5 text-[#2E7D6B]" />
        Digital Identity
      </h2>

      <Card className="border-[#2E7D6B]/20">
        <CardContent className="py-4 space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-[#2E7D6B]/10 rounded-full flex items-center justify-center mx-auto mb-2">
              <Fingerprint className="h-8 w-8 text-[#2E7D6B]" />
            </div>
            <h3 className="text-lg font-bold" data-testid="text-farmer-name">{farm.farmer_name}</h3>
            {account?.farmer_code && (
              <p className="text-sm text-muted-foreground font-mono" data-testid="text-farmer-code">ID: {account.farmer_code}</p>
            )}
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-muted-foreground text-xs">Phone</div>
                <div className="font-medium" data-testid="text-phone">{account?.phone || farm.phone || '—'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-muted-foreground text-xs">Community</div>
                <div className="font-medium" data-testid="text-community">{farm.community || '—'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-muted-foreground text-xs">Farm Area</div>
                <div className="font-medium">{farm.area_hectares ? `${farm.area_hectares} hectares` : '—'}</div>
              </div>
            </div>
            {farm.boundary && (
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <MapPin className="h-4 w-4 text-green-600" />
                <div>
                  <div className="text-green-800 font-medium text-xs">GPS Boundary Verified</div>
                  <div className="text-green-600 text-xs">{farm.boundary.coordinates?.[0]?.length || 0} coordinate points</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {data.certifications?.length > 0 && (
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
                <div key={cert.id} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm" data-testid={`cert-${cert.id}`}>
                  <div>
                    <div className="font-medium capitalize">{cert.certification_body?.replace(/_/g, ' ')}</div>
                    {cert.certificate_number && <div className="text-xs text-muted-foreground">#{cert.certificate_number}</div>}
                  </div>
                  <div className="text-right">
                    <Badge variant={cert.status === 'active' ? 'default' : 'secondary'} className="text-xs">{cert.status}</Badge>
                    {cert.expiry_date && <div className="text-xs text-muted-foreground mt-1">Exp: {new Date(cert.expiry_date).toLocaleDateString()}</div>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-[#2E7D6B]" />
            Training Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          {totalTraining > 0 ? (
            <div className="text-center py-2">
              <div className="text-2xl font-bold text-[#2E7D6B]" data-testid="text-training-completed">{completedTraining}/{totalTraining}</div>
              <div className="text-xs text-muted-foreground">Modules Completed</div>
              <div className="w-full bg-muted rounded-full h-2 mt-2">
                <div className="bg-[#2E7D6B] h-2 rounded-full transition-all" style={{ width: `${(completedTraining / totalTraining) * 100}%` }} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-6 text-center">
              <p className="text-sm font-medium">No training assigned yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">Check the Training tab for full details.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="py-4 text-center space-y-2">
          <QrCode className="h-12 w-12 text-[#2E7D6B] mx-auto" />
          <p className="text-sm font-medium">Verified Farmer Identity</p>
          <p className="text-xs text-muted-foreground">
            Scan to verify: {farm.farmer_name} — {data.organization?.name || 'OriginTrace'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
