import { NextRequest, NextResponse } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";

const ROOT_CONTROL_ID = "00000000-0000-0000-0000-000000000001";

function gestureCode() {
  return "GST-" + crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();
}

function titleFromEvent(eventType: string) {
  const map: Record<string, string> = {
    "counterparty.registered": "Revisar nuevo Link",
    "product.created": "Revisar producto creado",
    "business.created": "Revisar negocio creado",
    "business.updated": "Revisar cambios del negocio",
    "client.created": "Revisar cliente creado",
    "client.updated": "Revisar cambios del cliente",
    "gesture.task.created": "Nueva tarea",
  };
  return map[eventType] || eventType.replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function taskGuidance(task: Record<string, any>, entity?: Record<string, any> | null) {
  if (task.context_summary && task.objective && task.resolution_criteria && task.recommended_action) {
    return {
      context_summary: task.context_summary,
      objective: task.objective,
      resolution_criteria: task.resolution_criteria,
      recommended_action: task.recommended_action,
    };
  }

  const name = entity?.name || task.entity_name || "esta entidad";
  const eventType = String(task.origin_event_type || "");
  const kind = String(task.task_kind || "general");

  if (kind === "financial_transaction") {
    const state = String(task.financial_state || "open");
    const needsDocument = Boolean(task.requires_document);
    return {
      context_summary: `LINK WORLD detectó un movimiento financiero asociado a ${name}. Estado actual: ${state.replace(/_/g, " ")}${needsDocument ? "; falta respaldo documental." : "."}`,
      objective: "Cerrar el movimiento financiero con pago y respaldo correctamente vinculados al negocio.",
      resolution_criteria: needsDocument
        ? "El pago debe quedar registrado y el comprobante, boleta o factura correspondiente debe estar guardado en Drive e indexado en Supabase."
        : "La transacción debe quedar conciliada y en estado cerrado, sin pendientes documentales.",
      recommended_action: needsDocument
        ? "Adjuntar o localizar el respaldo de la transacción y vincularlo al movimiento."
        : "Revisar el estado de pago y marcar la transacción como conciliada cuando corresponda.",
    };
  }

  if (kind === "financial_closure") {
    return {
      context_summary: `Existe un cierre financiero abierto para ${name}. El cierre agrupa los movimientos del período y sus respaldos.`,
      objective: "Dejar el período financiero completamente conciliado y documentado.",
      resolution_criteria: "Todas las transacciones del período deben estar cerradas, con sus documentos requeridos, y el respaldo de cierre debe quedar registrado.",
      recommended_action: "Revisar transacciones pendientes, documentos faltantes y cerrar el período cuando todo esté conciliado.",
    };
  }

  if (eventType === "counterparty.registered" || task.entity_type === "counterparty") {
    const businessName = entity?.business_name ? ` dentro de ${entity.business_name}` : "";
    const relation = entity?.relationship_state || "sin definir";
    const agreement = entity?.agreement_status || "sin definir";
    return {
      context_summary: `${name} fue registrado por LINK WORLD como un Link comercial${businessName}. Relación: ${relation}. Acuerdo comercial: ${agreement}.`,
      objective: "Convertir el Link detectado en una relación comercial claramente definida y operable.",
      resolution_criteria: "Debe quedar definido el estado de la relación, el estado del acuerdo y un siguiente paso concreto: operar, negociar, esperar o descartar.",
      recommended_action: "Revisar la ficha del Link, validar las condiciones comerciales y registrar la decisión o siguiente acción.",
    };
  }

  if (eventType === "product.created" || task.entity_type === "product") {
    const stage = entity?.stage || "sin etapa";
    const economic = entity?.economic_state || "sin estado económico";
    const missing: string[] = [];
    if (entity?.public_price == null) missing.push("precio público");
    if (entity?.acquisition_price == null) missing.push("costo de adquisición");
    if (entity?.link_share_percent == null) missing.push("participación LINK");
    return {
      context_summary: `${name} existe en LINK WORLD. Etapa: ${stage}. Estado económico: ${economic}.${missing.length ? " Faltan: " + missing.join(", ") + "." : ""}`,
      objective: "Dejar el producto listo para avanzar comercialmente sin datos económicos o de operación críticos pendientes.",
      resolution_criteria: "La etapa, condiciones económicas, responsables y relación con cliente/negocio deben quedar suficientemente definidos para ejecutar el siguiente gesto.",
      recommended_action: missing.length
        ? "Completar " + missing.join(", ") + " y validar la etapa del producto."
        : "Validar la etapa actual y definir el siguiente gesto comercial.",
    };
  }

  if (task.entity_type === "business" || eventType.startsWith("business.")) {
    const verification = entity?.verification_status || "sin verificar";
    return {
      context_summary: `${name} tuvo un movimiento en LINK WORLD. Estado de verificación: ${verification}.`,
      objective: "Mantener el negocio con identidad, estado y próximos pasos operativos claramente definidos.",
      resolution_criteria: "El negocio debe quedar verificado o con una razón explícita para permanecer pendiente, y con el siguiente paso registrado.",
      recommended_action: "Revisar los cambios del negocio y confirmar si requiere validación, datos adicionales o una acción operativa.",
    };
  }

  return {
    context_summary: task.note || "LINK WORLD generó un gesto que requiere revisión humana.",
    objective: "Resolver el gesto y devolver un estado claro al ecosistema.",
    resolution_criteria: "Debe existir una decisión o resultado verificable y el gesto debe quedar actualizado en LINK WORLD.",
    recommended_action: "Abrir el contexto asociado, tomar la decisión necesaria y registrar el resultado.",
  };
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
      supabase.from("link_world_businesses").select("id,name,global_id,verification_status,summary"),
      supabase.from("link_world_clients").select("id,name,global_id,business_id,role,relationship_state,agreement_status,summary,owned_facts"),
      supabase.from("link_world_products").select("id,name,global_id,business_id,client_id,stage,economic_state,public_price,acquisition_price,link_share_percent"),
    ]);

    const firstError = [tasksResult.error, businessesResult.error, clientsResult.error, productsResult.error].find(Boolean);
    if (firstError) return NextResponse.json({ ok: false, error: firstError.message }, { status: 500 });

    const entityNames = new Map<string, string>();
    const entityContext = new Map<string, Record<string, any>>();

    for (const row of businessesResult.data || []) {
      if (!row.global_id) continue;
      entityNames.set(row.global_id, row.name);
      entityContext.set(row.global_id, row);
    }

    const businessById = new Map((businessesResult.data || []).map((row) => [row.id, row]));

    for (const row of clientsResult.data || []) {
      if (!row.global_id) continue;
      const business = row.business_id ? businessById.get(row.business_id) : null;
      const enriched = { ...row, business_name: business?.name || null };
      entityNames.set(row.global_id, row.name);
      entityContext.set(row.global_id, enriched);
    }

    for (const row of productsResult.data || []) {
      if (!row.global_id) continue;
      entityNames.set(row.global_id, row.name);
      entityContext.set(row.global_id, row);
    }

    const tasks = (tasksResult.data || []).map((task) => {
      const entity = task.global_id ? entityContext.get(task.global_id) || null : null;
      const entityName = task.global_id ? entityNames.get(task.global_id) || null : null;
      const guidance = taskGuidance({ ...task, entity_name: entityName }, entity);
      return {
        ...task,
        ...guidance,
        entity_name: entityName,
      };
    });

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
