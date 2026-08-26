import { NextRequest, NextResponse } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";

const ROOT_CONTROL_ID = "00000000-0000-0000-0000-000000000001";
const ACTOR = "link-control-onboarding";

async function recordEvent(supabase: NonNullable<ReturnType<typeof getCentralSupabase>>, input: { clientId: string; eventType: string; objectId?: string | null; payload?: Record<string, unknown> }) {
  await supabase.from("events").insert({
    control_id: ROOT_CONTROL_ID,
    client_id: input.clientId,
    event_type: input.eventType,
    actor: ACTOR,
    object_type: "client_onboarding_stage",
    object_id: input.objectId || null,
    payload: input.payload || {},
  });
}

export async function GET(request: NextRequest) {
  const supabase = getCentralSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "central_supabase_not_configured" }, { status: 503 });
  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ ok: false, error: "missing_client_id" }, { status: 400 });

  const { data, error } = await supabase
    .from("client_onboarding_stages")
    .select("id,client_id,stage_key,stage_order,title,status,checklist,fields,links,folders,observations,exit_criteria,completed_at,updated_at")
    .eq("client_id", clientId)
    .order("stage_order");

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, stages: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = getCentralSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "central_supabase_not_configured" }, { status: 503 });
  const body = await request.json();
  const clientId = String(body.clientId || "");
  const stageKey = String(body.stageKey || "");
  if (!clientId || !stageKey) return NextResponse.json({ ok: false, error: "missing_scope" }, { status: 400 });

  const { data: current, error: currentError } = await supabase
    .from("client_onboarding_stages")
    .select("id,stage_order,status")
    .eq("client_id", clientId)
    .eq("stage_key", stageKey)
    .single();
  if (currentError || !current) return NextResponse.json({ ok: false, error: currentError?.message || "stage_not_found" }, { status: 404 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [inputKey, dbKey] of [["checklist","checklist"],["fields","fields"],["links","links"],["folders","folders"],["observations","observations"],["status","status"]] as const) {
    if (body[inputKey] !== undefined) patch[dbKey] = body[inputKey];
  }

  if (body.status === "done") {
    const checklist = Array.isArray(body.checklist) ? body.checklist : [];
    const incomplete = checklist.filter((item: { done?: boolean }) => !item.done);
    if (incomplete.length) return NextResponse.json({ ok: false, error: "checklist_incomplete", pending: incomplete }, { status: 409 });
    patch.completed_at = new Date().toISOString();
  } else if (body.status !== undefined) {
    patch.completed_at = null;
  }

  const { data, error } = await supabase
    .from("client_onboarding_stages")
    .update(patch)
    .eq("id", current.id)
    .select("id,client_id,stage_key,stage_order,title,status,checklist,fields,links,folders,observations,exit_criteria,completed_at,updated_at")
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  if (body.status === "done") {
    await supabase
      .from("client_onboarding_stages")
      .update({ status: "in_progress", updated_at: new Date().toISOString() })
      .eq("client_id", clientId)
      .eq("stage_order", current.stage_order + 1)
      .eq("status", "pending");
  }

  await recordEvent(supabase, { clientId, eventType: body.status === "done" ? "onboarding.stage.completed" : "onboarding.stage.updated", objectId: current.id, payload: { stage_key: stageKey, status: data.status } });
  return NextResponse.json({ ok: true, stage: data });
}
