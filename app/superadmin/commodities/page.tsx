'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Wheat, Plus, Loader2, Check, X, Pencil, Trash2, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Commodity {
  id: number;
  name: string;
  code: string;
  category: string;
  unit: string;
  is_active: boolean;
  is_global: boolean;
  created_by_org_id: number | null;
  created_at: string;
  grades: string[];
  moisture_min: number | null;
  moisture_max: number | null;
  collection_metrics: Record<string, any>;
}

const CATEGORIES = [
  { value: 'tree_crop', label: 'Tree Crop' },
  { value: 'root_crop', label: 'Root Crop' },
  { value: 'grain', label: 'Grain' },
  { value: 'legume', label: 'Legume' },
  { value: 'seed_crop', label: 'Seed Crop' },
  { value: 'flower_crop', label: 'Flower Crop' },
  { value: 'vegetable', label: 'Vegetable' },
  { value: 'fruit', label: 'Fruit' },
  { value: 'other', label: 'Other' },
];

const UNITS = [
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'ton', label: 'Metric Tons' },
  { value: 'litres', label: 'Litres (L)' },
  { value: 'ml', label: 'Millilitres (mL)' },
  { value: 'bag', label: 'Bags' },
  { value: 'pieces', label: 'Pieces' },
];

export default function CommoditiesPage() {
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [commodityToDelete, setCommodityToDelete] = useState<Commodity | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const [newCommodity, setNewCommodity] = useState({
    name: '',
    code: '',
    category: 'tree_crop',
    unit: 'kg',
    is_global: true,
    grades: [] as string[],
    moisture_min: '' as string | number,
    moisture_max: '' as string | number,
    collection_metrics: {} as Record<string, any>
  });
  
  const [newGrade, setNewGrade] = useState('');
  const [editNewGrade, setEditNewGrade] = useState('');

  const [editCommodity, setEditCommodity] = useState<Commodity | null>(null);

  useEffect(() => {
    fetchCommodities();
  }, []);

  async function fetchCommodities() {
    try {
      const res = await fetch('/api/commodities?include_inactive=true');
      if (res.ok) {
        const data = await res.json();
        setCommodities(data.commodities || []);
      }
    } catch (error) {
      console.error('Failed to fetch commodities:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createCommodity() {
    if (!newCommodity.name || !newCommodity.code) {
      toast({ title: 'Error', description: 'Name and code are required', variant: 'destructive' });
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/commodities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCommodity)
      });

      if (res.ok) {
        const data = await res.json();
        setCommodities([...commodities, data.commodity]);
        setSheetOpen(false);
        toast({ title: 'Success', description: 'Commodity added to master list' });
        setNewCommodity({
          name: '',
          code: '',
          category: 'tree_crop',
          unit: 'kg',
          is_global: true,
          grades: [],
          moisture_min: '',
          moisture_max: '',
          collection_metrics: {}
        });
        setNewGrade('');
      } else {
        const error = await res.json();
        toast({ title: 'Error', description: error.error || 'Failed to create commodity', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to create commodity:', error);
      toast({ title: 'Error', description: 'Failed to create commodity', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(commodity: Commodity) {
    try {
      const res = await fetch(`/api/commodities?id=${commodity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !commodity.is_active })
      });

      if (res.ok) {
        setCommodities(commodities.map(c => 
          c.id === commodity.id ? { ...c, is_active: !c.is_active } : c
        ));
        toast({ title: 'Updated', description: `${commodity.name} ${!commodity.is_active ? 'activated' : 'deactivated'}` });
      }
    } catch (error) {
      console.error('Failed to update commodity:', error);
    }
  }

  function openEditSheet(commodity: Commodity) {
    setEditCommodity({ ...commodity });
    setEditSheetOpen(true);
  }

  async function saveEditedCommodity() {
    if (!editCommodity) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/commodities?id=${editCommodity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editCommodity.name,
          category: editCommodity.category,
          unit: editCommodity.unit,
          is_global: editCommodity.is_global,
          grades: editCommodity.grades || [],
          moisture_min: editCommodity.moisture_min,
          moisture_max: editCommodity.moisture_max,
          collection_metrics: editCommodity.collection_metrics || {}
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCommodities(commodities.map(c => 
          c.id === editCommodity.id ? data.commodity : c
        ));
        setEditSheetOpen(false);
        setEditCommodity(null);
        toast({ title: 'Success', description: 'Commodity updated successfully' });
      } else {
        const error = await res.json();
        toast({ title: 'Error', description: error.error || 'Failed to update commodity', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to update commodity:', error);
      toast({ title: 'Error', description: 'Failed to update commodity', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  function openDeleteDialog(commodity: Commodity) {
    setCommodityToDelete(commodity);
    setDeleteDialogOpen(true);
  }

  async function deleteCommodity() {
    if (!commodityToDelete) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/commodities?id=${commodityToDelete.id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        // Soft delete - update the item's is_active status in state
        setCommodities(commodities.map(c => 
          c.id === commodityToDelete.id ? { ...c, is_active: false } : c
        ));
        setDeleteDialogOpen(false);
        setCommodityToDelete(null);
        toast({ title: 'Deactivated', description: `${commodityToDelete.name} has been deactivated` });
      } else {
        const error = await res.json();
        toast({ title: 'Error', description: error.error || 'Failed to delete commodity', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to delete commodity:', error);
      toast({ title: 'Error', description: 'Failed to delete commodity', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  }

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      tree_crop: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      root_crop: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      grain: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      legume: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      seed_crop: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    };
    return (
      <Badge className={`capitalize ${colors[category] || 'bg-gray-100 text-gray-800'}`}>
        {category.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wheat className="h-6 w-6 text-green-600" />
            Commodity Master
          </h1>
          <p className="text-muted-foreground">
            Manage the global list of commodities available to all organizations
          </p>
        </div>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button data-testid="button-add-commodity">
              <Plus className="h-4 w-4 mr-2" />
              Add Commodity
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Add New Commodity</SheetTitle>
              <SheetDescription>
                Add a new commodity to the global master list
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 mt-6">
              <div>
                <Label htmlFor="name">Commodity Name *</Label>
                <Input
                  id="name"
                  value={newCommodity.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setNewCommodity({ 
                      ...newCommodity, 
                      name,
                      code: name.toUpperCase().replace(/\s+/g, '_')
                    });
                  }}
                  placeholder="e.g., Cocoa"
                  data-testid="input-commodity-name"
                />
              </div>

              <div>
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  value={newCommodity.code}
                  onChange={(e) => setNewCommodity({ ...newCommodity, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., COCOA"
                  data-testid="input-commodity-code"
                />
                <p className="text-xs text-muted-foreground mt-1">Unique identifier, uppercase letters only</p>
              </div>

              <div>
                <Label>Category</Label>
                <Select
                  value={newCommodity.category}
                  onValueChange={(value) => setNewCommodity({ ...newCommodity, category: value })}
                >
                  <SelectTrigger data-testid="select-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Default Unit</Label>
                <Select
                  value={newCommodity.unit}
                  onValueChange={(value) => setNewCommodity({ ...newCommodity, unit: value })}
                >
                  <SelectTrigger data-testid="select-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-4 mt-4">
                <Label className="text-sm font-medium">Quality Grades</Label>
                <p className="text-xs text-muted-foreground mb-2">Define grading options for collection</p>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newGrade}
                    onChange={(e) => setNewGrade(e.target.value)}
                    placeholder="e.g., Grade A"
                    data-testid="input-new-grade"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newGrade.trim()) {
                        e.preventDefault();
                        setNewCommodity({ 
                          ...newCommodity, 
                          grades: [...newCommodity.grades, newGrade.trim()] 
                        });
                        setNewGrade('');
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    size="icon" 
                    variant="outline"
                    disabled={!newGrade.trim()}
                    onClick={() => {
                      if (newGrade.trim()) {
                        setNewCommodity({ 
                          ...newCommodity, 
                          grades: [...newCommodity.grades, newGrade.trim()] 
                        });
                        setNewGrade('');
                      }
                    }}
                    data-testid="button-add-grade"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {newCommodity.grades.map((grade, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1 pr-1">
                      {grade}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-4 w-4 ml-1"
                        onClick={() => setNewCommodity({ 
                          ...newCommodity, 
                          grades: newCommodity.grades.filter((_, i) => i !== idx) 
                        })}
                        data-testid={`button-remove-grade-${idx}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-sm font-medium">Moisture Content Range (%)</Label>
                <p className="text-xs text-muted-foreground mb-2">Acceptable moisture percentage for quality control</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Min %</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={newCommodity.moisture_min}
                      onChange={(e) => setNewCommodity({ ...newCommodity, moisture_min: e.target.value })}
                      placeholder="e.g., 8"
                      data-testid="input-moisture-min"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Max %</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={newCommodity.moisture_max}
                      onChange={(e) => setNewCommodity({ ...newCommodity, moisture_max: e.target.value })}
                      placeholder="e.g., 12"
                      data-testid="input-moisture-max"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <div>
                  <Label>Global Commodity</Label>
                  <p className="text-xs text-muted-foreground">Available to all organizations</p>
                </div>
                <Switch
                  checked={newCommodity.is_global}
                  onCheckedChange={(checked) => setNewCommodity({ ...newCommodity, is_global: checked })}
                  data-testid="switch-global"
                />
              </div>

              <Button 
                className="w-full" 
                onClick={createCommodity}
                disabled={creating || !newCommodity.name || !newCommodity.code}
                data-testid="button-submit-commodity"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add Commodity
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{commodities.length}</div>
            <p className="text-sm text-muted-foreground">Total Commodities</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{commodities.filter(c => c.is_global).length}</div>
            <p className="text-sm text-muted-foreground">Global</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{commodities.filter(c => c.is_active).length}</div>
            <p className="text-sm text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{commodities.filter(c => c.category === 'tree_crop').length}</div>
            <p className="text-sm text-muted-foreground">Tree Crops</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Commodity Master List</CardTitle>
          <CardDescription>
            All commodities available in the platform. Organizations can select from these when collecting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : commodities.length === 0 ? (
            <div className="text-center py-12">
              <Wheat className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No commodities yet</h3>
              <p className="text-muted-foreground mb-4">Add your first commodity to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Grades</TableHead>
                  <TableHead>Moisture</TableHead>
                  <TableHead className="text-center">Global</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commodities.map((commodity) => (
                  <TableRow key={commodity.id} data-testid={`row-commodity-${commodity.id}`}>
                    <TableCell className="font-medium">{commodity.name}</TableCell>
                    <TableCell className="font-mono text-sm">{commodity.code}</TableCell>
                    <TableCell>{getCategoryBadge(commodity.category)}</TableCell>
                    <TableCell>{commodity.unit}</TableCell>
                    <TableCell>
                      {commodity.grades && commodity.grades.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {commodity.grades.slice(0, 3).map((grade, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {grade}
                            </Badge>
                          ))}
                          {commodity.grades.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{commodity.grades.length - 3}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {commodity.moisture_min !== null || commodity.moisture_max !== null ? (
                        <span className="text-sm">
                          {commodity.moisture_min ?? '-'}% - {commodity.moisture_max ?? '-'}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {commodity.is_global ? (
                        <Check className="h-4 w-4 text-green-600 mx-auto" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={commodity.is_active}
                        onCheckedChange={() => toggleActive(commodity)}
                        data-testid={`switch-active-${commodity.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditSheet(commodity)}
                          data-testid={`button-edit-${commodity.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openDeleteDialog(commodity)}
                          data-testid={`button-delete-${commodity.id}`}
                          className="text-destructive hover:text-destructive"
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

      {/* Edit Commodity Sheet */}
      <Sheet open={editSheetOpen} onOpenChange={(open) => {
        setEditSheetOpen(open);
        if (!open) {
          setEditCommodity(null);
        }
      }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit Commodity</SheetTitle>
            <SheetDescription>
              Update the commodity details
            </SheetDescription>
          </SheetHeader>
          {editCommodity ? (
            <div className="space-y-4 mt-6">
              <div>
                <Label htmlFor="edit-name">Commodity Name *</Label>
                <Input
                  id="edit-name"
                  value={editCommodity.name}
                  onChange={(e) => setEditCommodity({ ...editCommodity, name: e.target.value })}
                  placeholder="e.g., Cocoa"
                  data-testid="input-edit-commodity-name"
                />
              </div>

              <div>
                <Label htmlFor="edit-code">Code</Label>
                <Input
                  id="edit-code"
                  value={editCommodity.code}
                  disabled
                  className="bg-muted"
                  data-testid="input-edit-commodity-code"
                />
                <p className="text-xs text-muted-foreground mt-1">Code cannot be changed</p>
              </div>

              <div>
                <Label>Category</Label>
                <Select
                  value={editCommodity.category}
                  onValueChange={(value) => setEditCommodity({ ...editCommodity, category: value })}
                >
                  <SelectTrigger data-testid="select-edit-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Default Unit</Label>
                <Select
                  value={editCommodity.unit}
                  onValueChange={(value) => setEditCommodity({ ...editCommodity, unit: value })}
                >
                  <SelectTrigger data-testid="select-edit-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-4 mt-4">
                <Label className="text-sm font-medium">Quality Grades</Label>
                <p className="text-xs text-muted-foreground mb-2">Define grading options for collection</p>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={editNewGrade}
                    onChange={(e) => setEditNewGrade(e.target.value)}
                    placeholder="e.g., Grade A"
                    data-testid="input-edit-new-grade"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && editNewGrade.trim()) {
                        e.preventDefault();
                        setEditCommodity({ 
                          ...editCommodity, 
                          grades: [...(editCommodity.grades || []), editNewGrade.trim()] 
                        });
                        setEditNewGrade('');
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    size="icon" 
                    variant="outline"
                    disabled={!editNewGrade.trim()}
                    onClick={() => {
                      if (editNewGrade.trim()) {
                        setEditCommodity({ 
                          ...editCommodity, 
                          grades: [...(editCommodity.grades || []), editNewGrade.trim()] 
                        });
                        setEditNewGrade('');
                      }
                    }}
                    data-testid="button-edit-add-grade"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(editCommodity.grades || []).map((grade, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1 pr-1">
                      {grade}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-4 w-4 ml-1"
                        onClick={() => setEditCommodity({ 
                          ...editCommodity, 
                          grades: (editCommodity.grades || []).filter((_, i) => i !== idx) 
                        })}
                        data-testid={`button-edit-remove-grade-${idx}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-sm font-medium">Moisture Content Range (%)</Label>
                <p className="text-xs text-muted-foreground mb-2">Acceptable moisture percentage for quality control</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Min %</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={editCommodity.moisture_min || ''}
                      onChange={(e) => setEditCommodity({ ...editCommodity, moisture_min: e.target.value ? parseFloat(e.target.value) : null })}
                      placeholder="e.g., 8"
                      data-testid="input-edit-moisture-min"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Max %</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={editCommodity.moisture_max || ''}
                      onChange={(e) => setEditCommodity({ ...editCommodity, moisture_max: e.target.value ? parseFloat(e.target.value) : null })}
                      placeholder="e.g., 12"
                      data-testid="input-edit-moisture-max"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <div>
                  <Label>Global Commodity</Label>
                  <p className="text-xs text-muted-foreground">Available to all organizations</p>
                </div>
                <Switch
                  checked={editCommodity.is_global}
                  onCheckedChange={(checked) => setEditCommodity({ ...editCommodity, is_global: checked })}
                  data-testid="switch-edit-global"
                />
              </div>

              <Button 
                className="w-full" 
                onClick={saveEditedCommodity}
                disabled={saving || !editCommodity.name}
                data-testid="button-save-commodity"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setDeleteDialogOpen(false);
          setCommodityToDelete(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Commodity</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate "{commodityToDelete?.name || 'this commodity'}"? 
              The commodity will be marked as inactive and hidden from organizations.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => {
                setDeleteDialogOpen(false);
                setCommodityToDelete(null);
              }}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={deleteCommodity}
              disabled={deleting || !commodityToDelete}
              data-testid="button-confirm-delete"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
