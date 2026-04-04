/**
 * POST /api/org/kyc/verify-bank
 *
 * Calls the Paystack account resolution API to verify a Nigerian bank account.
 * Returns the account name for user confirmation before saving.
 *
 * Body:
 *   account_number: string
 *   bank_code:      string  (Paystack bank code, e.g. '058' for GTBank)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { resolveAccount } from '@/lib/payments/paystack';

const verifyBankSchema = z.object({
  account_number: z.string().min(10, 'Account number must be at least 10 digits'),
  bank_code:      z.string().min(3, 'Bank code is required'),
});

export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await getAuthenticatedProfile();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Only org admins can verify bank accounts' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = verifyBankSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', fields: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { account_number, bank_code } = parsed.data;

    const resolved = await resolveAccount({ accountNumber: account_number, bankCode: bank_code });

    return NextResponse.json({
      accountName:   resolved.accountName,
      accountNumber: resolved.accountNumber,
      bankId:        resolved.bankId,
    });
  } catch (error: any) {
    const msg: string = error?.message ?? 'Bank account verification failed';
    // Paystack returns specific error messages for invalid accounts
    if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('not found')) {
      return NextResponse.json({ error: 'Account not found. Please check the account number and bank code.' }, { status: 422 });
    }
    console.error('Bank verify error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
