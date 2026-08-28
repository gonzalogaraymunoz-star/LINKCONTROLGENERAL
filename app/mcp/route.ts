import type { NextRequest } from "next/server";
import { createLinkMcpHandler } from "@/lib/mcp/handler";
import { authorizeMcpRequest, oauthChallenge } from "@/lib/mcp/access";

export const maxDuration = 60;

const readOnlyHandler = createLinkMcpHandler("root", { writesEnabled: false });
const readWriteHandler = createLinkMcpHandler("root", { writesEnabled: true });

async function securedHandler(request: NextRequest) {
  const access = await authorizeMcpRequest(request, "root");
  if (!access.allowed) {
    const origin = request.nextUrl.origin;
    return Response.json(
      { error: "mcp_access_denied", reason: access.reason },
      {
        status: 401,
        headers: {
          "WWW-Authenticate": oauthChallenge(origin),
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }

  // The legacy signed token remains read-only. The explicit LINK_MCP_TOKEN
  // and authenticated OAuth owner sessions receive the audited write tools.
  const handler = access.mode === "legacy" ? readOnlyHandler : readWriteHandler;
  return handler(request);
}

export { securedHandler as GET, securedHandler as POST };

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type, authorization, mcp-session-id, x-link-mcp-token",
      "Access-Control-Expose-Headers": "Mcp-Session-Id, WWW-Authenticate",
    },
  });
}
