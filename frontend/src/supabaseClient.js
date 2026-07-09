import { createClient } from '@supabase/supabase-js';

// Uses the ANON key only — safe for the browser. RLS policies in
// supabase/schema.sql govern exactly what each user can touch.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

/** Helper: attach the current user's access token to a fetch call to our backend. */
export async function apiFetch(path, options = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Request failed');
  return body;
}
