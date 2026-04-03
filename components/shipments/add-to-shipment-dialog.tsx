'use client';

/**
 * AddToShipmentDialog
 *
 * Reusable dialog that lets users link a processing run's finished goods
 * or a dispatch batch to an active shipment. Supports two modes:
 *
 *  - mode='finished_good' items=[{id, name, weight_kg}] — links finished goods
 *  - mode='batch'         items=[{id, name, weight_kg}] — links collection batches
 *
 * On confirm it calls PATCH /api/shipments/:id with add_items payload.
 */

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Ship, Package, Plus } from 'lucide-react';

export interface LinkableItem {
  id: string;
  name: string;
  weight_kg?: number;
}

export type LinkItemType = 'finished_good' | 'batch';

interface ActiveShipment {
  id: string;
  shipment_code: string;
  destination_country: string | null;
  commodity: string | null;
  current_stage: number;
  status: string;
}

interface AddToShipmentDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  items: LinkableItem[];
  itemType: LinkItemType;
  /** Called when the link is successfully made */
  onLinked?: (shipmentId: string) => void;
}

const ITEM_TYPE_LABELS: Record<LinkItemType, string> = {
  finished_good: 'finished good',
  batch: 'batch',
};

export function AddToShipmentDialog({
  open,
  onOpenChange,
  items,
  itemType,
  onLinked,
}: AddToShipmentDialogProps) {
  const { toast } = useToast();
  const [shipments, setShipments] = useState<ActiveShipment[]>([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    fetch('/api/shipments?status=draft&status=pending&status=booked')
      .then((r) => r.json())
      .then((d) => {
        setShipments(d.shipments ?? []);
        setSelectedShipmentId('');
      })
      .catch(() => setShipments([]))
      .finally(() => setIsLoading(false));
  }, [open]);

  const handleLink = async () => {
    if (!selectedShipmentId || items.length === 0) return;
    setIsLinking(true);
    try {
      const addItems = items.map((item) => ({
        item_type: itemType,
        ...(itemType === 'finished_good'
          ? { finished_good_id: item.id }
          : { batch_id: item.id }),
      }));

      const res = await fetch(`/api/shipments/${selectedShipmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ add_items: addItems }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to link');
      }

      const selectedShipment = shipments.find((s) => s.id === selectedShipmentId);
      toast({
        title: 'Added to shipment',
        description: `${items.length} ${ITEM_TYPE_LABELS[itemType]}(s) added to ${
          selectedShipment?.shipment_code ?? 'shipment'
        }`,
      });
      onOpenChange(false);
      onLinked?.(selectedShipmentId);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to add to shipment',
        variant: 'destructive',
      });
    } finally {
      setIsLinking(false);
    }
  };

  const selectedShipment = shipments.find((s) => s.id === selectedShipmentId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5" />
            Add to Shipment
          </DialogTitle>
          <DialogDescription>
            Link {items.length} {ITEM_TYPE_LABELS[itemType]}
            {items.length !== 1 ? 's' : ''} to an active shipment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Items to be linked */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Items to add
            </p>
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 text-sm p-2 rounded-md bg-muted/50"
                >
                  <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate">{item.name}</span>
                  {item.weight_kg != null && (
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {Number(item.weight_kg).toLocaleString()} kg
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Shipment selector */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Select shipment
            </p>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading shipments…
              </div>
            ) : shipments.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-center">
                <p className="text-sm text-muted-foreground">No active shipments found.</p>
                <Button
                  size="sm"
                  variant="link"
                  className="mt-1 text-xs"
                  onClick={() => {
                    onOpenChange(false);
                    window.location.href = '/app/shipments';
                  }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Create a new shipment
                </Button>
              </div>
            ) : (
              <Select value={selectedShipmentId} onValueChange={setSelectedShipmentId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select a shipment…" />
                </SelectTrigger>
                <SelectContent>
                  {shipments.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{s.shipment_code}</span>
                        <span className="text-muted-foreground text-xs">
                          {s.destination_country && `· ${s.destination_country}`}
                          {s.commodity && ` · ${s.commodity}`}
                          {` · Stage ${s.current_stage ?? '?'}`}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedShipment && (
            <div className="rounded-md bg-muted/50 p-3 text-xs space-y-1">
              <div className="font-medium">{selectedShipment.shipment_code}</div>
              {selectedShipment.destination_country && (
                <div className="text-muted-foreground">
                  Destination: {selectedShipment.destination_country}
                </div>
              )}
              <div className="text-muted-foreground">
                Stage {selectedShipment.current_stage ?? '?'} · {selectedShipment.status}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleLink}
            disabled={!selectedShipmentId || isLinking || isLoading}
          >
            {isLinking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add to Shipment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
