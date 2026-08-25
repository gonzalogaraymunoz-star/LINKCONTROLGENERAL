import { createHmac, timingSafeEqual } from "node:crypto";

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
