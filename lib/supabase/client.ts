import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserSupabase: SupabaseClient | null = null;

export function getBrowserSupabase() {
  if (browserSupabase) return browserSupabase;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  browserSupabase = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserSupabase;
}
