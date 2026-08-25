import { createClient } from "@supabase/supabase-js";

const CENTRAL_SUPABASE_URL = "https://zgbnjlrxzvzpigmwidsp.supabase.co";

function serviceClient(url?: string, serviceRole?: string) {
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Central data plane: existing Supabase project LINK CONTROL CENTRAL.
 * The project URL is public configuration, so the known project URL is a safe fallback.
 * The service-role key remains secret and must come only from the server environment.
 */
export function getCentralSupabase() {
  return serviceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || CENTRAL_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

/** Backward-compatible alias used by bootstrap code. */
export const getServiceSupabase = getCentralSupabase;

/**
 * Operational data plane: existing tourism / Hotel Experience database.
 * Must only be called server-side through a scoped Gateway adapter.
 */
export function getOperationalSupabase() {
  return serviceClient(
    process.env.OPERATIONAL_SUPABASE_URL,
    process.env.OPERATIONAL_SUPABASE_SERVICE_ROLE_KEY,
  );
}
