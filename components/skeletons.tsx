import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// ── Stat card skeleton — matches the 4-column KPI grid on dashboard ────────
export function StatCardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-2" />
        <Skeleton className="h-3 w-36" />
      </CardContent>
    </Card>
  );
}

// ── Table row skeleton — matches a standard 5–9 column table ───────────────
export function TableRowSkeleton({ cols = 6 }: { cols?: number }) {
  const widths = ['w-32', 'w-24', 'w-20', 'w-16', 'w-20', 'w-16', 'w-24', 'w-16', 'w-20'];
  return (
    <tr className="border-b border-border">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className={`h-4 ${widths[i % widths.length]}`} />
        </td>
      ))}
    </tr>
  );
}

export function TableSkeleton({ rows = 6, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} cols={cols} />
      ))}
    </tbody>
  );
}

// ── Farmer row skeleton — matches the farmer ledger table columns ──────────
export function FarmerTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-border">
          <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
          <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-24" /></td>
          <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
          <td className="px-4 py-3 hidden md:table-cell text-right"><Skeleton className="h-4 w-12 ml-auto" /></td>
          <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
          <td className="px-4 py-3 hidden md:table-cell text-right"><Skeleton className="h-4 w-8 ml-auto" /></td>
          <td className="px-4 py-3 text-center"><Skeleton className="h-5 w-14 mx-auto rounded-full" /></td>
          <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-20" /></td>
          <td className="px-4 py-3 hidden md:table-cell text-center"><Skeleton className="h-4 w-4 mx-auto rounded-full" /></td>
        </tr>
      ))}
    </tbody>
  );
}

// ── Inventory batch row skeleton ───────────────────────────────────────────
export function InventoryTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-border">
          <td className="px-4 py-3"><Skeleton className="h-4 w-28 font-mono" /></td>
          <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
          <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-8" /></td>
          <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
          <td className="px-4 py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
          <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-20" /></td>
        </tr>
      ))}
    </tbody>
  );
}

// ── Shipment card skeleton — matches the shipment list cards ───────────────
export function ShipmentCardSkeleton() {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <Skeleton className="h-10 w-10 rounded-md shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Payment row skeleton ───────────────────────────────────────────────────
export function PaymentTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-border">
          <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
          <td className="px-4 py-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-full shrink-0" />
              <Skeleton className="h-4 w-28" />
            </div>
          </td>
          <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-5 w-16 rounded-full" /></td>
          <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
          <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-16" /></td>
          <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-24 font-mono" /></td>
          <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-5 w-14 rounded-full" /></td>
          <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
        </tr>
      ))}
    </tbody>
  );
}
