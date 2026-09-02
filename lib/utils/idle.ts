type IdleWindow = {
  requestIdleCallback?: (
    callback: (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void,
    options?: { timeout?: number }
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export function runWhenIdle(callback: () => void, timeout = 1500) {
  if (typeof window === 'undefined') return () => undefined;

  const idleWindow = window as unknown as IdleWindow;
  if (
    typeof idleWindow.requestIdleCallback === 'function' &&
    typeof idleWindow.cancelIdleCallback === 'function'
  ) {
    const id = idleWindow.requestIdleCallback(() => callback(), { timeout });
    return () => idleWindow.cancelIdleCallback?.(id);
  }

  const id = globalThis.setTimeout(callback, Math.min(timeout, 750));
  return () => globalThis.clearTimeout(id);
}
