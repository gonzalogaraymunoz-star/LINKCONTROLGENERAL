import { NextResponse } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";
import { getGatewayCapabilities } from "@/lib/gateway/adapters";

export async function GET() {
  const supabase = getCentralSupabase();
  const capabilities = getGatewayCapabilities();
  if (!supabase) return NextResponse.json({ ok: false, error: "central_supabase_not_configured" }, { status: 503 });

  const [clientsResult, actionsResult, viewsResult, integrationsResult, memoriesResult, commandsResult, eventsResult] = await Promise.all([
    supabase.from("clients").select("id,name,slug,status,short_code,symbol,accent,metadata,created_at,updated_at").eq("status", "active").is("archived_at", null).order("created_at", { ascending: false }),
    supabase.from("action_registry").select("action_key", { count: "exact", head: true }).eq("enabled", true),
    supabase.from("view_definitions").select("view_key", { count: "exact", head: true }).eq("enabled", true),
    supabase.from("integration_connections").select("provider,connection_key,mode,status,last_seen_at,last_error,metadata").order("provider"),
    supabase.from("deep_memories").select("id", { count: "exact", head: true }).is("archived_at", null),
    supabase.from("command_bus").select("id,command_type,action_key,status,payload,requested_at,processed_at,global_id").in("status", ["pending", "processing"]).order("requested_at", { ascending: false }),
    supabase.from("event_bus").select("id,source_provider,event_type,global_id,payload,received_at").order("received_at", { ascending: false }).limit(20),
  ]);

  const clientRows = clientsResult.data ?? [];
  const integrationConnections = integrationsResult.data ?? [];
  const pendingCommands = commandsResult.data ?? [];
  const recentEvents = eventsResult.data ?? [];
  const byId = Object.fromEntries(capabilities.map((item) => [item.id, item]));
  const centralSupabase = byId["supabase.central.health"];
  const github = byId["github.repo.health"];
  const twentyActive = integrationConnections.some((item) => item.provider === "twenty" && item.status === "active");

  const clients = clientRows.map((client: any) => ({
    ...client,
    effectiveFrom: client.metadata?.effective_from ?? null,
    stage: client.metadata?.stage ?? client.metadata?.commercial_stage ?? "Cliente",
    plan: client.metadata?.plan ?? client.metadata?.service_stage ?? null,
    monthlyValue: Number(client.metadata?.monthly_value ?? client.metadata?.monthly_value_clp ?? 0),
  }));

  const eventGestures = recentEvents.filter((event: any) => event.entity_type === "task" || event.event_type?.includes("gesture") || event.event_type?.includes("task"));
  const tasks = [
    ...pendingCommands.map((command: any) => ({ id: command.id, title: command.payload?.title ?? command.command_type ?? command.action_key, status: command.status, dueAt: command.payload?.due_at ?? null, client: command.payload?.client ?? null, source: "command_bus" })),
    ...eventGestures.map((event: any) => ({ id: event.id, title: event.payload?.title ?? event.event_type, status: event.payload?.status ?? "scheduled", dueAt: event.payload?.due_at ?? event.payload?.start_time ?? null, client: event.payload?.client ?? null, source: event.source_provider })),
  ];

  const services = [
    { key: "supabase", label: "Supabase", role: "Memoria profunda · identidad · eventos", status: centralSupabase?.available ? "connected" : "warning", detail: centralSupabase?.available ? "Memoria central conectada" : centralSupabase?.reason || "Sin verificación" },
    { key: "twenty", label: "Twenty", role: "CRM operacional", status: twentyActive ? "connected" : "warning", detail: integrationConnections.find((item) => item.provider === "twenty")?.last_error || "Bridge registrado" },
    { key: "github", label: "GitHub", role: "Código · versiones · arquitectura", status: github?.available ? "connected" : "warning", detail: github?.available ? "Repositorio vinculado" : github?.reason || "Sin verificación" },
    { key: "vercel", label: "Vercel", role: "Aplicación y APIs en producción", status: "connected", detail: "Deployment activo: linkcontrolgeneral.vercel.app" },
    { key: "chatgpt", label: "ChatGPT / MCP", role: "Consola conversacional", status: "connected", detail: "Rutas MCP publicadas" },
  ];

  const pipelineAmount = clients.reduce((sum: number, client: any) => sum + client.monthlyValue, 0);
  return NextResponse.json({
    ok: true, generatedAt: new Date().toISOString(), clients, tasks,
    metrics: { clients: clients.length, actions: actionsResult.count ?? 0, views: viewsResult.count ?? 0, memories: memoriesResult.count ?? 0, pendingCommands: pendingCommands.length },
    operational: { clients: clients.length, opportunities: 0, tasksOpen: tasks.length, tasksOverdue: 0, pipelineAmount, projects: 0, attention: tasks.length, source: twentyActive ? "twenty+supabase" : "supabase" },
    services, integrations: integrationConnections, recentEvents,
    readiness: { dashboardFoundation: true, deepMemory: true, crmBridge: twentyActive, actionRegistry: (actionsResult.count ?? 0) > 0, clientIntakeEnabled: true },
  });
}
