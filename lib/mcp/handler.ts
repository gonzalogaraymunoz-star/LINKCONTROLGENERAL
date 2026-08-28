import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { executeControlAction } from "@/lib/actions/execute";
import { STAGE_BY_KEY } from "@/lib/crm/stages";
import { getCentralSupabase } from "@/lib/supabase/server";

const SCOPE_ALIASES: Record<string, string> = {
  link_empresa: "link-empresa",
  lama: "lama-travelers",
  lama_travelers: "lama-travelers",
  hotel_experience: "hotel-experience",
  link_cupones: "link-cupones",
};

function normalizedSlug(scope: string) {
  return SCOPE_ALIASES[scope] ?? scope.replaceAll("_", "-");
}

async function clientsForScope(scope: string) {
  const supabase = getCentralSupabase();
  if (!supabase) return { supabase: null, clients: [] as Array<Record<string, unknown>> };

  let query = supabase
    .from("clients")
    .select("id,name,slug,status,short_code,accent,control_id,global_id,metadata")
    .eq("status", "active")
    .order("created_at");

  if (scope !== "root") query = query.eq("slug", normalizedSlug(scope));

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return { supabase, clients: (data ?? []) as Array<Record<string, unknown>> };
}

function errorResult(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

function successText(label: string, result: Record<string, unknown>) {
  return {
    structuredContent: { ok: true, ...result },
    content: [{ type: "text" as const, text: label }],
  };
}

export function createLinkMcpHandler(scope: string, options: { writesEnabled?: boolean } = {}) {
  const normalizedScope = scope || "root";
  const writesEnabled = Boolean(options.writesEnabled && normalizedScope === "root");

  return createMcpHandler(
    (server) => {
      server.registerTool(
        "get_scope",
        {
          title: "Get LINK Control scope",
          description: "Use this when ChatGPT needs to confirm which LINK Control scope it is operating inside before reading or changing business data.",
          inputSchema: z.object({}),
          annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
        },
        async () => {
          try {
            const { clients } = await clientsForScope(normalizedScope);
            return {
              structuredContent: {
                control: normalizedScope === "root" ? "LINK CONTROL CENTRAL" : normalizedSlug(normalizedScope),
                scope: normalizedScope,
                dataMode: "supabase-live",
                writesEnabled,
                clientCount: clients.length,
              },
              content: [{ type: "text", text: `LINK Control scope ${normalizedScope} is connected to live Supabase data. Write actions are ${writesEnabled ? "enabled" : "disabled"}.` }],
            };
          } catch (error) {
            return errorResult(error instanceof Error ? error.message : "Unable to resolve LINK Control scope.");
          }
        },
      );

      server.registerTool(
        "health",
        {
          title: "Check LINK Control health",
          description: "Use this when the user wants to verify whether LINK Control MCP and its Supabase data plane are reachable.",
          inputSchema: z.object({}),
          annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
        },
        async () => {
          try {
            const { supabase, clients } = await clientsForScope(normalizedScope);
            if (!supabase) return errorResult("Supabase is not configured on the LINK Control server.");
            const { count, error } = await supabase.from("work_items").select("id", { count: "exact", head: true }).neq("status", "cancelled");
            if (error) throw new Error(error.message);
            return {
              structuredContent: {
                service: "link-control-central",
                scope: normalizedScope,
                app: "ok",
                mcp: "ok",
                supabase: "ok",
                dataMode: writesEnabled ? "live-read-write" : "live-read-only",
                writesEnabled,
                clients: clients.length,
                workItems: count ?? 0,
                timestamp: new Date().toISOString(),
              },
              content: [{ type: "text", text: `LINK Control ${normalizedScope} and Supabase are reachable. MCP writes are ${writesEnabled ? "enabled for authenticated requests" : "disabled for this credential"}.` }],
            };
          } catch (error) {
            return errorResult(error instanceof Error ? error.message : "LINK Control health check failed.");
          }
        },
      );

      server.registerTool(
        "search_clients",
        {
          title: "Search LINK clients",
          description: "Use this when the user wants to find clients inside the active LINK Control scope and see their current stage and progress.",
          inputSchema: z.object({ query: z.string().trim().optional() }),
          annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
        },
        async ({ query }) => {
          try {
            const { supabase, clients } = await clientsForScope(normalizedScope);
            if (!supabase) return errorResult("Supabase is not configured.");
            const q = query?.toLowerCase();
            const filtered = clients.filter((client) => !q || String(client.name ?? "").toLowerCase().includes(q) || String(client.global_id ?? "").toLowerCase().includes(q));
            const ids = filtered.map((client) => String(client.id));
            let cycles: Array<Record<string, unknown>> = [];
            if (ids.length) {
              const { data, error } = await supabase.from("client_cycles").select("id,client_id,stage,progress,next_milestone,status").eq("status", "active").in("client_id", ids);
              if (error) throw new Error(error.message);
              cycles = (data ?? []) as Array<Record<string, unknown>>;
            }
            const result = filtered.map((client) => {
              const cycle = cycles.find((item) => item.client_id === client.id);
              const stage = String(cycle?.stage ?? "understand");
              return {
                id: client.id,
                globalId: client.global_id ?? null,
                name: client.name,
                slug: client.slug,
                stage,
                stageName: STAGE_BY_KEY[stage as keyof typeof STAGE_BY_KEY]?.name ?? stage,
                progress: Number(cycle?.progress ?? 0),
                nextMilestone: cycle?.next_milestone ?? null,
              };
            });
            return {
              structuredContent: { scope: normalizedScope, clients: result },
              content: [{ type: "text", text: `Found ${result.length} live client record${result.length === 1 ? "" : "s"} inside scope ${normalizedScope}.` }],
            };
          } catch (error) {
            return errorResult(error instanceof Error ? error.message : "Client search failed.");
          }
        },
      );

      server.registerTool(
        "get_client_360",
        {
          title: "Get client 360",
          description: "Use this when the user wants the live operational context for one client: need, product, LINK stage, progress, next milestone, actions, tasks and gestures.",
          inputSchema: z.object({ clientId: z.string().min(1) }),
          annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
        },
        async ({ clientId }) => {
          try {
            const { supabase, clients } = await clientsForScope(normalizedScope);
            if (!supabase) return errorResult("Supabase is not configured.");
            const client = clients.find((item) => String(item.id) === clientId || String(item.global_id ?? "") === clientId || String(item.slug) === clientId || String(item.name).toLowerCase() === clientId.toLowerCase());
            if (!client) return errorResult(`Client ${clientId} is outside scope ${normalizedScope} or does not exist.`);

            const { data: cycle, error: cycleError } = await supabase
              .from("client_cycles")
              .select("id,client_id,need_id,product_id,stage,progress,next_milestone,status,updated_at")
              .eq("client_id", String(client.id))
              .eq("status", "active")
              .maybeSingle();
            if (cycleError) throw new Error(cycleError.message);

            let need = null;
            let product = null;
            let workItems: Array<Record<string, unknown>> = [];
            if (cycle) {
              const [{ data: needData }, { data: productData }, { data: workData, error: workError }] = await Promise.all([
                cycle.need_id ? supabase.from("needs").select("id,title,description,status").eq("id", cycle.need_id).maybeSingle() : Promise.resolve({ data: null }),
                cycle.product_id ? supabase.from("products").select("id,name,description,product_type,active").eq("id", cycle.product_id).maybeSingle() : Promise.resolve({ data: null }),
                supabase.from("work_items").select("id,kind,title,description,due_at,priority,status,stage,source,updated_at").eq("cycle_id", cycle.id).neq("status", "cancelled").order("created_at"),
              ]);
              if (workError) throw new Error(workError.message);
              need = needData;
              product = productData;
              workItems = (workData ?? []) as Array<Record<string, unknown>>;
            }

            const stage = String(cycle?.stage ?? "understand");
            const result = {
              client,
              cycle: cycle ? { ...cycle, stageName: STAGE_BY_KEY[stage as keyof typeof STAGE_BY_KEY]?.name ?? stage } : null,
              need,
              product,
              workItems,
            };
            return {
              structuredContent: { scope: normalizedScope, ...result },
              content: [{ type: "text", text: cycle ? `${String(client.name)} is in ${result.cycle?.stageName} at ${cycle.progress}%. ${workItems.filter((item) => item.status !== "done").length} work items remain pending.` : `${String(client.name)} has no active LINK cycle.` }],
            };
          } catch (error) {
            return errorResult(error instanceof Error ? error.message : "Unable to load client 360.");
          }
        },
      );

      server.registerTool(
        "list_projects",
        {
          title: "List connected LINK projects",
          description: "Use this when the user wants to see the projects or business apps connected to clients in CONTROL CENTRAL.",
          inputSchema: z.object({ clientId: z.string().optional() }),
          annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
        },
        async ({ clientId }) => {
          try {
            const { supabase, clients } = await clientsForScope(normalizedScope);
            if (!supabase) return errorResult("Supabase is not configured.");
            const allowedIds = clients.map((item) => String(item.id));
            if (!allowedIds.length) return successText("No projects are available in this scope.", { scope: normalizedScope, projects: [] });
            let query = supabase.from("projects").select("id,client_id,name,slug,description,status,kind,phase,metadata,updated_at").in("client_id", allowedIds).eq("status", "active").order("created_at");
            if (clientId) query = query.eq("client_id", clientId);
            const { data, error } = await query;
            if (error) throw new Error(error.message);
            return {
              structuredContent: { scope: normalizedScope, projects: data ?? [] },
              content: [{ type: "text", text: `Found ${(data ?? []).length} connected projects.` }],
            };
          } catch (error) {
            return errorResult(error instanceof Error ? error.message : "Unable to list projects.");
          }
        },
      );

      server.registerTool(
        "list_work_items",
        {
          title: "List LINK work items",
          description: "Use this when the user wants to review live actions, tasks or gestures stored in Supabase for the active scope.",
          inputSchema: z.object({ clientId: z.string().optional(), kind: z.enum(["action", "task", "gesture"]).optional(), status: z.string().optional() }),
          annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
        },
        async ({ clientId, kind, status }) => {
          try {
            const { supabase, clients } = await clientsForScope(normalizedScope);
            if (!supabase) return errorResult("Supabase is not configured.");
            const allowedIds = clients.map((item) => String(item.id));
            if (!allowedIds.length) return { structuredContent: { scope: normalizedScope, workItems: [] }, content: [{ type: "text", text: "No clients are available in this scope." }] };
            let query = supabase.from("work_items").select("id,client_id,cycle_id,stage,kind,title,description,due_at,priority,status,source,updated_at").in("client_id", allowedIds).neq("status", "cancelled").order("created_at");
            if (clientId) query = query.eq("client_id", clientId);
            if (kind) query = query.eq("kind", kind);
            if (status) query = query.eq("status", status);
            const { data, error } = await query;
            if (error) throw new Error(error.message);
            return {
              structuredContent: { scope: normalizedScope, workItems: data ?? [] },
              content: [{ type: "text", text: `Found ${(data ?? []).length} live work items.` }],
            };
          } catch (error) {
            return errorResult(error instanceof Error ? error.message : "Unable to list work items.");
          }
        },
      );

      server.registerTool(
        "search_memory",
        {
          title: "Search CONTROL CENTRAL deep memory",
          description: "Use this when the user wants to recall decisions, facts, instructions, constraints or other deep memory linked to clients in CONTROL CENTRAL.",
          inputSchema: z.object({ query: z.string().trim().min(1), clientId: z.string().optional(), limit: z.number().int().min(1).max(50).default(20) }),
          annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
        },
        async ({ query, clientId, limit }) => {
          try {
            const { supabase, clients } = await clientsForScope(normalizedScope);
            if (!supabase) return errorResult("Supabase is not configured.");
            const selectedClients = clientId
              ? clients.filter((client) => String(client.id) === clientId || String(client.global_id ?? "") === clientId || String(client.slug) === clientId || String(client.name).toLowerCase() === clientId.toLowerCase())
              : clients;
            const scopeKeys = selectedClients.map((client) => String(client.global_id || client.id));
            if (!scopeKeys.length) return successText("No memory namespaces are available for this scope.", { scope: normalizedScope, memories: [] });
            const { data: namespaces, error: namespaceError } = await supabase.from("memory_namespaces").select("id,scope_type,scope_key,label").eq("scope_type", "client").in("scope_key", scopeKeys);
            if (namespaceError) throw new Error(namespaceError.message);
            const namespaceIds = (namespaces ?? []).map((item) => item.id);
            if (!namespaceIds.length) return successText("No deep memories are stored for the selected clients yet.", { scope: normalizedScope, memories: [] });
            const escaped = query.replaceAll("%", "\\%").replaceAll("_", "\\_");
            const { data, error } = await supabase
              .from("deep_memories")
              .select("id,namespace_id,memory_key,kind,content,importance,source,source_ref,structured_data,metadata,created_at,updated_at")
              .in("namespace_id", namespaceIds)
              .is("archived_at", null)
              .or(`memory_key.ilike.%${escaped}%,content.ilike.%${escaped}%`)
              .order("importance", { ascending: false })
              .order("updated_at", { ascending: false })
              .limit(limit);
            if (error) throw new Error(error.message);
            return {
              structuredContent: { scope: normalizedScope, query, memories: data ?? [], namespaces: namespaces ?? [] },
              content: [{ type: "text", text: `Found ${(data ?? []).length} deep memories matching "${query}".` }],
            };
          } catch (error) {
            return errorResult(error instanceof Error ? error.message : "Unable to search deep memory.");
          }
        },
      );

      server.registerTool(
        "get_integrations",
        {
          title: "Get CONTROL CENTRAL integrations",
          description: "Use this when the user wants to know which external systems are connected and the current synchronization status.",
          inputSchema: z.object({}),
          annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
        },
        async () => {
          try {
            const { supabase, clients } = await clientsForScope(normalizedScope);
            if (!supabase) return errorResult("Supabase is not configured.");
            const [{ data: connections, error: connectionError }, { data: bindings, error: bindingError }] = await Promise.all([
              supabase.from("integration_connections").select("id,provider,connection_key,mode,status,last_seen_at,last_error,metadata,updated_at").order("provider"),
              supabase.from("integration_bindings").select("id,control_id,provider,global_id,entity_type,external_object,external_id,source_app,sync_status,last_synced_at,metadata,updated_at").order("provider"),
            ]);
            if (connectionError || bindingError) throw new Error(connectionError?.message || bindingError?.message || "integration_query_failed");
            const allowedGlobalIds = new Set(clients.map((client) => String(client.global_id ?? "")).filter(Boolean));
            const scopedBindings = normalizedScope === "root" ? bindings ?? [] : (bindings ?? []).filter((binding) => allowedGlobalIds.has(String(binding.global_id ?? "")));
            return {
              structuredContent: { scope: normalizedScope, connections: connections ?? [], bindings: scopedBindings },
              content: [{ type: "text", text: `CONTROL CENTRAL has ${(connections ?? []).length} integration connections and ${scopedBindings.length} entity bindings visible in this scope.` }],
            };
          } catch (error) {
            return errorResult(error instanceof Error ? error.message : "Unable to load integrations.");
          }
        },
      );

      server.registerTool(
        "list_activity",
        {
          title: "List LINK activity",
          description: "Use this when the user wants the recent audited activity stored in Supabase for the active LINK Control scope.",
          inputSchema: z.object({ limit: z.number().int().min(1).max(100).default(30) }),
          annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
        },
        async ({ limit }) => {
          try {
            const { supabase, clients } = await clientsForScope(normalizedScope);
            if (!supabase) return errorResult("Supabase is not configured.");
            const ids = clients.map((item) => String(item.id));
            let query = supabase.from("events").select("id,client_id,event_type,actor,object_type,object_id,payload,created_at").order("created_at", { ascending: false }).limit(limit);
            if (normalizedScope !== "root") {
              if (!ids.length) return { structuredContent: { scope: normalizedScope, events: [] }, content: [{ type: "text", text: "No activity is available in this scope." }] };
              query = query.in("client_id", ids);
            }
            const { data, error } = await query;
            if (error) throw new Error(error.message);
            return {
              structuredContent: { scope: normalizedScope, events: data ?? [] },
              content: [{ type: "text", text: `Loaded ${(data ?? []).length} recent audited LINK events.` }],
            };
          } catch (error) {
            return errorResult(error instanceof Error ? error.message : "Unable to load LINK activity.");
          }
        },
      );

      if (writesEnabled) {
        server.registerTool(
          "create_client",
          {
            title: "Create CONTROL CENTRAL client",
            description: "Use this only when the user explicitly asks to create a new client identity in LINK CONTROL CENTRAL. The action writes to Supabase and is audited in the command and event buses.",
            inputSchema: z.object({
              name: z.string().trim().min(1),
              slug: z.string().trim().optional(),
              shortCode: z.string().trim().max(5).optional(),
              accent: z.string().trim().optional(),
              globalId: z.string().trim().optional(),
              metadata: z.record(z.string(), z.unknown()).optional(),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
          },
          async (input) => {
            try {
              const execution = await executeControlAction("client.create", input, { actor: "chatgpt-mcp", entityType: "client", globalId: input.globalId || null });
              return successText(`Created client ${input.name} in LINK CONTROL CENTRAL.`, execution as unknown as Record<string, unknown>);
            } catch (error) {
              return errorResult(error instanceof Error ? error.message : "Unable to create client.");
            }
          },
        );

        server.registerTool(
          "update_client",
          {
            title: "Update CONTROL CENTRAL client",
            description: "Use this when the user explicitly asks to change a client's name, short code, accent, status or metadata in CONTROL CENTRAL.",
            inputSchema: z.object({
              clientRef: z.string().trim().min(1),
              name: z.string().trim().min(1).optional(),
              shortCode: z.string().trim().max(5).optional(),
              accent: z.string().trim().optional(),
              status: z.enum(["active", "archived"]).optional(),
              metadata: z.record(z.string(), z.unknown()).optional(),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
          },
          async (input) => {
            try {
              const execution = await executeControlAction("client.update", input, { actor: "chatgpt-mcp", entityType: "client" });
              return successText(`Updated client ${input.clientRef}.`, execution as unknown as Record<string, unknown>);
            } catch (error) {
              return errorResult(error instanceof Error ? error.message : "Unable to update client.");
            }
          },
        );

        server.registerTool(
          "archive_client",
          {
            title: "Archive CONTROL CENTRAL client",
            description: "Use this only when the user explicitly asks to archive a client. This does not delete the client's memory or historical records.",
            inputSchema: z.object({ clientRef: z.string().trim().min(1) }),
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
          },
          async (input) => {
            try {
              const execution = await executeControlAction("client.archive", input, { actor: "chatgpt-mcp", entityType: "client" });
              return successText(`Archived client ${input.clientRef} without deleting its memory.`, execution as unknown as Record<string, unknown>);
            } catch (error) {
              return errorResult(error instanceof Error ? error.message : "Unable to archive client.");
            }
          },
        );

        server.registerTool(
          "connect_project",
          {
            title: "Connect project to client",
            description: "Use this when the user explicitly asks to connect a business, app or project to an existing CONTROL CENTRAL client.",
            inputSchema: z.object({
              clientRef: z.string().trim().min(1),
              projectName: z.string().trim().min(1),
              slug: z.string().trim().optional(),
              description: z.string().trim().optional(),
              kind: z.string().trim().optional(),
              phase: z.string().trim().optional(),
              metadata: z.record(z.string(), z.unknown()).optional(),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
          },
          async (input) => {
            try {
              const execution = await executeControlAction("project.connect", input, { actor: "chatgpt-mcp", entityType: "project" });
              return successText(`Connected ${input.projectName} to ${input.clientRef}.`, execution as unknown as Record<string, unknown>);
            } catch (error) {
              return errorResult(error instanceof Error ? error.message : "Unable to connect project.");
            }
          },
        );

        server.registerTool(
          "create_work_item",
          {
            title: "Create CONTROL CENTRAL work item",
            description: "Use this when the user explicitly asks to create a task, action or gesture in CONTROL CENTRAL for a client or the root workspace.",
            inputSchema: z.object({
              clientRef: z.string().trim().optional(),
              title: z.string().trim().min(1),
              description: z.string().trim().optional(),
              kind: z.enum(["action", "task", "gesture"]).default("task"),
              stage: z.enum(["understand", "organize", "build", "activate", "support", "scale"]).optional(),
              dueAt: z.string().trim().optional(),
              priority: z.number().int().min(1).max(4).default(2),
              cycleId: z.string().trim().optional(),
              strategyId: z.string().trim().optional(),
              onboardingStageId: z.string().trim().optional(),
              metadata: z.record(z.string(), z.unknown()).optional(),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
          },
          async (input) => {
            try {
              const execution = await executeControlAction("work_item.create", input, { actor: "chatgpt-mcp", entityType: "work_item" });
              return successText(`Created ${input.kind} "${input.title}" in CONTROL CENTRAL.`, execution as unknown as Record<string, unknown>);
            } catch (error) {
              return errorResult(error instanceof Error ? error.message : "Unable to create work item.");
            }
          },
        );

        server.registerTool(
          "remember_memory",
          {
            title: "Store CONTROL CENTRAL deep memory",
            description: "Use this when the user explicitly asks to save a durable fact, decision, instruction, constraint or relationship in the deep memory of a CONTROL CENTRAL client.",
            inputSchema: z.object({
              clientRef: z.string().trim().min(1),
              memoryKey: z.string().trim().min(1),
              content: z.string().trim().min(1),
              kind: z.enum(["fact", "preference", "instruction", "decision", "constraint", "summary", "relationship", "other"]).default("fact"),
              importance: z.number().int().min(1).max(5).default(3),
              sourceRef: z.string().trim().optional(),
              structuredData: z.record(z.string(), z.unknown()).optional(),
              metadata: z.record(z.string(), z.unknown()).optional(),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
          },
          async (input) => {
            try {
              const execution = await executeControlAction("memory.remember", input, { actor: "chatgpt-mcp", entityType: "memory" });
              return successText(`Stored deep memory "${input.memoryKey}" for ${input.clientRef}.`, execution as unknown as Record<string, unknown>);
            } catch (error) {
              return errorResult(error instanceof Error ? error.message : "Unable to store deep memory.");
            }
          },
        );
      }
    },
    {
      serverInfo: { name: `link-control-${normalizedScope}`, version: "1.0.0" },
      instructions: writesEnabled
        ? "This MCP is the authenticated root interface for LINK CONTROL CENTRAL. Read live data from Supabase and use write tools only when the user explicitly requests the change. All writes are audited through command_bus and event_bus. Never infer client identifiers when more than one match is possible."
        : "This MCP reads live LINK Control data from Supabase. Confirm scope before answering. Write tools are not exposed for this credential. Never infer data outside the active scope.",
    },
  );
}
