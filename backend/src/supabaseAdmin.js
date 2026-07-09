import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Service-role client. This bypasses RLS, so it must NEVER be exposed
// to the frontend — it only ever lives in this backend process.
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);
