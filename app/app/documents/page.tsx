'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useOrg } from '@/lib/contexts/org-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';
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
import { useApiResource } from '@/hooks/use-api-resource';
import { useTranslations } from 'next-intl';

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
  linked_entity_verified: boolean;
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
  linked_entity_verified: true,
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

async function fetchEntityPayload<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body && typeof body === 'object' && 'error' in body
      ? String((body as { error: unknown }).error)
      : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return body as T;
}

async function fetchEntityOptions(entityType: string, signal: AbortSignal): Promise<EntityOption[]> {
  if (entityType === 'shipment') {
    const data = await fetchEntityPayload<{ shipments?: Record<string, unknown>[] }>('/api/shipments?limit=200', signal);
    return (data.shipments || []).map((s) => ({
      id: String(s.id),
      label: `${s.shipment_code || s.id} — ${s.destination_country || ''}`.trim().replace(/—\s*$/, ''),
    }));
  }
  if (entityType === 'farm') {
    const data = await fetchEntityPayload<{ farms?: Record<string, unknown>[] }>('/api/farms?limit=200', signal);
    return (data.farms || []).map((f) => ({
      id: String(f.id),
      label: `${f.farmer_name || 'Farm'} — ${f.community || ''}`.trim().replace(/—\s*$/, ''),
    }));
  }
  if (entityType === 'farmer') {
    const data = await fetchEntityPayload<{ farmers?: Record<string, unknown>[] }>('/api/farmers?limit=200', signal);
    return (data.farmers || []).map((f) => ({
      id: String(f.farm_id || f.id || f.farmer_id),
      label: String(f.farmer_name || f.full_name || f.farm_id || f.id),
    }));
  }
  if (entityType === 'batch') {
    const data = await fetchEntityPayload<{ batches?: Record<string, unknown>[] }>('/api/batches?limit=200', signal);
    return (data.batches || []).map((b) => {
      const farm = b.farm as Record<string, unknown> | undefined;
      const label = farm
        ? `${farm.farmer_name || 'Batch'} — ${(b.id as string)?.slice(0, 8) || ''}`
        : String((b.id as string)?.slice(0, 8) || b.id);
      return { id: String(b.id), label };
    });
  }
  return [];
}

