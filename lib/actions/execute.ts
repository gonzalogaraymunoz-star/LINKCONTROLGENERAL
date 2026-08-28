import { randomUUID } from "node:crypto";
import { ACTION_BY_KEY } from "@/lib/actions/registry";
import { getCentralSupabase } from "@/lib/supabase/server";

const ROOT_CONTROL_ID = "00000000-0000-0000-0000-000000000001";
const STAGES = new Set(["understand", "organize", "build", "activate", "support", "scale"]);
const WORK_KINDS = new Set(["action", "task", "gesture"]);

type CentralSupabase = NonNullable<ReturnType<typeof getCentralSupabase>>;
type JsonObject = Record<string, unknown>;

export type ExecuteControlActionOptions = {
  actor?: string;
  idempotencyKey?: string;
  globalId?: string | null;
  entityType?: string | null;
};

export type ControlActionExecution = {
  actionKey: string;
  deduped: boolean;
  queued: boolean;
  commandId: string;
  result: JsonObject;
};

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
}

function shortCodeFor(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function resolveClient(supabase: CentralSupabase, reference: string) {
  const ref = reference.trim();
  if (!ref) throw new Error("client_reference_required");

  const select = "id,name,slug,status,short_code,accent,control_id,global_id,metadata";
  if (isUuid(ref)) {
    const { data, error } = await supabase.from("clients").select(select).eq("id", ref).maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data;
  }

  for (const field of ["global_id", "slug"] as const) {
    const { data, error } = await supabase.from("clients").select(select).eq(field, ref).maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data;
  }

  const { data, error } = await supabase.from("clients").select(select).ilike("name", ref).limit(2);
  if (error) throw new Error(error.message);
  if ((data ?? []).length === 1) return data![0];
  if ((data ?? []).length > 1) throw new Error("client_reference_ambiguous");
  throw new Error("client_not_found");
}

async function uniqueClientSlug(supabase: CentralSupabase, requested: string) {
  const base = slugify(requested) || `client-${randomUUID().slice(0, 8)}`;
  const { data, error } = await supabase.from("clients").select("id").eq("slug", base).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? `${base}-${randomUUID().slice(0, 5)}` : base;
}

async function uniqueProjectSlug(supabase: CentralSupabase, requested: string) {
  const base = slugify(requested) || `project-${randomUUID().slice(0, 8)}`;
  const { data, error } = await supabase.from("projects").select("id").eq("slug", base).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? `${base}-${randomUUID().slice(0, 5)}` : base;
}

async function recordLegacyEvent(
  supabase: CentralSupabase,
  eventType: string,
  actor: string,
  result: JsonObject,
) {
  const clientId = text(result.clientId) || text(asObject(result.client).id) || null;
  const objectType = text(result.objectType) || text(result.entityType) || "control_action";
  const objectId = text(result.objectId) || text(asObject(result.client).id) || text(asObject(result.project).id) || text(asObject(result.workItem).id) || text(asObject(result.memory).id) || null;
  await supabase.from("events").insert({
    control_id: ROOT_CONTROL_ID,
    client_id: clientId,
    event_type: eventType,
    actor,
    object_type: objectType,
    object_id: objectId,
    payload: result,
  });
}

async function recordBusEvent(
  supabase: CentralSupabase,
  commandId: string,
  eventType: string,
  result: JsonObject,
  options: ExecuteControlActionOptions,
) {
  await supabase.from("event_bus").insert({
    control_id: ROOT_CONTROL_ID,
    source_provider: "control-central",
    event_type: eventType,
    entity_type: options.entityType || text(result.entityType) || null,
    global_id: options.globalId || text(result.globalId) || text(asObject(result.client).global_id) || null,
    correlation_id: commandId,
    dedupe_key: `${commandId}:${eventType}`,
    payload: result,
    occurred_at: new Date().toISOString(),
  });
}

async function executeMutation(supabase: CentralSupabase, actionKey: string, payload: JsonObject, actor: string): Promise<JsonObject> {
  if (actionKey === "client.create") {
    const name = text(payload.name);
    if (!name) throw new Error("client_name_required");
    const slug = await uniqueClientSlug(supabase, text(payload.slug) || name);
    const globalId = text(payload.globalId) || `CC-CLIENT-${randomUUID().slice(0, 8).toUpperCase()}`;
    const { data, error } = await supabase
      .from("clients")
      .insert({
        control_id: ROOT_CONTROL_ID,
        name,
        slug,
        status: "active",
        short_code: text(payload.shortCode) || shortCodeFor(name),
        accent: text(payload.accent) || "#7a7a76",
        global_id: globalId,
        metadata: { ...asObject(payload.metadata), source: actor },
      })
      .select("id,name,slug,status,short_code,accent,control_id,global_id,metadata,created_at")
      .single();
    if (error) throw new Error(error.message);
    return { entityType: "client", globalId, clientId: data.id, objectType: "client", objectId: data.id, client: data };
  }

  if (actionKey === "client.update") {
    const reference = text(payload.clientRef) || text(payload.clientId) || text(payload.globalId);
    const client = await resolveClient(supabase, reference);
    const patch: JsonObject = { updated_at: new Date().toISOString() };
    if (payload.name !== undefined) patch.name = text(payload.name);
    if (payload.shortCode !== undefined) patch.short_code = text(payload.shortCode);
    if (payload.accent !== undefined) patch.accent = text(payload.accent);
    if (payload.status !== undefined) {
      const status = text(payload.status);
      if (!new Set(["active", "archived"]).has(status)) throw new Error("invalid_client_status");
      patch.status = status;
      patch.archived_at = status === "archived" ? new Date().toISOString() : null;
    }
    if (payload.metadata !== undefined) patch.metadata = { ...asObject(client.metadata), ...asObject(payload.metadata) };
    const { data, error } = await supabase
      .from("clients")
      .update(patch)
      .eq("id", client.id)
      .select("id,name,slug,status,short_code,accent,control_id,global_id,metadata,updated_at")
      .single();
    if (error) throw new Error(error.message);
    return { entityType: "client", globalId: data.global_id, clientId: data.id, objectType: "client", objectId: data.id, client: data };
  }

  if (actionKey === "client.archive") {
    const reference = text(payload.clientRef) || text(payload.clientId) || text(payload.globalId);
    const client = await resolveClient(supabase, reference);
    const { data, error } = await supabase
      .from("clients")
      .update({ status: "archived", archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", client.id)
      .select("id,name,slug,status,global_id,archived_at")
      .single();
    if (error) throw new Error(error.message);
    return { entityType: "client", globalId: data.global_id, clientId: data.id, objectType: "client", objectId: data.id, client: data };
  }

  if (actionKey === "project.connect") {
    const reference = text(payload.clientRef) || text(payload.clientId) || text(payload.globalId);
    const client = await resolveClient(supabase, reference);
    const name = text(payload.projectName) || text(payload.name);
    if (!name) throw new Error("project_name_required");
    const requestedSlug = text(payload.slug) || `${client.slug}-${slugify(name)}`;

    const { data: already, error: existingError } = await supabase
      .from("projects")
      .select("id,name,slug,status,client_id,kind,phase,metadata")
      .eq("client_id", client.id)
      .eq("name", name)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);
    if (already) {
      return { entityType: "project", globalId: client.global_id, clientId: client.id, objectType: "project", objectId: already.id, project: already, alreadyConnected: true };
    }

    const slug = await uniqueProjectSlug(supabase, requestedSlug);
    const { data, error } = await supabase
      .from("projects")
      .insert({
        client_id: client.id,
        name,
        slug,
        description: text(payload.description) || null,
        status: "active",
        kind: text(payload.kind) || "business-app",
        phase: text(payload.phase) || "discovery",
        metadata: { ...asObject(payload.metadata), source: actor, client_global_id: client.global_id },
      })
      .select("id,name,slug,status,client_id,kind,phase,metadata,created_at")
      .single();
    if (error) throw new Error(error.message);
    return { entityType: "project", globalId: client.global_id, clientId: client.id, objectType: "project", objectId: data.id, project: data };
  }

  if (actionKey === "work_item.create") {
    const reference = text(payload.clientRef) || text(payload.clientId) || text(payload.globalId);
    const client = reference ? await resolveClient(supabase, reference) : null;
    const title = text(payload.title);
    if (!title) throw new Error("work_item_title_required");
    const kind = text(payload.kind) || "task";
    if (!WORK_KINDS.has(kind)) throw new Error("invalid_work_item_kind");
    const stage = text(payload.stage);
    if (stage && !STAGES.has(stage)) throw new Error("invalid_stage");
    const priorityRaw = Number(payload.priority ?? 2);
    const priority = Number.isFinite(priorityRaw) ? Math.max(1, Math.min(4, Math.round(priorityRaw))) : 2;
    const { data, error } = await supabase
      .from("work_items")
      .insert({
        control_id: ROOT_CONTROL_ID,
        client_id: client?.id || null,
        cycle_id: text(payload.cycleId) || null,
        strategy_id: text(payload.strategyId) || null,
        onboarding_stage_id: text(payload.onboardingStageId) || null,
        stage: stage || null,
        kind,
        title,
        description: text(payload.description) || null,
        due_at: text(payload.dueAt) || null,
        priority,
        status: "pending",
        source: text(payload.source) || actor,
        metadata: asObject(payload.metadata),
      })
      .select("id,client_id,cycle_id,stage,kind,title,description,due_at,priority,status,source,metadata,created_at")
      .single();
    if (error) throw new Error(error.message);
    return {
      entityType: "work_item",
      globalId: client?.global_id || null,
      clientId: data.client_id,
      objectType: "work_item",
      objectId: data.id,
      workItem: data,
    };
  }

  if (actionKey === "memory.remember") {
    const reference = text(payload.clientRef) || text(payload.clientId) || text(payload.globalId);
    const client = await resolveClient(supabase, reference);
    const memoryKey = text(payload.memoryKey);
    const content = text(payload.content);
    if (!memoryKey || !content) throw new Error("memory_key_and_content_required");
    const scopeKey = client.global_id || client.id;
    const { data: namespaces, error: namespaceError } = await supabase
      .from("memory_namespaces")
      .select("id,scope_type,scope_key,label")
      .eq("scope_type", "client")
      .eq("scope_key", scopeKey)
      .limit(1);
    if (namespaceError) throw new Error(namespaceError.message);
    let namespace = namespaces?.[0] || null;
    if (!namespace) {
      const { data, error } = await supabase
        .from("memory_namespaces")
        .insert({ control_id: ROOT_CONTROL_ID, scope_type: "client", scope_key: scopeKey, label: client.name, metadata: { source: actor } })
        .select("id,scope_type,scope_key,label")
        .single();
      if (error) throw new Error(error.message);
      namespace = data;
    }
    const importanceRaw = Number(payload.importance ?? 3);
    const importance = Number.isFinite(importanceRaw) ? Math.max(1, Math.min(5, Math.round(importanceRaw))) : 3;
    const { data: memory, error } = await supabase
      .from("deep_memories")
      .insert({
        namespace_id: namespace.id,
        memory_key: memoryKey,
        kind: text(payload.kind) || "fact",
        content,
        structured_data: asObject(payload.structuredData),
        importance,
        source: text(payload.source) || actor,
        source_ref: text(payload.sourceRef) || null,
        metadata: asObject(payload.metadata),
      })
      .select("id,namespace_id,memory_key,kind,content,importance,source,created_at")
      .single();
    if (error) throw new Error(error.message);
    await supabase.from("memory_links").insert({ memory_id: memory.id, entity_type: "client", entity_key: scopeKey, relation: "about", metadata: { client_id: client.id } });
    return {
      entityType: "memory",
      globalId: client.global_id,
      clientId: client.id,
      objectType: "deep_memory",
      objectId: memory.id,
      memory,
    };
  }

  throw new Error(`action_not_executable:${actionKey}`);
}

export async function executeControlAction(
  actionKey: string,
  payload: JsonObject,
  options: ExecuteControlActionOptions = {},
): Promise<ControlActionExecution> {
  const definition = ACTION_BY_KEY.get(actionKey);
  if (!definition) throw new Error("unsupported_action");
  if (definition.mode !== "write") throw new Error("write_action_required");
  if (definition.provider === "twenty") throw new Error("twenty_actions_are_queued_by_crm_gateway");

  const supabase = getCentralSupabase();
  if (!supabase) throw new Error("central_supabase_not_configured");

  const actor = options.actor || "control-central";
  const idempotencyKey = options.idempotencyKey || randomUUID();
  const { data: existing, error: existingError } = await supabase
    .from("command_bus")
    .select("id,status,result,error")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) {
    return {
      actionKey,
      deduped: true,
      queued: existing.status === "pending" || existing.status === "processing",
      commandId: existing.id,
      result: asObject(existing.result),
    };
  }

  const { data: command, error: commandError } = await supabase
    .from("command_bus")
    .insert({
      control_id: ROOT_CONTROL_ID,
      command_type: "COMMAND",
      action_key: actionKey,
      actor,
      target_provider: definition.provider,
      entity_type: options.entityType || null,
      global_id: options.globalId || null,
      payload,
      idempotency_key: idempotencyKey,
      status: "processing",
      attempts: 1,
    })
    .select("id")
    .single();
  if (commandError) throw new Error(commandError.message);

  try {
    const result = await executeMutation(supabase, actionKey, payload, actor);
    await supabase
      .from("command_bus")
      .update({ status: "succeeded", result, processed_at: new Date().toISOString() })
      .eq("id", command.id);

    if (definition.successEvent) {
      await recordLegacyEvent(supabase, definition.successEvent, actor, result);
      await recordBusEvent(supabase, command.id, definition.successEvent, result, options);
    }

    return { actionKey, deduped: false, queued: false, commandId: command.id, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "action_failed";
    await supabase
      .from("command_bus")
      .update({ status: "failed", error: message, processed_at: new Date().toISOString() })
      .eq("id", command.id);
    if (definition.failureEvent) {
      const failure = { actionKey, error: message, payload };
      await recordBusEvent(supabase, command.id, definition.failureEvent, failure, options);
    }
    throw error;
  }
}
