'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import {
  Search, User, Package, Ship, Fingerprint, Loader2,
  UserPlus, PlusCircle, Map, FileText, X,
} from 'lucide-react';

interface SearchResult {
  type: 'farmer' | 'batch' | 'shipment' | 'dpp';
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  href: string;
}

const TYPE_ICONS = {
  farmer:   User,
  batch:    Package,
  shipment: Ship,
  dpp:      Fingerprint,
};

const TYPE_LABELS = {
  farmer:   'Farmer',
  batch:    'Batch',
  shipment: 'Shipment',
  dpp:      'Passport',
};

const QUICK_ACTIONS = [
  { label: 'Register Farmer',     icon: UserPlus,    href: '/app/farmers/new' },
  { label: 'Start Collection',    icon: PlusCircle,  href: '/app/collect' },
  { label: 'New Shipment',        icon: Ship,        href: '/app/shipments' },
  { label: 'Map Farm',            icon: Map,         href: '/app/farms/map' },
  { label: 'Upload Document',     icon: FileText,    href: '/app/documents' },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cmd+K / Ctrl+K toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!query || query.length < 2) { setResults([]); setLoading(false); return; }

    setLoading(true);
    debounce.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const d = await r.json();
        setResults(d.results || []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 220);
  }, [query]);

  const navigate = useCallback((href: string) => {
    router.push(href);
    setOpen(false);
    setQuery('');
    setResults([]);
  }, [router]);

  const close = () => { setOpen(false); setQuery(''); setResults([]); };

  if (!open) return null;

  // Group results by type
  const grouped = (['farmer', 'batch', 'shipment', 'dpp'] as const).map(type => ({
    type,
    items: results.filter(r => r.type === type),
  })).filter(g => g.items.length > 0);

  return (
    <div
      className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[15vh]"
      onClick={e => { if (e.target === e.currentTarget) close(); }}
      role="dialog"
      aria-label="Command palette"
      aria-modal="true"
    >
      <div className="w-full max-w-lg mx-4 bg-background border border-border rounded-xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          {loading
            ? <Loader2 className="h-4 w-4 text-muted-foreground animate-spin shrink-0" />
            : <Search className="h-4 w-4 text-muted-foreground shrink-0" />}
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search farmers, batches, shipments, passports…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Search"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border font-mono">
            Esc
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {/* Results */}
          {grouped.length > 0 && (
            <div className="py-1">
              {grouped.map(({ type, items }) => {
                const Icon = TYPE_ICONS[type];
                return (
                  <div key={type}>
                    <p className="px-4 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {TYPE_LABELS[type]}s
                    </p>
                    {items.map(item => (
                      <button
                        key={item.id}
                        onClick={() => navigate(item.href)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors text-left group"
                      >
                        <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.title}</p>
                          {item.subtitle && (
                            <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                          )}
                        </div>
                        {item.badge && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground capitalize shrink-0">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* No results */}
          {query.length >= 2 && !loading && results.length === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {/* Quick actions — show when no query */}
          {!query && (
            <div className="py-1">
              <p className="px-4 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Quick Actions
              </p>
              {QUICK_ACTIONS.map(action => (
                <button
                  key={action.href}
                  onClick={() => navigate(action.href)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors text-left group"
                >
                  <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                    <action.icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-sm">{action.label}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30">
          <span className="text-[10px] text-muted-foreground">
            {results.length > 0 ? `${results.length} result${results.length !== 1 ? 's' : ''}` : 'Type to search'}
          </span>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <kbd className="bg-muted px-1 py-0.5 rounded border border-border font-mono">↑↓</kbd> navigate
            </span>
            <span className="flex items-center gap-0.5">
              <kbd className="bg-muted px-1 py-0.5 rounded border border-border font-mono">↵</kbd> open
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
