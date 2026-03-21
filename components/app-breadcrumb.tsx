'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

// Static label map for known routes
const STATIC_LABELS: Record<string, string> = {
  '/app':              'Dashboard',
  '/app/collect':      'Smart Collect',
  '/app/farmers':      'Farmers',
  '/app/farmers/new':  'Register Farmer',
  '/app/farms':        'Farm Polygons',
  '/app/farms/map':    'Map Farm',
  '/app/inventory':    'Inventory',
  '/app/processing':   'Processing Runs',
  '/app/pedigree':     'Pedigree',
  '/app/dpp':          'Product Passports',
  '/app/shipments':    'Shipments',
  '/app/documents':    'Documents',
  '/app/payments':     'Payments',
  '/app/contracts':    'Contracts',
  '/app/analytics':    'Analytics',
  '/app/analytics/reports': 'Reports',
  '/app/traceability': 'Traceability',
  '/app/team':         'Team',
  '/app/settings':     'Settings',
  '/app/guide':        'Guide',
  '/app/sync':         'Sync',
  '/app/dispatch':     'Dispatch',
  '/app/agents':       'Field Agents',
  '/app/conflicts':    'Boundary Conflicts',
  '/app/dds':          'DDS Export',
  '/app/audit':        'Audit Log',
  '/app/yield-alerts': 'Yield Alerts',
  '/app/verify':       'Scan & Verify',
};

// Parent map — for detail pages, which list page do they belong to?
const PARENT: Record<string, string> = {
  '/app/farmers':    '/app/farmers',
  '/app/inventory':  '/app/inventory',
  '/app/processing': '/app/processing',
  '/app/pedigree':   '/app/pedigree',
  '/app/dpp':        '/app/dpp',
  '/app/shipments':  '/app/shipments',
};

interface Crumb {
  label: string;
  href: string;
  current: boolean;
}

async function fetchLabel(segment: string, id: string): Promise<string> {
  try {
    if (segment === 'farmers') {
      const r = await fetch(`/api/farmers/${id}`);
      if (!r.ok) return id.slice(0, 8);
      const d = await r.json();
      return d.farmer?.farmer_name || d.farmer_name || id.slice(0, 8);
    }
    if (segment === 'inventory') {
      const r = await fetch(`/api/batches/${id}`);
      if (!r.ok) return id.slice(0, 8);
      const d = await r.json();
      return d.batch?.batch_code || d.batch?.batch_id || id.slice(0, 8);
    }
    if (segment === 'processing') {
      const r = await fetch(`/api/processing-runs/${id}`);
      if (!r.ok) return id.slice(0, 8);
      const d = await r.json();
      return d.run?.run_code || id.slice(0, 8);
    }
    if (segment === 'pedigree') {
      const r = await fetch(`/api/pedigree/${id}`);
      if (!r.ok) return id.slice(0, 8);
      const d = await r.json();
      return d.finished_good?.pedigree_code || id.slice(0, 8);
    }
    if (segment === 'dpp') {
      const r = await fetch(`/api/dpp/${id}`);
      if (!r.ok) return id.slice(0, 8);
      const d = await r.json();
      return d.dpp?.dpp_code || id.slice(0, 8);
    }
    if (segment === 'shipments') {
      const r = await fetch(`/api/shipments/${id}`);
      if (!r.ok) return id.slice(0, 8);
      const d = await r.json();
      return d.shipment?.shipment_code || id.slice(0, 8);
    }
  } catch { /* ignore */ }
  return id.slice(0, 8);
}

// UUID regex
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function AppBreadcrumb() {
  const pathname = usePathname();
  const [crumbs, setCrumbs] = useState<Crumb[]>([]);

  useEffect(() => {
    async function build() {
      const parts = pathname.split('/').filter(Boolean); // ['app', 'farmers', '<uuid>']
      if (parts.length <= 1) { setCrumbs([]); return; } // just /app

      const result: Crumb[] = [];

      // Walk each path segment
      let accumulated = '';
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        accumulated += '/' + part;
        const isLast = i === parts.length - 1;
        const isId = UUID_RE.test(part) || (part.length > 8 && !STATIC_LABELS[accumulated]);

        if (isId) {
          // Fetch the human-readable label for this ID
          const parentSegment = parts[i - 1]; // e.g. 'farmers'
          const label = await fetchLabel(parentSegment, part);
          result.push({ label, href: accumulated, current: isLast });
        } else {
          const label = STATIC_LABELS[accumulated] || part.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          // Skip 'App' crumb and Dashboard on deep pages to keep it clean
          if (part === 'app') continue;
          result.push({ label, href: accumulated, current: isLast });
        }
      }

      setCrumbs(result);
    }
    build();
  }, [pathname]);

  // Don't show on top-level pages (only 1 segment after /app)
  const depth = pathname.split('/').filter(Boolean).length;
  if (depth <= 2) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground min-w-0">
      <Link href="/app" className="flex items-center hover:text-foreground transition-colors shrink-0">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1 min-w-0">
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
          {crumb.current ? (
            <span className="font-medium text-foreground truncate max-w-[180px]" aria-current="page">
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.href}
              className="hover:text-foreground transition-colors truncate max-w-[140px]"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
