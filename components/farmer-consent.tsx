'use client';

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SignaturePadComponent } from '@/components/signature-pad';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, FileSignature, Shield } from 'lucide-react';

interface FarmerConsentProps {
  onConsentComplete: (consentData: { 
    hasConsent: boolean; 
    signature?: string;
    timestamp: string;
  }) => void;
  requireSignature?: boolean;
  farmerName?: string;
}

export function FarmerConsent({ 
  onConsentComplete, 
  requireSignature = false,
  farmerName = 'the farmer'
}: FarmerConsentProps) {
  const [gpsConsent, setGpsConsent] = useState(false);
  const [dataConsent, setDataConsent] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);

  const allConsentsGiven = gpsConsent && dataConsent;

  const handleComplete = () => {
    if (requireSignature && !signature) {
      setShowSignature(true);
      return;
    }

    onConsentComplete({
      hasConsent: true,
      signature: signature || undefined,
      timestamp: new Date().toISOString()
    });
  };

  const handleSignatureSave = (signatureData: string) => {
    setSignature(signatureData);
    setShowSignature(false);
    
    onConsentComplete({
      hasConsent: true,
      signature: signatureData,
      timestamp: new Date().toISOString()
    });
  };

  if (showSignature) {
    return (
      <SignaturePadComponent
        title="Farmer Signature"
        description={`${farmerName} must sign to confirm consent`}
        onSave={handleSignatureSave}
        onCancel={() => setShowSignature(false)}
      />
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-primary" />
          Farmer Consent
        </CardTitle>
        <CardDescription>
          Required for EUDR compliance and data protection
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
            <Checkbox
              id="gps-consent"
              checked={gpsConsent}
              onCheckedChange={(checked) => setGpsConsent(checked === true)}
              data-testid="checkbox-gps-consent"
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="gps-consent" className="cursor-pointer font-medium">
                GPS Mapping Consent
              </Label>
              <p className="text-sm text-muted-foreground">
                I confirm {farmerName} has consented to GPS mapping of their farm boundaries.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
            <Checkbox
              id="data-consent"
              checked={dataConsent}
              onCheckedChange={(checked) => setDataConsent(checked === true)}
              data-testid="checkbox-data-consent"
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="data-consent" className="cursor-pointer font-medium">
                Data Sharing Consent
              </Label>
              <p className="text-sm text-muted-foreground">
                I confirm {farmerName} has consented to data sharing for EUDR compliance and traceability purposes.
              </p>
            </div>
          </div>
        </div>

        {signature && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700 dark:text-green-400">Signature captured</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          {requireSignature && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowSignature(true)}
              disabled={!allConsentsGiven}
              className="w-full sm:w-auto"
              data-testid="button-add-signature"
            >
              <FileSignature className="h-4 w-4 mr-1" />
              {signature ? 'Re-sign' : 'Add Signature'}
            </Button>
          )}
          <Button
            type="button"
            onClick={handleComplete}
            disabled={!allConsentsGiven || (requireSignature && !signature)}
            className="w-full sm:flex-1"
            data-testid="button-confirm-consent"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Confirm Consent
          </Button>
        </div>

        {!allConsentsGiven && (
          <p className="text-xs text-muted-foreground text-center">
            Both consent checkboxes must be checked to proceed
          </p>
        )}
      </CardContent>
    </Card>
  );
}
