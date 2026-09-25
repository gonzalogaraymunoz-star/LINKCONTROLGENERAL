"use server";

import { NextRequest, NextResponse } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";

const ROOT_CONTROL_ID = "00000000-0000-0000-0000-000000000001";
const WORKFLOW_STATES = new Set([
  "inbox",
  "to_resolve",
  "scheduled",
  "in_progress",
  "waiting",
  "resolved",
  "financially_closed",
]);

function gestureCode() {
  return "GST-" + crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();
}

function humanTitle(eventType: string) {
  const map: Record<string, string> = {
    "counterparty.registered": "Revisar nuevo Link",
    "product.created": "Revisar producto creado",
    "business.created": "Revisar negocio creado",
    "business.updated": "Revisar cambios del negocio",
    "client.created": "Revisar nuevo Link",
    "client.updated": "Revisar cambios del Link",
  };
  return map[eventType] || eventType.replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function syncLinkWorldGestures(supabase: NonNullable<ReturnType<typeof getCentralSupabase>>) {
  const { data: events, error } = await supabase
    .from("event_bus")
    .select("id,gesture_code,event_type,entity_type,global_id,payload,received_at")
    .eq("source_provider", "link_world")
    .not("gesture_code", "is", null)
    .order("received_at", { ascending: true })
    .limit(500);

  if (error) throw error;
  if (!events?.length) return;

  const codes = events.map((event) => event.gesture_code).filter(Boolean);
  const { data: existing, error: existingError } = await supabase
    .from("gesture_tasks")
    .select("gesture_code")
    .in("gesture_code", codes);

  if (existingError) throw existingError;
  const seen = new Set((existing || []).map((row) => row.gesture_code));

  const rows = events
    .filter((event) => event.gesture_code && !seen.has(event.gesture_code))
    .map((event) => ({
      gesture_code: event.gesture_code,
      source_domain: "world",
      entity_type: event.entity_type,
      global_id: event.global_id,
      title: humanTitle(event.event_type),
      note: "Gesto recibido desde LINK WORLD",
      status: "open",
      workflow_state: "inbox",
      workflow_updated_at: event.received_at,
      priority: 2,
      origin_event_type: event.event_type,
      origin_event_id: event.id,
      metadata: { origin: "link_world", event_payload: event.payload || {} },
      created_at: event.received_at,
      updated_at: event.received_at,
    }));

  if (rows.length) {
    const { error: insertError } = await supabase.from("gesture_tasks").insert(rows);
    if (insertError) throw insertError;
  }
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
    command_type: "operational_board",
    action_key: input.actionKey,
    actor: "control-central",
    target_provider: "link_world",
    entity_type: input.entityType || "gesture_task",
    global_id: input.globalId || null,
    payload,
    idempotency_key: "board:" + code,
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
    dedupe_key: "board:" + code + ":" + input.eventType,
    payload,
    occurred_at: now,
    gesture_code: code,
  });

  if (eventError) throw eventError;
  return code;
}

async function resolveCalendar(
  supabase: NonNullable<ReturnType<typeof getCentralSupabase>>,
  globalId?: string | null,
) {
  let businessId: string | null = null;

  if (globalId) {
    const { data: client } = await supabase
      .from("link_world_clients")
      .select("business_id")
      .eq("global_id", globalId)
      .maybeSingle();

    if (client?.business_id) {
      businessId = client.business_id;
    } else {
      const { data: product } = await supabase
        .from("link_world_products")
        .select("business_id")
        .eq("global_id", globalId)
        .maybeSingle();
      if (product?.business_id) businessId = product.business_id;
    }

    if (!businessId) {
      const { data: business } = await supabase
        .from("link_world_businesses")
        .select("id")
        .eq("global_id", globalId)
        .maybeSingle();
      if (business?.id) businessId = business.id;
    }
  }

  if (businessId) {
    const { data } = await supabase
      .from("link_world_calendar_sources")
      .select("id,google_calendar_id,calendar_name,background_color")
      .eq("business_id", businessId)
      .eq("status", "active")
      .maybeSingle();
    if (data) return data;
  }

  const { data } = await supabase
    .from("link_world_calendar_sources")
    .select("id,google_calendar_id,calendar_name,background_color")
    .eq("is_primary", true)
    .eq("status", "active")
    .maybeSingle();

  return data || null;
}

