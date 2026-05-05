'use client';

/**
 * Shipment Templates Page
 *
 * Manage reusable shipment configurations. Create templates from scratch
 * or from existing shipments to speed up new shipment setup.
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  Ship,
  MapPin,
  Package,
  Truck,
} from 'lucide-react';

interface ShipmentTemplate {
  id: string;
  name: string;
  description: string | null;
  destination_country: string | null;
  destination_port: string | null;
  buyer_company: string | null;
  commodity: string | null;
  freight_forwarder_name: string | null;
  clearing_agent_name: string | null;
  contract_price_per_mt: number | null;
  created_at: string;
}

const EMPTY_FORM = {
  name: '',
  description: '',
  destination_country: '',
  destination_port: '',
  buyer_company: '',
  buyer_contact: '',
  commodity: '',
  freight_forwarder_name: '',
  clearing_agent_name: '',
  contract_price_per_mt: '',
};

function TemplateCard({
  template,
  onEdit,
  onDelete,
}: {
  template: ShipmentTemplate;
  onEdit: (t: ShipmentTemplate) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card className="card-accent-blue transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{template.name}</CardTitle>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => onEdit(template)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(template.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        {template.description && (
          <CardDescription className="text-xs">{template.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          {template.destination_country && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span>{template.destination_country}</span>
              {template.destination_port && <span>· {template.destination_port}</span>}
            </div>
          )}
          {template.commodity && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Package className="h-3 w-3 shrink-0" />
              <span>{template.commodity}</span>
            </div>
          )}
          {template.buyer_company && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Ship className="h-3 w-3 shrink-0" />
              <span>{template.buyer_company}</span>
            </div>
          )}
          {template.freight_forwarder_name && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Truck className="h-3 w-3 shrink-0" />
              <span>{template.freight_forwarder_name}</span>
            </div>
          )}
          {template.contract_price_per_mt && (
            <Badge variant="secondary" className="text-xs">
              ${template.contract_price_per_mt.toLocaleString()} / MT
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TemplateFormDialog({
  open,
  onOpenChange,
  editTemplate,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editTemplate: ShipmentTemplate | null;
  onSubmit: (data: typeof EMPTY_FORM) => void;
  isSubmitting: boolean;
}) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (editTemplate) {
      setForm({
        name: editTemplate.name,
        description: editTemplate.description ?? '',
        destination_country: editTemplate.destination_country ?? '',
        destination_port: editTemplate.destination_port ?? '',
        buyer_company: editTemplate.buyer_company ?? '',
        buyer_contact: '',
        commodity: editTemplate.commodity ?? '',
        freight_forwarder_name: editTemplate.freight_forwarder_name ?? '',
        clearing_agent_name: editTemplate.clearing_agent_name ?? '',
        contract_price_per_mt: editTemplate.contract_price_per_mt
          ? String(editTemplate.contract_price_per_mt)
          : '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editTemplate, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
          <DialogDescription>
            Save a configuration to reuse when creating new shipments.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1 max-h-[70vh] overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label className="text-xs">Template Name *</Label>
            <Input
              placeholder="e.g. Germany Cocoa Route"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea
              placeholder="When to use this template..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="text-sm resize-none"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Destination Country</Label>
              <Input
                placeholder="e.g. Germany"
                value={form.destination_country}
                onChange={(e) => setForm((f) => ({ ...f, destination_country: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Destination Port</Label>
              <Input
                placeholder="e.g. Hamburg"
                value={form.destination_port}
                onChange={(e) => setForm((f) => ({ ...f, destination_port: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Commodity</Label>
              <Input
                placeholder="e.g. Cocoa Beans"
                value={form.commodity}
                onChange={(e) => setForm((f) => ({ ...f, commodity: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Buyer Company</Label>
              <Input
                placeholder="e.g. Barry Callebaut"
                value={form.buyer_company}
                onChange={(e) => setForm((f) => ({ ...f, buyer_company: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Freight Forwarder</Label>
              <Input
                placeholder="Company name"
                value={form.freight_forwarder_name}
                onChange={(e) => setForm((f) => ({ ...f, freight_forwarder_name: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Clearing Agent</Label>
              <Input
                placeholder="Company name"
                value={form.clearing_agent_name}
                onChange={(e) => setForm((f) => ({ ...f, clearing_agent_name: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Contract Price per MT (USD)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 2800"
                value={form.contract_price_per_mt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contract_price_per_mt: e.target.value }))
                }
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onSubmit(form)} disabled={isSubmitting || !form.name}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editTemplate ? 'Save Changes' : 'Create Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ShipmentTemplatesPage() {
  const { organization, isLoading: orgLoading } = useOrg();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ShipmentTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<ShipmentTemplate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTemplates = useCallback(async () => {
    if (!organization) return;
    try {
      const res = await fetch('/api/shipment-templates');
      if (res.ok) {
        const d = await res.json();
        setTemplates(d.templates ?? []);
      }
    } catch { /* silent */ } finally {
      setIsLoading(false);
    }
  }, [organization]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleSubmit = async (formData: typeof EMPTY_FORM) => {
    setIsSubmitting(true);
    try {
      const isEdit = !!editTemplate;
      const url = isEdit
        ? `/api/shipment-templates/${editTemplate!.id}`
        : '/api/shipment-templates';
      const method = isEdit ? 'PATCH' : 'POST';

      const payload: Record<string, any> = { ...formData };
      if (formData.contract_price_per_mt) {
        payload.contract_price_per_mt = parseFloat(formData.contract_price_per_mt);
      } else {
        delete payload.contract_price_per_mt;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to save');
      }

      toast({ title: isEdit ? 'Template updated' : 'Template created' });
      setDialogOpen(false);
      setEditTemplate(null);
      fetchTemplates();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/shipment-templates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast({ title: 'Template deleted' });
      fetchTemplates();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete template', variant: 'destructive' });
    }
  };

  if (orgLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Shipment Templates</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Reusable configurations to speed up new shipment creation
          </p>
        </div>
        <Button
          onClick={() => {
            setEditTemplate(null);
            setDialogOpen(true);
          }}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          New Template
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium">No templates yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create a template to pre-fill shipment fields like destination, buyer, freight
              forwarder, and pricing.
            </p>
            <Button
              onClick={() => {
                setEditTemplate(null);
                setDialogOpen(true);
              }}
              size="sm"
              className="mt-4 gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Create First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={(t) => {
                setEditTemplate(t);
                setDialogOpen(true);
              }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <TemplateFormDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditTemplate(null);
        }}
        editTemplate={editTemplate}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
