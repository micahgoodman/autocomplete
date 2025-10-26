import { createClient } from '@supabase/supabase-js';

function deriveSupabaseUrl(): string | undefined {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  if (envUrl) return envUrl;
  const base = import.meta.env.VITE_API_BASE;
  if (!base) return undefined;
  try {
    const u = new URL(base);
    // If pointing at Edge Functions (e.g., http://127.0.0.1:54321/functions/v1),
    // strip the functions path to get the project base URL for Realtime.
    u.pathname = u.pathname.replace(/\/?functions\/v1\/?$/, '/');
    return u.origin;
  } catch {
    return undefined;
  }
}

const supabaseUrl = deriveSupabaseUrl();
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  // eslint-disable-next-line no-console
  console.warn('[supabase] Missing VITE_SUPABASE_URL and could not derive from VITE_API_BASE');
}
if (!supabaseKey) {
  // eslint-disable-next-line no-console
  console.warn('[supabase] Missing VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(
  supabaseUrl ?? '',
  supabaseKey ?? '',
  {
    auth: { persistSession: false },
    // You can tweak realtime options here if needed
  }
);
