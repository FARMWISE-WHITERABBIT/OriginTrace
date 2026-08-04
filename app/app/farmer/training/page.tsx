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
import { GraduationCap, CheckCircle2, Clock, PlayCircle, Pencil, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';
import { useApiResource } from '@/hooks/use-api-resource';

export default function FarmerTrainingPage() {
  const t = useTranslations('farmer');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const { toast } = useToast();

  const moduleTypeLabels: Record<string, string> = {
    gap: t('moduleGap'), safety: t('moduleSafety'),
    sustainability: t('moduleSustainability'), organic: t('moduleOrganic'),
    child_labor: t('moduleChildLabor'), eudr_awareness: t('moduleEudrAwareness'),
  };
  const moduleTypes = Object.entries(moduleTypeLabels).map(([value, label]) => ({ value, label }));

  const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
    not_started: { icon: PlayCircle, color: 'text-muted-foreground', label: t('notStarted') },
    in_progress:  { icon: Clock,        color: 'text-amber-600',       label: t('inProgress') },
    completed:    { icon: CheckCircle2, color: 'text-green-600',        label: t('completed')   },
  };

  const { data, loading, error, refetch, setData } = useApiResource<{ modules: any[] }>('/api/farmer/training');
  const modules = data?.modules || [];

  const [editMod, setEditMod] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ module_name: '', module_type: 'gap', status: 'not_started', score: '', completed_at: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const updateStatus = async (moduleId: string, status: string) => {
    try {
      const res = await fetch('/api/farmer/training', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId, status }),
      });
      if (res.ok) {
        const { module } = await res.json();
        setData(prev => (prev ? { modules: prev.modules.map(m => m.id === moduleId ? module : m) } : prev));
        toast({ title: status === 'completed' ? t('moduleCompletedToast') : t('progressUpdatedToast') });
      } else {
        toast({ title: tErrors('generic'), variant: 'destructive' });
      }
    } catch { toast({ title: tErrors('generic'), variant: 'destructive' }); }
  };

  const openEdit = (mod: any) => {
    setEditMod(mod);
    setEditForm({
      module_name: mod.module_name || '',
      module_type: mod.module_type || 'gap',
      status: mod.status || 'not_started',
      score: mod.score?.toString() || '',
      completed_at: mod.completed_at ? mod.completed_at.split('T')[0] : '',
      notes: mod.notes || '',
    });
  };

  const handleEditSave = async () => {
    if (!editMod) return;
    setSaving(true);
    try {
      const payload: any = {
        module_name: editForm.module_name,
        module_type: editForm.module_type,
        status: editForm.status,
      };
      if (editForm.score) payload.score = parseFloat(editForm.score);
      if (editForm.completed_at) payload.completed_at = editForm.completed_at;
      if (editForm.notes) payload.notes = editForm.notes;

      const res = await fetch(`/api/farmer/training/${editMod.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (res.ok) {
        const { module } = await res.json();
        setData(prev => (prev ? { modules: prev.modules.map(m => m.id === editMod.id ? module : m) } : prev));
        toast({ title: t('moduleUpdatedToast') });
        setEditMod(null);
      } else { toast({ title: tErrors('generic'), variant: 'destructive' }); }
    } catch { toast({ title: tErrors('generic'), variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">{tCommon('loading')}</div>;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
        <AlertTriangle className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button size="sm" variant="outline" onClick={() => refetch()} data-testid="button-retry-training">
          {tErrors('tryAgain')}
        </Button>
      </div>
    );
  }

  const completedCount = modules.filter(m => m.status === 'completed').length;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2" data-testid="text-training-title">
        <GraduationCap className="h-5 w-5 text-[#2E7D6B]" />{t('trainingModules')}
      </h2>

      {modules.length > 0 && (
        <Card className="bg-[#2E7D6B]/5 border-[#2E7D6B]/20">
          <CardContent className="py-3 flex justify-between items-center">
            <span className="text-sm text-[#1F5F52] font-medium">{t('progress')}</span>
            <span className="text-lg font-bold text-[#1F5F52]" data-testid="text-training-progress">
              {t('completedOfTotal', { completed: completedCount, total: modules.length })}
            </span>
          </CardContent>
        </Card>
      )}

      {modules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <GraduationCap className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium text-sm">{t('noTrainingYet')}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('noTrainingHint')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map(mod => {
            const config = statusConfig[mod.status] || statusConfig.not_started;
            const StatusIcon = config.icon;
            return (
              <Card key={mod.id} data-testid={`training-module-${mod.id}`}>
                <CardContent className="py-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="font-medium text-sm truncate">{mod.module_name}</h3>
                      <p className="text-xs text-muted-foreground">{moduleTypeLabels[mod.module_type] || mod.module_type}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant="outline" className={`${config.color} text-xs`}>
                        <StatusIcon className="h-3 w-3 mr-1" />{config.label}
                      </Badge>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEdit(mod)} aria-label={t('editModuleAria')}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {mod.score != null && <div className="text-xs text-muted-foreground mb-2">{t('score')}: {mod.score}%</div>}
                  {mod.completed_at && <div className="text-xs text-muted-foreground mb-2">{t('completedOn')}: {new Date(mod.completed_at).toLocaleDateString('en-GB')}</div>}
                  {mod.status !== 'completed' && (
                    <div className="flex gap-2 mt-2">
                      {mod.status === 'not_started' && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(mod.id, 'in_progress')} data-testid={`button-start-${mod.id}`}>{t('start')}</Button>
                      )}
                      {mod.status === 'in_progress' && (
                        <Button size="sm" onClick={() => updateStatus(mod.id, 'completed')} data-testid={`button-complete-${mod.id}`}>{t('markComplete')}</Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={!!editMod} onOpenChange={open => { if (!open) setEditMod(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t('editTrainingModule')}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <Label className="text-xs">{t('moduleTitle')}</Label>
              <Input value={editForm.module_name} onChange={e => setEditForm(f => ({ ...f, module_name: e.target.value }))} placeholder={t('moduleTitlePlaceholder')} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('category')}</Label>
              <Select value={editForm.module_type} onValueChange={v => setEditForm(f => ({ ...f, module_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{moduleTypes.map(mt => <SelectItem key={mt.value} value={mt.value}>{mt.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">{tCommon('select')} {t('status')}</Label>
                <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">{t('notStarted')}</SelectItem>
                    <SelectItem value="in_progress">{t('inProgress')}</SelectItem>
                    <SelectItem value="completed">{t('completed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('score')} (%)</Label>
                <Input type="number" min="0" max="100" value={editForm.score} onChange={e => setEditForm(f => ({ ...f, score: e.target.value }))} placeholder="0–100" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('completionDate')}</Label>
              <Input type="date" value={editForm.completed_at} onChange={e => setEditForm(f => ({ ...f, completed_at: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('notes')}</Label>
              <Textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder={t('optionalNotes')} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMod(null)}>{tCommon('cancel')}</Button>
            <Button onClick={handleEditSave} disabled={saving}>{saving ? tCommon('savingEllipsis') : tCommon('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
