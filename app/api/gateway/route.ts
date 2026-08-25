import { NextRequest, NextResponse } from "next/server";
import { authorizeGatewayAction, type GatewayContext } from "@/lib/gateway/policy";

export async function POST(request: NextRequest) {
  const internalToken = process.env.LINK_GATEWAY_INTERNAL_TOKEN;
  if (internalToken) {
    const supplied = request.headers.get("x-link-gateway-token");
    if (supplied !== internalToken) {
      return NextResponse.json({ ok: false, error: "unauthorized_gateway" }, { status: 401 });
    }
  }

  const body = (await request.json()) as { context?: GatewayContext; input?: unknown };
  if (!body.context) {
    return NextResponse.json({ ok: false, error: "missing_context" }, { status: 400 });
  }

  const policy = authorizeGatewayAction(body.context);
  if (!policy.allowed) {
    return NextResponse.json({ ok: false, policy }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    policy,
    execution: "bootstrap_stub",
    note: "Conecta aquí los adaptadores reales de GitHub, Supabase, Vercel, Google y partners.",
  });
}
