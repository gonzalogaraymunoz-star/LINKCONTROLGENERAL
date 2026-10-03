import { NextRequest, NextResponse } from "next/server";
import { executeGatewayAction, getGatewayCapabilities, type GatewayAction } from "@/lib/gateway/adapters";
import { getCentralSupabase } from "@/lib/supabase/server";

const ROOT_CONTROL_ID = "00000000-0000-0000-0000-000000000001";

type PulseNode = {
  key: "supabase" | "connections" | "github" | "vercel" | "director";
  label: string;
  status: "ok" | "warning" | "error";
  detail: string;
  latencyMs?: number | null;
};

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || "unknown_error");
}

async function gatewayCheck(action: GatewayAction) {
  const capability = getGatewayCapabilities().find((item) => item.id === action);
  if (!capability?.available) {
    return {
      ok: false,
      skipped: true,
      error: capability?.reason || "not_configured",
      result: null,
    };
  }

  try {
    return { ok: true, skipped: false, error: null, result: await executeGatewayAction(action) };
  } catch (error) {
    return { ok: false, skipped: false, error: errorMessage(error), result: null };
  }
}

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ ok: false, error: "cross_origin_link_pulse" }, { status: 403 });
  }

  const supabase = getCentralSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "central_supabase_not_configured" }, { status: 503 });
  }

  const scanId = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  const [
    centralHealth,
    githubHealth,
    vercelHealth,
    operationalHealth,
    connectionsResult,
    bindingsResult,
    relationsResult,
    directorQueueResult,
    recentEventsResult,
  ] = await Promise.all([
    gatewayCheck("supabase.central.health"),
    gatewayCheck("github.repo.health"),
    gatewayCheck("vercel.project.health"),
    gatewayCheck("supabase.operational.health"),
    supabase
      .from("integration_connections")
      .select("provider,connection_key,mode,status,last_seen_at,last_error,metadata")
      .order("provider"),
    supabase
      .from("integration_bindings")
      .select("provider,global_id,entity_type,external_object,external_id,source_app,sync_status,last_synced_at,metadata")
      .order("updated_at", { ascending: false })
      .limit(500),
    supabase
      .from("entity_relations")
      .select("source_global_id,target_global_id,relation,state,label,updated_at")
      .order("updated_at", { ascending: false })
      .limit(500),
    supabase
      .from("agent_work_queue")
      .select("id,status,reason,event_type,source_event_id,updated_at")
      .eq("agent_slug", "link-director")
      .in("status", ["queued", "processing", "awaiting_approval", "retry_wait", "blocked"])
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase
      .from("event_bus")
      .select("id,source_provider,event_type,global_id,payload,received_at")
      .order("received_at", { ascending: false })
      .limit(80),
  ]);

  const queryErrors = [
    connectionsResult.error,
    bindingsResult.error,
    relationsResult.error,
    directorQueueResult.error,
    recentEventsResult.error,
  ].filter(Boolean);

  if (queryErrors.length) {
    return NextResponse.json(
      { ok: false, error: "link_pulse_query_failed", detail: queryErrors.map((item) => item?.message) },
      { status: 500 },
    );
  }

  const connections = connectionsResult.data ?? [];
  const bindings = bindingsResult.data ?? [];
  const relations = relationsResult.data ?? [];
  const directorQueueBefore = directorQueueResult.data ?? [];
  const recentEvents = recentEventsResult.data ?? [];

  const activeConnections = connections.filter((row: any) => ["active", "connected", "healthy"].includes(String(row.status).toLowerCase()));
  const connectionErrors = connections.filter((row: any) => row.last_error || ["error", "failed", "blocked"].includes(String(row.status).toLowerCase()));
  const bindingWarnings = bindings.filter((row: any) => !["connected", "synced", "active"].includes(String(row.sync_status).toLowerCase()));
  const relationWarnings = relations.filter((row: any) => !["active", "verified", "connected"].includes(String(row.state || "active").toLowerCase()));
  const recentFailureEvents = recentEvents.filter((row: any) =>
    /error|failed|blocked|disconnect|timeout/i.test(String(row.event_type || "")),
  );

  const issues: Array<{ severity: "warning" | "error"; source: string; detail: string }> = [];
  for (const row of connectionErrors.slice(0, 12)) {
    issues.push({
      severity: /error|failed|blocked/i.test(String(row.status)) ? "error" : "warning",
      source: String(row.provider || "integration"),
      detail: row.last_error || `Conexión en estado ${row.status}`,
    });
  }
  if (!githubHealth.ok) issues.push({ severity: "warning", source: "github", detail: githubHealth.error || "GitHub no verificado" });
  if (!vercelHealth.ok) issues.push({ severity: "warning", source: "vercel", detail: vercelHealth.error || "Vercel no verificado" });
  if (!centralHealth.ok) issues.push({ severity: "error", source: "supabase", detail: centralHealth.error || "Supabase Central no verificado" });
  if (bindingWarnings.length) issues.push({ severity: "warning", source: "bindings", detail: `${bindingWarnings.length} binding(s) no están sincronizados` });
  if (relationWarnings.length) issues.push({ severity: "warning", source: "relations", detail: `${relationWarnings.length} relación(es) requieren revisión` });

  const recommendations: string[] = [];
  if (connectionErrors.length) recommendations.push("Revisar primero las integraciones con last_error o estado fallido.");
  if (!vercelHealth.ok) recommendations.push("Confirmar credenciales Vercel del servidor para que el pulso pueda verificar el deployment real.");
  if (bindingWarnings.length) recommendations.push("Reconciliar bindings desincronizados antes de crear nuevas identidades externas.");
  if (recentFailureEvents.length) recommendations.push("Cruzar los fallos recientes del event_bus con la integración que los originó.");
  if (!recommendations.length) recommendations.push("No aparecen fallos críticos: comparar este pulso con el siguiente para detectar cambios.");

  const connectionStatus: PulseNode["status"] = connectionErrors.length || bindingWarnings.length ? "warning" : "ok";
  const nodes: PulseNode[] = [
    {
      key: "supabase",
      label: "Supabase",
      status: centralHealth.ok ? "ok" : "error",
      detail: centralHealth.ok
        ? `Fuente central viva · ${(centralHealth.result as any)?.latencyMs ?? "—"} ms`
        : centralHealth.error || "No disponible",
      latencyMs: (centralHealth.result as any)?.latencyMs ?? null,
    },
    {
      key: "connections",
      label: "Conexiones LINK",
      status: connectionStatus,
      detail: `${activeConnections.length}/${connections.length} conexiones activas · ${bindings.length} bindings · ${relations.length} relaciones`,
    },
    {
      key: "github",
      label: "GitHub",
      status: githubHealth.ok ? "ok" : "warning",
      detail: githubHealth.ok
        ? `${(githubHealth.result as any)?.repository || "repo"} · push ${(githubHealth.result as any)?.pushedAt || "sin fecha"}`
        : githubHealth.error || "No verificado",
      latencyMs: (githubHealth.result as any)?.latencyMs ?? null,
    },
    {
      key: "vercel",
      label: "Vercel",
      status: vercelHealth.ok ? "ok" : "warning",
      detail: vercelHealth.ok
        ? `${(vercelHealth.result as any)?.project || "proyecto"} · ${(vercelHealth.result as any)?.deploymentState || "deployment leído"}`
        : vercelHealth.error || "No verificado",
      latencyMs: (vercelHealth.result as any)?.latencyMs ?? null,
    },
    {
      key: "director",
      label: "LINKDOT DIRECTOR",
      status: "ok",
      detail: `Recibirá evidencia del pulso · ${directorQueueBefore.length} trabajo(s) previos en cola`,
    },
  ];

  const completedAt = new Date().toISOString();
  const healthScore = Math.max(0, 100 - issues.filter((item) => item.severity === "error").length * 25 - issues.filter((item) => item.severity === "warning").length * 8);
  const summary = issues.length
    ? `Pulso LINK completado con ${issues.length} señal(es) de atención. Salud estimada: ${healthScore}%.`
    : `Pulso LINK completado sin fallos detectados. Salud estimada: ${healthScore}%.`;

  const analysisMaterial = {
    scanId,
    startedAt,
    completedAt,
    summary,
    healthScore,
    metrics: {
      connections: connections.length,
      activeConnections: activeConnections.length,
      bindings: bindings.length,
      relationEdges: relations.length,
      connectionErrors: connectionErrors.length,
      bindingWarnings: bindingWarnings.length,
      relationWarnings: relationWarnings.length,
      recentFailureEvents: recentFailureEvents.length,
      directorQueueBefore: directorQueueBefore.length,
    },
    nodes,
    issues,
    recommendations,
    connections,
    bindingWarnings: bindingWarnings.slice(0, 40),
    relationWarnings: relationWarnings.slice(0, 40),
    recentFailureEvents: recentFailureEvents.slice(0, 20),
    externalChecks: {
      centralHealth,
      operationalHealth,
      githubHealth,
      vercelHealth,
    },
  };

  const { data: pulseEvent, error: eventError } = await supabase
    .from("event_bus")
    .insert({
      control_id: ROOT_CONTROL_ID,
      source_provider: "control-central",
      event_type: "system.link_pulse.completed",
      entity_type: "system",
      global_id: "agent:link-director",
      correlation_id: scanId,
      dedupe_key: `link_pulse:${scanId}`,
      payload: analysisMaterial,
      occurred_at: completedAt,
      gesture_code: `link-pulse-${scanId.slice(0, 8)}`,
    })
    .select("id")
    .single();

  if (eventError || !pulseEvent) {
    return NextResponse.json(
      { ok: false, error: "link_pulse_event_not_persisted", detail: eventError?.message || null },
      { status: 500 },
    );
  }

  const { error: refreshError } = await supabase.rpc("link_refresh_agent_work_queue_v1");
  const { data: queuedForDirector } = await supabase
    .from("agent_work_queue")
    .select("id,status,reason,updated_at")
    .eq("agent_slug", "link-director")
    .eq("source_event_id", pulseEvent.id)
    .maybeSingle();

  nodes[nodes.length - 1] = {
    ...nodes[nodes.length - 1],
    status: refreshError ? "warning" : "ok",
    detail: queuedForDirector
      ? `Evidencia entregada · cola ${queuedForDirector.status}`
      : refreshError
        ? `Evidencia persistida; cola pendiente: ${refreshError.message}`
        : "Evidencia persistida; esperando ciclo del agente",
  };

  return NextResponse.json({
    ok: true,
    scanId,
    startedAt,
    completedAt,
    summary,
    healthScore,
    nodes,
    issues,
    recommendations,
    metrics: analysisMaterial.metrics,
    eventId: pulseEvent.id,
    director: {
      queued: Boolean(queuedForDirector),
      workItemId: queuedForDirector?.id || null,
      status: queuedForDirector?.status || (refreshError ? "refresh_warning" : "event_persisted"),
    },
  });
}
