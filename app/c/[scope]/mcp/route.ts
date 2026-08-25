import type { NextRequest } from "next/server";
import { createLinkMcpHandler } from "@/lib/mcp/handler";

export const maxDuration = 60;

type Context = { params: Promise<{ scope: string }> };

async function scopedHandler(request: NextRequest, context: Context) {
  const { scope } = await context.params;
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
      "Access-Control-Allow-Headers": "content-type, authorization, mcp-session-id",
      "Access-Control-Expose-Headers": "Mcp-Session-Id",
    },
  });
}
