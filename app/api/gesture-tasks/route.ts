import { NextRequest, NextResponse } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";

const ROOT_CONTROL_ID = "00000000-0000-0000-0000-000000000001";

function gestureCode() {
  return "GST-" + crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();
}

function titleFromEvent(eventType: string) {
  const map: Record<string, string> = {
    "counterparty.registered": "Revisar nueva contraparte",
    "product.created": "Revisar producto creado",
    "business.created": "Revisar negocio creado",
    "business.updated": "Revisar cambios del negocio",
    "client.created": "Revisar cliente creado",
    "client.updated": "Revisar cambios del cliente",
    "gesture.task.created": "Nueva tarea",
  };
  return map[eventType] || eventType.replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function emitGesture(
  supabase: NonNullable<ReturnType<typeof getCentralSupabase>>,
  input: {
    actionKey: string;
    eventType: string;
    parentGestureCode?: string | null;
    entityType?: string | null;
    globalId?: string | null;
    payload?: Record<string, unknown>;
  },
) {
  const code = gestureCode();
  const now = new Date().toISOString();
  const correlationId = crypto.randomUUID();
  const payload = input.payload || {};

  const { error: commandError } = await supabase.from("command_bus").insert({
    control_id: ROOT_CONTROL_ID,
    command_type: "operational_task",
    action_key: input.actionKey,
    actor: "control-central",
    target_provider: "link_world",
    entity_type: input.entityType || "gesture_task",
    global_id: input.globalId || null,
    payload,
    idempotency_key: "control-central:" + code,
    status: "succeeded",
    result: { applied: true },
    processed_at: now,
    gesture_code: code,
    source_domain: "control",
    parent_gesture_code: input.parentGestureCode || null,
    correlation_id: correlationId,
    requires_approval: false,
    approval_status: "not_required",
  });

  if (commandError) throw commandError;

  const { error: eventError } = await supabase.from("event_bus").insert({
    control_id: ROOT_CONTROL_ID,
    source_provider: "control_central",
    event_type: input.eventType,
    entity_type: input.entityType || "gesture_task",
    global_id: input.globalId || null,
    correlation_id: correlationId,
    dedupe_key: "control-central:" + code + ":" + input.eventType,
    payload,
    occurred_at: now,
    gesture_code: code,
  });

  if (eventError) throw eventError;
  return code;
}

async function syncLinkWorldGestures(supabase: NonNullable<ReturnType<typeof getCentralSupabase>>) {
  const { data: events, error } = await supabase
    .from("event_bus")
    .select("id,gesture_code,event_type,entity_type,global_id,payload,received_at")
    .eq("source_provider", "link_world")
    .not("gesture_code", "is", null)
    .order("received_at", { ascending: true })
    .limit(200);

  if (error) throw error;
  if (!events?.length) return;

  const gestureCodes = events.map((event) => event.gesture_code).filter(Boolean);
  const { data: existing, error: existingError } = await supabase
    .from("gesture_tasks")
    .select("gesture_code")
    .in("gesture_code", gestureCodes);

  if (existingError) throw existingError;
  const seen = new Set((existing || []).map((row) => row.gesture_code));

  const rows = events
    .filter((event) => event.gesture_code && !seen.has(event.gesture_code))
    .map((event) => ({
      gesture_code: event.gesture_code,
      source_domain: "world",
      entity_type: event.entity_type,
      global_id: event.global_id,
      title: titleFromEvent(event.event_type),
      note: "Gesto recibido desde LINK WORLD",
      status: "open",
      priority: 2,
      origin_event_type: event.event_type,
      origin_event_id: event.id,
      metadata: {
        origin: "link_world",
        event_payload: event.payload || {},
      },
      created_at: event.received_at,
      updated_at: event.received_at,
    }));

  if (rows.length) {
    const { error: insertError } = await supabase.from("gesture_tasks").insert(rows);
    if (insertError) throw insertError;
  }
}

export async function GET() {
  const supabase = getCentralSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "central_supabase_not_configured" }, { status: 503 });

  try {
    await syncLinkWorldGestures(supabase);

    const [tasksResult, businessesResult, clientsResult, productsResult] = await Promise.all([
      supabase.from("gesture_tasks")
        .select("*")
        .neq("status", "cancelled")
        .order("status", { ascending: true })
        .order("priority", { ascending: true })
        .order("due_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false }),
      supabase.from("link_world_businesses").select("id,name,global_id"),
      supabase.from("link_world_clients").select("id,name,global_id,business_id"),
      supabase.from("link_world_products").select("id,name,global_id,business_id,client_id"),
    ]);

    const firstError = [tasksResult.error, businessesResult.error, clientsResult.error, productsResult.error].find(Boolean);
    if (firstError) return NextResponse.json({ ok: false, error: firstError.message }, { status: 500 });

    const entityNames = new Map<string, string>();
    for (const row of businessesResult.data || []) if (row.global_id) entityNames.set(row.global_id, row.name);
    for (const row of clientsResult.data || []) if (row.global_id) entityNames.set(row.global_id, row.name);
    for (const row of productsResult.data || []) if (row.global_id) entityNames.set(row.global_id, row.name);

    const tasks = (tasksResult.data || []).map((task) => ({
      ...task,
      entity_name: task.global_id ? entityNames.get(task.global_id) || null : null,
    }));

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      tasks,
      counts: {
        open: tasks.filter((task) => task.status === "open").length,
        done: tasks.filter((task) => task.status === "done").length,
        world: tasks.filter((task) => task.source_domain === "world").length,
      },
    });
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "gesture_task_sync_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = getCentralSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "central_supabase_not_configured" }, { status: 503 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  const action = String(body.action || "");

  try {
    if (action === "create") {
      const title = String(body.title || "").trim();
      if (!title) return NextResponse.json({ ok: false, error: "title_required" }, { status: 400 });

      const code = gestureCode();
      const now = new Date().toISOString();
      const globalId = body.globalId ? String(body.globalId) : null;
      const entityType = body.entityType ? String(body.entityType) : "gesture_task";

      const { data: task, error } = await supabase.from("gesture_tasks").insert({
        gesture_code: code,
        source_domain: "control",
        entity_type: entityType,
        global_id: globalId,
        title,
        note: body.note ? String(body.note) : null,
        status: "open",
        priority: Number(body.priority || 2),
        due_at: body.dueAt ? new Date(body.dueAt).toISOString() : null,
        metadata: { origin: "control_central" },
        created_at: now,
        updated_at: now,
      }).select("*").single();

      if (error) throw error;

      await supabase.from("command_bus").insert({
        control_id: ROOT_CONTROL_ID,
        command_type: "operational_task",
        action_key: "gesture.task.create",
        actor: "control-central",
        target_provider: "link_world",
        entity_type: entityType,
        global_id: globalId,
        payload: { task_id: task.id, title },
        idempotency_key: "control-central:" + code,
        status: "succeeded",
        result: { created: true },
        processed_at: now,
        gesture_code: code,
        source_domain: "control",
        correlation_id: task.id,
        requires_approval: false,
        approval_status: "not_required",
      });

      await supabase.from("event_bus").insert({
        control_id: ROOT_CONTROL_ID,
        source_provider: "control_central",
        event_type: "gesture.task.created",
        entity_type: entityType,
        global_id: globalId,
        correlation_id: task.id,
        dedupe_key: "gesture-task-created:" + code,
        payload: { task_id: task.id, title },
        occurred_at: now,
        gesture_code: code,
      });

      return NextResponse.json({ ok: true, task }, { status: 201 });
    }

    if (["complete", "reopen", "snooze", "cancel", "update"].includes(action)) {
      const id = String(body.id || "");
      if (!id) return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });

      const { data: current, error: currentError } = await supabase.from("gesture_tasks").select("*").eq("id", id).single();
      if (currentError || !current) return NextResponse.json({ ok: false, error: "task_not_found" }, { status: 404 });

      const now = new Date().toISOString();
      const patch: Record<string, unknown> = { updated_at: now };
      let eventType = "gesture.task.updated";
      let actionKey = "gesture.task.update";

      if (action === "complete") {
        patch.status = "done";
        patch.completed_at = now;
        eventType = "gesture.task.completed";
        actionKey = "gesture.task.complete";
      } else if (action === "reopen") {
        patch.status = "open";
        patch.completed_at = null;
        eventType = "gesture.task.reopened";
        actionKey = "gesture.task.reopen";
      } else if (action === "snooze") {
        patch.status = "snoozed";
        patch.due_at = body.dueAt ? new Date(body.dueAt).toISOString() : null;
        eventType = "gesture.task.snoozed";
        actionKey = "gesture.task.snooze";
      } else if (action === "cancel") {
        patch.status = "cancelled";
        eventType = "gesture.task.cancelled";
        actionKey = "gesture.task.cancel";
      } else {
        if (body.title !== undefined) patch.title = String(body.title).trim();
        if (body.note !== undefined) patch.note = body.note ? String(body.note) : null;
        if (body.priority !== undefined) patch.priority = Number(body.priority);
        if (body.dueAt !== undefined) patch.due_at = body.dueAt ? new Date(body.dueAt).toISOString() : null;
      }

      const { data: task, error } = await supabase.from("gesture_tasks").update(patch).eq("id", id).select("*").single();
      if (error) throw error;

      const childGesture = await emitGesture(supabase, {
        actionKey,
        eventType,
        parentGestureCode: current.gesture_code,
        entityType: current.entity_type,
        globalId: current.global_id,
        payload: {
          task_id: current.id,
          task_gesture_code: current.gesture_code,
          title: task.title,
          status: task.status,
          due_at: task.due_at,
        },
      });

      return NextResponse.json({ ok: true, task, emittedGesture: childGesture });
    }

    return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "gesture_task_action_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
