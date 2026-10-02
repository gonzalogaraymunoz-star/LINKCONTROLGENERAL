import { NextResponse } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";
import { getGatewayCapabilities } from "@/lib/gateway/adapters";

export async function GET() {
  const supabase = getCentralSupabase();
  const capabilities = getGatewayCapabilities();
  if (!supabase) return NextResponse.json({ ok: false, error: "central_supabase_not_configured" }, { status: 503 });

  const [clientsResult, profilesResult, plansResult, strategiesResult, cyclesResult, calendarsResult, gesturesResult, actionsResult, viewsResult, integrationsResult, memoriesResult, commandsResult, eventsResult, worldNodesResult, worldEdgesResult, worldSummaryResult, missionsResult, evidenceResult, allCommandsResult, parametersResult, observationsResult, wakesResult, operatingResult, workQueueResult] = await Promise.all([
    supabase.from("clients").select("id,name,slug,status,short_code,symbol,accent,metadata,created_at,updated_at,global_id").eq("status", "active").is("archived_at", null).order("created_at", { ascending: false }),
    supabase.from("client_profiles").select("client_id,brand_dna,communication_rules,business_rules,metadata"),
    supabase.from("client_plan_assignments").select("client_id,plan_name_snapshot,agreed_price,currency,status,starts_at,objectives,metadata").eq("status", "active"),
    supabase.from("client_strategies").select("client_id,title,objective,diagnosis,approach,success_metrics,status,metadata,updated_at").order("updated_at", { ascending: false }),
    supabase.from("client_cycles").select("client_id,stage,progress,objective,next_milestone,status,updated_at").eq("status", "active"),
    supabase.from("client_calendar_workspaces").select("id,client_id,google_calendar_id,calendar_name,timezone,status,sync_mode,last_synced_at,last_error,metadata"),
    supabase.from("client_gestures").select("id,client_id,calendar_workspace_id,title,description,gesture_type,status,starts_at,ends_at,timezone,recurrence_rule,google_event_id,sync_status,source,priority,metadata,location,attendees,visibility,reminders,all_day,created_at,updated_at").neq("status", "cancelled").order("starts_at", { ascending: true }),
    supabase.from("action_registry").select("action_key", { count: "exact", head: true }).eq("enabled", true),
    supabase.from("view_definitions").select("view_key", { count: "exact", head: true }).eq("enabled", true),
    supabase.from("integration_connections").select("provider,connection_key,mode,status,last_seen_at,last_error,metadata").order("provider"),
    supabase.from("deep_memories").select("id", { count: "exact", head: true }).is("archived_at", null),
    supabase.from("command_bus").select("id,command_type,action_key,status,payload,requested_at,processed_at,global_id").in("status", ["pending", "processing"]).order("requested_at", { ascending: false }),
    supabase.from("event_bus").select("id,source_provider,event_type,global_id,payload,received_at").order("received_at", { ascending: false }).limit(20),
    supabase.from("link_control_world_nodes_v").select("*").order("updated_at", { ascending: false }),
    supabase.from("link_control_world_edges_v").select("*").order("updated_at", { ascending: false }).limit(300),
    supabase.from("link_control_world_summary_v").select("*").maybeSingle(),
    supabase.from("agent_missions").select("id,mission_code,business_global_id,stage_key,title,problem_statement,diagnosis,expected_outcome,created_by_agent,assigned_agent_slug,status,priority,metadata,created_at,updated_at").order("updated_at", { ascending: false }).limit(200),
    supabase.from("agent_mission_evidence").select("id,mission_id,requirement_key,description,evidence_type,status,requested_by_agent,provided_by,evidence_uri,note,metadata,requested_at,received_at,validated_at").order("requested_at", { ascending: false }).limit(400),
    supabase.from("command_bus").select("id,command_type,action_key,actor,target_provider,entity_type,global_id,payload,status,result,error,requested_at,processed_at,gesture_code,requires_approval,approval_status,approved_by,approved_at").order("requested_at", { ascending: false }).limit(300),
    supabase.from("agent_stage_parameters").select("id,agent_slug,stage_key,parameter_key,label,direction,unit,description,source,metadata,updated_at").order("agent_slug").order("label"),
    supabase.from("agent_parameter_observations").select("id,parameter_id,business_global_id,value_numeric,value_text,observed_at,evidence,source,metadata").order("observed_at", { ascending: false }).limit(1000),
    supabase.from("event_bus")
      .select("id,source_provider,event_type,entity_type,global_id,correlation_id,dedupe_key,payload,occurred_at,received_at")
      .eq("source_provider", "agent-runtime")
      .in("event_type", ["AGENT_WAKE_PROPOSED", "AGENT_WAKE_NOOP", "AGENT_WAKE_FAILED"])
      .order("received_at", { ascending: false })
      .limit(40),
    supabase.from("agent_operating_state_v")
      .select("*")
      .order("agent_slug")
      .order("priority", { ascending: false }),
    supabase.from("agent_work_queue")
      .select("id,agent_slug,stage_key,business_global_id,source_event_id,source_provider,event_type,work_type,priority,status,reason,attempt_count,max_attempts,last_error,next_attempt_at,command_id,mission_id,created_at,updated_at,completed_at")
      .order("updated_at", { ascending: false })
      .limit(150),
  ]);

  const clientRows = clientsResult.data ?? [], profiles = profilesResult.data ?? [], plans = plansResult.data ?? [], strategies = strategiesResult.data ?? [], cycles = cyclesResult.data ?? [], calendars = calendarsResult.data ?? [], gestures = gesturesResult.data ?? [], integrationConnections = integrationsResult.data ?? [], pendingCommands = commandsResult.data ?? [], recentEvents = eventsResult.data ?? [];
  const worldNodes = worldNodesResult.data ?? [];
  const worldEdges = worldEdgesResult.data ?? [];
  const worldSummary = worldSummaryResult.data ?? null;
  const missions = missionsResult.data ?? [];
  const missionEvidence = evidenceResult.data ?? [];
  const allAgentCommands = allCommandsResult.data ?? [];
  const stageParameters = parametersResult.data ?? [];
  const parameterObservations = observationsResult.data ?? [];
  const wakeEvents = wakesResult.data ?? [];
  const agentOperatingState = operatingResult.data ?? [];
  const agentWorkQueue = workQueueResult.data ?? [];
  const byId = Object.fromEntries(capabilities.map((item) => [item.id, item]));
  const centralSupabase = byId["supabase.central.health"], github = byId["github.repo.health"];
  const twentyActive = integrationConnections.some((item) => item.provider === "twenty" && item.status === "active");

  const clients = clientRows.map((client: any) => {
    const calendar = calendars.find((item: any) => item.client_id === client.id) ?? null;
    const clientGestures = gestures.filter((item: any) => item.client_id === client.id);
    const profile = profiles.find((item: any) => item.client_id === client.id) ?? null;
    const plan = plans.find((item: any) => item.client_id === client.id) ?? null;
    const strategy = strategies.find((item: any) => item.client_id === client.id) ?? null;
    const cycle = cycles.find((item: any) => item.client_id === client.id) ?? null;
    return { ...client, effectiveFrom: client.metadata?.effective_from ?? client.metadata?.start_date ?? null, stage: client.metadata?.initial_stage ?? client.metadata?.stage ?? cycle?.stage ?? "Cliente", plan: plan?.plan_name_snapshot ?? client.metadata?.plan ?? client.metadata?.service_stage ?? null, monthlyValue: Number(plan?.agreed_price ?? client.metadata?.monthly_value ?? client.metadata?.monthly_fee_clp ?? 0), profile, planAssignment: plan, strategy, cycle, calendar, gestureCount: clientGestures.filter((g: any) => ["planned","scheduled"].includes(g.status)).length, nextGestureAt: clientGestures.find((g: any) => g.starts_at && new Date(g.starts_at) >= new Date())?.starts_at ?? null };
  });

  const tasks = gestures.filter((gesture: any) => ["planned","scheduled"].includes(gesture.status)).map((gesture: any) => { const client = clients.find((item: any) => item.id === gesture.client_id); return { id: gesture.id, title: gesture.title, status: gesture.status, dueAt: gesture.starts_at, client: client?.name ?? null, clientId: gesture.client_id, source: gesture.source, syncStatus: gesture.sync_status }; });
  const services = [
    { key: "supabase", label: "Supabase", role: "Memoria profunda · identidad · eventos", status: centralSupabase?.available ? "connected" : "warning", detail: centralSupabase?.available ? "Memoria central conectada" : centralSupabase?.reason || "Sin verificación" },
    { key: "twenty", label: "Twenty", role: "CRM operacional", status: twentyActive ? "connected" : "warning", detail: integrationConnections.find((item) => item.provider === "twenty")?.last_error || "Bridge registrado" },
    { key: "github", label: "GitHub", role: "Código · versiones · arquitectura", status: github?.available ? "connected" : "warning", detail: github?.available ? "Repositorio vinculado" : github?.reason || "Sin verificación" },
    { key: "vercel", label: "Vercel", role: "Aplicación y APIs en producción", status: "connected", detail: "Deployment activo: linkcontrolgeneral.vercel.app" },
    { key: "chatgpt", label: "ChatGPT / MCP", role: "Consola conversacional", status: "connected", detail: "Rutas MCP publicadas" },
    { key: "linkworld", label: "LINK WORLD", role: "Negocios · relaciones · micelio", status: worldSummary ? "connected" : "warning", detail: worldSummary ? `${worldSummary.businesses ?? 0} negocios · ${worldSummary.active_edges ?? 0} relaciones activas` : "Puente sin lectura" },
  ];
  const agentSlugs = Array.from(new Set([
    ...stageParameters.map((row: any) => row.agent_slug),
    ...missions.map((row: any) => row.created_by_agent),
    ...allAgentCommands.map((row: any) => row.actor),
  ].filter(Boolean)));

  const agentProduction = agentSlugs.map((slug: string) => {
    const agentMissions = missions.filter((row: any) => row.created_by_agent === slug || row.assigned_agent_slug === slug);
    const agentCommands = allAgentCommands.filter((row: any) => row.actor === slug);
    const missionIds = new Set(agentMissions.map((row: any) => row.id));
    const agentEvidence = missionEvidence.filter((row: any) => missionIds.has(row.mission_id));
    const params = stageParameters.filter((row: any) => row.agent_slug === slug).map((parameter: any) => {
      const observations = parameterObservations.filter((row: any) => row.parameter_id === parameter.id);
      const latest = observations[0] ?? null;
      const previous = observations[1] ?? null;
      let trend = "unmeasured";
      if (latest && previous && latest.value_numeric != null && previous.value_numeric != null) {
        const delta = Number(latest.value_numeric) - Number(previous.value_numeric);
        if (delta === 0) trend = "flat";
        else {
          const improved = parameter.direction === "down" ? delta < 0 : delta > 0;
          trend = improved ? "improving" : "declining";
        }
      } else if (latest) trend = "measured";
      return { ...parameter, latest, previous, trend };
    });

    const pendingApproval = agentCommands.filter((row: any) => row.status === "pending" && row.approval_status === "pending");
    const activeMissions = agentMissions.filter((row: any) => ["approved","active","blocked","waiting_evidence"].includes(row.status));
    const verifiedMissions = agentMissions.filter((row: any) => row.status === "verified");
    const waitingEvidence = agentEvidence.filter((row: any) => ["requested","received"].includes(row.status));
    const validatedEvidence = agentEvidence.filter((row: any) => row.status === "validated");
    const latestCommand = agentCommands[0] ?? null;
    const activeMission = activeMissions[0] ?? null;

    let suggestion = "Observar la etapa y esperar una señal verificable antes de abrir trabajo.";
    let prompt = `Revisa el estado actual del agente ${slug} en CONTROL CENTRAL. Usa solo datos y evidencia disponibles. Identifica si existe una restricción real en su etapa. Si no hay evidencia suficiente, no inventes una misión: dime exactamente qué señal falta medir.`;
    if (pendingApproval.length) {
      suggestion = `Revisar ${pendingApproval.length} acción(es) pendiente(s) de aprobación.`;
      prompt = `Revisa las acciones pendientes de aprobación del agente ${slug}. Para cada una, explica qué problema intenta resolver, qué cambia si se aprueba, qué riesgo tiene y qué evidencia deberá producir. No ejecutes nada fuera del entorno sin aprobación.`;
    } else if (waitingEvidence.length) {
      suggestion = `Completar ${waitingEvidence.length} evidencia(s) antes de cerrar la misión.`;
      prompt = `Revisa las evidencias pendientes del agente ${slug}. Ordena qué prueba falta, dónde debería obtenerse y cuál es el criterio mínimo para validarla. No marques una misión como resuelta sin evidencia verificable.`;
    } else if (activeMission) {
      suggestion = `Avanzar la misión ${activeMission.mission_code}: ${activeMission.title}.`;
      prompt = `Trabaja la misión ${activeMission.mission_code} del agente ${slug}: "${activeMission.title}". Problema: "${activeMission.problem_statement}". Usa el estado actual de CONTROL CENTRAL y LINK WORLD. Propón el siguiente movimiento verificable de menor esfuerzo y mayor impacto, indicando qué puede ejecutar el sistema, qué requiere aprobación humana y qué evidencia debe quedar persistida.`;
    } else if (params.length) {
      const unmeasured = params.filter((row: any) => row.trend === "unmeasured");
      suggestion = unmeasured.length ? `Instrumentar ${unmeasured.length} parámetro(s) todavía sin medición.` : "Revisar evolución de parámetros y detectar el siguiente cuello de botella.";
      prompt = `Analiza los parámetros del agente ${slug}: ${params.map((row: any) => row.label).join(", ")}. Usa únicamente observaciones con evidencia. Identifica cuál parámetro limita hoy la etapa, evita optimizar métricas aisladas que dañen el Customer Journey y propón una misión concreta solo si la evidencia lo justifica.`;
    }

    return {
      agentSlug: slug,
      stageKey: params[0]?.stage_key ?? activeMission?.stage_key ?? null,
      missions: {
        total: agentMissions.length,
        active: activeMissions.length,
        verified: verifiedMissions.length,
        current: activeMission,
      },
      commands: {
        total: agentCommands.length,
        pendingApproval: pendingApproval.length,
        latest: latestCommand,
      },
      evidence: {
        requestedOrReceived: waitingEvidence.length,
        validated: validatedEvidence.length,
      },
      parameters: params,
      suggestion,
      prompt,
    };
  });

  const successfulWakeKeys = new Set(
    wakeEvents
      .filter((wake: any) => ["AGENT_WAKE_PROPOSED", "AGENT_WAKE_NOOP"].includes(wake.event_type))
      .map((wake: any) => `${wake?.payload?.agent_slug || ""}:${wake?.payload?.source_event_id || ""}`),
  );

  const agentWakeEvidence = wakeEvents.map((wake: any) => {
    const commandId = wake?.payload?.command_id || null;
    const command = commandId
      ? allAgentCommands.find((row: any) => row.id === commandId)
      : null;
    const sourceEventId = wake?.payload?.source_event_id || null;
    const recovered = wake.event_type === "AGENT_WAKE_FAILED" &&
      successfulWakeKeys.has(`${wake?.payload?.agent_slug || ""}:${sourceEventId || ""}`);
    return {
      id: wake.id,
      eventType: wake.event_type,
      agentSlug: wake?.payload?.agent_slug || null,
      sourceEventType: wake?.payload?.source_event_type || null,
      actionKey: wake?.payload?.action_key || command?.action_key || null,
      decision: wake?.payload?.decision || null,
      reason: wake?.payload?.reason || wake?.payload?.error || null,
      model: wake?.payload?.model || null,
      globalId: wake.global_id || null,
      commandId,
      commandStatus: command?.status || null,
      approvalStatus: command?.approval_status || null,
      requiresApproval: command?.requires_approval ?? null,
      occurredAt: wake.occurred_at || wake.received_at,
      receivedAt: wake.received_at,
      recovered,
    };
  });

  const pipelineAmount = clients.reduce((sum: number, client: any) => sum + client.monthlyValue, 0);
  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    clients,
    gestures,
    tasks,
    metrics: {
      clients: clients.length,
      businesses: worldSummary?.businesses ?? 0,
      agents: worldSummary?.agents ?? 0,
      stageDirectors: worldSummary?.stage_directors ?? 0,
      activeEdges: worldSummary?.active_edges ?? 0,
      actions: actionsResult.count ?? 0,
      views: viewsResult.count ?? 0,
      memories: memoriesResult.count ?? 0,
      pendingCommands: pendingCommands.length,
      agentQueue: agentWorkQueue.filter((row: any) => ["queued","processing","retry_wait"].includes(row.status)).length,
      agentWaitingApproval: agentWorkQueue.filter((row: any) => row.status === "awaiting_approval").length,
      agentBlocked: agentWorkQueue.filter((row: any) => row.status === "blocked").length,
    },
    operational: {
      clients: clients.length,
      businesses: worldSummary?.businesses ?? 0,
      opportunities: 0,
      tasksOpen: tasks.length,
      tasksOverdue: 0,
      pipelineAmount,
      projects: 0,
      attention: tasks.length,
      source: twentyActive ? "twenty+supabase+link-world" : "supabase+link-world",
    },
    world: {
      summary: worldSummary,
      nodes: worldNodes,
      edges: worldEdges,
      source: "link_control_world_*_v",
    },
    agentProduction,
    agentActions: allAgentCommands,
    agentMissions: missions,
    agentEvidence: missionEvidence,
    agentWakeEvidence,
    agentOperatingState,
    agentWorkQueue,
    services,
    integrations: integrationConnections,
    recentEvents,
    readiness: {
      dashboardFoundation: true,
      deepMemory: true,
      crmBridge: twentyActive,
      actionRegistry: (actionsResult.count ?? 0) > 0,
      clientIntakeEnabled: true,
      calendarWorkspace: true,
      linkWorldBridge: Boolean(worldSummary),
    },
  });
}
