'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  CalendarDays, Plus, Loader2, Pencil, Trash2, Users,
  Download, ToggleLeft, ToggleRight, ExternalLink, RefreshCw,
} from 'lucide-react';

interface Event {
  id: string;
  slug: string;
  title: string;
  short_title: string | null;
  description: string | null;
  theme: string | null;
  partner: string | null;
  date: string;
  start_time: string;
  location: string;
  location_address: string | null;
  tags: string[];
  is_free: boolean;
  registration_open: boolean;
  registration_closes_at: string | null;
  created_at: string;
  registration_count: number;
}

const EMPTY_FORM = {
  slug: '',
  title: '',
  short_title: '',
  description: '',
  theme: '',
  partner: '',
  date: '',
  start_time: '09:00',
  location: '',
  location_address: '',
  tags: '',
  is_free: true,
  registration_open: true,
  registration_closes_at: '',
};

type FormState = typeof EMPTY_FORM;

export default function SuperadminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const { toast } = useToast();

  async function fetchEvents() {
    setLoading(true);
    try {
      const res = await fetch('/api/superadmin/events');
      if (!res.ok) throw new Error('Failed to load events');
      const data = await res.json();
      setEvents(data.events ?? []);
    } catch {
      toast({ title: 'Error', description: 'Failed to load events', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchEvents(); }, []);

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setCreateSheetOpen(true);
  }

  function openEdit(event: Event) {
    setSelectedEvent(event);
    setForm({
      slug: event.slug,
      title: event.title,
      short_title: event.short_title ?? '',
      description: event.description ?? '',
      theme: event.theme ?? '',
      partner: event.partner ?? '',
      date: event.date,
      start_time: event.start_time,
      location: event.location,
      location_address: event.location_address ?? '',
      tags: (event.tags ?? []).join(', '),
      is_free: event.is_free,
      registration_open: event.registration_open,
      registration_closes_at: event.registration_closes_at
        ? new Date(event.registration_closes_at).toISOString().slice(0, 16)
        : '',
    });
    setEditSheetOpen(true);
  }

  function buildPayload(f: FormState) {
    return {
      slug: f.slug.trim(),
      title: f.title.trim(),
      short_title: f.short_title.trim() || null,
      description: f.description.trim() || null,
      theme: f.theme.trim() || null,
      partner: f.partner.trim() || null,
      date: f.date,
      start_time: f.start_time || '09:00',
      location: f.location.trim(),
      location_address: f.location_address.trim() || null,
      tags: f.tags ? f.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      is_free: f.is_free,
      registration_open: f.registration_open,
      registration_closes_at: f.registration_closes_at
        ? new Date(f.registration_closes_at).toISOString()
        : null,
    };
  }

  async function handleCreate() {
    setSaving(true);
    try {
      const res = await fetch('/api/superadmin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(form)),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Error', description: data.error ?? 'Failed to create event', variant: 'destructive' });
        return;
      }
      toast({ title: 'Event created', description: `${data.event.title} is now live.` });
      setCreateSheetOpen(false);
      fetchEvents();
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate() {
    if (!selectedEvent) return;
    setSaving(true);
    try {
      const res = await fetch('/api/superadmin/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: selectedEvent.slug, ...buildPayload(form) }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Error', description: data.error ?? 'Failed to update event', variant: 'destructive' });
        return;
      }
      toast({ title: 'Event updated' });
      setEditSheetOpen(false);
      fetchEvents();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleRegistration(event: Event) {
    const res = await fetch('/api/superadmin/events', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: event.slug, registration_open: !event.registration_open }),
    });
    if (res.ok) {
      toast({
        title: event.registration_open ? 'Registration closed' : 'Registration opened',
        description: event.title,
      });
      fetchEvents();
    }
  }

  async function handleDelete() {
    if (!selectedEvent) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/superadmin/events?slug=${selectedEvent.slug}`, { method: 'DELETE' });
      if (!res.ok) {
        toast({ title: 'Error', description: 'Failed to delete event', variant: 'destructive' });
        return;
      }
      toast({ title: 'Event deleted', description: selectedEvent.title });
      setDeleteDialogOpen(false);
      setSelectedEvent(null);
      fetchEvents();
    } finally {
      setDeleting(false);
    }
  }

  async function handleExport(slug: string) {
    setExporting(slug);
    try {
      const adminKey = prompt('Enter admin key to export registrations:');
      if (!adminKey) return;
      const res = await fetch(`/api/events/export?slug=${slug}`, {
        headers: { 'x-admin-key': adminKey },
      });
      if (!res.ok) {
        toast({ title: 'Export failed', description: 'Check your admin key', variant: 'destructive' });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug}_registrations.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  }

  function isOpen(event: Event): boolean {
    if (!event.registration_open) return false;
    if (event.registration_closes_at && new Date() > new Date(event.registration_closes_at)) return false;
    return true;
  }

  const EventForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Slug <span className="text-red-400">*</span></Label>
          <Input name="slug" value={form.slug} onChange={handleFormChange} placeholder="yexdep-2027" className="bg-slate-800 border-slate-600 text-white" />
          <p className="text-xs text-slate-500">URL-safe, lowercase, hyphens only</p>
        </div>
        <div className="space-y-1">
          <Label>Short Title</Label>
          <Input name="short_title" value={form.short_title} onChange={handleFormChange} placeholder="YEXDEP 2027" className="bg-slate-800 border-slate-600 text-white" />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Full Title <span className="text-red-400">*</span></Label>
        <Input name="title" value={form.title} onChange={handleFormChange} placeholder="Youth Export Development Programme" className="bg-slate-800 border-slate-600 text-white" />
      </div>

      <div className="space-y-1">
        <Label>Theme / Tagline</Label>
        <Input name="theme" value={form.theme} onChange={handleFormChange} placeholder='"From Passion to Port: …"' className="bg-slate-800 border-slate-600 text-white" />
      </div>

      <div className="space-y-1">
        <Label>Partner Organisation</Label>
        <Input name="partner" value={form.partner} onChange={handleFormChange} placeholder="Nigerian Export Promotion Council" className="bg-slate-800 border-slate-600 text-white" />
      </div>

      <div className="space-y-1">
        <Label>Description</Label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleFormChange}
          rows={3}
          placeholder="Brief event description…"
          className="w-full rounded-md border border-slate-600 bg-slate-800 text-white px-3 py-2 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Date <span className="text-red-400">*</span></Label>
          <Input name="date" type="date" value={form.date} onChange={handleFormChange} className="bg-slate-800 border-slate-600 text-white" />
        </div>
        <div className="space-y-1">
          <Label>Start Time</Label>
          <Input name="start_time" type="time" value={form.start_time} onChange={handleFormChange} className="bg-slate-800 border-slate-600 text-white" />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Location <span className="text-red-400">*</span></Label>
        <Input name="location" value={form.location} onChange={handleFormChange} placeholder="NEPC Enugu Regional Office" className="bg-slate-800 border-slate-600 text-white" />
      </div>

      <div className="space-y-1">
        <Label>Full Address</Label>
        <Input name="location_address" value={form.location_address} onChange={handleFormChange} placeholder="Agric Bank Building, Independence Layout, Enugu" className="bg-slate-800 border-slate-600 text-white" />
      </div>

      <div className="space-y-1">
        <Label>Tags <span className="text-slate-500 font-normal">(comma-separated)</span></Label>
        <Input name="tags" value={form.tags} onChange={handleFormChange} placeholder="Export, Youth, Nigeria" className="bg-slate-800 border-slate-600 text-white" />
      </div>

      <div className="space-y-1">
        <Label>Registration Closes At</Label>
        <Input name="registration_closes_at" type="datetime-local" value={form.registration_closes_at} onChange={handleFormChange} className="bg-slate-800 border-slate-600 text-white" />
        <p className="text-xs text-slate-500">Leave blank for no auto-close</p>
      </div>

      <div className="flex items-center gap-6 pt-2">
        <div className="flex items-center gap-2">
          <Switch
            checked={form.is_free}
            onCheckedChange={v => setForm(prev => ({ ...prev, is_free: v }))}
            className="data-[state=checked]:bg-cyan-500"
          />
          <Label className="cursor-pointer">Free event</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={form.registration_open}
            onCheckedChange={v => setForm(prev => ({ ...prev, registration_open: v }))}
            className="data-[state=checked]:bg-cyan-500"
          />
          <Label className="cursor-pointer">Registration open</Label>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button onClick={onSubmit} disabled={saving} className="bg-cyan-600 hover:bg-cyan-700 text-white flex-1">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {submitLabel}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <CalendarDays className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Events</h1>
            <p className="text-sm text-slate-400">Create and manage events shown on the public /events page</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={fetchEvents} className="text-slate-400 hover:text-white">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={openCreate} className="bg-cyan-600 hover:bg-cyan-700 text-white gap-2">
            <Plus className="h-4 w-4" /> New Event
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400 mb-1">Total Events</p>
            <p className="text-2xl font-bold text-white">{events.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400 mb-1">Open for Registration</p>
            <p className="text-2xl font-bold text-cyan-400">{events.filter(isOpen).length}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400 mb-1">Total Registrations</p>
            <p className="text-2xl font-bold text-white">{events.reduce((s, e) => s + e.registration_count, 0)}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400 mb-1">Upcoming Events</p>
            <p className="text-2xl font-bold text-white">
              {events.filter(e => new Date(e.date) >= new Date()).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Events table */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-base">All Events</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDays className="h-10 w-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No events yet</p>
              <Button onClick={openCreate} variant="ghost" className="mt-3 text-cyan-400 hover:text-cyan-300">
                Create your first event
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-400">Event</TableHead>
                  <TableHead className="text-slate-400">Date</TableHead>
                  <TableHead className="text-slate-400">Location</TableHead>
                  <TableHead className="text-slate-400 text-center">Registrations</TableHead>
                  <TableHead className="text-slate-400 text-center">Status</TableHead>
                  <TableHead className="text-slate-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map(event => (
                  <TableRow key={event.id} className="border-slate-700 hover:bg-slate-800/50">
                    <TableCell>
                      <div>
                        <p className="text-white font-medium text-sm">{event.title}</p>
                        {event.short_title && (
                          <p className="text-xs text-slate-500">{event.short_title}</p>
                        )}
                        {event.partner && (
                          <p className="text-xs text-slate-500 mt-0.5">× {event.partner}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-300 text-sm whitespace-nowrap">
                      {new Date(event.date + 'T00:00:00').toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                      <br />
                      <span className="text-xs text-slate-500">{event.start_time}</span>
                    </TableCell>
                    <TableCell className="text-slate-300 text-sm max-w-[180px] truncate">
                      {event.location}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-white font-semibold">{event.registration_count}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {isOpen(event) ? (
                        <Badge className="bg-green-500/10 text-green-400 border-green-500/30">Open</Badge>
                      ) : (
                        <Badge className="bg-slate-700 text-slate-400 border-slate-600">Closed</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {/* Toggle registration */}
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => handleToggleRegistration(event)}
                          title={event.registration_open ? 'Close registration' : 'Open registration'}
                          className="text-slate-400 hover:text-cyan-400 h-8 w-8 p-0"
                        >
                          {event.registration_open
                            ? <ToggleRight className="h-4 w-4" />
                            : <ToggleLeft className="h-4 w-4" />}
                        </Button>

                        {/* Export */}
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => handleExport(event.slug)}
                          disabled={exporting === event.slug}
                          title="Export registrations"
                          className="text-slate-400 hover:text-cyan-400 h-8 w-8 p-0"
                        >
                          {exporting === event.slug
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Download className="h-4 w-4" />}
                        </Button>

                        {/* View public page */}
                        <a
                          href={`/events/${event.slug.replace('-2026', '').replace('-2027', '').replace(/-\d{4}$/, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View public page"
                          className="inline-flex items-center justify-center h-8 w-8 text-slate-400 hover:text-cyan-400 transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>

                        {/* Edit */}
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => openEdit(event)}
                          title="Edit event"
                          className="text-slate-400 hover:text-cyan-400 h-8 w-8 p-0"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        {/* Delete */}
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => { setSelectedEvent(event); setDeleteDialogOpen(true); }}
                          title="Delete event"
                          className="text-slate-400 hover:text-red-400 h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create sheet */}
      <Sheet open={createSheetOpen} onOpenChange={setCreateSheetOpen}>
        <SheetContent className="bg-slate-900 border-slate-700 text-white w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-white">Create New Event</SheetTitle>
            <SheetDescription className="text-slate-400">
              Fill in the details below. The event will appear on the public /events page immediately.
            </SheetDescription>
          </SheetHeader>
          <EventForm onSubmit={handleCreate} submitLabel="Create Event" />
        </SheetContent>
      </Sheet>

      {/* Edit sheet */}
      <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
        <SheetContent className="bg-slate-900 border-slate-700 text-white w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-white">Edit Event</SheetTitle>
            <SheetDescription className="text-slate-400">
              Changes are reflected on the public /events page within 5 minutes.
            </SheetDescription>
          </SheetHeader>
          <EventForm onSubmit={handleUpdate} submitLabel="Save Changes" />
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Event?</DialogTitle>
            <DialogDescription className="text-slate-400">
              This will permanently delete <strong className="text-white">{selectedEvent?.title}</strong> and all its
              registration data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)} className="text-slate-400 hover:text-white">
              Cancel
            </Button>
            <Button onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
