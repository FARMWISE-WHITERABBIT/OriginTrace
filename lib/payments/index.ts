import { PaymentProvider } from './types';
import { MTNMoMoProvider } from './mtn-momo';
import { OpayProvider } from './opay';
import { PalmPayProvider } from './palmpay';

export type { PaymentProvider, DisbursementRequest, DisbursementResponse } from './types';

const providers: Record<string, () => PaymentProvider> = {
  mtn_momo: () => new MTNMoMoProvider(),
  opay: () => new OpayProvider(),
  palmpay: () => new PalmPayProvider(),
};

export function getPaymentProvider(name: string): PaymentProvider | null {
  const factory = providers[name];
  return factory ? factory() : null;
}

export const SUPPORTED_PROVIDERS = [
  { id: 'mtn_momo', name: 'MTN MoMo', countries: ['GH', 'CI', 'NG', 'CM', 'UG'] },
  { id: 'opay', name: 'OPay', countries: ['NG'] },
  { id: 'palmpay', name: 'PalmPay', countries: ['NG', 'GH'] },
] as const;
