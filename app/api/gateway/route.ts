import { NextRequest, NextResponse } from "next/server";
import { executeGatewayAction, getGatewayCapabilities, type GatewayAction } from "@/lib/gateway/adapters";
import { authorizeGatewayAction, type GatewayContext } from "@/lib/gateway/policy";
import { getCentralSupabase } from "@/lib/supabase/server";

const ROOT_CONTROL_ID = "00000000-0000-0000-0000-000000000001";

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

async function audit(input: {
  action: string;
  ok: boolean;
  actorId: string;
  resource?: string;
  result?: unknown;
  error?: string;
}) {
  const supabase = getCentralSupabase();
  if (!supabase) return false;
  const { error } = await supabase.from("events").insert({
    control_id: ROOT_CONTROL_ID,
    client_id: null,
    event_type: "gateway.action",
    actor: input.actorId,
    object_type: "gateway",
    object_id: input.action,
    payload: {
      action: input.action,
      resource: input.resource || null,
      ok: input.ok,
      error: input.error || null,
      result: input.result || null,
    },
  });
  return !error;
}

export async function GET() {
  const central = getCentralSupabase();
  const capabilities = getGatewayCapabilities().map(capability => ({
    ...capability,
    available: Boolean(central) && capability.available,
    reason: !central ? "La auditoría central no está disponible; la acción se mantiene bloqueada." : capability.reason,
  }));

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    gatewayReady: Boolean(central),
    mode: "verified-read-actions",
    capabilities,
  });
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ ok: false, error: "cross_origin_gateway_request" }, { status: 403 });
  }

  const body = (await request.json()) as { context?: GatewayContext; input?: unknown };
  if (!body.context) {
    return NextResponse.json({ ok: false, error: "missing_context" }, { status: 400 });
  }

  const policy = authorizeGatewayAction(body.context);
  if (!policy.allowed) {
    return NextResponse.json({ ok: false, policy }, { status: 403 });
  }

  const capabilities = getGatewayCapabilities();
  const capability = capabilities.find(item => item.id === body.context?.action);
  if (!capability) {
    return NextResponse.json({ ok: false, error: "unsupported_gateway_action" }, { status: 400 });
  }
  if (!capability.available) {
    return NextResponse.json({ ok: false, error: "gateway_action_not_configured", reason: capability.reason }, { status: 503 });
  }

  const central = getCentralSupabase();
  if (!central) {
    return NextResponse.json({ ok: false, error: "gateway_audit_not_available" }, { status: 503 });
  }

  try {
    const result = await executeGatewayAction(capability.id as GatewayAction);
    const audited = await audit({
      action: capability.id,
      ok: true,
      actorId: body.context.actorId,
      resource: body.context.resource,
      result,
    });
    if (!audited) {
      return NextResponse.json({ ok: false, error: "gateway_audit_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, policy, capability, result, audited: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "gateway_execution_failed";
    await audit({
      action: capability.id,
      ok: false,
      actorId: body.context.actorId,
      resource: body.context.resource,
      error: message,
    });
    return NextResponse.json({ ok: false, error: message, capability }, { status: 502 });
  }
}
