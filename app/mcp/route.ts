import type { NextRequest } from "next/server";
import { createLinkMcpHandler } from "@/lib/mcp/handler";
import { validateMcpAccessToken } from "@/lib/mcp/access";

export const maxDuration = 60;
const handler = createLinkMcpHandler("root");

async function securedHandler(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("access");
  if (!validateMcpAccessToken("root", token)) {
    return Response.json({ error: "mcp_access_denied" }, { status: 401 });
  }
  return handler(request);
}

export { securedHandler as GET, securedHandler as POST };

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type, authorization, mcp-session-id",
      "Access-Control-Expose-Headers": "Mcp-Session-Id",
    },
  });
}
