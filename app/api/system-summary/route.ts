import { NextResponse } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";
import { getGatewayCapabilities } from "@/lib/gateway/adapters";

export async function GET() {
  const supabase = getCentralSupabase();
  const capabilities = getGatewayCapabilities();

  if (!supabase) {
    return NextResponse.json({ ok: false, error: "central_supabase_not_configured" }, { status: 503 });
  }

  const [clientsResult, actionsResult, viewsResult, integrationsResult, memoriesResult, commandsResult, eventsResult] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("action_registry").select("action_key", { count: "exact", head: true }).eq("enabled", true),
    supabase.from("view_definitions").select("view_key", { count: "exact", head: true }).eq("enabled", true),
    supabase.from("integration_connections").select("provider,connection_key,mode,status,last_seen_at,last_error,metadata").order("provider"),
    supabase.from("deep_memories").select("id", { count: "exact", head: true }).is("archived_at", null),
    supabase.from("command_bus").select("id,status", { count: "exact" }).in("status", ["pending", "processing"]),
    supabase.from("event_bus").select("id,source_provider,event_type,global_id,received_at").order("received_at", { ascending: false }).limit(8),
  ]);

  const integrationConnections = integrationsResult.data ?? [];
  const byId = Object.fromEntries(capabilities.map((item) => [item.id, item]));
  const centralSupabase = byId["supabase.central.health"];
  const github = byId["github.repo.health"];

  const services = [
    {
      key: "supabase",
      label: "Supabase",
      role: "Memoria profunda · identidad · eventos",
      status: centralSupabase?.available ? "connected" : "warning",
      detail: centralSupabase?.available ? "Memoria central conectada" : centralSupabase?.reason || "Sin verificación",
    },
    {
      key: "twenty",
      label: "Twenty",
      role: "CRM operacional",
      status: integrationConnections.some((item) => item.provider === "twenty" && item.status === "active") ? "connected" : "warning",
      detail: integrationConnections.find((item) => item.provider === "twenty")?.last_error || "Bridge registrado",
    },
    {
      key: "github",
      label: "GitHub",
      role: "Código · versiones · arquitectura",
      status: github?.available ? "connected" : "warning",
      detail: github?.available ? "Repositorio vinculado" : github?.reason || "Sin verificación",
    },
    {
      key: "vercel",
      label: "Vercel",
      role: "Aplicación y APIs en producción",
      status: "connected",
      detail: "Deployment activo: linkcontrolgeneral.vercel.app",
    },
    {
      key: "chatgpt",
      label: "ChatGPT / MCP",
      role: "Consola conversacional",
      status: "connected",
      detail: "Rutas MCP publicadas",
    },
  ];

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    metrics: {
      clients: clientsResult.count ?? 0,
      actions: actionsResult.count ?? 0,
      views: viewsResult.count ?? 0,
      memories: memoriesResult.count ?? 0,
      pendingCommands: commandsResult.count ?? 0,
    },
    services,
    integrations: integrationConnections,
    recentEvents: eventsResult.data ?? [],
    readiness: {
      dashboardFoundation: true,
      deepMemory: true,
      crmBridge: integrationConnections.some((item) => item.provider === "twenty" && item.status === "active"),
      actionRegistry: (actionsResult.count ?? 0) > 0,
      clientIntakeEnabled: false,
    },
  });
}
