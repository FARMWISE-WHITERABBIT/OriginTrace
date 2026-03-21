'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, FolderOpen, Search, FileText, ExternalLink, Calendar, AlertTriangle } from 'lucide-react';

interface BuyerDocument {
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

interface Exporter {
  id: string;
  name: string;
}

const typeLabels: Record<string, string> = {
  export_license: 'Export License',
  phytosanitary: 'Phytosanitary Cert',
  fumigation: 'Fumigation Cert',
  organic_cert: 'Organic Cert',
  insurance: 'Insurance',
  lab_result: 'Lab Result',
  customs_declaration: 'Customs Declaration',
  bill_of_lading: 'Bill of Lading',
  certificate_of_origin: 'Certificate of Origin',
  quality_cert: 'Quality Cert',
  other: 'Other',
};

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  expiring_soon: 'secondary',
  expired: 'destructive',
  archived: 'outline',
};

const statusLabels: Record<string, string> = {
  active: 'Active',
  expiring_soon: 'Expiring Soon',
  expired: 'Expired',
  archived: 'Archived',
};

export default function BuyerDocumentsPage() {
  const [documents, setDocuments] = useState<BuyerDocument[]>([]);
  const [exporters, setExporters] = useState<Exporter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    async function fetchDocuments() {
      try {
        const response = await fetch('/api/buyer?section=documents');
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setDocuments(data.documents || []);
        setExporters(data.exporters || []);
      } catch (error) {
        console.error('Failed to fetch documents:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDocuments();
  }, []);

  const filteredDocuments = documents.filter(doc => {
    if (typeFilter !== 'all' && doc.document_type !== typeFilter) return false;
    if (statusFilter !== 'all' && doc.status !== statusFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return doc.title?.toLowerCase().includes(q)
      || doc.file_name?.toLowerCase().includes(q)
      || doc.document_type?.toLowerCase().includes(q)
      || doc.notes?.toLowerCase().includes(q);
  });

  const expiringCount = documents.filter(d => d.status === 'expiring_soon').length;
  const expiredCount = documents.filter(d => d.status === 'expired').length;

  const docTypes = [...new Set(documents.map(d => d.document_type))];

  return (
    <div className="flex-1 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Documents</h1>
        <p className="text-sm text-muted-foreground mt-1">View documents shared by your exporters</p>
      </div>

      {!isLoading && (expiringCount > 0 || expiredCount > 0) && (
        <Card className="border-yellow-500/30 dark:border-yellow-500/20">
          <CardContent className="py-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0" />
            <div className="text-sm">
              {expiringCount > 0 && (
                <span className="text-yellow-700 dark:text-yellow-300" data-testid="text-expiring-alert">
                  {expiringCount} document{expiringCount > 1 ? 's' : ''} expiring soon.
                </span>
              )}
              {expiringCount > 0 && expiredCount > 0 && ' '}
              {expiredCount > 0 && (
                <span className="text-red-600 dark:text-red-400" data-testid="text-expired-alert">
                  {expiredCount} document{expiredCount > 1 ? 's' : ''} expired.
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && documents.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-muted-foreground">Total Documents</p>
              <p className="text-2xl font-semibold mt-1" data-testid="text-total-documents">{documents.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-semibold mt-1" data-testid="text-active-documents">
                {documents.filter(d => d.status === 'active').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-muted-foreground">Exporters</p>
              <p className="text-2xl font-semibold mt-1" data-testid="text-total-exporters">{exporters.length}</p>
            </CardContent>
          </Card>
        </div>
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
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {docTypes.map(type => (
              <SelectItem key={type} value={type}>{typeLabels[type] || type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-status-filter">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({length:3}).map((_,i)=><div key={i} className="border border-border rounded-xl p-4 bg-card space-y-3"><div className="flex justify-between items-center"><div className="h-4 w-40 bg-muted animate-pulse rounded"/><div className="h-5 w-16 bg-muted animate-pulse rounded-full"/></div><div className="h-3 w-56 bg-muted animate-pulse rounded"/><div className="h-3 w-32 bg-muted animate-pulse rounded"/></div>)}</div>
      ) : filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">No shared documents</h3>
            <p className="text-sm text-muted-foreground max-w-md" data-testid="text-no-documents">
              Documents shared by your exporters (certificates, compliance reports, shipping documents) will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredDocuments.map(doc => (
            <Card key={doc.id} data-testid={`card-document-${doc.id}`}>
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm" data-testid={`text-doc-title-${doc.id}`}>
                          {doc.title}
                        </span>
                        <Badge variant={statusVariants[doc.status] || 'outline'} data-testid={`badge-doc-status-${doc.id}`}>
                          {statusLabels[doc.status] || doc.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {typeLabels[doc.document_type] || doc.document_type}
                        </Badge>
                      </div>
                      {doc.file_url && (
                        <Button variant="ghost" size="sm" asChild data-testid={`button-view-doc-${doc.id}`}>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View
                          </a>
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      {doc.file_name && <span>{doc.file_name}</span>}
                      {doc.file_size && <span>{(doc.file_size / 1024).toFixed(0)} KB</span>}
                      {doc.issued_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Issued: {new Date(doc.issued_date).toLocaleDateString()}
                        </span>
                      )}
                      {doc.expiry_date && (
                        <span className={`flex items-center gap-1 ${doc.status === 'expired' ? 'text-red-600 dark:text-red-400' : doc.status === 'expiring_soon' ? 'text-yellow-600 dark:text-yellow-400' : ''}`}>
                          <Calendar className="h-3 w-3" />
                          Expires: {new Date(doc.expiry_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {doc.notes && (
                      <p className="text-xs text-muted-foreground">{doc.notes}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
