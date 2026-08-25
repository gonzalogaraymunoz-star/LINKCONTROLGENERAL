import { createLinkMcpHandler } from "@/lib/mcp/handler";

export const maxDuration = 60;
const handler = createLinkMcpHandler("root");
export { handler as GET, handler as POST };


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
