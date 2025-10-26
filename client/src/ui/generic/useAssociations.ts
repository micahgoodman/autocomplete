import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Association, normalizeIdentity, resolveAssociationsForIdentity } from './associations';
import { fetchByIdentity } from '../../api';

export function useAssociations(moduleType: string, rawIdentity: string) {
  const identityKey = useMemo(() => normalizeIdentity(rawIdentity), [rawIdentity]);
  const [associations, setAssociations] = useState<Association[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [childId, setChildId] = useState<string | null>(null);

  // Realtime: refresh when matching module with same identity changes
  useEffect(() => {
    if (!moduleType || !identityKey) return;
    try {
      const suffix = Math.random().toString(36).slice(2, 8);
      const topic = `assoc-${moduleType}-${identityKey}-${suffix}`;
      const channel = supabase
        .channel(topic)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'module_data' }, (payload: any) => {
          try {
            const mt = payload?.new?.module_type ?? payload?.old?.module_type;
            if (mt !== moduleType) return;
            const data = payload?.new?.data ?? payload?.old?.data ?? {};
            let key: string | undefined = data?.identity_key;
            if (!key) {
              // Fallback for legacy rows
              const nameOrText = typeof data?.name === 'string' ? data.name
                : typeof data?.text === 'string' ? data.text
                : '';
              key = normalizeIdentity(nameOrText);
            }
            if (key === identityKey) setVersion(v => v + 1);
          } catch {
            // noop
          }
        })
        .subscribe();
      return () => { try { supabase.removeChannel(channel); } catch { /* noop */ } };
    } catch {
      return () => {};
    }
  }, [moduleType, identityKey]);

  // Derive childId for this identity (first matching instance)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!moduleType || !identityKey) { if (!cancelled) setChildId(null); return; }
        const candidates = await fetchByIdentity<any>(moduleType, identityKey).catch(() => [] as any[]);
        const id = candidates && candidates.length > 0 ? String(candidates[0]?.id ?? '') : '';
        if (!cancelled) setChildId(id || null);
      } catch {
        if (!cancelled) setChildId(null);
      }
    })();
    return () => { cancelled = true; };
  }, [moduleType, identityKey]);

  // Realtime: refresh when any parent row gains/loses this child in sub_modules
  useEffect(() => {
    if (!childId) return;
    try {
      const suffix = Math.random().toString(36).slice(2, 8);
      const topic = `assoc-parents-${moduleType}-${childId}-${suffix}`;
      const channel = supabase
        .channel(topic)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'module_data' }, (payload: any) => {
          try {
            const subsNew = (payload?.new?.sub_modules ?? {}) as Record<string, string[]>;
            const subsOld = (payload?.old?.sub_modules ?? {}) as Record<string, string[]>;
            const arrNew = Array.isArray((subsNew as any)[moduleType]) ? (subsNew as any)[moduleType] : [];
            const arrOld = Array.isArray((subsOld as any)[moduleType]) ? (subsOld as any)[moduleType] : [];
            const has = arrNew.includes(childId);
            const had = arrOld.includes(childId);
            if (has || had) setVersion((v) => v + 1);
          } catch {
            // noop
          }
        })
        .subscribe();
      return () => { try { supabase.removeChannel(channel); } catch { /* noop */ } };
    } catch {
      return () => {};
    }
  }, [moduleType, childId]);

  // Compute associations list
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const assocs = await resolveAssociationsForIdentity(moduleType, rawIdentity);
        if (!cancelled) setAssociations(assocs);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to load associations');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [moduleType, rawIdentity, version]);

  return { associations, loading, error } as const;
}
