'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileCheck2, Loader2, Vault } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DocumentUpload, type UploadResult } from '@/components/document-upload';
import { useToast } from '@/hooks/use-toast';

const DOCUMENT_TYPES = [
  { value: 'other', labelKey: 'typesOther' },
  { value: 'quality_cert', labelKey: 'typesQuality' },
  { value: 'lab_result', labelKey: 'typesLab' },
  { value: 'certificate_of_origin', labelKey: 'typesOrigin' },
  { value: 'phytosanitary', labelKey: 'typesPhytosanitary' },
] as const;

const ENTITY_TYPES = [
  { value: 'none', labelKey: 'entityNone' },
  { value: 'shipment', labelKey: 'entityShipment' },
  { value: 'farm', labelKey: 'entityFarm' },
  { value: 'farmer', labelKey: 'entityFarmer' },
  { value: 'batch', labelKey: 'entityBatch' },
  { value: 'organization', labelKey: 'entityOrganization' },
] as const;

export default function EvidencePage() {
  const t = useTranslations('Evidence');
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState('other');
  const [linkedEntityType, setLinkedEntityType] = useState('none');
  const [linkedEntityId, setLinkedEntityId] = useState('');
  const [notes, setNotes] = useState('');
  const [upload, setUpload] = useState<UploadResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim() || !upload) {
      setError(t('missingFields'));
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          document_type: documentType,
          file_url: upload.url,
          file_name: upload.file_name,
          file_size: upload.file_size,
          linked_entity_type: linkedEntityType === 'none' ? null : linkedEntityType,
          linked_entity_id: linkedEntityId.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || data.message || t('failedTitle'));
      }

      setMessage(t('savedTitle'));
      toast({ title: t('savedTitle') });
    } catch (saveError) {
      const saveMessage = saveError instanceof Error ? saveError.message : t('failedTitle');
      setError(saveMessage);
      toast({ title: t('failedTitle'), description: saveMessage, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/app/documents">
            <Vault className="mr-2 h-4 w-4" />
            {t('documentVault')}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('documentDetails')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="evidence-title">{t('documentTitle')}</Label>
                <Input
                  id="evidence-title"
                  value={title}
                  onChange={event => setTitle(event.target.value)}
                  placeholder={t('documentTitlePlaceholder')}
                  data-testid="input-evidence-title"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('documentType')}</Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger data-testid="select-evidence-document-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('linkType')}</Label>
                <Select value={linkedEntityType} onValueChange={setLinkedEntityType}>
                  <SelectTrigger data-testid="select-evidence-entity-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_TYPES.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="linked-entity-id">{t('linkId')}</Label>
                <Input
                  id="linked-entity-id"
                  value={linkedEntityId}
                  onChange={event => setLinkedEntityId(event.target.value)}
                  placeholder={t('linkIdPlaceholder')}
                  disabled={linkedEntityType === 'none'}
                  data-testid="input-evidence-entity-id"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('upload')}</Label>
              <DocumentUpload
                onUploadComplete={setUpload}
                onClear={() => setUpload(null)}
                currentFileName={upload?.file_name}
                currentFileUrl={upload?.url}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="evidence-notes">{t('notes')}</Label>
              <Textarea
                id="evidence-notes"
                value={notes}
                onChange={event => setNotes(event.target.value)}
                placeholder={t('notesPlaceholder')}
                data-testid="textarea-evidence-notes"
              />
            </div>

            {error && (
              <Alert variant="destructive" data-testid="alert-evidence-error">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {message && (
              <Alert data-testid="alert-evidence-success">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={isSaving} data-testid="button-save-evidence">
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileCheck2 className="mr-2 h-4 w-4" />
              )}
              {isSaving ? t('saving') : t('save')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
