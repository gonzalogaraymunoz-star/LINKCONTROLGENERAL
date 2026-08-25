import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";

const SUPABASE_AUTH_SERVER = "https://zgbnjlrxzvzpigmwidsp.supabase.co/auth/v1";

function secret() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

export function createMcpAccessToken(scope: string) {
  const key = secret();
  if (!key) return null;
  return createHmac("sha256", key).update(`link-control-mcp-read:${scope}`).digest("base64url");
}

export function validateMcpAccessToken(scope: string, token: string | null) {
  if (!token) return false;
  const expected = createMcpAccessToken(scope);
  if (!expected) return false;
  const left = Buffer.from(token);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function protectedResourceMetadata(origin: string, resourcePath = "/mcp") {
  return {
    resource: `${origin}${resourcePath}`,
    authorization_servers: [SUPABASE_AUTH_SERVER],
    scopes_supported: ["email", "profile"],
    bearer_methods_supported: ["header"],
    resource_name: "LINK CONTROL CENTRAL",
  };
}

export function oauthChallenge(origin: string, resourcePath = "/mcp") {
  const metadataUrl = `${origin}/.well-known/oauth-protected-resource${resourcePath}`;
  return `Bearer resource_metadata="${metadataUrl}", scope="email profile"`;
}

function bearerToken(request: NextRequest) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export async function authorizeMcpRequest(request: NextRequest, scope: string) {
  // Backward-compatible signed read token. This is kept only while OAuth is rolled out.
  const legacyToken = request.nextUrl.searchParams.get("access");
  if (validateMcpAccessToken(scope, legacyToken)) {
    return { allowed: true as const, mode: "legacy" as const, userId: null };
  }

  const token = bearerToken(request);
  if (!token) return { allowed: false as const, reason: "missing_bearer" as const };

  const supabase = getCentralSupabase();
  if (!supabase) return { allowed: false as const, reason: "supabase_not_configured" as const };

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const user = userData.user;
  if (userError || !user) return { allowed: false as const, reason: "invalid_bearer" as const };

  const { data: member, error: memberError } = await supabase
    .from("app_members")
    .select("role,status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (memberError || !member) return { allowed: false as const, reason: "membership_required" as const };

  if (scope === "root" && member.role !== "owner") {
    return { allowed: false as const, reason: "root_owner_required" as const };
  }

  // Scoped business Controls will move to control-specific memberships. Until then,
  // OAuth is deliberately limited to root rather than leaking global membership.
  if (scope !== "root") {
    return { allowed: false as const, reason: "scoped_oauth_not_ready" as const };
  }

  return { allowed: true as const, mode: "oauth" as const, userId: user.id, role: member.role };
}
