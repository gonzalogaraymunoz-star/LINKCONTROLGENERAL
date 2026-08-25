import type { NextRequest } from "next/server";
import { createLinkMcpHandler } from "@/lib/mcp/handler";
import { authorizeMcpRequest, oauthChallenge } from "@/lib/mcp/access";

export const maxDuration = 60;

type Context = { params: Promise<{ scope: string }> };

async function scopedHandler(request: NextRequest, context: Context) {
  const { scope } = await context.params;
  const access = await authorizeMcpRequest(request, scope);
  if (!access.allowed) {
    const origin = request.nextUrl.origin;
    return Response.json(
      { error: "mcp_access_denied", reason: access.reason },
      {
        status: 401,
        headers: {
          "WWW-Authenticate": oauthChallenge(origin, `/c/${scope}/mcp`),
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }

  const handler = createLinkMcpHandler(scope);
  return handler(request);
}

export { scopedHandler as GET, scopedHandler as POST };

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
