'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Sprout, Plus, Calendar, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';
import { useApiResource } from '@/hooks/use-api-resource';

const emptyForm = () => ({
  input_type: 'fertilizer', product_name: '', quantity: '', unit: 'kg',
  application_date: new Date().toISOString().split('T')[0], area_applied_hectares: '', notes: '',
});

export default function FarmerInputsPage() {
  const t = useTranslations('farmer');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const { toast } = useToast();

  const inputTypes = [
    { value: 'fertilizer', label: t('inputFertilizer') },
    { value: 'pesticide', label: t('inputPesticide') },
    { value: 'herbicide', label: t('inputHerbicide') },
    { value: 'seed', label: t('inputSeed') },
    { value: 'organic_amendment', label: t('inputOrganicAmendment') },
  ];
  const units = ['kg', 'liters', 'bags', 'units'];

  const { data, loading, error, refetch, setData } = useApiResource<{ inputs: any[] }>('/api/farmer/inputs');
  const inputs = data?.inputs || [];

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openCreate = () => { setEditingId(null); setForm(emptyForm()); setShowForm(true); };
  const openEdit = (input: any) => {
    setEditingId(input.id);
    setForm({
      input_type: input.input_type || 'fertilizer',
      product_name: input.product_name || '',
      quantity: input.quantity?.toString() || '',
      unit: input.unit || 'kg',
      application_date: input.application_date?.split('T')[0] || new Date().toISOString().split('T')[0],
      area_applied_hectares: input.area_applied_hectares?.toString() || '',
      notes: input.notes || '',
    });
    setShowForm(true);
  };

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

      const url = editingId ? `/api/farmer/inputs/${editingId}` : '/api/farmer/inputs';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

      if (res.ok) {
        const resData = await res.json();
        const updated = resData.input;
        if (editingId) {
          setData(prev => (prev ? { inputs: prev.inputs.map(i => i.id === editingId ? updated : i) } : prev));
          toast({ title: t('inputUpdatedToast') });
        } else {
          setData(prev => (prev ? { inputs: [updated, ...prev.inputs] } : { inputs: [updated] }));
          toast({ title: t('inputRecordedToast') });
        }
        setShowForm(false); setEditingId(null); setForm(emptyForm());
      } else {
        toast({ title: tErrors('generic'), variant: 'destructive' });
      }
    } catch { toast({ title: tErrors('generic'), variant: 'destructive' }); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await fetch(`/api/farmer/inputs/${deleteId}`, { method: 'DELETE' });
    if (res.ok) {
      setData(prev => (prev ? { inputs: prev.inputs.filter(i => i.id !== deleteId) } : prev));
      toast({ title: t('inputDeletedToast') });
    } else { toast({ title: tErrors('generic'), variant: 'destructive' }); }
    setDeleteId(null);
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">{tCommon('loading')}</div>;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
        <AlertTriangle className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button size="sm" variant="outline" onClick={() => refetch()} data-testid="button-retry-inputs">
          {tErrors('tryAgain')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2" data-testid="text-inputs-title">
          <Sprout className="h-5 w-5 text-[#2E7D6B]" />{t('agriculturalInputs')}
        </h2>
        <Button size="sm" onClick={openCreate} data-testid="button-add-input">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {inputs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Sprout className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium text-sm">{t('noInputsYet')}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('noInputsHint')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {inputs.map(input => (
            <Card key={input.id} data-testid={`input-record-${input.id}`}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="capitalize text-xs">{input.input_type?.replace(/_/g, ' ')}</Badge>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1 mr-1">
                      <Calendar className="h-3 w-3" />
                      {input.application_date ? new Date(input.application_date).toLocaleDateString('en-GB') : '—'}
                    </span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEdit(input)} aria-label={t('editInputAria')}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => setDeleteId(input.id)} aria-label={t('deleteInputAria')}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {input.product_name && <div className="font-medium text-sm">{input.product_name}</div>}
                <div className="text-xs text-muted-foreground mt-1">
                  {input.quantity && `${input.quantity} ${input.unit || ''}`}
                  {input.area_applied_hectares && ` ${t('onAreaHa', { area: input.area_applied_hectares })}`}
                </div>
                {input.notes && <div className="text-xs text-muted-foreground mt-1 italic">{input.notes}</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={showForm} onOpenChange={open => { if (!open) { setShowForm(false); setEditingId(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingId ? t('editInput') : t('addInput')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <Label className="text-xs">{t('inputType')}</Label>
              <Select value={form.input_type} onValueChange={v => setForm(f => ({ ...f, input_type: v }))}>
                <SelectTrigger data-testid="select-input-type"><SelectValue /></SelectTrigger>
                <SelectContent>{inputTypes.map(it => <SelectItem key={it.value} value={it.value}>{it.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('productName')}</Label>
              <Input value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))} placeholder="e.g. NPK 15-15-15" data-testid="input-product-name" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">{t('quantity')}</Label>
                <Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0" data-testid="input-quantity" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('unit')}</Label>
                <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
                  <SelectTrigger data-testid="select-unit"><SelectValue /></SelectTrigger>
                  <SelectContent>{units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">{t('applicationDate')}</Label>
                <Input type="date" value={form.application_date} onChange={e => setForm(f => ({ ...f, application_date: e.target.value }))} data-testid="input-date" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('areaApplied')}</Label>
                <Input type="number" step="0.1" value={form.area_applied_hectares} onChange={e => setForm(f => ({ ...f, area_applied_hectares: e.target.value }))} placeholder="0" data-testid="input-area" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('notes')}</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder={t('optionalNotes')} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>{tCommon('cancel')}</Button>
            <Button onClick={handleSubmit} disabled={submitting} data-testid="button-submit-input">
              {submitting ? tCommon('savingEllipsis') : editingId ? t('saveChanges') : t('addInput')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={open => { if (!open) setDeleteId(null); }}
        title={t('deleteInputTitle')}
        description={t('deleteInputDescription')}
        confirmLabel={tCommon('delete')}
        variant="destructive"
        onConfirm={() => { handleDelete(); }}
      />
    </div>
  );
}
