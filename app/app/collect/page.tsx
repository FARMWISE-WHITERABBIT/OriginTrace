'use client';

import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { useCollectionLogic } from './components/use-collection-logic';
import { CollectionStepper } from './components/collection-stepper';
import { CollectionSuccess } from './components/collection-success';
import { Step1BatchIdentity } from './components/step1-batch-identity';
import { Step2Contributors } from './components/step2-contributors';
import { Step3FarmSelection } from './components/step3-farm-selection';
import { Step4InventoryLog } from './components/step4-inventory-log';
import { Step5ComplianceReview } from './components/step5-compliance-review';
import { Step6FinalSummary } from './components/step6-final-summary';

export default function SmartCollectPage() {
  const logic = useCollectionLogic();
  const { step, setStep, showSuccess, isSaving, canProceed, handleFinalize, complianceScore, hasBlockingIssues } = logic;

  if (showSuccess) {
    return <CollectionSuccess logic={logic} />;
  }

  return (
    <div className="space-y-4 pb-28 lg:pb-4">
      <CollectionStepper step={step} setStep={setStep} />

      {step === 1 && <Step1BatchIdentity logic={logic} />}
      {step === 2 && <Step2Contributors logic={logic} />}
      {step === 3 && <Step3FarmSelection logic={logic} />}
      {step === 4 && <Step4InventoryLog logic={logic} />}
      {step === 5 && <Step5ComplianceReview logic={logic} />}
      {step === 6 && <Step6FinalSummary logic={logic} />}

      <div className="hidden lg:flex gap-3 justify-end pt-2">
        {step > 1 && (
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            data-testid="button-prev-desktop"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        )}
        {step < 6 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            data-testid="button-next"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleFinalize}
            disabled={isSaving || !canProceed()}
            data-testid="button-finalize"
          >
            {isSaving ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : complianceScore < 100 || hasBlockingIssues ? (
              <AlertTriangle className="h-5 w-5 mr-2" />
            ) : (
              <CheckCircle className="h-5 w-5 mr-2" />
            )}
            {complianceScore < 100 || hasBlockingIssues ? `Blocked (${complianceScore}%)` : 'Complete Batch'}
          </Button>
        )}
      </div>

      <div className="fixed bottom-16 left-0 right-0 bg-card border-t px-4 py-3 z-40 lg:hidden">
        <div className="flex gap-3">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              data-testid="button-prev"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
          {step < 6 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="flex-1"
              data-testid="button-next-mobile"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleFinalize}
              disabled={isSaving || !canProceed()}
              className="flex-1"
              data-testid="button-finalize-mobile"
            >
              {isSaving ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : complianceScore < 100 || hasBlockingIssues ? (
                <AlertTriangle className="h-5 w-5 mr-2" />
              ) : (
                <CheckCircle className="h-5 w-5 mr-2" />
              )}
              {complianceScore < 100 || hasBlockingIssues ? `Blocked (${complianceScore}%)` : 'Complete Batch'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
