'use client';

/**
 * Service Provider Directory
 *
 * Per-org registry of freight forwarders, clearing agents, inspection bodies,
 * labs and shipping lines. Used to auto-fill shipment logistics fields and
 * maintain a rolodex of trusted providers.
 */

import { useState, useEffect, useCallback } from 'react';
import { useOrg } from '@/lib/contexts/org-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Star,
  Ship,
  Truck,
  FlaskConical,
  ClipboardCheck,
  Package,
  Phone,
  Mail,
  MapPin,
  Hash,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ProviderType = 'freight_forwarder' | 'clearing_agent' | 'inspection_body' | 'lab' | 'shipping_line';

interface ServiceProvider {
  id: string;
  provider_type: ProviderType;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  country: string | null;
  registration_number: string | null;
  notes: string | null;
  is_preferred: boolean;
  is_active: boolean;
  created_at: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<ProviderType, { label: string; icon: any; color: string; bg: string }> = {
  freight_forwarder: {
    label: 'Freight Forwarder',
    icon: Ship,
    color: 'text-blue-700',
    bg: 'bg-blue-50 dark:bg-blue-950/20',
  },
  clearing_agent: {
    label: 'Clearing Agent',
    icon: Truck,
    color: 'text-amber-700',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
  },
  inspection_body: {
    label: 'Inspection Body',
    icon: ClipboardCheck,
    color: 'text-green-700',
    bg: 'bg-green-50 dark:bg-green-950/20',
  },
  lab: {
    label: 'Laboratory',
    icon: FlaskConical,
    color: 'text-purple-700',
    bg: 'bg-purple-50 dark:bg-purple-950/20',
  },
  shipping_line: {
    label: 'Shipping Line',
    icon: Package,
    color: 'text-primary',
    bg: 'bg-primary/5',
  },
};

const PROVIDER_TYPES: ProviderType[] = [
  'freight_forwarder',
  'clearing_agent',
  'inspection_body',
  'lab',
  'shipping_line',
];

const EMPTY_FORM = {
  provider_type: 'freight_forwarder' as ProviderType,
  name: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  address: '',
  country: '',
  registration_number: '',
  notes: '',
  is_preferred: false,
};

// ─── Provider card ────────────────────────────────────────────────────────────

function ProviderCard({
  provider,
  onEdit,
  onDelete,
  onTogglePreferred,
}: {
  provider: ServiceProvider;
  onEdit: (p: ServiceProvider) => void;
  onDelete: (id: string) => void;
  onTogglePreferred: (id: string, preferred: boolean) => void;
}) {
  const cfg = TYPE_CONFIG[provider.provider_type];
  const Icon = cfg.icon;

  return (
    <Card className="relative">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`h-9 w-9 rounded-md flex items-center justify-center shrink-0 ${cfg.bg}`}>
            <Icon className={`h-4 w-4 ${cfg.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold leading-tight">{provider.name}</h3>
                  {provider.is_preferred && (
                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                  )}
                </div>
                <Badge variant="secondary" className="text-xs mt-1">
                  {cfg.label}
                </Badge>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => onTogglePreferred(provider.id, !provider.is_preferred)}
                  title={provider.is_preferred ? 'Remove preferred' : 'Mark as preferred'}
                >
                  <Star
                    className={`h-3.5 w-3.5 ${
                      provider.is_preferred
                        ? 'text-amber-500 fill-amber-500'
                        : 'text-muted-foreground'
                    }`}
                  />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => onEdit(provider)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => onDelete(provider.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="mt-2 space-y-1">
              {provider.contact_name && (
                <p className="text-xs text-muted-foreground">{provider.contact_name}</p>
              )}
              {provider.contact_email && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3 shrink-0" />
                  <a
                    href={`mailto:${provider.contact_email}`}
                    className="hover:underline truncate"
                  >
                    {provider.contact_email}
                  </a>
                </div>
              )}
              {provider.contact_phone && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3 shrink-0" />
                  <span>{provider.contact_phone}</span>
                </div>
              )}
              {provider.country && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span>{provider.country}</span>
                </div>
              )}
              {provider.registration_number && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Hash className="h-3 w-3 shrink-0" />
                  <span className="font-mono">{provider.registration_number}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Provider form dialog ─────────────────────────────────────────────────────

function ProviderDialog({
  open,
  onOpenChange,
  editProvider,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editProvider: ServiceProvider | null;
  onSubmit: (data: typeof EMPTY_FORM) => void;
  isSubmitting: boolean;
}) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (editProvider) {
      setForm({
        provider_type: editProvider.provider_type,
        name: editProvider.name,
        contact_name: editProvider.contact_name ?? '',
        contact_email: editProvider.contact_email ?? '',
        contact_phone: editProvider.contact_phone ?? '',
        address: editProvider.address ?? '',
        country: editProvider.country ?? '',
        registration_number: editProvider.registration_number ?? '',
        notes: editProvider.notes ?? '',
        is_preferred: editProvider.is_preferred,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editProvider, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editProvider ? 'Edit Provider' : 'Add Service Provider'}</DialogTitle>
          <DialogDescription>
            Register a trusted provider for use across shipments.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Provider Type *</Label>
              <Select
                value={form.provider_type}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, provider_type: v as ProviderType }))
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_CONFIG[t].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Company Name *</Label>
              <Input
                placeholder="e.g. Kuehne+Nagel Nigeria"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Contact Person</Label>
              <Input
                placeholder="Full name"
                value={form.contact_name}
                onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Country</Label>
              <Input
                placeholder="e.g. Nigeria"
                value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                placeholder="contact@provider.com"
                value={form.contact_email}
                onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input
                type="tel"
                placeholder="+234 800 000 0000"
                value={form.contact_phone}
                onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Registration / Licence Number</Label>
              <Input
                placeholder="NCS clearing agent code, lab accreditation no., etc."
                value={form.registration_number}
                onChange={(e) => setForm((f) => ({ ...f, registration_number: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Notes</Label>
              <Textarea
                placeholder="Preferred routes, specialisations, performance notes..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="text-sm resize-none"
                rows={2}
              />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="is_preferred"
                checked={form.is_preferred}
                onChange={(e) => setForm((f) => ({ ...f, is_preferred: e.target.checked }))}
                className="h-4 w-4 rounded"
              />
              <Label htmlFor="is_preferred" className="text-xs cursor-pointer">
                Mark as preferred (shown first in shipment auto-fill)
              </Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onSubmit(form)} disabled={isSubmitting || !form.name}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editProvider ? 'Save Changes' : 'Add Provider'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ServiceProvidersPage() {
  const { organization, isLoading: orgLoading } = useOrg();
  const { toast } = useToast();

  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTypeFilter, setActiveTypeFilter] = useState<ProviderType | 'all'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProvider, setEditProvider] = useState<ServiceProvider | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProviders = useCallback(async () => {
    if (!organization) return;
    try {
      const res = await fetch('/api/service-providers');
      if (res.ok) {
        const d = await res.json();
        setProviders(d.providers ?? []);
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [organization]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const handleSubmit = async (formData: typeof EMPTY_FORM) => {
    setIsSubmitting(true);
    try {
      const isEdit = !!editProvider;
      const url = isEdit
        ? `/api/service-providers/${editProvider!.id}`
        : '/api/service-providers';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to save');
      }

      toast({ title: isEdit ? 'Provider updated' : 'Provider added' });
      setDialogOpen(false);
      setEditProvider(null);
      fetchProviders();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/service-providers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast({ title: 'Provider deactivated' });
      fetchProviders();
    } catch {
      toast({ title: 'Error', description: 'Failed to deactivate provider', variant: 'destructive' });
    }
  };

  const handleTogglePreferred = async (id: string, preferred: boolean) => {
    try {
      await fetch(`/api/service-providers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_preferred: preferred }),
      });
      fetchProviders();
    } catch {
      toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' });
    }
  };

  const openCreate = () => {
    setEditProvider(null);
    setDialogOpen(true);
  };

  const openEdit = (provider: ServiceProvider) => {
    setEditProvider(provider);
    setDialogOpen(true);
  };

  const filteredProviders =
    activeTypeFilter === 'all'
      ? providers
      : providers.filter((p) => p.provider_type === activeTypeFilter);

  if (orgLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Service Provider Directory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage trusted freight forwarders, clearing agents, inspection bodies and labs
          </p>
        </div>
        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add Provider
        </Button>
      </div>

      {/* Type filter tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={activeTypeFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTypeFilter('all')}
        >
          All ({providers.length})
        </Button>
        {PROVIDER_TYPES.map((type) => {
          const cfg = TYPE_CONFIG[type];
          const count = providers.filter((p) => p.provider_type === type).length;
          if (count === 0) return null;
          return (
            <Button
              key={type}
              variant={activeTypeFilter === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTypeFilter(type)}
            >
              {cfg.label} ({count})
            </Button>
          );
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredProviders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Ship className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium">No providers yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add your trusted freight forwarders, clearing agents and inspection bodies.
            </p>
            <Button onClick={openCreate} size="sm" className="mt-4 gap-1.5">
              <Plus className="h-4 w-4" />
              Add First Provider
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProviders.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              onEdit={openEdit}
              onDelete={handleDelete}
              onTogglePreferred={handleTogglePreferred}
            />
          ))}
        </div>
      )}

      {/* Dialog */}
      <ProviderDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditProvider(null);
        }}
        editProvider={editProvider}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
