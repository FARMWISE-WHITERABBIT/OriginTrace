'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Banknote, Calendar, Smartphone, CreditCard } from 'lucide-react';

const methodIcons: Record<string, any> = {
  mobile_money: Smartphone,
  bank_transfer: CreditCard,
  cash: Banknote,
  cheque: CreditCard,
};

export default function FarmerPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/farmer')
      .then(r => r.json())
      .then(d => setPayments(d.payments || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading payments...</div>;
  }

  const totalReceived = payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + (p.amount || 0), 0);
  const currency = payments[0]?.currency || 'NGN';

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2" data-testid="text-payments-title">
        <Banknote className="h-5 w-5 text-[#2E7D6B]" />
        My Payments
      </h2>

      <Card className="bg-[#2E7D6B]/5 border-[#2E7D6B]/20">
        <CardContent className="py-3 flex justify-between items-center">
          <span className="text-sm text-[#1F5F52] font-medium">Total Received</span>
          <span className="text-lg font-bold text-[#1F5F52]" data-testid="text-total-received">
            {currency} {totalReceived.toLocaleString()}
          </span>
        </CardContent>
      </Card>

      {payments.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">No payments recorded yet.</p>
      ) : (
        <div className="space-y-3">
          {payments.map(payment => {
            const MethodIcon = methodIcons[payment.payment_method] || Banknote;
            return (
              <Card key={payment.id} data-testid={`payment-${payment.id}`}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MethodIcon className="h-4 w-4 text-[#2E7D6B]" />
                      <span className="font-medium text-sm capitalize">{payment.payment_method?.replace(/_/g, ' ')}</span>
                    </div>
                    <Badge variant={payment.status === 'completed' ? 'default' : payment.status === 'pending' ? 'secondary' : 'destructive'} className="text-xs">
                      {payment.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">{payment.currency} {payment.amount?.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  {payment.reference_number && (
                    <div className="text-xs text-muted-foreground mt-1">Ref: {payment.reference_number}</div>
                  )}
                  {payment.notes && (
                    <div className="text-xs text-muted-foreground mt-1">{payment.notes}</div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
