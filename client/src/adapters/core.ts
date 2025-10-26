import { useCallback, useEffect, useState } from 'react';

export type Context = { type: string; id: string };

export interface ModuleAdapter<TItem, TCreate, TUpdate> {
  list: (opts?: { context?: Context }) => Promise<TItem[]>;
  create: (input: TCreate) => Promise<unknown>;
  update: (id: string, patch: TUpdate) => Promise<unknown>;
  remove: (id: string, opts?: { context?: Context }) => Promise<void>;
  getKey: (item: TItem) => string;
  getTitle: (item: TItem) => string;
  subscribe?: (onChange: () => void, opts?: { context?: Context }) => () => void;
}

export function useModuleList<TItem>(
  adapter: ModuleAdapter<TItem, any, any>,
  opts?: { context?: Context }
) {
  const [items, setItems] = useState<TItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Derive a stable key from context values so deps don't change with object identity
  const ctxKey = opts?.context ? `${opts.context.type}:${opts.context.id}` : '';

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adapter.list({ context: opts?.context });
      setItems(Array.isArray(data) ? data : []);
      return { success: true as const };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setItems([]);
      const msg = err instanceof Error ? err.message : 'Failed to load items';
      setError(msg);
      return { success: false as const, error: msg };
    } finally {
      setLoading(false);
    }
  }, [adapter, ctxKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!adapter.subscribe) return;
    try {
      const unsub = adapter.subscribe(async () => { await refresh(); }, { context: opts?.context });
      return () => { try { unsub && unsub(); } catch { /* noop */ } };
    } catch {
      return () => {};
    }
  }, [adapter, ctxKey, refresh]);

  return { items, loading, error, refresh } as const;
}
