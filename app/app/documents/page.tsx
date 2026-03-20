'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useOrg } from '@/lib/contexts/org-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { TierGate } from '@/components/tier-gate';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DocumentUpload, type UploadResult } from '@/components/document-upload';
import {
  Loader2,
  Plus,
  Search,
  FileText,
  AlertTriangle,
  Calendar,
  Link as LinkIcon,
  Trash2,
  Paperclip,
  Pencil,
} from 'lucide-react';
import { StatusBadge } from '@/lib/status-badge';

interface Document {
  id: string;
  title: string;
  document_type: string;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  issued_date: string | null;
  expiry_date: string | null;
  status: string;
  linked_entity_type: string | null;
  linked_entity_id: string | null;
  notes: string | null;
  created_at: string;
}

interface DocFormState {
  title: string;
  document_type: string;
  issued_date: string;
  expiry_date: string;
  notes: string;
  linked_entity_type: string;
  linked_entity_id: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
}

interface EntityOption {
  id: string;
  label: string;
}

const EMPTY_FORM: DocFormState = {
  title: '',
  document_type: '',
  issued_date: '',
  expiry_date: '',
  notes: '',
  linked_entity_type: '',
  linked_entity_id: '',
  file_url: '',
  file_name: '',
  file_size: null,
};

const DOCUMENT_TYPES = [
  { value: 'export_license', label: 'Export License' },
  { value: 'phytosanitary', label: 'Phytosanitary Certificate' },
  { value: 'fumigation', label: 'Fumigation Certificate' },
  { value: 'organic_cert', label: 'Organic Certification' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'lab_result', label: 'Lab Result / COA' },
  { value: 'customs_declaration', label: 'Customs Declaration' },
  { value: 'bill_of_lading', label: 'Bill of Lading' },
  { value: 'certificate_of_origin', label: 'Certificate of Origin' },
  { value: 'quality_cert', label: 'Quality Certificate' },
  { value: 'uk_due_diligence', label: 'UK Due Diligence Statement' },
  { value: 'fda_prior_notice', label: 'FDA Prior Notice' },
  { value: 'lacey_act_declaration', label: 'Lacey Act Declaration' },
  { value: 'gacc_registration', label: 'China GACC Registration' },
  { value: 'gb_standards_cert', label: 'China GB Standards Certificate' },
  { value: 'china_customs_declaration', label: 'China Customs Declaration' },
  { value: 'halal_certificate', label: 'Halal Certificate' },
  { value: 'esma_compliance', label: 'UAE ESMA Compliance Cert' },
  { value: 'gulf_certificate_of_conformity', label: 'Gulf CoC (GCC)' },
  { value: 'other', label: 'Other' },
];

const ENTITY_TYPES = [
  { value: 'shipment', label: 'Shipment' },
  { value: 'farm', label: 'Farm' },
  { value: 'farmer', label: 'Farmer' },
  { value: 'organization', label: 'Organization' },
  { value: 'batch', label: 'Batch' },
];

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  DOCUMENT_TYPES.map(t => [t.value, t.label])
);

async function fetchEntityOptions(entityType: string): Promise<EntityOption[]> {
  try {
    if (entityType === 'shipment') {
      const res = await fetch('/api/shipments?limit=100');
      if (!res.ok) return [];
      const data = await res.json();
      return (data.shipments || []).map((s: Record<string, unknown>) => ({
        id: String(s.id),
        label: `${s.shipment_code || s.id} — ${s.destination_country || ''}`.trim().replace(/—\s*$/, ''),
      }));
    }
    if (entityType === 'farm') {
      const res = await fetch('/api/farms?limit=100');
      if (!res.ok) return [];
      const data = await res.json();
      return (data.farms || []).map((f: Record<string, unknown>) => ({
        id: String(f.id),
        label: `${f.farmer_name || 'Farm'} — ${f.community || ''}`.trim().replace(/—\s*$/, ''),
      }));
    }
    if (entityType === 'farmer') {
      const res = await fetch('/api/farmers?limit=100');
      if (!res.ok) return [];
      const data = await res.json();
      return (data.farmers || []).map((f: Record<string, unknown>) => ({
        id: String(f.id || f.farmer_id),
        label: String(f.farmer_name || f.full_name || f.id),
      }));
    }
    if (entityType === 'batch') {
      const res = await fetch('/api/batches?limit=100');
      if (!res.ok) return [];
      const data = await res.json();
      return (data.batches || []).map((b: Record<string, unknown>) => {
        const farm = b.farm as Record<string, unknown> | undefined;
        const label = farm
          ? `${farm.farmer_name || 'Batch'} — ${(b.id as string)?.slice(0, 8) || ''}`
          : String((b.id as string)?.slice(0, 8) || b.id);
        return { id: String(b.id), label };
      });
    }
    return [];
  } catch {
    return [];
  }
}

