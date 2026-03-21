'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sprout, Plus, X, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const inputTypes = [
  { value: 'fertilizer', label: 'Fertilizer' },
  { value: 'pesticide', label: 'Pesticide' },
  { value: 'herbicide', label: 'Herbicide' },
  { value: 'seed', label: 'Seed' },
  { value: 'organic_amendment', label: 'Organic Amendment' },
];

const units = ['kg', 'liters', 'bags', 'units'];

export default function FarmerInputsPage() {
  const [inputs, setInputs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    input_type: 'fertilizer',
    product_name: '',
    quantity: '',
    unit: 'kg',
    application_date: new Date().toISOString().split('T')[0],
    area_applied_hectares: '',
    notes: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetch('/api/farmer/inputs')
      .then(r => r.json())
      .then(d => setInputs(d.inputs || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload: any = {
        input_type: form.input_type,
        application_date: form.application_date,
      };
      if (form.product_name) payload.product_name = form.product_name;
      if (form.quantity) payload.quantity = parseFloat(form.quantity);
      if (form.unit) payload.unit = form.unit;
      if (form.area_applied_hectares) payload.area_applied_hectares = parseFloat(form.area_applied_hectares);
      if (form.notes) payload.notes = form.notes;

      const res = await fetch('/api/farmer/inputs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const { input } = await res.json();
        setInputs(prev => [input, ...prev]);
        setShowForm(false);
        setForm({ input_type: 'fertilizer', product_name: '', quantity: '', unit: 'kg', application_date: new Date().toISOString().split('T')[0], area_applied_hectares: '', notes: '' });
        toast({ title: 'Input Recorded' });
      } else {
        toast({ title: 'Error', description: 'Failed to record input', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading inputs...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2" data-testid="text-inputs-title">
          <Sprout className="h-5 w-5 text-[#2E7D6B]" />
          Agricultural Inputs
        </h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)} data-testid="button-add-input">
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>

      {showForm && (
        <Card className="border-[#2E7D6B]/30">
          <CardContent className="py-4 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Input Type</Label>
              <Select value={form.input_type} onValueChange={v => setForm(f => ({ ...f, input_type: v }))}>
                <SelectTrigger data-testid="select-input-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {inputTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Product Name</Label>
              <Input value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))} placeholder="e.g. NPK 15-15-15" data-testid="input-product-name" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Quantity</Label>
                <Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0" data-testid="input-quantity" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Unit</Label>
                <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
                  <SelectTrigger data-testid="select-unit"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={form.application_date} onChange={e => setForm(f => ({ ...f, application_date: e.target.value }))} data-testid="input-date" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Area (ha)</Label>
                <Input type="number" step="0.1" value={form.area_applied_hectares} onChange={e => setForm(f => ({ ...f, area_applied_hectares: e.target.value }))} placeholder="0" data-testid="input-area" />
              </div>
            </div>
            <Button className="w-full" onClick={handleSubmit} disabled={submitting} data-testid="button-submit-input">
              {submitting ? 'Saving...' : 'Record Input'}
            </Button>
          </CardContent>
        </Card>
      )}

      {inputs.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <Sprout className="h-10 w-10 text-muted-foreground mx-auto" />
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Sprout className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-sm">No inputs recorded yet</p>
            <p className="text-xs text-muted-foreground mt-1">Log fertilizers, pesticides, and other inputs using the form above.</p>
          </div>
          <p className="text-xs text-muted-foreground">Tap + to record fertilizer, pesticide, or seed usage.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {inputs.map(input => (
            <Card key={input.id} data-testid={`input-record-${input.id}`}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="capitalize text-xs">{input.input_type?.replace(/_/g, ' ')}</Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {input.application_date ? new Date(input.application_date).toLocaleDateString() : '—'}
                  </span>
                </div>
                {input.product_name && <div className="font-medium text-sm">{input.product_name}</div>}
                <div className="text-xs text-muted-foreground mt-1">
                  {input.quantity && `${input.quantity} ${input.unit || ''}`}
                  {input.area_applied_hectares && ` on ${input.area_applied_hectares} ha`}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
