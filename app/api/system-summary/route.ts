import { NextResponse } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";
import { getGatewayCapabilities } from "@/lib/gateway/adapters";

export async function GET() {
  const supabase = getCentralSupabase();
  const capabilities = getGatewayCapabilities();
  if (!supabase) return NextResponse.json({ ok: false, error: "central_supabase_not_configured" }, { status: 503 });

  const [clientsResult, profilesResult, plansResult, strategiesResult, cyclesResult, calendarsResult, gesturesResult, actionsResult, viewsResult, integrationsResult, memoriesResult, commandsResult, eventsResult] = await Promise.all([
    supabase.from("clients").select("id,name,slug,status,short_code,symbol,accent,metadata,created_at,updated_at,global_id").eq("status", "active").is("archived_at", null).order("created_at", { ascending: false }),
    supabase.from("client_profiles").select("client_id,brand_dna,communication_rules,business_rules,metadata"),
    supabase.from("client_plan_assignments").select("client_id,plan_name_snapshot,agreed_price,currency,status,starts_at,objectives,metadata").eq("status", "active"),
    supabase.from("client_strategies").select("client_id,title,objective,diagnosis,approach,success_metrics,status,metadata,updated_at").order("updated_at", { ascending: false }),
    supabase.from("client_cycles").select("client_id,stage,progress,objective,next_milestone,status,updated_at").eq("status", "active"),
    supabase.from("client_calendar_workspaces").select("id,client_id,google_calendar_id,calendar_name,timezone,status,sync_mode,last_synced_at,last_error,metadata"),
    supabase.from("client_gestures").select("id,client_id,calendar_workspace_id,title,description,gesture_type,status,starts_at,ends_at,timezone,recurrence_rule,google_event_id,sync_status,source,priority,metadata,created_at,updated_at").neq("status", "cancelled").order("starts_at", { ascending: true }),
    supabase.from("action_registry").select("action_key", { count: "exact", head: true }).eq("enabled", true),
    supabase.from("view_definitions").select("view_key", { count: "exact", head: true }).eq("enabled", true),
    supabase.from("integration_connections").select("provider,connection_key,mode,status,last_seen_at,last_error,metadata").order("provider"),
    supabase.from("deep_memories").select("id", { count: "exact", head: true }).is("archived_at", null),
    supabase.from("command_bus").select("id,command_type,action_key,status,payload,requested_at,processed_at,global_id").in("status", ["pending", "processing"]).order("requested_at", { ascending: false }),
    supabase.from("event_bus").select("id,source_provider,event_type,global_id,payload,received_at").order("received_at", { ascending: false }).limit(20),
  ]);

  const clientRows = clientsResult.data ?? [];
  const profiles = profilesResult.data ?? [];
  const plans = plansResult.data ?? [];
  const strategies = strategiesResult.data ?? [];
  const cycles = cyclesResult.data ?? [];
  const calendars = calendarsResult.data ?? [];
  const gestures = gesturesResult.data ?? [];
  const integrationConnections = integrationsResult.data ?? [];
  const pendingCommands = commandsResult.data ?? [];
  const recentEvents = eventsResult.data ?? [];

  const byId = Object.fromEntries(capabilities.map((item) => [item.id, item]));
  const centralSupabase = byId["supabase.central.health"];
  const github = byId["github.repo.health"];
  const twentyActive = integrationConnections.some((item) => item.provider === "twenty" && item.status === "active");

  const clients = clientRows.map((client: any) => {
    const calendar = calendars.find((item: any) => item.client_id === client.id) ?? null;
    const clientGestures = gestures.filter((item: any) => item.client_id === client.id);
    const profile = profiles.find((item: any) => item.client_id === client.id) ?? null;
    const plan = plans.find((item: any) => item.client_id === client.id) ?? null;
    const strategy = strategies.find((item: any) => item.client_id === client.id) ?? null;
    const cycle = cycles.find((item: any) => item.client_id === client.id) ?? null;
    return {
      ...client,
      effectiveFrom: client.metadata?.effective_from ?? client.metadata?.start_date ?? null,
      stage: client.metadata?.initial_stage ?? client.metadata?.stage ?? cycle?.stage ?? "Cliente",
      plan: plan?.plan_name_snapshot ?? client.metadata?.plan ?? client.metadata?.service_stage ?? null,
      monthlyValue: Number(plan?.agreed_price ?? client.metadata?.monthly_value ?? client.metadata?.monthly_fee_clp ?? 0),
      profile, planAssignment: plan, strategy, cycle, calendar,
      gestureCount: clientGestures.filter((g: any) => ["planned","scheduled"].includes(g.status)).length,
      nextGestureAt: clientGestures.find((g: any) => g.starts_at && new Date(g.starts_at) >= new Date())?.starts_at ?? null,
    };
  });

  const tasks = gestures.filter((gesture: any) => ["planned","scheduled"].includes(gesture.status)).map((gesture: any) => {
    const client = clients.find((item: any) => item.id === gesture.client_id);
    return { id: gesture.id, title: gesture.title, status: gesture.status, dueAt: gesture.starts_at, client: client?.name ?? null, clientId: gesture.client_id, source: gesture.source, syncStatus: gesture.sync_status };
  });

  const services = [
    { key: "supabase", label: "Supabase", role: "Memoria profunda · identidad · eventos", status: centralSupabase?.available ? "connected" : "warning", detail: centralSupabase?.available ? "Memoria central conectada" : centralSupabase?.reason || "Sin verificación" },
    { key: "twenty", label: "Twenty", role: "CRM operacional", status: twentyActive ? "connected" : "warning", detail: integrationConnections.find((item) => item.provider === "twenty")?.last_error || "Bridge registrado" },
    { key: "github", label: "GitHub", role: "Código · versiones · arquitectura", status: github?.available ? "connected" : "warning", detail: github?.available ? "Repositorio vinculado" : github?.reason || "Sin verificación" },
    { key: "vercel", label: "Vercel", role: "Aplicación y APIs en producción", status: "connected", detail: "Deployment activo: linkcontrolgeneral.vercel.app" },
    { key: "chatgpt", label: "ChatGPT / MCP", role: "Consola conversacional", status: "connected", detail: "Rutas MCP publicadas" },
  ];

  const pipelineAmount = clients.reduce((sum: number, client: any) => sum + client.monthlyValue, 0);
  return NextResponse.json({
    ok: true, generatedAt: new Date().toISOString(), clients, gestures, tasks,
    metrics: { clients: clients.length, actions: actionsResult.count ?? 0, views: viewsResult.count ?? 0, memories: memoriesResult.count ?? 0, pendingCommands: pendingCommands.length },
    operational: { clients: clients.length, opportunities: 0, tasksOpen: tasks.length, tasksOverdue: 0, pipelineAmount, projects: 0, attention: tasks.length, source: twentyActive ? "twenty+supabase" : "supabase" },
    services, integrations: integrationConnections, recentEvents,
    readiness: { dashboardFoundation: true, deepMemory: true, crmBridge: twentyActive, actionRegistry: (actionsResult.count ?? 0) > 0, clientIntakeEnabled: true, calendarWorkspace: true },
  });
}
