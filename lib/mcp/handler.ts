import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { ARTIFACTS, CLIENTS, GATEWAYS } from "@/lib/mock-data";
import { STAGE_BY_KEY } from "@/lib/crm/stages";

const SCOPE_CLIENTS: Record<string, string[]> = {
  root: CLIENTS.map((client) => client.id),
  link_empresa: ["client_link_empresa"],
  lama: ["client_lama"],
  hotel_experience: ["client_hotel"],
  link_cupones: ["client_cupones"],
};

function clientsForScope(scope: string) {
  const allowed = new Set(SCOPE_CLIENTS[scope] ?? []);
  return CLIENTS.filter((client) => allowed.has(client.id));
}

export function createLinkMcpHandler(scope: string) {
  const normalizedScope = scope || "root";
  const scopedClients = clientsForScope(normalizedScope);

  return createMcpHandler(
    (server) => {
      server.registerTool(
        "get_scope",
        {
          title: "Get LINK Control scope",
          description: "Use this when ChatGPT needs to confirm which LINK Control and permission scope it is operating inside before reading or changing business data.",
          inputSchema: z.object({}),
          annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
        },
        async () => ({
          structuredContent: {
            control: normalizedScope === "root" ? "LINK CONTROL CENTRAL" : normalizedScope,
            scope: normalizedScope,
            mode: "bootstrap-demo-v0.2",
            writesEnabled: false,
          },
          content: [{ type: "text", text: `Operating in LINK Control scope: ${normalizedScope}. Real writes stay disabled until user authorization is configured.` }],
        }),
      );

      server.registerTool(
        "health",
        {
          title: "Check LINK Control health",
          description: "Use this when the user wants to know whether the active Control, gateway layer, or deployment is operational.",
          inputSchema: z.object({}),
          annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
        },
        async () => ({
          structuredContent: {
            service: "link-control-central",
            scope: normalizedScope,
            app: "ok",
            mcp: "ok",
            dataMode: "demo-until-auth",
            centralDataPlane: "LINK PREVIEW",
            operationalDataPlane: "gateway-only",
            timestamp: new Date().toISOString(),
          },
          content: [{ type: "text", text: `LINK Control ${normalizedScope} is reachable.` }],
        }),
      );

      server.registerTool(
        "search_clients",
        {
          title: "Search clients",
          description: "Use this when the user wants to find or review clients inside the active LINK Control.",
          inputSchema: z.object({ query: z.string().trim().optional() }),
          annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
        },
        async ({ query }) => {
          const q = query?.toLowerCase();
          const clients = scopedClients
            .filter((client) => !q || client.name.toLowerCase().includes(q))
            .map((client) => ({ id: client.id, name: client.name, stage: client.stage, progress: client.progress, need: client.need, product: client.product }));
          return { structuredContent: { scope: normalizedScope, clients, mode: "demo" }, content: [{ type: "text", text: `Found ${clients.length} clients inside scope ${normalizedScope}.` }] };
        },
      );

      server.registerTool(
        "get_client_360",
        {
          title: "Get client 360",
          description: "Use this when the user wants the complete operational context for one client: need, product, LINK stage, progress, actions, gestures and next milestone.",
          inputSchema: z.object({ clientId: z.string().min(1) }),
          annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
        },
        async ({ clientId }) => {
          const demo = scopedClients.find((client) => client.id === clientId || client.name.toLowerCase() === clientId.toLowerCase());
          if (!demo) return { content: [{ type: "text", text: `Client ${clientId} is not available inside scope ${normalizedScope}.` }], isError: true };
          const data = { ...demo, stageName: STAGE_BY_KEY[demo.stage].name };
          return { structuredContent: { scope: normalizedScope, client: data }, content: [{ type: "text", text: `${demo.name} is in ${data.stageName} at ${demo.progress}%. Next milestone: ${demo.nextMilestone}.` }] };
        },
      );

      server.registerTool(
        "list_artifacts",
        {
          title: "List artifacts",
          description: "Use this when the user wants to see websites, campaigns, PDFs, images, dashboards or other products generated inside the active Control.",
          inputSchema: z.object({ clientId: z.string().optional(), type: z.string().optional() }),
          annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
        },
        async ({ clientId, type }) => {
          const allowedIds = new Set(scopedClients.map((client) => client.id));
          const artifacts = ARTIFACTS.filter((item) => {
            if (normalizedScope !== "root" && (!item.clientId || !allowedIds.has(item.clientId))) return false;
            return (!clientId || item.clientId === clientId) && (!type || item.type.toLowerCase() === type.toLowerCase());
          });
          return { structuredContent: { scope: normalizedScope, artifacts }, content: [{ type: "text", text: `Found ${artifacts.length} artifacts inside scope ${normalizedScope}.` }] };
        },
      );

      server.registerTool(
        "list_gateways",
        {
          title: "List gateways",
          description: "Use this when the user wants to inspect integrations, their health, and permissions exposed to the active LINK Control.",
          inputSchema: z.object({}),
          annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
        },
        async () => ({ structuredContent: { scope: normalizedScope, gateways: GATEWAYS }, content: [{ type: "text", text: `There are ${GATEWAYS.length} gateway definitions available to inspect in bootstrap mode.` }] }),
      );

      server.registerTool(
        "create_gesture",
        {
          title: "Create client gesture",
          description: "Use this when the user explicitly asks to add a manual commitment or gesture for a client and LINK stage. Bootstrap mode validates but does not persist the write.",
          inputSchema: z.object({ clientId: z.string().min(1), stage: z.string().min(1), title: z.string().min(1), dueAt: z.string().optional() }),
          annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false, idempotentHint: false },
        },
        async ({ clientId, stage, title, dueAt }) => {
          const allowed = scopedClients.some((client) => client.id === clientId);
          if (!allowed) return { content: [{ type: "text", text: `Client ${clientId} is outside scope ${normalizedScope}.` }], isError: true };
          return {
            structuredContent: { status: "simulated", scope: normalizedScope, clientId, stage, title, dueAt: dueAt ?? null, requiresAuthBeforeProduction: true },
            content: [{ type: "text", text: `Gesture “${title}” validated but not persisted. Configure authenticated MCP access before enabling writes.` }],
          };
        },
      );
    },
    {
      serverInfo: { name: `link-control-${normalizedScope}`, version: "0.2.0" },
      instructions: "Confirm scope before acting. Read tools use bootstrap data until authorization is configured. Never claim a write succeeded when the tool reports simulated or blocked. Central memory promotion is never automatic.",
    },
  );
}
