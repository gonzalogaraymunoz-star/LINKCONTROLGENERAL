import { NextRequest, NextResponse } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function complementSetup(input: { name: string; description: string; endpoint: string; scope: string }) {
  const simpleTokenConfigured = Boolean((process.env.LINK_MCP_TOKEN || "").trim());

  return {
    name: input.name,
    description: input.description,
    connectionMode: "server_url",
    serverUrl: input.endpoint,
    serverUrlFormat: `${input.endpoint}?mcp_token=TU_LINK_MCP_TOKEN`,
    authentication: {
      state: simpleTokenConfigured ? "ready" : "missing_token",
      recommendedSelection: "Sin autenticación",
      label: simpleTokenConfigured ? "Protocolo simple LINK listo" : "Falta LINK_MCP_TOKEN en Vercel",
      detail: simpleTokenConfigured
        ? "Usa la URL del servidor agregando ?mcp_token=TU_LINK_MCP_TOKEN y selecciona Sin autenticación en ChatGPT. El token nunca se expone desde este dashboard."
        : "Configura LINK_MCP_TOKEN como secreto de Vercel. Después usa la URL agregando ?mcp_token=TU_LINK_MCP_TOKEN y selecciona Sin autenticación en ChatGPT.",
      tokenEnvironmentVariable: "LINK_MCP_TOKEN",
      tokenTransport: "query:mcp_token (fallback para clientes sin headers); también acepta x-link-mcp-token",
    },
    scope: input.scope,
    readyToCreate: simpleTokenConfigured,
  };
}

export async function GET(request: NextRequest) {
  const supabase = getCentralSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "central_supabase_not_configured" }, { status: 503 });
  }

  const [{ data: clients, error: clientError }, { data: cycles, error: cycleError }] = await Promise.all([
    supabase.from("clients").select("id,name,slug,short_code,accent,status").eq("status", "active").order("created_at"),
    supabase.from("client_cycles").select("id,client_id,stage,progress,status").eq("status", "active"),
  ]);

  if (clientError || cycleError) {
    return NextResponse.json({ ok: false, error: clientError?.message || cycleError?.message }, { status: 500 });
  }

  const origin = request.nextUrl.origin;
  const controls = (clients ?? []).filter(client => client.slug).map(client => {
    const cycle = (cycles ?? []).find(item => item.client_id === client.id);
    const endpoint = `${origin}/c/${client.slug}/mcp`;
    return {
      id: client.id,
      name: client.name,
      slug: client.slug,
      shortCode: client.short_code,
      accent: client.accent,
      stage: cycle?.stage ?? null,
      progress: cycle?.progress ?? 0,
      scope: client.slug,
      panelUrl: `${origin}/c/${client.slug}`,
      mcpEndpoint: endpoint,
      dataSource: "Supabase · LINK CONTROL CENTRAL",
      mode: "live-protected",
      accessState: "link_mcp_token",
      setup: complementSetup({
        name: `LINK CONTROL — ${client.name}`,
        description: `Control de negocio de ${client.name}, gobernado por LINK CONTROL CENTRAL. Consulta únicamente información y capacidades autorizadas para este negocio.`,
        endpoint,
        scope: client.slug,
      }),
    };
  });

  const centralEndpoint = `${origin}/mcp`;

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    central: {
      name: "LINK CONTROL CENTRAL",
      scope: "root",
      panelUrl: origin,
      mcpEndpoint: centralEndpoint,
      dataSource: "Supabase · LINK CONTROL CENTRAL",
      mode: "live-protected",
      accessState: "link_mcp_token",
      writeStatus: "governed-by-tool-annotations-and-gateway",
      setup: complementSetup({
        name: "LINK CONTROL CENTRAL",
        description: "Centro de mando del ecosistema LINK. Consulta clientes, trabajo, actividad y controles autorizados desde una sola conexión MCP.",
        endpoint: centralEndpoint,
        scope: "root",
      }),
    },
    controls,
    tools: ["get_scope", "health", "search_clients", "get_client_360", "list_work_items", "list_activity"],
    protocol: {
      transport: "Remote MCP over HTTPS",
      endpointRule: "Central uses /mcp. Scoped Controls use /c/<client-slug>/mcp.",
      authentication: "Simple LINK token. ChatGPT selection: Sin autenticación. URL fallback: ?mcp_token=...",
      oauth: "Optional stronger mode retained for future rollout; not required for initial connection.",
      setupRule: "The dashboard is the canonical source for ChatGPT complement setup. Never expose LINK_MCP_TOKEN from a public API response.",
    },
  });
}
