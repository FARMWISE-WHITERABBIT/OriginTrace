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
 *     {
 *       enabled: !!organization?.id,
 *       scopeKey: organization?.id,
 *       deps: [organization?.id],
 *     }
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
  /**
   * Primitive identity for the resource owner (normally organization.id).
   * Data from another scope is never returned while the next request runs.
   */
  scopeKey?: string | number | boolean | null;
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
    scopeKey,
    deps = [],
    select,
    showErrorToast = true,
    initialData = null,
    init,
  } = options;

  const { toast } = useToast();
  const [scopedData, setScopedData] = React.useState<{
    value: T | null;
    scopeKey: typeof scopeKey;
  }>(() => ({ value: initialData, scopeKey }));
  const [scopedError, setScopedError] = React.useState<{
    value: string | null;
    scopeKey: typeof scopeKey;
  }>(() => ({ value: null, scopeKey }));
  const [scopedLoading, setScopedLoading] = React.useState<{
    value: boolean;
    scopeKey: typeof scopeKey;
  }>(() => ({ value: enabled && !!url, scopeKey }));

  // Keep the latest select/init/toast without re-triggering the effect on every
  // render (callers usually pass inline literals).
  const selectRef = React.useRef(select);
  const initRef = React.useRef(init);
  const toastRef = React.useRef(toast);
  const scopeKeyRef = React.useRef(scopeKey);
  const urlRef = React.useRef(url);
  const enabledRef = React.useRef(enabled);
  selectRef.current = select;
  initRef.current = init;
  toastRef.current = toast;
  scopeKeyRef.current = scopeKey;
  urlRef.current = url;
  enabledRef.current = enabled;

  const runToken = React.useRef(0);
  const abortRef = React.useRef<AbortController | null>(null);
  const [restoreEpoch, setRestoreEpoch] = React.useState(0);

  const fetchNow = React.useCallback(async () => {
    if (!url || !enabled) return;
    // An async mutation can retain an older refetch callback across a tenant
    // switch. Never let that stale callback fetch the active tenant and tag the
    // result with its former scope.
    if (
      !Object.is(scopeKey, scopeKeyRef.current) ||
      url !== urlRef.current ||
      enabled !== enabledRef.current
    ) return;
    const requestScopeKey = scopeKey;
    const selectForRequest = selectRef.current;
    const token = ++runToken.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const externalSignal = initRef.current?.signal;
    const abortFromExternal = () => controller.abort();
    if (externalSignal?.aborted) controller.abort();
    else externalSignal?.addEventListener("abort", abortFromExternal, { once: true });
    setScopedLoading({ value: true, scopeKey: requestScopeKey });
    setScopedError({ value: null, scopeKey: requestScopeKey });
    try {
      const res = await fetch(url, { ...initRef.current, signal: controller.signal });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          (body && typeof body === "object" && "error" in body
            ? String((body as { error: unknown }).error)
            : null) || `Request failed (${res.status})`;
        throw new Error(message);
      }
      if (controller.signal.aborted || token !== runToken.current) return;
      const mapped = selectForRequest
        ? selectForRequest(body)
        : (body as T);
      setScopedData({ value: mapped, scopeKey: requestScopeKey });
    } catch (err) {
      if (controller.signal.aborted) return;
      if (token !== runToken.current) return;
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setScopedError({ value: message, scopeKey: requestScopeKey });
      if (showErrorToast) {
        toastRef.current({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      }
    } finally {
      externalSignal?.removeEventListener("abort", abortFromExternal);
      if (token === runToken.current) {
        setScopedLoading({ value: false, scopeKey: requestScopeKey });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, enabled, showErrorToast, scopeKey]);

  React.useEffect(() => {
    if (!enabled || !url) {
      ++runToken.current;
      abortRef.current?.abort();
      setScopedLoading({ value: false, scopeKey });
      return;
    }
    void fetchNow();
    return () => {
      ++runToken.current;
      abortRef.current?.abort();
    };
    // Re-run on url/enabled change and any caller-provided deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, enabled, scopeKey, restoreEpoch, ...deps]);

  React.useEffect(() => {
    const abortForPageHide = () => {
      ++runToken.current;
      abortRef.current?.abort();
    };
    const revalidateAfterRestore = (event: PageTransitionEvent) => {
      if (!event.persisted) return;

      const currentScopeKey = scopeKeyRef.current;
      if (enabledRef.current && urlRef.current) {
        // BFCache restores do not remount React effects. Mark the current
        // resource pending immediately, then use an epoch to start a fresh read.
        setScopedLoading({ value: true, scopeKey: currentScopeKey });
        setScopedError({ value: null, scopeKey: currentScopeKey });
      }
      setRestoreEpoch((epoch) => epoch + 1);
    };

    window.addEventListener("pagehide", abortForPageHide);
    window.addEventListener("pageshow", revalidateAfterRestore);
    return () => {
      window.removeEventListener("pagehide", abortForPageHide);
      window.removeEventListener("pageshow", revalidateAfterRestore);
      abortForPageHide();
    };
  }, []);

  const dataScopeMatches = Object.is(scopedData.scopeKey, scopeKey);
  const errorScopeMatches = Object.is(scopedError.scopeKey, scopeKey);
  const loadingScopeMatches = Object.is(scopedLoading.scopeKey, scopeKey);
  const data = dataScopeMatches ? scopedData.value : null;
  const error = errorScopeMatches ? scopedError.value : null;
  // Treat a newly selected scope as loading immediately, before the effect has
  // had a chance to start its request. This avoids a false empty-state frame.
  const loading = enabled && !!url
    ? (loadingScopeMatches ? scopedLoading.value : true)
    : false;

  const setData = React.useCallback<React.Dispatch<React.SetStateAction<T | null>>>(
    (nextValue) => {
      const targetScopeKey = scopeKey;
      const targetUrl = url;
      const targetEnabled = enabled;
      setScopedData((previous) => {
        // Like refetch(), setters are frequently retained by an async action.
        // Do not let a callback from an older tenant/resource replace the one
        // current scoped-data slot after navigation or a filter change.
        if (
          !Object.is(targetScopeKey, scopeKeyRef.current) ||
          targetUrl !== urlRef.current ||
          targetEnabled !== enabledRef.current
        ) return previous;
        const previousValue = Object.is(previous.scopeKey, targetScopeKey)
          ? previous.value
          : null;
        const value = typeof nextValue === "function"
          ? (nextValue as (current: T | null) => T | null)(previousValue)
          : nextValue;
        return { value, scopeKey: targetScopeKey };
      });
    },
    [enabled, scopeKey, url],
  );

  return { data, error, loading, refetch: fetchNow, setData };
}
