'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Wheat, Globe, Plus, Loader2, Pencil, Trash2, Save, MapPin, Building, ChevronRight, X, Check } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Commodity {
  id: number; name: string; code: string; category: string; unit: string;
  is_active: boolean; is_global: boolean; grades: string[];
  moisture_min: number | null; moisture_max: number | null;
}

interface State { id: number; name: string; code: string; }
interface LGA { id: number; name: string; state_id: number; }

const CATEGORIES = [
  { value: 'tree_crop', label: 'Tree Crop' }, { value: 'root_crop', label: 'Root Crop' },
  { value: 'grain', label: 'Grain' }, { value: 'legume', label: 'Legume' },
  { value: 'seed_crop', label: 'Seed Crop' }, { value: 'vegetable', label: 'Vegetable' },
  { value: 'fruit', label: 'Fruit' }, { value: 'other', label: 'Other' },
];

const UNITS = [
  { value: 'kg', label: 'Kilograms (kg)' }, { value: 'ton', label: 'Metric Tons' },
  { value: 'bag', label: 'Bags' }, { value: 'pieces', label: 'Pieces' },
];

const CAT_COLORS: Record<string, string> = {
  tree_crop: 'bg-green-900/40 text-green-300 border-green-700',
  root_crop: 'bg-orange-900/40 text-orange-300 border-orange-700',
  grain: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  legume: 'bg-blue-900/40 text-blue-300 border-blue-700',
  seed_crop: 'bg-purple-900/40 text-purple-300 border-purple-700',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function ReferenceDataPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const activeTab = searchParams.get('tab') ?? 'commodities';

  // ── Commodity state ──────────────────────────────────────────────────────
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [comLoading, setComLoading] = useState(true);
  const [comSheetOpen, setComSheetOpen] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [commodityToDelete, setCommodityToDelete] = useState<Commodity | null>(null);
  const [editCommodity, setEditCommodity] = useState<Commodity | null>(null);
  const [newGrade, setNewGrade] = useState('');
  const [editNewGrade, setEditNewGrade] = useState('');
  const [newCommodity, setNewCommodity] = useState({
    name: '', code: '', category: 'tree_crop', unit: 'kg', is_global: true,
    grades: [] as string[], moisture_min: '' as string | number, moisture_max: '' as string | number,
  });

  // ── Location state ───────────────────────────────────────────────────────
  const [states, setStates] = useState<State[]>([]);
  const [lgas, setLgas] = useState<LGA[]>([]);
  const [selectedState, setSelectedState] = useState<State | null>(null);
  const [locLoading, setLocLoading] = useState(true);
  const [locCreating, setLocCreating] = useState(false);
  const [locSheetOpen, setLocSheetOpen] = useState(false);
  const [addType, setAddType] = useState<'state' | 'lga'>('lga');
  const [newLocation, setNewLocation] = useState({ name: '', code: '', state_id: '' });

  // ── Data fetching ────────────────────────────────────────────────────────

  useEffect(() => { fetchCommodities(); fetchStates(); }, []);

  async function fetchCommodities() {
    setComLoading(true);
    try {
      const res = await fetch('/api/commodities?include_inactive=true');
      if (res.ok) setCommodities((await res.json()).commodities ?? []);
    } finally { setComLoading(false); }
  }

  async function fetchStates() {
    setLocLoading(true);
    try {
      const res = await fetch('/api/locations?type=states');
      if (res.ok) setStates((await res.json()).states ?? []);
    } finally { setLocLoading(false); }
  }

  async function fetchLgas(stateId: number) {
    try {
      const res = await fetch(`/api/locations?state_id=${stateId}`);
      if (res.ok) setLgas((await res.json()).lgas ?? []);
    } catch { /* silent */ }
  }

  // ── Commodity actions ────────────────────────────────────────────────────

  async function createCommodity() {
    if (!newCommodity.name || !newCommodity.code) {
      toast({ title: 'Name and code required', variant: 'destructive' }); return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/commodities', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCommodity),
      });
      if (res.ok) {
        const created = await res.json();
        setCommodities(prev => [...prev, created.commodity]);
        setComSheetOpen(false);
        setNewCommodity({ name: '', code: '', category: 'tree_crop', unit: 'kg', is_global: true, grades: [], moisture_min: '', moisture_max: '' });
        toast({ title: 'Commodity added' });
      } else {
        toast({ title: 'Error', description: (await res.json()).error, variant: 'destructive' });
      }
    } finally { setCreating(false); }
  }

  async function toggleActive(c: Commodity) {
    const res = await fetch(`/api/commodities?id=${c.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !c.is_active }),
    });
    if (res.ok) setCommodities(prev => prev.map(x => x.id === c.id ? { ...x, is_active: !x.is_active } : x));
  }

  async function saveEdit() {
    if (!editCommodity) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/commodities?id=${editCommodity.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editCommodity),
      });
      if (res.ok) {
        setCommodities(prev => prev.map(x => x.id === editCommodity.id ? (res.json() as any) : x));
        await fetchCommodities();
        setEditSheetOpen(false);
        toast({ title: 'Commodity updated' });
      } else {
        toast({ title: 'Error', description: (await res.json()).error, variant: 'destructive' });
      }
    } finally { setSaving(false); }
  }

  async function deleteCommodity() {
    if (!commodityToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/commodities?id=${commodityToDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        setCommodities(prev => prev.map(x => x.id === commodityToDelete.id ? { ...x, is_active: false } : x));
        setDeleteDialogOpen(false);
        toast({ title: 'Commodity deactivated' });
      }
    } finally { setDeleting(false); }
  }

  // ── Location actions ─────────────────────────────────────────────────────

  async function createLocation() {
    if (!newLocation.name || (addType === 'lga' && !newLocation.state_id)) {
      toast({ title: 'Missing fields', variant: 'destructive' }); return;
    }
    setLocCreating(true);
    try {
      const res = await fetch('/api/locations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: addType, name: newLocation.name,
          code: newLocation.code || newLocation.name.substring(0, 2).toUpperCase(),
          state_id: addType === 'lga' ? parseInt(newLocation.state_id) : undefined,
        }),
      });
      if (res.ok) {
        if (addType === 'state') await fetchStates();
        else if (selectedState) await fetchLgas(selectedState.id);
        setLocSheetOpen(false);
        setNewLocation({ name: '', code: '', state_id: '' });
        toast({ title: `${addType === 'state' ? 'State' : 'LGA'} added` });
      } else {
        toast({ title: 'Error', description: (await res.json()).error, variant: 'destructive' });
      }
    } finally { setLocCreating(false); }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Reference Data</h1>
        <p className="text-slate-400">Manage global commodities and geographic location hierarchy</p>
      </div>

      <Tabs value={activeTab} onValueChange={tab => router.replace(`?tab=${tab}`)}>
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger value="commodities" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400">
            <Wheat className="h-4 w-4 mr-2" />Commodities
          </TabsTrigger>
          <TabsTrigger value="locations" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400">
            <Globe className="h-4 w-4 mr-2" />Locations
          </TabsTrigger>
        </TabsList>

        {/* ── Commodities tab ── */}
        <TabsContent value="commodities" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-sm">{commodities.filter(c => c.is_active).length} active · {commodities.length} total</p>
            <Sheet open={comSheetOpen} onOpenChange={setComSheetOpen}>
              <SheetTrigger asChild>
                <Button className="bg-[#2E7D6B] hover:bg-[#1F5F52]" data-testid="button-add-commodity">
                  <Plus className="h-4 w-4 mr-2" />Add Commodity
                </Button>
              </SheetTrigger>
              <SheetContent className="bg-slate-900 border-slate-700 text-white">
                <SheetHeader>
                  <SheetTitle className="text-white">Add Commodity</SheetTitle>
                  <SheetDescription className="text-slate-400">Add to the global commodity master list</SheetDescription>
                </SheetHeader>
                <div className="space-y-4 mt-6">
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Name *</Label>
                    <Input value={newCommodity.name} placeholder="e.g. Cocoa"
                      onChange={e => setNewCommodity(p => ({ ...p, name: e.target.value, code: e.target.value.toUpperCase().replace(/\s+/g, '_') }))}
                      className="bg-slate-800 border-slate-600 text-white" data-testid="input-commodity-name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Code *</Label>
                    <Input value={newCommodity.code} placeholder="COCOA"
                      onChange={e => setNewCommodity(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                      className="bg-slate-800 border-slate-600 text-white" data-testid="input-commodity-code" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Category</Label>
                    <Select value={newCommodity.category} onValueChange={v => setNewCommodity(p => ({ ...p, category: v }))}>
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Unit</Label>
                    <Select value={newCommodity.unit} onValueChange={v => setNewCommodity(p => ({ ...p, unit: v }))}>
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        {UNITS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Grades</Label>
                    <div className="flex gap-2">
                      <Input value={newGrade} placeholder="e.g. Grade A" onChange={e => setNewGrade(e.target.value)}
                        className="bg-slate-800 border-slate-600 text-white"
                        onKeyDown={e => { if (e.key === 'Enter' && newGrade.trim()) { setNewCommodity(p => ({ ...p, grades: [...p.grades, newGrade.trim()] })); setNewGrade(''); } }} />
                      <Button type="button" size="sm" variant="outline" className="border-slate-600 text-slate-300 shrink-0"
                        onClick={() => { if (newGrade.trim()) { setNewCommodity(p => ({ ...p, grades: [...p.grades, newGrade.trim()] })); setNewGrade(''); } }}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {newCommodity.grades.map(g => (
                        <Badge key={g} variant="outline" className="border-slate-600 text-slate-300 gap-1">
                          {g}<button onClick={() => setNewCommodity(p => ({ ...p, grades: p.grades.filter(x => x !== g) }))}><X className="h-3 w-3" /></button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <Switch checked={newCommodity.is_global} onCheckedChange={v => setNewCommodity(p => ({ ...p, is_global: v }))} />
                    <Label className="text-slate-300">Available to all organisations</Label>
                  </div>
                  <Button onClick={createCommodity} disabled={creating || !newCommodity.name || !newCommodity.code} className="w-full bg-[#2E7D6B] hover:bg-[#1F5F52]">
                    {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}Create
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <Card className="bg-slate-900 border-slate-700">
            <CardContent className="pt-4">
              {comLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700">
                      <TableHead className="text-slate-400">Name</TableHead>
                      <TableHead className="text-slate-400">Code</TableHead>
                      <TableHead className="text-slate-400">Category</TableHead>
                      <TableHead className="text-slate-400">Unit</TableHead>
                      <TableHead className="text-slate-400">Grades</TableHead>
                      <TableHead className="text-slate-400">Global</TableHead>
                      <TableHead className="text-slate-400">Active</TableHead>
                      <TableHead className="text-slate-400">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commodities.map(c => (
                      <TableRow key={c.id} className="border-slate-700 hover:bg-slate-800/40" data-testid={`row-commodity-${c.id}`}>
                        <TableCell className="font-medium text-white">{c.name}</TableCell>
                        <TableCell><span className="font-mono text-xs text-slate-400">{c.code}</span></TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs capitalize ${CAT_COLORS[c.category] ?? 'border-slate-600 text-slate-400'}`}>
                            {c.category.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-300 text-sm">{c.unit}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(c.grades ?? []).slice(0, 3).map(g => (
                              <Badge key={g} variant="outline" className="text-xs border-slate-600 text-slate-400">{g}</Badge>
                            ))}
                            {(c.grades ?? []).length > 3 && <Badge variant="outline" className="text-xs border-slate-600 text-slate-500">+{c.grades.length - 3}</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {c.is_global ? <Check className="h-4 w-4 text-green-400" /> : <X className="h-4 w-4 text-slate-600" />}
                        </TableCell>
                        <TableCell>
                          <Switch checked={c.is_active} onCheckedChange={() => toggleActive(c)} data-testid={`switch-active-${c.id}`} />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
                              onClick={() => { setEditCommodity({ ...c }); setEditSheetOpen(true); }} data-testid={`button-edit-${c.id}`}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                              onClick={() => { setCommodityToDelete(c); setDeleteDialogOpen(true); }} data-testid={`button-delete-${c.id}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {commodities.length === 0 && (
                      <TableRow><TableCell colSpan={8} className="text-center py-12 text-slate-500">No commodities found</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Edit sheet */}
          <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
            <SheetContent className="bg-slate-900 border-slate-700 text-white">
              <SheetHeader>
                <SheetTitle className="text-white">Edit Commodity</SheetTitle>
                <SheetDescription className="text-slate-400">{editCommodity?.name}</SheetDescription>
              </SheetHeader>
              {editCommodity && (
                <div className="space-y-4 mt-6">
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Name</Label>
                    <Input value={editCommodity.name} onChange={e => setEditCommodity(p => p ? { ...p, name: e.target.value } : p)}
                      className="bg-slate-800 border-slate-600 text-white" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Category</Label>
                    <Select value={editCommodity.category} onValueChange={v => setEditCommodity(p => p ? { ...p, category: v } : p)}>
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Unit</Label>
                    <Select value={editCommodity.unit} onValueChange={v => setEditCommodity(p => p ? { ...p, unit: v } : p)}>
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        {UNITS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Grades</Label>
                    <div className="flex gap-2">
                      <Input value={editNewGrade} placeholder="Add grade" onChange={e => setEditNewGrade(e.target.value)}
                        className="bg-slate-800 border-slate-600 text-white"
                        onKeyDown={e => { if (e.key === 'Enter' && editNewGrade.trim()) { setEditCommodity(p => p ? { ...p, grades: [...(p.grades ?? []), editNewGrade.trim()] } : p); setEditNewGrade(''); } }} />
                      <Button type="button" size="sm" variant="outline" className="border-slate-600 text-slate-300 shrink-0"
                        onClick={() => { if (editNewGrade.trim()) { setEditCommodity(p => p ? { ...p, grades: [...(p.grades ?? []), editNewGrade.trim()] } : p); setEditNewGrade(''); } }}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {(editCommodity.grades ?? []).map(g => (
                        <Badge key={g} variant="outline" className="border-slate-600 text-slate-300 gap-1">
                          {g}<button onClick={() => setEditCommodity(p => p ? { ...p, grades: p.grades.filter(x => x !== g) } : p)}><X className="h-3 w-3" /></button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={editCommodity.is_global} onCheckedChange={v => setEditCommodity(p => p ? { ...p, is_global: v } : p)} />
                    <Label className="text-slate-300">Available to all organisations</Label>
                  </div>
                  <Button onClick={saveEdit} disabled={saving} className="w-full bg-[#2E7D6B] hover:bg-[#1F5F52]">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}Save Changes
                  </Button>
                </div>
              )}
            </SheetContent>
          </Sheet>

          {/* Delete dialog */}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-white">Deactivate Commodity</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Deactivate <span className="text-white font-medium">{commodityToDelete?.name}</span>? It will be hidden from organizations.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button variant="ghost" className="text-slate-400" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                <Button onClick={deleteCommodity} disabled={deleting} className="bg-red-700 hover:bg-red-800">
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}Deactivate
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ── Locations tab ── */}
        <TabsContent value="locations" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-sm">{states.length} states loaded</p>
            <Sheet open={locSheetOpen} onOpenChange={setLocSheetOpen}>
              <SheetTrigger asChild>
                <Button className="bg-[#2E7D6B] hover:bg-[#1F5F52]" data-testid="button-add-location">
                  <Plus className="h-4 w-4 mr-2" />Add Location
                </Button>
              </SheetTrigger>
              <SheetContent className="bg-slate-900 border-slate-700 text-white">
                <SheetHeader>
                  <SheetTitle className="text-white">Add Location</SheetTitle>
                  <SheetDescription className="text-slate-400">Add a state or LGA to the hierarchy</SheetDescription>
                </SheetHeader>
                <div className="space-y-4 mt-6">
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Type</Label>
                    <Select value={addType} onValueChange={(v: 'state' | 'lga') => setAddType(v)}>
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-white" data-testid="select-location-type"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        <SelectItem value="state">State</SelectItem>
                        <SelectItem value="lga">LGA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {addType === 'lga' && (
                    <div className="space-y-1.5">
                      <Label className="text-slate-300">State *</Label>
                      <Select value={newLocation.state_id} onValueChange={v => setNewLocation(p => ({ ...p, state_id: v }))}>
                        <SelectTrigger className="bg-slate-800 border-slate-600 text-white" data-testid="select-state"><SelectValue placeholder="Select state" /></SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600">
                          {states.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">{addType === 'state' ? 'State' : 'LGA'} Name *</Label>
                    <Input value={newLocation.name} placeholder={addType === 'state' ? 'e.g. Lagos' : 'e.g. Ikeja'}
                      onChange={e => setNewLocation(p => ({ ...p, name: e.target.value }))}
                      className="bg-slate-800 border-slate-600 text-white" data-testid="input-location-name" />
                  </div>
                  {addType === 'state' && (
                    <div className="space-y-1.5">
                      <Label className="text-slate-300">State Code</Label>
                      <Input value={newLocation.code} placeholder="e.g. LA" maxLength={2}
                        onChange={e => setNewLocation(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                        className="bg-slate-800 border-slate-600 text-white" data-testid="input-state-code" />
                    </div>
                  )}
                  <Button onClick={createLocation} disabled={locCreating || !newLocation.name || (addType === 'lga' && !newLocation.state_id)}
                    className="w-full bg-[#2E7D6B] hover:bg-[#1F5F52]" data-testid="button-submit-location">
                    {locCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    Add {addType === 'state' ? 'State' : 'LGA'}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2"><Building className="h-4 w-4 text-slate-400" />States ({states.length})</CardTitle>
                <CardDescription className="text-slate-400">Click a state to view its LGAs</CardDescription>
              </CardHeader>
              <CardContent>
                {locLoading ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
                ) : (
                  <div className="space-y-0.5 max-h-96 overflow-y-auto">
                    {states.map(state => (
                      <button key={state.id}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${selectedState?.id === state.id ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-300 hover:bg-slate-800'}`}
                        onClick={() => { setSelectedState(state); fetchLgas(state.id); }}
                        data-testid={`button-state-${state.id}`}>
                        <span className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs border-slate-600 text-slate-400">{state.code}</Badge>
                          {state.name}
                        </span>
                        <ChevronRight className="h-4 w-4 opacity-50" />
                      </button>
                    ))}
                    {states.length === 0 && <p className="text-center text-slate-500 py-8 text-sm">No states found</p>}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  {selectedState ? `LGAs — ${selectedState.name}` : 'LGAs'}
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {selectedState ? `${lgas.length} local government areas` : 'Select a state to view LGAs'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedState ? (
                  <p className="text-slate-500 text-sm py-8 text-center">Select a state from the left</p>
                ) : (
                  <div className="space-y-0.5 max-h-96 overflow-y-auto">
                    {lgas.map(lga => (
                      <div key={lga.id} className="flex items-center px-3 py-2 text-sm text-slate-300 rounded-lg hover:bg-slate-800">
                        <MapPin className="h-3.5 w-3.5 mr-2 text-slate-500 shrink-0" />{lga.name}
                      </div>
                    ))}
                    {lgas.length === 0 && <p className="text-center text-slate-500 py-8 text-sm">No LGAs found</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
