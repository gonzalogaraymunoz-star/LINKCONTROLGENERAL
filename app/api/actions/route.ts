import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ACTION_BY_KEY, CONTROL_ACTIONS } from "@/lib/actions/registry";
import { getCentralSupabase } from "@/lib/supabase/server";

const ROOT_CONTROL_ID = "00000000-0000-0000-0000-000000000001";

export async function GET() {
  return NextResponse.json({ ok: true, actions: CONTROL_ACTIONS });
}

export async function POST(request: NextRequest) {
  const supabase = getCentralSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "central_supabase_not_configured" }, { status: 503 });

  const body = await request.json();
  const actionKey = String(body.action || "");
  const definition = ACTION_BY_KEY.get(actionKey);
  if (!definition) return NextResponse.json({ ok: false, error: "unsupported_action" }, { status: 400 });

  const idempotencyKey = String(body.idempotencyKey || request.headers.get("idempotency-key") || randomUUID());
  const payload = body.input && typeof body.input === "object" ? body.input : {};
  const globalId = typeof body.globalId === "string" ? body.globalId : null;
  const entityType = typeof body.entityType === "string" ? body.entityType : null;

  const { data: existing } = await supabase.from("command_bus").select("*").eq("idempotency_key", idempotencyKey).maybeSingle();
  if (existing) return NextResponse.json({ ok: true, deduped: true, command: existing });

  const queued = definition.provider === "twenty";
  const { data: command, error } = await supabase.from("command_bus").insert({
    control_id: ROOT_CONTROL_ID,
    command_type: definition.mode === "write" ? "COMMAND" : "QUERY",
    action_key: actionKey,
    actor: String(body.actor || "link-control-ui"),
    target_provider: definition.provider,
    entity_type: entityType,
    global_id: globalId,
    payload,
    idempotency_key: idempotencyKey,
    status: queued ? "pending" : "processing",
  }).select().single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  if (queued) return NextResponse.json({ ok: true, queued: true, executor: "twenty", command });

  await supabase.from("command_bus").update({ status: "succeeded", result: { accepted: true }, processed_at: new Date().toISOString() }).eq("id", command.id);
  return NextResponse.json({ ok: true, queued: false, command: { ...command, status: "succeeded" } });
}
