import { PaymentProvider, DisbursementRequest, DisbursementResponse } from './types';

export class PalmPayProvider implements PaymentProvider {
  name = 'palmpay';

  private appId: string;
  private secretKey: string;
  private baseUrl: string;

  constructor() {
    this.appId = process.env.PALMPAY_APP_ID || '';
    this.secretKey = process.env.PALMPAY_SECRET_KEY || '';
    this.baseUrl = process.env.PALMPAY_BASE_URL || 'https://open-api-sandbox.palmpay-inc.com';
  }

  async disburse(request: DisbursementRequest): Promise<DisbursementResponse> {
    const referenceId = `PP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    try {
      const res = await fetch(`${this.baseUrl}/api/v2/transfer/payout`, {
        method: 'POST',
        headers: {
          'Authorization': this.secretKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appId: this.appId,
          amount: Math.round(request.amount * 100),
          currency: request.currency,
          orderNo: request.reference,
          customerPhone: request.phone,
          remark: request.narration || 'OriginTrace Payment',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return {
          provider: this.name,
          transactionId: data.data?.orderNo || referenceId,
          status: data.respCode === '00000' ? 'completed' : 'pending',
          message: data.respMsg,
        };
      }

      return { provider: this.name, transactionId: referenceId, status: 'failed', message: `HTTP ${res.status}` };
    } catch (error) {
      return { provider: this.name, transactionId: referenceId, status: 'failed', message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  verifyCallback(body: any, _signature: string): boolean {
    return body && body.orderNo ? true : false;
  }
}