async function queueCalendar(
  supabase: NonNullable<ReturnType<typeof getCentralSupabase>>,
  task: Record<string, any>,
  childGesture: string,
) {
  if (!task.due_at) return;
  const source = await resolveCalendar(supabase, task.global_id);
  if (!source) return;

  const now = new Date().toISOString();
  await supabase.from("gesture_tasks").update({
    calendar_source_id: source.id,
    calendar_sync_status: "pending",
    updated_at: now,
  }).eq("id", task.id);

  await supabase.from("command_bus").insert({
    control_id: ROOT_CONTROL_ID,
    command_type: "calendar_sync",
    action_key: "calendar.event.upsert",
    actor: "control-central",
    target_provider: "google_calendar",
    entity_type: task.entity_type || "gesture_task",
    global_id: task.global_id,
    payload: {
      task_id: task.id,
      task_gesture_code: task.gesture_code,
      title: task.title,
      starts_at: task.due_at,
      duration_minutes: 30,
      google_calendar_id: source.google_calendar_id,
      calendar_name: source.calendar_name,
    },
    idempotency_key: "calendar:" + task.id + ":" + String(task.due_at),
    status: "pending",
    gesture_code: childGesture,
    source_domain: "control",
    parent_gesture_code: task.gesture_code,
    correlation_id: task.id,
    requires_approval: false,
    approval_status: "not_required",
  });
}

