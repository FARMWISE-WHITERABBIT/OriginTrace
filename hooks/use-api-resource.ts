"use client";

/**
 * useApiResource — the canonical client hook for reading OriginTrace API data.
 *
 * The app's largest pages (shipments/[id] is 2,300+ lines, settings 1,900+)
 * repeat the same fetch + loading + error + toast boilerplate dozens of times,
 * and that duplicated data-access layer is where workflow bugs breed
 * (see docs/FRICTION-AUDIT.md cluster C4). This hook centralises it:
 *
 *   const { data, loading, error, refetch } = useApiResource<Shipment[]>(
 *     '/api/shipments',
 *     { enabled: !!organization?.id, deps: [organization?.id] }
 *   );
 *
 * It expects the standard OriginTrace error shape `{ error: string }` from
 * lib/api/errors.ts and surfaces it via the shared toast.
 */

import * as React from "react";
import { useToast } from "@/hooks/use-toast";

export interface UseApiResourceOptions<T> {
  /** When false, no request is made (e.g. wait for org to load). Default true. */
  enabled?: boolean;
  /** Re-fetch whenever one of these values changes. */
  deps?: React.DependencyList;
  /** Transform the parsed JSON body into T. Default: identity. */
  select?: (raw: unknown) => T;
  /** Show a destructive toast on failure. Default true. */
  showErrorToast?: boolean;
  /** Seed value before the first successful fetch. */
  initialData?: T | null;
  /** Passed through to fetch (headers, method, body, …). */
  init?: RequestInit;
}

export interface UseApiResourceResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refetch: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

export function useApiResource<T = unknown>(
  url: string | null,
  options: UseApiResourceOptions<T> = {}
): UseApiResourceResult<T> {
  const {
    enabled = true,
    deps = [],
    select,
    showErrorToast = true,
    initialData = null,
    init,
  } = options;

  const { toast } = useToast();
  const [data, setData] = React.useState<T | null>(initialData);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(enabled && !!url);

  // Keep the latest select/init/toast without re-triggering the effect on every
  // render (callers usually pass inline literals).
  const selectRef = React.useRef(select);
  const initRef = React.useRef(init);
  const toastRef = React.useRef(toast);
  selectRef.current = select;
  initRef.current = init;
  toastRef.current = toast;

  const runToken = React.useRef(0);

  const fetchNow = React.useCallback(async () => {
    if (!url || !enabled) return;
    const token = ++runToken.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, initRef.current);
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          (body && typeof body === "object" && "error" in body
            ? String((body as { error: unknown }).error)
            : null) || `Request failed (${res.status})`;
        throw new Error(message);
      }
      if (token !== runToken.current) return; // superseded by a newer call
      const mapped = selectRef.current
        ? selectRef.current(body)
        : (body as T);
      setData(mapped);
    } catch (err) {
      if (token !== runToken.current) return;
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
      if (showErrorToast) {
        toastRef.current({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      }
    } finally {
      if (token === runToken.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, enabled, showErrorToast]);

  React.useEffect(() => {
    if (!enabled || !url) {
      setLoading(false);
      return;
    }
    void fetchNow();
    // Re-run on url/enabled change and any caller-provided deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, enabled, ...deps]);

  return { data, error, loading, refetch: fetchNow, setData };
}
