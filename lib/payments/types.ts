export interface DisbursementRequest {
  phone: string;
  amount: number;
  currency: string;
  reference: string;
  narration?: string;
}

export interface DisbursementResponse {
  provider: string;
  transactionId: string;
  status: 'pending' | 'completed' | 'failed';
  message?: string;
}

export interface PaymentProvider {
  name: string;
  disburse(request: DisbursementRequest): Promise<DisbursementResponse>;
  verifyCallback(body: any, signature: string): boolean;
}
