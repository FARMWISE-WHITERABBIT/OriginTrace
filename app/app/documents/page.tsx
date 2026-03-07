'use client';

import { useState, useEffect, useMemo } from 'react';
import { useOrg } from '@/lib/contexts/org-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { TierGate } from '@/components/tier-gate';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  Plus,
  Search,
  FileText,
  AlertTriangle,
  Calendar,
  Link as LinkIcon,
  Trash2,
} from 'lucide-react';

interface Document {
  id: string;
  title: string;
  document_type: string;
  file_url: string | null;
  file_name: string | null;
  issued_date: string | null;
  expiry_date: string | null;
  status: string;
  linked_entity_type: string | null;
  linked_entity_id: string | null;
  notes: string | null;
  created_at: string;
}

const DOCUMENT_TYPES = [
  { value: 'export_license', label: 'Export License' },
  { value: 'phytosanitary', label: 'Phytosanitary Certificate' },
  { value: 'fumigation', label: 'Fumigation Certificate' },
  { value: 'organic_cert', label: 'Organic Certification' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'lab_result', label: 'Lab Result' },
  { value: 'customs_declaration', label: 'Customs Declaration' },
  { value: 'bill_of_lading', label: 'Bill of Lading' },
  { value: 'certificate_of_origin', label: 'Certificate of Origin' },
  { value: 'quality_cert', label: 'Quality Certificate' },
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

function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active': return 'default';
    case 'expiring_soon': return 'secondary';
    case 'expired': return 'destructive';
    case 'archived': return 'outline';
    default: return 'outline';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'active': return 'Active';
    case 'expiring_soon': return 'Expiring Soon';
    case 'expired': return 'Expired';
    case 'archived': return 'Archived';
    default: return status;
  }
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newDoc, setNewDoc] = useState({
    title: '',
    document_type: '',
    issued_date: '',
    expiry_date: '',
    notes: '',
    linked_entity_type: '',
    linked_entity_id: '',
  });
  const { organization, isLoading: orgLoading } = useOrg();
  const { toast } = useToast();

  const fetchDocuments = async () => {
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
  };

  useEffect(() => {
    fetchDocuments();
  }, [organization, orgLoading, typeFilter, statusFilter]);

  const handleCreate = async () => {
    if (!newDoc.title || !newDoc.document_type) {
      toast({ title: 'Missing fields', description: 'Title and document type are required.', variant: 'destructive' });
      return;
    }
    setIsCreating(true);
    try {
      const payload: Record<string, unknown> = {
        title: newDoc.title,
        document_type: newDoc.document_type,
      };
      if (newDoc.issued_date) payload.issued_date = newDoc.issued_date;
      if (newDoc.expiry_date) payload.expiry_date = newDoc.expiry_date;
      if (newDoc.notes) payload.notes = newDoc.notes;
      if (newDoc.linked_entity_type) payload.linked_entity_type = newDoc.linked_entity_type;
      if (newDoc.linked_entity_id) payload.linked_entity_id = newDoc.linked_entity_id;

      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create document');
      }
      toast({ title: 'Document created', description: `"${newDoc.title}" has been added to the vault.` });
      setDialogOpen(false);
      setNewDoc({ title: '', document_type: '', issued_date: '', expiry_date: '', notes: '', linked_entity_type: '', linked_entity_id: '' });
      fetchDocuments();
    } catch (error: unknown) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to create document', variant: 'destructive' });
    } finally {
      setIsCreating(false);
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
    <TierGate feature="documents" requiredTier="basic" featureLabel="Document Vault">
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
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-document">
                <Plus className="h-4 w-4 mr-2" />
                Add Document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Document</DialogTitle>
                <DialogDescription>
                  Add a new document to your organization vault.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="doc-title">Title</Label>
                  <Input
                    id="doc-title"
                    placeholder="e.g. NAFDAC Export License 2024"
                    value={newDoc.title}
                    onChange={e => setNewDoc(s => ({ ...s, title: e.target.value }))}
                    data-testid="input-doc-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doc-type">Document Type</Label>
                  <Select
                    value={newDoc.document_type}
                    onValueChange={v => setNewDoc(s => ({ ...s, document_type: v }))}
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="doc-issued">Issued Date</Label>
                    <Input
                      id="doc-issued"
                      type="date"
                      value={newDoc.issued_date}
                      onChange={e => setNewDoc(s => ({ ...s, issued_date: e.target.value }))}
                      data-testid="input-doc-issued-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doc-expiry">Expiry Date</Label>
                    <Input
                      id="doc-expiry"
                      type="date"
                      value={newDoc.expiry_date}
                      onChange={e => setNewDoc(s => ({ ...s, expiry_date: e.target.value }))}
                      data-testid="input-doc-expiry-date"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doc-notes">Notes</Label>
                  <Input
                    id="doc-notes"
                    placeholder="Optional notes"
                    value={newDoc.notes}
                    onChange={e => setNewDoc(s => ({ ...s, notes: e.target.value }))}
                    data-testid="input-doc-notes"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="doc-entity-type">Linked Entity Type</Label>
                    <Select
                      value={newDoc.linked_entity_type}
                      onValueChange={v => setNewDoc(s => ({ ...s, linked_entity_type: v }))}
                    >
                      <SelectTrigger data-testid="select-doc-entity-type">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        {ENTITY_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doc-entity-id">Linked Entity ID</Label>
                    <Input
                      id="doc-entity-id"
                      placeholder="UUID"
                      value={newDoc.linked_entity_id}
                      onChange={e => setNewDoc(s => ({ ...s, linked_entity_id: e.target.value }))}
                      data-testid="input-doc-entity-id"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-create">
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={isCreating} data-testid="button-confirm-create">
                  {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Document
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
              <Button onClick={() => setDialogOpen(true)} data-testid="button-add-first-document">
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
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(doc.id)}
                      data-testid={`button-delete-doc-${doc.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" data-testid={`badge-type-${doc.id}`}>
                      {TYPE_LABELS[doc.document_type] || doc.document_type}
                    </Badge>
                    <Badge variant={getStatusBadgeVariant(doc.status)} data-testid={`badge-status-${doc.id}`}>
                      {getStatusLabel(doc.status)}
                    </Badge>
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
                        {doc.linked_entity_type}{doc.linked_entity_id ? `: ${doc.linked_entity_id.slice(0, 8)}...` : ''}
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
      </div>
    </TierGate>
  );
}