function EntitySelect({
  entityType,
  value,
  onChange,
}: {
  entityType: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [options, setOptions] = useState<EntityOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    if (!entityType || entityType === 'none' || entityType === 'organization') {
      setOptions([]);
      setUseFallback(entityType === 'organization');
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setUseFallback(false);

    fetchEntityOptions(entityType).then(opts => {
      if (cancelled) return;
      setIsLoading(false);
      if (opts.length === 0) {
        setUseFallback(true);
      } else {
        setOptions(opts);
      }
    });

    return () => { cancelled = true; };
  }, [entityType]);

  if (!entityType || entityType === 'none') {
    return (
      <Input
        placeholder="Select an entity type first"
        disabled
        data-testid="input-doc-entity-id"
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 h-9 px-3 border rounded-md bg-muted/50">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading {entityType}s...</span>
      </div>
    );
  }

  if (useFallback || entityType === 'organization') {
    return (
      <Input
        placeholder="Paste entity ID (UUID)"
        value={value}
        onChange={e => onChange(e.target.value)}
        data-testid="input-doc-entity-id"
      />
    );
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger data-testid="select-doc-entity-id">
        <SelectValue placeholder={`Select ${entityType}`} />
      </SelectTrigger>
      <SelectContent>
        {options.map(opt => (
          <SelectItem key={opt.id} value={opt.id}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function DocForm({
  form,
  onChange,
  onUploadComplete,
  onUploadClear,
}: {
  form: DocFormState;
  onChange: (updates: Partial<DocFormState>) => void;
  onUploadComplete: (result: UploadResult) => void;
  onUploadClear: () => void;
}) {
  return (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label htmlFor="doc-title">Title <span className="text-destructive">*</span></Label>
        <Input
          id="doc-title"
          placeholder="e.g. NAFDAC Export License 2024"
          value={form.title}
          onChange={e => onChange({ title: e.target.value })}
          data-testid="input-doc-title"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="doc-type">Document Type <span className="text-destructive">*</span></Label>
        <Select
          value={form.document_type}
          onValueChange={v => onChange({ document_type: v })}
        >
          <SelectTrigger data-testid="select-doc-type">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Attach File</Label>
        <DocumentUpload
          onUploadComplete={onUploadComplete}
          onClear={onUploadClear}
          currentFileName={form.file_name || null}
          currentFileUrl={form.file_url || null}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="doc-issued">Issued Date</Label>
          <Input
            id="doc-issued"
            type="date"
            value={form.issued_date}
            onChange={e => onChange({ issued_date: e.target.value })}
            data-testid="input-doc-issued-date"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="doc-expiry">Expiry Date</Label>
          <Input
            id="doc-expiry"
            type="date"
            value={form.expiry_date}
            onChange={e => onChange({ expiry_date: e.target.value })}
            data-testid="input-doc-expiry-date"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="doc-notes">Notes</Label>
        <Textarea
          id="doc-notes"
          placeholder="Optional notes"
          value={form.notes}
          onChange={e => onChange({ notes: e.target.value })}
          rows={2}
          data-testid="input-doc-notes"
        />
      </div>

      <div className="space-y-3">
        <Label>Link to Entity</Label>
        <div className="grid grid-cols-2 gap-3">
          <Select
            value={form.linked_entity_type || 'none'}
            onValueChange={v => onChange({ linked_entity_type: v === 'none' ? '' : v, linked_entity_id: '' })}
          >
            <SelectTrigger data-testid="select-doc-entity-type">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {ENTITY_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <EntitySelect
            entityType={form.linked_entity_type}
            value={form.linked_entity_id}
            onChange={v => onChange({ linked_entity_id: v })}
          />
        </div>
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [createOpen, setCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState<DocFormState>(EMPTY_FORM);

  const [editDoc, setEditDoc] = useState<Document | null>(null);
  const [editForm, setEditForm] = useState<DocFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const { organization, isLoading: orgLoading } = useOrg();
  const { toast } = useToast();

  const fetchDocuments = useCallback(async () => {
    if (orgLoading) return;
    if (!organization) {
      setIsLoading(false);
      return;
    }
    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const qs = params.toString();
      const url = qs ? `/api/documents?${qs}` : '/api/documents';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch documents');
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setIsLoading(false);
    }
  }, [organization, orgLoading, typeFilter, statusFilter]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleCreate = async () => {
    if (!createForm.title || !createForm.document_type) {
      toast({ title: 'Missing fields', description: 'Title and document type are required.', variant: 'destructive' });
      return;
    }
    setIsCreating(true);
    try {
      const payload: Record<string, unknown> = {
        title: createForm.title,
        document_type: createForm.document_type,
      };
      if (createForm.issued_date) payload.issued_date = createForm.issued_date;
      if (createForm.expiry_date) payload.expiry_date = createForm.expiry_date;
      if (createForm.notes) payload.notes = createForm.notes;
      if (createForm.linked_entity_type && createForm.linked_entity_type !== 'none') {
        payload.linked_entity_type = createForm.linked_entity_type;
      }
      if (createForm.linked_entity_id) payload.linked_entity_id = createForm.linked_entity_id;
      if (createForm.file_url) payload.file_url = createForm.file_url;
      if (createForm.file_name) payload.file_name = createForm.file_name;
      if (createForm.file_size != null) payload.file_size = createForm.file_size;

      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create document');
      }
      toast({ title: 'Document created', description: `"${createForm.title}" has been added to the vault.` });
      setCreateOpen(false);
      setCreateForm(EMPTY_FORM);
      fetchDocuments();
    } catch (error: unknown) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to create document', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const openEdit = (doc: Document) => {
    setEditDoc(doc);
    setEditForm({
      title: doc.title,
      document_type: doc.document_type,
      issued_date: doc.issued_date ? doc.issued_date.slice(0, 10) : '',
      expiry_date: doc.expiry_date ? doc.expiry_date.slice(0, 10) : '',
      notes: doc.notes || '',
      linked_entity_type: doc.linked_entity_type || '',
      linked_entity_id: doc.linked_entity_id || '',
      file_url: doc.file_url || '',
      file_name: doc.file_name || '',
      file_size: doc.file_size,
    });
  };

  const handleSaveEdit = async () => {
    if (!editDoc) return;
    if (!editForm.title || !editForm.document_type) {
      toast({ title: 'Missing fields', description: 'Title and document type are required.', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: editForm.title,
        document_type: editForm.document_type,
        issued_date: editForm.issued_date || null,
        expiry_date: editForm.expiry_date || null,
        notes: editForm.notes || null,
        linked_entity_type: (editForm.linked_entity_type && editForm.linked_entity_type !== 'none')
          ? editForm.linked_entity_type : null,
        linked_entity_id: editForm.linked_entity_id || null,
        file_url: editForm.file_url || null,
        file_name: editForm.file_name || null,
        file_size: editForm.file_size,
      };

      const response = await fetch(`/api/documents/${editDoc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update document');
      }
      toast({ title: 'Document updated', description: `"${editForm.title}" has been saved.` });
      setEditDoc(null);
      fetchDocuments();
    } catch (error: unknown) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to update document', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete document');
      toast({ title: 'Document deleted' });
      fetchDocuments();
    } catch (error: unknown) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to delete', variant: 'destructive' });
    }
  };

  const filteredDocuments = useMemo(() => {
    if (!searchQuery) return documents;
    const q = searchQuery.toLowerCase();
    return documents.filter(d =>
      d.title.toLowerCase().includes(q) ||
      (TYPE_LABELS[d.document_type] || d.document_type).toLowerCase().includes(q) ||
      (d.notes?.toLowerCase().includes(q))
    );
  }, [documents, searchQuery]);

  const expiringCount = documents.filter(d => d.status === 'expiring_soon').length;
  const expiredCount = documents.filter(d => d.status === 'expired').length;
  const alertCount = expiringCount + expiredCount;

  return (
    <TierGate feature="documents" requiredTier="starter" featureLabel="Document Vault">
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">
              Document Vault
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Store and track export licenses, certificates, and compliance documents with expiry alerts.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} data-testid="button-add-document">
            <Plus className="h-4 w-4 mr-2" />
            Add Document
          </Button>
        </div>

        {alertCount > 0 && (
          <Alert variant="destructive" data-testid="alert-expiry-banner">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription data-testid="text-alert-description">
              {expiredCount > 0 && `${expiredCount} expired document${expiredCount !== 1 ? 's' : ''}`}
              {expiredCount > 0 && expiringCount > 0 && ' and '}
              {expiringCount > 0 && `${expiringCount} document${expiringCount !== 1 ? 's' : ''} expiring soon`}
              . Review and renew to stay compliant.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-documents"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-type-filter">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {DOCUMENT_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading || orgLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredDocuments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No documents found</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                Add export licenses, certificates, and other compliance documents to track their validity and expiry.
              </p>
              <Button onClick={() => setCreateOpen(true)} data-testid="button-add-first-document">
                <Plus className="h-4 w-4 mr-2" />
                Add First Document
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDocuments.map(doc => (
              <Card key={doc.id} data-testid={`card-document-${doc.id}`}>
                <CardContent className="pt-4 pb-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm truncate" data-testid={`text-doc-title-${doc.id}`}>
                        {doc.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {doc.file_url && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => window.open(doc.file_url!, '_blank')}
                          title={doc.file_name || 'Download attachment'}
                          data-testid={`button-download-doc-${doc.id}`}
                        >
                          <Paperclip className="h-3.5 w-3.5 text-primary" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => openEdit(doc)}
                        data-testid={`button-edit-doc-${doc.id}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleDelete(doc.id)}
                        data-testid={`button-delete-doc-${doc.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" data-testid={`badge-type-${doc.id}`}>
                      {TYPE_LABELS[doc.document_type] || doc.document_type}
                    </Badge>
                    <StatusBadge domain="document" status={doc.status} data-testid={`badge-status-${doc.id}`} />
                    {doc.file_name && (
                      <Badge variant="secondary" className="text-xs gap-1" data-testid={`badge-attachment-${doc.id}`}>
                        <Paperclip className="h-2.5 w-2.5" />
                        {doc.file_name.length > 20 ? doc.file_name.slice(0, 20) + '…' : doc.file_name}
                      </Badge>
                    )}
                  </div>

                  {doc.expiry_date && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span data-testid={`text-expiry-${doc.id}`}>
                        Expires: {new Date(doc.expiry_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {doc.linked_entity_type && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <LinkIcon className="h-3 w-3" />
                      <span data-testid={`text-linked-${doc.id}`}>
                        {doc.linked_entity_type}{doc.linked_entity_id ? `: ${doc.linked_entity_id.slice(0, 8)}…` : ''}
                      </span>
                    </div>
                  )}

                  {doc.notes && (
                    <p className="text-xs text-muted-foreground line-clamp-2" data-testid={`text-notes-${doc.id}`}>
                      {doc.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={createOpen} onOpenChange={open => { setCreateOpen(open); if (!open) setCreateForm(EMPTY_FORM); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Document</DialogTitle>
              <DialogDescription>
                Add a new document to your organization vault. Attach a file or scan it with your camera.
              </DialogDescription>
            </DialogHeader>
            <DocForm
              form={createForm}
              onChange={updates => setCreateForm(s => ({ ...s, ...updates }))}
              onUploadComplete={result => setCreateForm(s => ({
                ...s,
                file_url: result.url,
                file_name: result.file_name,
                file_size: result.file_size,
              }))}
              onUploadClear={() => setCreateForm(s => ({ ...s, file_url: '', file_name: '', file_size: null }))}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)} data-testid="button-cancel-create">
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isCreating} data-testid="button-confirm-create">
                {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Document
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editDoc} onOpenChange={open => { if (!open) setEditDoc(null); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Document</DialogTitle>
              <DialogDescription>
                Update the document details or replace the attached file.
              </DialogDescription>
            </DialogHeader>
            <DocForm
              key={editDoc?.id}
              form={editForm}
              onChange={updates => setEditForm(s => ({ ...s, ...updates }))}
              onUploadComplete={result => setEditForm(s => ({
                ...s,
                file_url: result.url,
                file_name: result.file_name,
                file_size: result.file_size,
              }))}
              onUploadClear={() => setEditForm(s => ({ ...s, file_url: '', file_name: '', file_size: null }))}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDoc(null)} data-testid="button-cancel-edit">
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={isSaving} data-testid="button-confirm-edit">
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TierGate>
  );
}