export async function GET() {
  const supabase = getCentralSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "central_supabase_not_configured" }, { status: 503 });
  }

  try {
    await syncLinkWorldGestures(supabase);

    const [
      tasksResult,
      businessesResult,
      clientsResult,
      productsResult,
      agendaResult,
      calendarsResult,
      financeResult,
      documentsResult,
    ] = await Promise.all([
      supabase.from("gesture_tasks")
        .select("*")
        .neq("status", "cancelled")
        .order("priority", { ascending: true })
        .order("workflow_updated_at", { ascending: false }),
      supabase.from("link_world_businesses")
        .select("id,name,global_id,slug,verification_status,summary")
        .order("name"),
      supabase.from("link_world_clients")
        .select("id,name,global_id,business_id,role,relationship_state,agreement_status,summary")
        .order("name"),
      supabase.from("link_world_products")
        .select("id,name,global_id,business_id,client_id,stage,economic_state,public_price,currency")
        .order("name"),
      supabase.from("link_world_calendar_events")
        .select("id,title,description,starts_at,ends_at,event_url,event_kind,business_id,business_global_id,link_id,link_global_id,product_id,gesture_code,source_id,priority,status")
        .order("starts_at", { ascending: true })
        .limit(1000),
      supabase.from("link_world_calendar_sources")
        .select("id,calendar_name,business_id,business_global_id,is_primary,google_color_id,background_color,source_scope,status")
        .eq("status", "active")
        .order("calendar_name"),
      supabase.from("link_world_financial_followup")
        .select("*"),
      supabase.from("link_world_documents")
        .select("id,business_id,transaction_id,closure_id,counterparty_id,product_id,document_type,route_key,drive_url,file_name,issue_date,amount,currency,created_at")
        .order("created_at", { ascending: false })
        .limit(300),
    ]);

    const firstError = [
      tasksResult.error,
      businessesResult.error,
      clientsResult.error,
      productsResult.error,
      agendaResult.error,
      calendarsResult.error,
      financeResult.error,
      documentsResult.error,
    ].find(Boolean);

    if (firstError) {
      return NextResponse.json({ ok: false, error: firstError.message }, { status: 500 });
    }

    const businesses = businessesResult.data || [];
    const clients = clientsResult.data || [];
    const products = productsResult.data || [];
    const calendars = calendarsResult.data || [];
    const businessById = new Map(businesses.map((row) => [row.id, row]));
    const clientById = new Map(clients.map((row) => [row.id, row]));
    const calendarByBusinessId = new Map(calendars.filter((row) => row.business_id).map((row) => [row.business_id, row]));
    const calendarById = new Map(calendars.map((row) => [row.id, row]));
    const primaryCalendar = calendars.find((row) => row.is_primary) || null;

    const contextByGlobalId = new Map<string, Record<string, any>>();
    for (const business of businesses) {
      if (business.global_id) {
        contextByGlobalId.set(business.global_id, {
          type: "business",
          business_id: business.id,
          business_global_id: business.global_id,
          business_name: business.name,
          entity_name: business.name,
        });
      }
    }
    for (const client of clients) {
      if (!client.global_id) continue;
      const business = client.business_id ? businessById.get(client.business_id) || null : null;
      contextByGlobalId.set(client.global_id, {
        type: "link",
        business_id: client.business_id,
        business_global_id: business?.global_id || null,
        business_name: business?.name || null,
        entity_name: client.name,
        link_id: client.id,
        link_global_id: client.global_id,
      });
    }
    for (const product of products) {
      if (!product.global_id) continue;
      const business = product.business_id ? businessById.get(product.business_id) || null : null;
      const link = product.client_id ? clientById.get(product.client_id) || null : null;
      contextByGlobalId.set(product.global_id, {
        type: "product",
        business_id: product.business_id,
        business_global_id: business?.global_id || null,
        business_name: business?.name || null,
        entity_name: product.name,
        link_id: link?.id || null,
        link_global_id: link?.global_id || null,
        link_name: link?.name || null,
        product_id: product.id,
        product_global_id: product.global_id,
      });
    }

    const financeByBusiness = new Map((financeResult.data || []).map((row) => [row.business_id, row]));
    const docsByBusiness = new Map<string, any[]>();
    for (const document of documentsResult.data || []) {
      const list = docsByBusiness.get(document.business_id) || [];
      list.push(document);
      docsByBusiness.set(document.business_id, list);
    }

    const tasks = (tasksResult.data || []).map((task) => {
      const context = task.global_id ? contextByGlobalId.get(task.global_id) || null : null;
      const businessId = context?.business_id || null;
      const calendar = businessId ? calendarByBusinessId.get(businessId) || null : primaryCalendar;
      return {
        ...task,
        workflow_state: task.workflow_state || (task.status === "done" ? "resolved" : task.due_at ? "scheduled" : "to_resolve"),
        business_id: businessId,
        business_global_id: context?.business_global_id || null,
        business_name: context?.business_name || (calendar?.is_primary ? "Personal" : "Sin negocio"),
        business_color: calendar?.background_color || "#d7d4cc",
        entity_name: context?.entity_name || null,
        link_id: context?.link_id || null,
        link_global_id: context?.link_global_id || null,
        link_name: context?.link_name || (context?.type === "link" ? context?.entity_name : null),
        product_id: context?.product_id || null,
        product_global_id: context?.product_global_id || null,
        product_name: context?.type === "product" ? context?.entity_name : null,
        finance: businessId ? financeByBusiness.get(businessId) || null : null,
        documents: businessId ? (docsByBusiness.get(businessId) || []).slice(0, 8) : [],
      };
    });

    const agenda = (agendaResult.data || []).map((event) => {
      const source = calendarById.get(event.source_id) || null;
      const business = event.business_id ? businessById.get(event.business_id) || null : null;
      const link = event.link_id ? clientById.get(event.link_id) || null : null;
      const product = event.product_id ? products.find((row) => row.id === event.product_id) || null : null;
      return {
        ...event,
        business_name: business?.name || source?.calendar_name || "Sin negocio",
        business_color: source?.background_color || "#d7d4cc",
        calendar_name: source?.calendar_name || null,
        link_name: link?.name || null,
        product_name: product?.name || null,
      };
    });

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      tasks,
      agenda,
      businesses,
      links: clients,
      products,
      calendars,
      counts: {
        active: tasks.filter((task) => !["resolved", "financially_closed"].includes(task.workflow_state)).length,
        today: tasks.filter((task) => task.due_at && new Date(task.due_at).toDateString() === new Date().toDateString() && !["resolved", "financially_closed"].includes(task.workflow_state)).length,
        financial: tasks.filter((task) => ["financial_transaction", "financial_closure"].includes(String(task.task_kind || "")) && !["resolved", "financially_closed"].includes(task.workflow_state)).length,
        waiting: tasks.filter((task) => task.workflow_state === "waiting").length,
      },
    });
  } catch (reason) {
    return NextResponse.json({
      ok: false,
      error: reason instanceof Error ? reason.message : "operational_board_failed",
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = getCentralSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "central_supabase_not_configured" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });

  const action = String(body.action || "");

  try {
    if (action === "create") {
      const title = String(body.title || "").trim();
      if (!title) return NextResponse.json({ ok: false, error: "title_required" }, { status: 400 });

      const code = gestureCode();
      const now = new Date().toISOString();
      const dueAt = body.dueAt ? new Date(body.dueAt).toISOString() : null;
      const workflowState = dueAt ? "scheduled" : "inbox";
      const globalId = body.globalId ? String(body.globalId) : null;
      const entityType = body.entityType ? String(body.entityType) : "gesture_task";

      const { data: task, error } = await supabase.from("gesture_tasks").insert({
        gesture_code: code,
        source_domain: "control",
        entity_type: entityType,
        global_id: globalId,
        title,
        note: body.note ? String(body.note) : null,
        objective: body.objective ? String(body.objective) : null,
        responsible: body.responsible ? String(body.responsible) : null,
        status: "open",
        workflow_state: workflowState,
        workflow_updated_at: now,
        priority: [1,2,3].includes(Number(body.priority)) ? Number(body.priority) : 2,
        due_at: dueAt,
        schedule_status: dueAt ? "scheduled" : "unscheduled",
        calendar_sync_status: dueAt ? "pending" : "not_requested",
        metadata: { origin: "control_central_board" },
        created_at: now,
        updated_at: now,
      }).select("*").single();

      if (error) throw error;

      const childGesture = await emitGesture(supabase, {
        actionKey: "gesture.task.create",
        eventType: "gesture.task.created",
        parentGestureCode: null,
        entityType,
        globalId,
        payload: { task_id: task.id, title, workflow_state: workflowState },
      });

      if (dueAt) await queueCalendar(supabase, task, childGesture);
      return NextResponse.json({ ok: true, task }, { status: 201 });
    }

    if (action === "update") {
      const id = String(body.id || "");
      if (!id) return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });

      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (body.title !== undefined) patch.title = String(body.title).trim();
      if (body.objective !== undefined) patch.objective = body.objective ? String(body.objective) : null;
      if (body.note !== undefined) patch.note = body.note ? String(body.note) : null;
      if (body.responsible !== undefined) patch.responsible = body.responsible ? String(body.responsible) : null;
      if (body.priority !== undefined && [1,2,3].includes(Number(body.priority))) patch.priority = Number(body.priority);

      const { data: task, error } = await supabase.from("gesture_tasks").update(patch).eq("id", id).select("*").single();
      if (error) throw error;

      await emitGesture(supabase, {
        actionKey: "gesture.task.update",
        eventType: "gesture.task.updated",
        parentGestureCode: task.gesture_code,
        entityType: task.entity_type,
        globalId: task.global_id,
        payload: { task_id: task.id, title: task.title },
      });

      return NextResponse.json({ ok: true, task });
    }

    if (action === "move_workflow") {
      const id = String(body.id || "");
      const workflowState = String(body.workflowState || "");
      if (!id || !WORKFLOW_STATES.has(workflowState)) {
        return NextResponse.json({ ok: false, error: "invalid_workflow_move" }, { status: 400 });
      }

      const { data: current, error: currentError } = await supabase.from("gesture_tasks").select("*").eq("id", id).single();
      if (currentError || !current) return NextResponse.json({ ok: false, error: "task_not_found" }, { status: 404 });

      const now = new Date().toISOString();
      const patch: Record<string, unknown> = {
        workflow_state: workflowState,
        workflow_updated_at: now,
        updated_at: now,
      };

      let eventType = "gesture.task.moved";
      let actionKey = "gesture.task.move";

      if (workflowState === "scheduled") {
        const dueAt = body.dueAt ? new Date(body.dueAt).toISOString() : current.due_at;
        if (!dueAt) return NextResponse.json({ ok: false, error: "due_at_required" }, { status: 400 });
        patch.status = "open";
        patch.due_at = dueAt;
        patch.schedule_status = "scheduled";
        patch.calendar_sync_status = "pending";
        eventType = "gesture.task.scheduled";
        actionKey = "gesture.task.schedule";
      } else if (workflowState === "in_progress") {
        patch.status = "open";
        patch.started_at = current.started_at || now;
        eventType = "gesture.task.started";
        actionKey = "gesture.task.start";
      } else if (workflowState === "waiting") {
        patch.status = "open";
        patch.waiting_for = body.waitingFor ? String(body.waitingFor) : current.waiting_for;
        patch.follow_up_at = body.followUpAt ? new Date(body.followUpAt).toISOString() : current.follow_up_at;
        eventType = "gesture.task.waiting";
        actionKey = "gesture.task.wait";
      } else if (workflowState === "resolved") {
        patch.status = "done";
        patch.completed_at = now;
        patch.resolution_note = body.resolutionNote ? String(body.resolutionNote) : current.resolution_note;
        eventType = "gesture.task.resolved";
        actionKey = "gesture.task.resolve";
      } else if (workflowState === "financially_closed") {
        if (!["financial_transaction", "financial_closure"].includes(String(current.task_kind || ""))) {
          return NextResponse.json({ ok: false, error: "financial_task_required" }, { status: 409 });
        }

        if (current.transaction_id) {
          const { data: transaction } = await supabase.from("link_world_transactions")
            .select("id,status,documentary_status")
            .eq("id", current.transaction_id)
            .single();
          if (!transaction || !["complete","none"].includes(String(transaction.documentary_status || ""))) {
            return NextResponse.json({ ok: false, error: "financial_document_missing" }, { status: 409 });
          }
          if (!["settled","cancelled"].includes(String(transaction.status || ""))) {
            await supabase.from("link_world_transactions").update({
              status: "settled",
              settled_at: now,
              updated_at: now,
            }).eq("id", current.transaction_id);
          }
        }

        if (current.closure_id) {
          const { data: closure } = await supabase.from("link_world_financial_closures")
            .select("id,status")
            .eq("id", current.closure_id)
            .single();
          if (!closure || !["ready","closed"].includes(String(closure.status || ""))) {
            return NextResponse.json({ ok: false, error: "financial_closure_not_ready" }, { status: 409 });
          }
          if (closure.status !== "closed") {
            await supabase.from("link_world_financial_closures").update({
              status: "closed",
              closed_at: now,
              updated_at: now,
            }).eq("id", current.closure_id);
          }
        }

        patch.status = "done";
        patch.completed_at = now;
        patch.financial_state = "closed";
        eventType = "gesture.task.financially_closed";
        actionKey = "gesture.task.financial_close";
      } else {
        patch.status = "open";
        if (workflowState === "inbox" || workflowState === "to_resolve") {
          patch.completed_at = null;
        }
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
          from: current.workflow_state,
          to: workflowState,
          due_at: task.due_at,
          waiting_for: task.waiting_for,
          resolution_note: task.resolution_note,
        },
      });

      if (workflowState === "scheduled") await queueCalendar(supabase, task, childGesture);
      return NextResponse.json({ ok: true, task, emittedGesture: childGesture });
    }

    return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
  } catch (reason) {
    return NextResponse.json({
      ok: false,
      error: reason instanceof Error ? reason.message : "operational_board_action_failed",
    }, { status: 500 });
  }
}
