import { NextRequest, NextResponse } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";

const ROOT_CONTROL_ID = "00000000-0000-0000-0000-000000000001";
const ACTOR = "link-control-missions";

const OPERATIONAL_STAGE_BY_ONBOARDING: Record<string, string> = {
  interview: "understand",
  identity: "organize",
  connections: "organize",
  control: "build",
  memory: "build",
  product: "activate",
  mcp: "activate",
  tests: "support",
  delivery: "scale",
};

async function event(supabase: NonNullable<ReturnType<typeof getCentralSupabase>>, clientId: string, type: string, id: string, payload: Record<string, unknown> = {}) {
  await supabase.from("events").insert({
    control_id: ROOT_CONTROL_ID,
    client_id: clientId,
    event_type: type,
    actor: ACTOR,
    object_type: "work_item",
    object_id: id,
    payload,
  });
}

export async function GET(request: NextRequest) {
  const supabase = getCentralSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "central_supabase_not_configured" }, { status: 503 });
  const clientId = request.nextUrl.searchParams.get("clientId");
  const onboardingStageId = request.nextUrl.searchParams.get("onboardingStageId");
  if (!clientId) return NextResponse.json({ ok: false, error: "missing_client_id" }, { status: 400 });

  let query = supabase.from("work_items")
    .select("id,client_id,cycle_id,onboarding_stage_id,stage,kind,title,description,due_at,priority,status,source,metadata,completed_at,created_at,updated_at")
    .eq("client_id", clientId)
    .neq("status", "cancelled")
    .order("created_at");
  if (onboardingStageId) query = query.eq("onboarding_stage_id", onboardingStageId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, missions: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = getCentralSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "central_supabase_not_configured" }, { status: 503 });
  const body = await request.json();
  const action = String(body.action || "");

  if (action === "create") {
    const clientId = String(body.clientId || "");
    const onboardingStageId = String(body.onboardingStageId || "");
    const title = String(body.title || "").trim();
    if (!clientId || !onboardingStageId || !title) return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });

    const [{ data: onboardingStage, error: stageError }, { data: cycle }] = await Promise.all([
      supabase.from("client_onboarding_stages").select("id,stage_key,title").eq("id", onboardingStageId).eq("client_id", clientId).single(),
      supabase.from("client_cycles").select("id").eq("client_id", clientId).eq("status", "active").maybeSingle(),
    ]);
    if (stageError || !onboardingStage) return NextResponse.json({ ok: false, error: stageError?.message || "onboarding_stage_not_found" }, { status: 404 });

    const operationalStage = OPERATIONAL_STAGE_BY_ONBOARDING[onboardingStage.stage_key] || "understand";
    const { data, error } = await supabase.from("work_items").insert({
      control_id: ROOT_CONTROL_ID,
      client_id: clientId,
      cycle_id: cycle?.id || null,
      onboarding_stage_id: onboardingStageId,
      stage: operationalStage,
      kind: body.kind || "task",
      title,
      description: body.description || null,
      due_at: body.dueAt || null,
      priority: Number(body.priority || 2),
      status: "pending",
      source: "onboarding_mission",
      metadata: { onboarding_stage_key: onboardingStage.stage_key, onboarding_stage_title: onboardingStage.title },
    }).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    await event(supabase, clientId, "mission.created", data.id, { onboarding_stage_id: onboardingStageId, stage_key: onboardingStage.stage_key });
    return NextResponse.json({ ok: true, mission: data });
  }

  const missionId = String(body.missionId || "");
  if (!missionId) return NextResponse.json({ ok: false, error: "missing_mission_id" }, { status: 400 });
  const { data: current, error: currentError } = await supabase.from("work_items").select("id,client_id").eq("id", missionId).single();
  if (currentError || !current) return NextResponse.json({ ok: false, error: currentError?.message || "mission_not_found" }, { status: 404 });

  if (action === "update") {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) patch.title = String(body.title);
    if (body.description !== undefined) patch.description = body.description || null;
    if (body.dueAt !== undefined) patch.due_at = body.dueAt || null;
    if (body.priority !== undefined) patch.priority = Number(body.priority);
    if (body.kind !== undefined) patch.kind = String(body.kind);
    const { data, error } = await supabase.from("work_items").update(patch).eq("id", missionId).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    await event(supabase, current.client_id, "mission.updated", missionId, patch);
    return NextResponse.json({ ok: true, mission: data });
  }

  if (action === "status") {
    const status = String(body.status || "pending");
    const patch = { status, completed_at: status === "done" ? new Date().toISOString() : null, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from("work_items").update(patch).eq("id", missionId).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    await event(supabase, current.client_id, status === "done" ? "mission.completed" : "mission.status_changed", missionId, { status });
    return NextResponse.json({ ok: true, mission: data });
  }

  if (action === "archive") {
    const { data, error } = await supabase.from("work_items").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", missionId).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    await event(supabase, current.client_id, "mission.archived", missionId);
    return NextResponse.json({ ok: true, mission: data });
  }

  return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
}
