import { PaymentProvider, DisbursementRequest, DisbursementResponse } from './types';

export class OpayProvider implements PaymentProvider {
  name = 'opay';

  private merchantId: string;
  private secretKey: string;
  private baseUrl: string;

  constructor() {
    this.merchantId = process.env.OPAY_MERCHANT_ID || '';
    this.secretKey = process.env.OPAY_SECRET_KEY || '';
    this.baseUrl = process.env.OPAY_BASE_URL || 'https://sandboxapi.opaycheckout.com';
  }

  async disburse(request: DisbursementRequest): Promise<DisbursementResponse> {
    const referenceId = `OPAY-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    try {
      const res = await fetch(`${this.baseUrl}/api/v3/transfer/toWallet`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'MerchantId': this.merchantId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: { total: Math.round(request.amount * 100), currency: request.currency },
          receiver: { name: 'Farmer', phoneNumber: request.phone, type: 'USER' },
          reference: request.reference,
          remark: request.narration || 'OriginTrace Payment',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return {
          provider: this.name,
          transactionId: data.data?.reference || referenceId,
          status: data.data?.status === 'SUCCESS' ? 'completed' : 'pending',
          message: data.message,
        };
      }

      return { provider: this.name, transactionId: referenceId, status: 'failed', message: `HTTP ${res.status}` };
    } catch (error) {
      return { provider: this.name, transactionId: referenceId, status: 'failed', message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  verifyCallback(body: any, _signature: string): boolean {
    return body && body.reference ? true : false;
  }
}
