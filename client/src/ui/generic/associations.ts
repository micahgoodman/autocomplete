import { fetchByIdentity, fetchParentsOf } from '../../api';

export type AssociationContext = { type: string; id: string };
export type Association = { type: string; title: string };
export type AssociationResolver = (id: string) => Promise<string>;

const resolvers = new Map<string, AssociationResolver>();
const cache = new Map<string, string>(); // key: `${type}:${id}` -> title

export function registerAssociationResolver(type: string, resolver: AssociationResolver) {
  resolvers.set(type, resolver);
}

export async function resolveAssociationTitles(contexts: AssociationContext[]): Promise<Association[]> {
  const results: Association[] = [];
  for (const ctx of contexts) {
    const key = `${ctx.type}:${String(ctx.id)}`;
    if (cache.has(key)) {
      results.push({ type: ctx.type, title: cache.get(key)! });
      continue;
    }
    const resolver = resolvers.get(ctx.type);
    if (resolver) {
      try {
        const title = await resolver(String(ctx.id));
        cache.set(key, title);
        results.push({ type: ctx.type, title });
        continue;
      } catch {
        // Fall through to id as title
      }
    }
    const fallback = String(ctx.id);
    cache.set(key, fallback);
    results.push({ type: ctx.type, title: fallback });
  }
  return results;
}

// Normalize an identity string the same way server computes identity_key
export function normalizeIdentity(s: string): string {
  return String(s ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

// Resolve associations for any module type by its identity string (across all contexts)
export async function resolveAssociationsForIdentity(
  moduleType: string,
  rawIdentity: string,
): Promise<Association[]> {
  const identityKey = normalizeIdentity(rawIdentity);
  const candidates = await fetchByIdentity<any>(moduleType, identityKey).catch(() => [] as any[]);
  const child = candidates[0];
  if (!child || !child.id) return [];

  const parents = await fetchParentsOf(moduleType, String(child.id)).catch(() => []);
  if (!parents || parents.length === 0) return [];
  const contexts = parents.map((p) => ({ type: p.type, id: String(p.id) }));
  return resolveAssociationTitles(contexts);
}
