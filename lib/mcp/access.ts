import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";

const SUPABASE_AUTH_SERVER = "https://zgbnjlrxzvzpigmwidsp.supabase.co/auth/v1";

function secret() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

function safeEqual(leftValue: string, rightValue: string) {
  const left = Buffer.from(leftValue);
  const right = Buffer.from(rightValue);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
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
  return safeEqual(token, expected);
}

function configuredSimpleToken() {
  return (process.env.LINK_MCP_TOKEN || "").trim();
}

function simpleTokenFromRequest(request: NextRequest) {
  const queryToken = request.nextUrl.searchParams.get("mcp_token")?.trim() || "";
  if (queryToken) return queryToken;

  const custom = request.headers.get("x-link-mcp-token")?.trim() || "";
  if (custom) return custom;

  return "";
}

function validateSimpleToken(request: NextRequest) {
  const expected = configuredSimpleToken();
  if (!expected) return false;
  const provided = simpleTokenFromRequest(request);
  if (!provided) return false;
  return safeEqual(provided, expected);
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
  // Simple LINK protocol, equivalent to LINK Preview Studio.
  // The secret stays in Vercel as LINK_MCP_TOKEN; clients that only accept a URL
  // may send it as ?mcp_token=... .
  if (validateSimpleToken(request)) {
    return { allowed: true as const, mode: "simple_token" as const, userId: null };
  }

  // Backward-compatible signed read token.
  const legacyToken = request.nextUrl.searchParams.get("access");
  if (validateMcpAccessToken(scope, legacyToken)) {
    return { allowed: true as const, mode: "legacy" as const, userId: null };
  }

  // OAuth remains supported as the stronger long-term option.
  const token = bearerToken(request);
  if (!token) return { allowed: false as const, reason: "missing_auth" as const };

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

  if (scope !== "root") {
    return { allowed: false as const, reason: "scoped_oauth_not_ready" as const };
  }

  return { allowed: true as const, mode: "oauth" as const, userId: user.id, role: member.role };
}
