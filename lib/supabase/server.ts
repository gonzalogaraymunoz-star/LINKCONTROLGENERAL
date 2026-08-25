import { createClient } from "@supabase/supabase-js";

function serviceClient(url?: string, serviceRole?: string) {
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Central data plane: existing Supabase project LINK PREVIEW.
 * CRM, controls/scopes, Preview Studio, memories, intelligence, artifacts and events.
 */
export function getCentralSupabase() {
  return serviceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
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
