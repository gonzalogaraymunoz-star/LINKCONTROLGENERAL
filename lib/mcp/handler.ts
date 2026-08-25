import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
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
    .select("id,name,slug,status,short_code,accent,control_id")
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

export function createLinkMcpHandler(scope: string) {
  const normalizedScope = scope || "root";

  return createMcpHandler(
    (server) => {
      server.registerTool(
        "get_scope",
        {
          title: "Get LINK Control scope",
          description: "Use this when ChatGPT needs to confirm which LINK Control scope it is operating inside before reading business data.",
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
                writesEnabled: false,
                clientCount: clients.length,
              },
              content: [{ type: "text", text: `LINK Control scope ${normalizedScope} is connected to live Supabase data in read-only MCP mode.` }],
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
                dataMode: "live-read-only",
                clients: clients.length,
                workItems: count ?? 0,
                timestamp: new Date().toISOString(),
              },
              content: [{ type: "text", text: `LINK Control ${normalizedScope} and Supabase are reachable. MCP writes remain disabled until authenticated authorization is added.` }],
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
            const filtered = clients.filter((client) => !q || String(client.name ?? "").toLowerCase().includes(q));
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
            const client = clients.find((item) => String(item.id) === clientId || String(item.slug) === clientId || String(item.name).toLowerCase() === clientId.toLowerCase());
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
    },
    {
      serverInfo: { name: `link-control-${normalizedScope}`, version: "0.4.0" },
      instructions: "This MCP reads live LINK Control data from Supabase. Confirm scope before answering. Do not claim or attempt writes: MCP write tools are intentionally disabled until authenticated authorization is implemented. Never infer data outside the active scope.",
    },
  );
}
