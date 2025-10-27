const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
function url(path: string) {
  if (API_BASE.endsWith('/') && path.startsWith('/')) return API_BASE + path.slice(1);
  if (!API_BASE.endsWith('/') && !path.startsWith('/')) return `${API_BASE}/${path}`;
  return API_BASE + path;
}

function isSupabaseUrl(base: string): boolean {
  return /\.supabase\.co\//.test(base) || /127\.0\.0\.1|localhost/.test(base);
}

function buildHeaders(extra?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = {};
  // Include Supabase auth headers when targeting Edge Functions
  if (isSupabaseUrl(API_BASE) && SUPABASE_ANON_KEY) {
    headers['apikey'] = SUPABASE_ANON_KEY;
    headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
  }
  if (extra) {
    // Merge provided headers (object only, minimal implementation)
    const e = extra as Record<string, string>;
    for (const k in e) headers[k] = e[k];
  }
  return headers;
}

async function json<T>(res: Response): Promise<T> {
  const raw = await res.text();
  let data: any = undefined;
  try {
    data = raw ? JSON.parse(raw) : undefined;
  } catch (_) {
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} non-JSON response: ${raw.slice(0, 200)}`);
    }
    // If ok but empty/non-JSON, just return as-is
    return (undefined as unknown) as T;
  }
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || raw;
    throw new Error(`HTTP ${res.status}: ${typeof msg === 'string' ? msg.slice(0, 200) : JSON.stringify(msg).slice(0, 200)}`);
  }
  return (data as any)?.payload ?? (data as any);
}

// Generic fetch by identity_key across all contexts for any module type
export async function fetchByIdentity<T = any>(filter: string, identityKey: string): Promise<T[]> {
  const params = new URLSearchParams({ filter, identityKey });
  return fetch(url(`/concepts?${params.toString()}`), { headers: buildHeaders() }).then(res => json<T[]>(res));
}

// Generic association API
export async function associateModule(body: { parentType: string; parentId: string; childType: string; childId: string }) {
  return fetch(url('/concepts?action=associate'), {
    method: 'POST',
    headers: buildHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  }).then(res => json<{ ok: boolean }>(res));
}

export async function disassociateModule(body: { parentType: string; parentId: string; childType: string; childId: string }) {
  return fetch(url('/concepts?action=disassociate'), {
    method: 'POST',
    headers: buildHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  }).then(res => json<{ ok: boolean }>(res));
}

// Fetch parents that reference a child in their sub_modules
export async function fetchParentsOf(childType: string, childId: string): Promise<Array<{ id: string; type: string; title?: string }>> {
  const params = new URLSearchParams({ childType, childId, parentsOnly: 'true' });
  return fetch(url(`/concepts?${params.toString()}`), { headers: buildHeaders() }).then(res => json<Array<{ id: string; type: string; title?: string }>>(res));
}

/**
 * 
 * Checklists
 * 
**/
export type ChecklistItem = {
  text: string;
  completed: boolean;
  draft?: string | null;
  steps?: Array<{
    content: string;
    timestamp: string;
  }>;
  workTypes?: {
    email?: boolean;
    coding?: boolean;
    calendar?: boolean;
  };
  isEmailTask?: boolean;
};

export type Checklist = {
  id: string;
  name: string;
  items: ChecklistItem[];
  context?: {
    type: string;
    id: string;
  };
};

export async function fetchChecklists(): Promise<Checklist[]> {
  return fetch(url('/concepts?filter=checklist'), { headers: buildHeaders() }).then(res => json<Checklist[]>(res));
}

export async function fetchChecklistsByContext(contextType: string, contextId: string): Promise<Checklist[]> {
  return fetch(url(`/concepts?filter=checklist&contextType=${encodeURIComponent(contextType)}&contextId=${encodeURIComponent(contextId)}`), { headers: buildHeaders() }).then(res => json<Checklist[]>(res));
}

export async function createChecklist(body: { name: string; items?: ChecklistItem[]; context?: { type: string; id: string } }) {
  return fetch(url('/concepts?filter=checklist'), {
    method: 'POST',
    headers: buildHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body)
  }).then(res => json<{ id: string }>(res));
}

export async function updateChecklist(id: string, body: { name?: string; items?: ChecklistItem[] }) {
  return fetch(url(`/concepts/${encodeURIComponent(id)}`), {
    method: 'PATCH',
    headers: buildHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body)
  }).then(res => json<{ ok: boolean }>(res));
}

export async function deleteChecklist(id: string) {
  return fetch(url(`/concepts/${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers: buildHeaders()
  }).then(res => json<{ ok: boolean }>(res));
}