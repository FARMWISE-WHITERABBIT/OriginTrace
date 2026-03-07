'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FolderOpen, Search } from 'lucide-react';

export default function BuyerDocumentsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="flex-1 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Documents</h1>
        <p className="text-sm text-muted-foreground mt-1">View documents shared by your exporters</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search documents..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" data-testid="input-search-documents" />
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-1">No shared documents</h3>
          <p className="text-sm text-muted-foreground max-w-md" data-testid="text-no-documents">
            Documents shared by your exporters (certificates, compliance reports, shipping documents) will appear here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
