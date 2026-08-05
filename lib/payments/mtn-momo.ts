import { PaymentProvider, DisbursementRequest, DisbursementResponse } from './types';

export class MTNMoMoProvider implements PaymentProvider {
  name = 'mtn_momo';

  private apiKey: string;
  private subscriptionKey: string;
  private baseUrl: string;
  private callbackUrl: string;

  constructor() {
    this.apiKey = process.env.MTN_MOMO_API_KEY || '';
    this.subscriptionKey = process.env.MTN_MOMO_SUBSCRIPTION_KEY || '';
    this.baseUrl = process.env.MTN_MOMO_BASE_URL || 'https://sandbox.momodeveloper.mtn.com';
    this.callbackUrl = process.env.MTN_MOMO_CALLBACK_URL || '';
  }

  async disburse(request: DisbursementRequest): Promise<DisbursementResponse> {
    const referenceId = crypto.randomUUID();

    try {
      const tokenRes = await fetch(`${this.baseUrl}/disbursement/token/`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.apiKey}:${this.subscriptionKey}`).toString('base64')}`,
          'Ocp-Apim-Subscription-Key': this.subscriptionKey,
        },
      });

      if (!tokenRes.ok) {
        return { provider: this.name, transactionId: referenceId, status: 'failed', message: 'Token request failed' };
      }

      const { access_token } = await tokenRes.json();

      const disbursementRes = await fetch(`${this.baseUrl}/disbursement/v1_0/transfer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'X-Reference-Id': referenceId,
          'X-Target-Environment': 'sandbox',
          'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          'Content-Type': 'application/json',
          'X-Callback-Url': this.callbackUrl,
        },
        body: JSON.stringify({
          amount: request.amount.toString(),
          currency: request.currency,
          externalId: request.reference,
          payee: { partyIdType: 'MSISDN', partyId: request.phone },
          payerMessage: request.narration || 'OriginTrace Payment',
          payeeNote: request.narration || 'OriginTrace Payment',
        }),
      });

      if (disbursementRes.status === 202) {
        return { provider: this.name, transactionId: referenceId, status: 'pending', message: 'Disbursement initiated' };
      }

      return { provider: this.name, transactionId: referenceId, status: 'failed', message: `HTTP ${disbursementRes.status}` };
    } catch (error) {
      return { provider: this.name, transactionId: referenceId, status: 'failed', message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  verifyCallback(body: any, _signature: string): boolean {
    return body && body.referenceId ? true : false;
  }
}