function EntitySelect({
  entityType,
  scopeKey,
  value,
  onChange,
}: {
  entityType: string;
  scopeKey: string | number | null;
  value: string;
  onChange: (v: string, verified: boolean) => void;
}) {
  const tErrors = useTranslations('errors');
  const [options, setOptions] = useState<EntityOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const activeScopeKeyRef = useRef<string | number | null>(scopeKey);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  activeScopeKeyRef.current = scopeKey;
  valueRef.current = value;
  onChangeRef.current = onChange;

  useEffect(() => {
    setOptions([]);
    if (!entityType || entityType === 'none') {
      setIsLoading(false);
      setLoadError(null);
      return;
    }
    if (scopeKey === null) {
      setIsLoading(false);
      setLoadError(tErrors('organizationContextUnavailable'));
      return;
    }
    if (entityType === 'organization') {
      setIsLoading(false);
      setLoadError(null);
      const organizationId = String(scopeKey);
      onChangeRef.current(organizationId, true);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const requestScopeKey = scopeKey;
    setIsLoading(true);
    setLoadError(null);
    onChangeRef.current(valueRef.current, false);

    void fetchEntityOptions(entityType, controller.signal)
      .then(opts => {
        if (cancelled || activeScopeKeyRef.current !== requestScopeKey) return;
        setIsLoading(false);
        setOptions(opts);
        const currentValue = valueRef.current;
        const isVerified = !!currentValue && opts.some((option) => option.id === currentValue);
        onChangeRef.current(isVerified ? currentValue : '', isVerified);
      })
      .catch((error: unknown) => {
        if (
          cancelled ||
          controller.signal.aborted ||
          activeScopeKeyRef.current !== requestScopeKey ||
          (error instanceof DOMException && error.name === 'AbortError')
        ) return;
        setIsLoading(false);
        setLoadError(error instanceof Error
          ? error.message
          : tErrors('unableToLoadEntityOptions', { entityType }));
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [entityType, retryAttempt, scopeKey, tErrors]);

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

  if (loadError) {
    return (
      <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-destructive/40 px-3 py-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-destructive">
            {tErrors('unableToLoadEntityOptions', { entityType })}
          </p>
          <p className="truncate text-xs text-muted-foreground">{loadError}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setRetryAttempt((attempt) => attempt + 1)}>
          {tErrors('tryAgain')}
        </Button>
      </div>
    );
  }

  if (entityType === 'organization') {
    return (
      <Input
        value={scopeKey === null ? '' : String(scopeKey)}
        readOnly
        data-testid="input-doc-entity-id"
      />
    );
  }

  return (
    <Select
      value={value}
      onValueChange={(nextValue) => onChange(
        nextValue,
        options.some((option) => option.id === nextValue),
      )}
    >
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
  organizationId,
  onChange,
  onUploadComplete,
  onUploadClear,
}: {
  form: DocFormState;
  organizationId: string | number | null;
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
            onValueChange={v => onChange({
              linked_entity_type: v === 'none' ? '' : v,
              linked_entity_id: '',
              linked_entity_verified: v === 'none',
            })}
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
            scopeKey={organizationId}
            value={form.linked_entity_id}
            onChange={(v, verified) => onChange({
              linked_entity_id: v,
              linked_entity_verified: verified,
            })}
          />
        </div>
      </div>
    </div>
  );
}

function DocumentsPage() {
  const tErrors = useTranslations('errors');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggleSelect = (id: string) => setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = (ids: string[]) => setSelected(p => p.size === ids.length && ids.every(id => p.has(id)) ? new Set() : new Set(ids));

  const [createOpen, setCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState<DocFormState>(EMPTY_FORM);

  const [editDoc, setEditDoc] = useState<Document | null>(null);
  const [editForm, setEditForm] = useState<DocFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Document | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { organization, isLoading: orgLoading } = useOrg();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const organizationId = organization?.id ?? null;
  const activeOrganizationIdRef = useRef<number | null>(organizationId);
  activeOrganizationIdRef.current = organizationId;
  const [formScopeKey, setFormScopeKey] = useState<number | null>(organizationId);
  const documentActionTokenRef = useRef(0);
  const handledAutoOpenKeyRef = useRef<string | null>(null);
  const formScopeMatches = Object.is(formScopeKey, organizationId);

  const documentParams = new URLSearchParams();
  if (typeFilter !== 'all') documentParams.set('type', typeFilter);
  if (statusFilter !== 'all') documentParams.set('status', statusFilter);
  const documentQuery = documentParams.toString();
  const documentsUrl = documentQuery ? `/api/documents?${documentQuery}` : '/api/documents';
  const {
    data: fetchedDocuments,
    error: documentsError,
    loading: documentsLoading,
    refetch: fetchDocuments,
  } = useApiResource<Document[]>(documentsUrl, {
    enabled: !!organization?.id,
    scopeKey: organization?.id,
    deps: [organization?.id, typeFilter, statusFilter],
    showErrorToast: false,
    select: (raw) => (raw as { documents?: Document[] }).documents || [],
  });
  const documents = fetchedDocuments ?? [];
  const isLoading = orgLoading || (!!organization?.id && documentsLoading);

  useEffect(() => {
    ++documentActionTokenRef.current;
    setFormScopeKey(organizationId);
    setSelected(new Set());
    setCreateOpen(false);
    setCreateForm(EMPTY_FORM);
    setEditDoc(null);
    setEditForm(EMPTY_FORM);
    setConfirmDelete(null);
    setIsCreating(false);
    setIsSaving(false);
    setIsDeleting(false);
  }, [organizationId]);

  // Auto-open upload dialog pre-filled when navigated from shipment
  useEffect(() => {
    if (organizationId === null) {
      handledAutoOpenKeyRef.current = null;
      return;
    }
    const entityType = searchParams.get('entity_type');
    const entityId   = searchParams.get('entity_id');
    const shipCode   = searchParams.get('shipment_code');
    if (!entityType || !entityId) {
      // Leaving an auto-open URL rearms the same link for a future visit while
      // this client page remains mounted.
      handledAutoOpenKeyRef.current = null;
      return;
    }
    const autoOpenKey = `${organizationId}:${entityType}:${entityId}:${shipCode ?? ''}`;
    if (handledAutoOpenKeyRef.current === autoOpenKey) return;
    handledAutoOpenKeyRef.current = autoOpenKey;
    setCreateForm(f => ({
      ...f,
      linked_entity_type: entityType,
      linked_entity_id:   entityId,
      linked_entity_verified: false,
      title: shipCode ? `Document for ${shipCode}` : '',
    }));
    setCreateOpen(true);
  }, [organizationId, searchParams]);

  const beginDocumentAction = () => {
    if (organizationId === null || !formScopeMatches) return null;
    return {
      organizationId,
      token: ++documentActionTokenRef.current,
    };
  };
  const documentActionIsCurrent = (action: { organizationId: number; token: number }) =>
    activeOrganizationIdRef.current === action.organizationId &&
    documentActionTokenRef.current === action.token;

  const handleCreate = async () => {
    const action = beginDocumentAction();
    if (!action) return;
    const formSnapshot = { ...createForm };
    if (!formSnapshot.title || !formSnapshot.document_type) {
      toast({ title: 'Missing fields', description: 'Title and document type are required.', variant: 'destructive' });
      return;
    }
    if (
      formSnapshot.linked_entity_type &&
      (!formSnapshot.linked_entity_id || !formSnapshot.linked_entity_verified)
    ) return;
    setIsCreating(true);
    try {
      const payload: Record<string, unknown> = {
        title: formSnapshot.title,
        document_type: formSnapshot.document_type,
      };
      if (formSnapshot.issued_date) payload.issued_date = formSnapshot.issued_date;
      if (formSnapshot.expiry_date) payload.expiry_date = formSnapshot.expiry_date;
      if (formSnapshot.notes) payload.notes = formSnapshot.notes;
      if (formSnapshot.linked_entity_type && formSnapshot.linked_entity_type !== 'none') {
        payload.linked_entity_type = formSnapshot.linked_entity_type;
      }
      if (formSnapshot.linked_entity_id) payload.linked_entity_id = formSnapshot.linked_entity_id;
      if (formSnapshot.file_url) payload.file_url = formSnapshot.file_url;
      if (formSnapshot.file_name) payload.file_name = formSnapshot.file_name;
      if (formSnapshot.file_size != null) payload.file_size = formSnapshot.file_size;

      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create document');
      }
      if (!documentActionIsCurrent(action)) return;
      toast({ title: 'Document created', description: `"${formSnapshot.title}" has been added to the vault.` });
      setCreateOpen(false);
      setCreateForm(EMPTY_FORM);
      await fetchDocuments();
    } catch (error: unknown) {
      if (!documentActionIsCurrent(action)) return;
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to create document', variant: 'destructive' });
    } finally {
      if (documentActionIsCurrent(action)) setIsCreating(false);
    }
  };

  const openEdit = (doc: Document) => {
    if (!formScopeMatches) return;
    setEditDoc(doc);
    setEditForm({
      title: doc.title,
      document_type: doc.document_type,
      issued_date: doc.issued_date ? doc.issued_date.slice(0, 10) : '',
      expiry_date: doc.expiry_date ? doc.expiry_date.slice(0, 10) : '',
      notes: doc.notes || '',
      linked_entity_type: doc.linked_entity_type || '',
      linked_entity_id: doc.linked_entity_id || '',
      linked_entity_verified: !doc.linked_entity_type,
      file_url: doc.file_url || '',
      file_name: doc.file_name || '',
      file_size: doc.file_size,
    });
  };

  const handleSaveEdit = async () => {
    const action = beginDocumentAction();
    const documentSnapshot = editDoc;
    const formSnapshot = { ...editForm };
    if (!action || !documentSnapshot) return;
    if (!formSnapshot.title || !formSnapshot.document_type) {
      toast({ title: 'Missing fields', description: 'Title and document type are required.', variant: 'destructive' });
      return;
    }
    if (
      formSnapshot.linked_entity_type &&
      (!formSnapshot.linked_entity_id || !formSnapshot.linked_entity_verified)
    ) return;
    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: formSnapshot.title,
        document_type: formSnapshot.document_type,
        issued_date: formSnapshot.issued_date || null,
        expiry_date: formSnapshot.expiry_date || null,
        notes: formSnapshot.notes || null,
        linked_entity_type: (formSnapshot.linked_entity_type && formSnapshot.linked_entity_type !== 'none')
          ? formSnapshot.linked_entity_type : null,
        linked_entity_id: formSnapshot.linked_entity_id || null,
        file_url: formSnapshot.file_url || null,
        file_name: formSnapshot.file_name || null,
        file_size: formSnapshot.file_size,
      };

      const response = await fetch(`/api/documents/${documentSnapshot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update document');
      }
      if (!documentActionIsCurrent(action)) return;
      toast({ title: 'Document updated', description: `"${formSnapshot.title}" has been saved.` });
      setEditDoc(null);
      await fetchDocuments();
    } catch (error: unknown) {
      if (!documentActionIsCurrent(action)) return;
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to update document', variant: 'destructive' });
    } finally {
      if (documentActionIsCurrent(action)) setIsSaving(false);
    }
  };

  const handleDelete = (doc: Document) => {
    if (!formScopeMatches) return;
    setConfirmDelete(doc);
  };

  const doDelete = async () => {
    const action = beginDocumentAction();
    const documentSnapshot = confirmDelete;
    if (!action || !documentSnapshot) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/documents/${documentSnapshot.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete document');
      if (!documentActionIsCurrent(action)) return;
      toast({ title: 'Document deleted', description: `"${documentSnapshot.title}" has been removed.` });
      setConfirmDelete(null);
      await fetchDocuments();
    } catch (error: unknown) {
      if (!documentActionIsCurrent(action)) return;
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to delete', variant: 'destructive' });
    } finally {
      if (documentActionIsCurrent(action)) setIsDeleting(false);
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
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
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
          <div className="space-y-3">{Array.from({length:4}).map((_,i)=><div key={i} className="h-16 bg-muted animate-pulse rounded-xl"/>)}</div>
        ) : documentsError ? (
          <Card role="alert" className="border-destructive/40" data-testid="documents-load-error">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <AlertTriangle className="h-9 w-9 text-destructive" />
              <div>
                <h3 className="font-medium">{tErrors('unableToLoadDocuments')}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{documentsError}</p>
              </div>
              <Button type="button" variant="outline" onClick={() => void fetchDocuments()}>
                {tErrors('tryAgain')}
              </Button>
            </CardContent>
          </Card>
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
          <div className="space-y-3">
            {/* Select-all bar */}
            <div className="flex items-center gap-3 px-1">
              <Checkbox
                checked={filteredDocuments.length > 0 && filteredDocuments.every(d => selected.has(d.id))}
                onCheckedChange={() => toggleAll(filteredDocuments.map(d => d.id))}
                aria-label="Select all documents"
              />
              <span className="text-xs text-muted-foreground">{selected.size > 0 ? `${selected.size} selected` : `${filteredDocuments.length} document${filteredDocuments.length !== 1 ? 's' : ''}`}</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDocuments.map(doc => (
              <Card key={doc.id} data-testid={`card-document-${doc.id}`} className={selected.has(doc.id) ? 'ring-2 ring-primary/40' : ''}>
                <CardContent className="pt-4 pb-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Checkbox checked={selected.has(doc.id)} onCheckedChange={() => toggleSelect(doc.id)} aria-label={`Select ${doc.title}`} />
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
                          aria-label="Download attachment"
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
                        aria-label="Edit document"
                        data-testid={`button-edit-doc-${doc.id}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleDelete(doc)}
                        aria-label="Delete document"
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
          {/* Bulk action bar */}
          {selected.size > 0 && (
            <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-background border border-border rounded-xl shadow-lg px-4 py-3">
              <span className="text-sm font-medium text-muted-foreground">{selected.size} doc{selected.size !== 1 ? 's' : ''} selected</span>
              <div className="w-px h-4 bg-border" />
              <Button size="sm" variant="outline" onClick={() => {
                const sel = filteredDocuments.filter(d => selected.has(d.id));
                const csv = ['Title,Type,Status,Expiry'].concat(sel.map(d => [d.title, d.document_type||'', d.status||'', d.expiry_date||''].join(','))).join('\n');
                const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'documents.csv' });
                a.click();
              }}>Export CSV</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
            </div>
          )}
          </div>
        )}

        <Dialog open={formScopeMatches && createOpen} onOpenChange={open => { setCreateOpen(open); if (!open) setCreateForm(EMPTY_FORM); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Document</DialogTitle>
              <DialogDescription>
                Add a new document to your organization vault. Attach a file or scan it with your camera.
              </DialogDescription>
            </DialogHeader>
            <DocForm
              form={createForm}
              organizationId={organizationId}
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
              <Button
                onClick={handleCreate}
                disabled={isCreating || (
                  !!createForm.linked_entity_type &&
                  (!createForm.linked_entity_id || !createForm.linked_entity_verified)
                )}
                data-testid="button-confirm-create"
              >
                {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Document
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={formScopeMatches && !!editDoc} onOpenChange={open => { if (!open) setEditDoc(null); }}>
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
              organizationId={organizationId}
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
              <Button
                onClick={handleSaveEdit}
                disabled={isSaving || (
                  !!editForm.linked_entity_type &&
                  (!editForm.linked_entity_id || !editForm.linked_entity_verified)
                )}
                data-testid="button-confirm-edit"
              >
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <ConfirmDialog
        open={formScopeMatches && !!confirmDelete}
        onOpenChange={open => { if (!open) setConfirmDelete(null); }}
        title="Delete document"
        description={`Delete "${confirmDelete?.title}"? This cannot be undone.`}
        confirmLabel="Delete Document"
        loading={isDeleting}
        onConfirm={doDelete}
      />
    </TierGate>
  );
}

function DocumentsPageWrapperInner() {
  return <Suspense><DocumentsPage /></Suspense>;
}

export default function DocumentsPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
      <DocumentsPageWrapperInner />
    </Suspense>
  );
}
