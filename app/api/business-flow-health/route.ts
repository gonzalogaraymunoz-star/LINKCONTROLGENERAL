import { NextResponse } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Row = Record<string, any>;

function blockerLabel(value?: string | null) {
  const map: Record<string, string> = {
    no_verified_customer: "Falta comprobar visita, reserva, compra o pago.",
    delivery_not_verified: "Falta comprobar que la experiencia prometida ocurrió realmente.",
    no_verified_reservation_or_customer: "No existe una reserva/cliente que requiera onboarding.",
  };
  return map[String(value || "")] || String(value || "Hay una entrega entre etapas bloqueada.");
}

function stateLabel(state: string) {
  const labels: Record<string, string> = {
    working: "En movimiento",
    active: "Activo",
    waiting_evidence: "Esperando evidencia",
    needs_decision: "Necesita decisión",
    blocked: "Bloqueado",
    disconnected: "Sin fuente activa",
    setup: "En preparación",
    ready_waiting_signal: "Listo · esperando señal",
    signal_without_mission: "Señal sin continuidad",
    ready: "Listo",
  };
  return labels[state] || state;
}

export async function GET() {
  const supabase = getCentralSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "central_supabase_not_configured" }, { status: 503 });
  }

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const [
    businessesResult,
    sourcesResult,
    scopesResult,
    missionsResult,
    queueResult,
    commandsResult,
    handoffsResult,
    eventsResult,
  ] = await Promise.all([
    supabase
      .from("link_world_businesses")
      .select("id,global_id,slug,name,verification_status,updated_at")
      .order("name"),
    supabase
      .from("link_ingestion_sources")
      .select("business_id,source_key,label,status,feeds_sales_leads,feeds_interactions,metadata,updated_at"),
    supabase
      .from("agent_scope_state")
      .select("business_global_id,stage_key,state,current_focus,current_mission_id,current_mission_code,last_wake_at,last_success_at,last_failure_at,updated_at")
      .not("business_global_id", "is", null),
    supabase
      .from("agent_missions")
      .select("id,mission_code,business_global_id,stage_key,title,status,priority,assigned_agent_slug,updated_at")
      .neq("status", "cancelled"),
    supabase
      .from("agent_work_queue")
      .select("business_global_id,stage_key,agent_slug,status,work_type,reason,last_error,mission_id,updated_at"),
    supabase
      .from("command_bus")
      .select("global_id,status,approval_status,action_key,requested_at")
      .eq("status", "pending")
      .eq("approval_status", "pending"),
    supabase
      .from("agent_stage_handoffs")
      .select("business_global_id,from_stage_key,to_stage_key,status,blocker,summary,updated_at"),
    supabase
      .from("event_bus")
      .select("global_id,event_type,source_provider,occurred_at")
      .gte("occurred_at", cutoff)
      .not("global_id", "is", null)
      .order("occurred_at", { ascending: false })
      .limit(1000),
  ]);

  for (const result of [
    businessesResult,
    sourcesResult,
    scopesResult,
    missionsResult,
    queueResult,
    commandsResult,
    handoffsResult,
    eventsResult,
  ]) {
    if (result.error) {
      return NextResponse.json({ ok: false, error: result.error.message }, { status: 500 });
    }
  }

  const businesses = businessesResult.data || [];
  const sources = sourcesResult.data || [];
  const scopes = scopesResult.data || [];
  const missions = missionsResult.data || [];
  const queue = queueResult.data || [];
  const commands = commandsResult.data || [];
  const handoffs = handoffsResult.data || [];
  const events = eventsResult.data || [];

  const rows = businesses.map((business: Row) => {
    const businessSources = sources.filter((row: Row) => row.business_id === business.id);
    const activeSources = businessSources.filter((row: Row) => row.status === "active");
    const businessScopes = scopes.filter((row: Row) => row.business_global_id === business.global_id);
    const businessMissions = missions.filter((row: Row) => row.business_global_id === business.global_id);
    const activeMissions = businessMissions.filter((row: Row) =>
      ["approved", "active", "waiting_evidence", "blocked"].includes(String(row.status)),
    );
    const businessQueue = queue.filter((row: Row) => row.business_global_id === business.global_id);
    const executable = businessQueue.filter((row: Row) =>
      ["queued", "processing", "retry_wait"].includes(String(row.status)),
    );
    const blockedWork = businessQueue.filter((row: Row) => row.status === "blocked");
    const pendingApprovals = commands.filter((row: Row) => row.global_id === business.global_id);
    const blockedHandoffs = handoffs.filter(
      (row: Row) => row.business_global_id === business.global_id && row.status === "blocked",
    );
    const businessEvents = events.filter((row: Row) => row.global_id === business.global_id);
    const flowSource = businessSources.find((row: Row) => row.metadata?.flow_state);
    const sourceFeeds = activeSources.filter((row: Row) => row.feeds_interactions || row.feeds_sales_leads);

    let state = "ready";
    let bottleneck = "Sin cuello visible.";
    let nextAction = "Seguir observando señales reales.";

    if (pendingApprovals.length) {
      state = "needs_decision";
      bottleneck = `${pendingApprovals.length} decisión${pendingApprovals.length === 1 ? "" : "es"} esperando revisión.`;
      nextAction = "Resolver la decisión más antigua.";
    } else if (blockedWork.length) {
      state = "blocked";
      bottleneck = blockedWork[0]?.last_error
        ? "Un trabajo falló y agotó sus reintentos."
        : "Hay trabajo bloqueado en el runtime.";
      nextAction = "Revisar el fallo técnico y reencolar solo si sigue vigente.";
    } else if (blockedHandoffs.length) {
      state = "waiting_evidence";
      bottleneck = blockedHandoffs.map((row: Row) => blockerLabel(row.blocker)).join(" ");
      nextAction = "Conseguir la evidencia real que permite pasar a la siguiente etapa.";
    } else if (activeMissions.length && executable.length) {
      state = "working";
      bottleneck = "No hay bloqueo artificial: los DOT tienen trabajo real en cola.";
      nextAction = executable[0]?.reason || "Dejar que la ronda interna avance.";
    } else if (activeMissions.length) {
      state = "active";
      bottleneck = "Hay misión activa, pero no existe trabajo ejecutable ahora.";
      nextAction = "Esperar una señal nueva o la próxima revisión programada.";
    } else if (!activeSources.length) {
      state = "disconnected";
      bottleneck = "No hay una fuente de negocio activa alimentando LINK.";
      nextAction = "Conectar o activar la fuente antes de pedir trabajo al DOT.";
    } else if (business.verification_status === "draft") {
      state = "setup";
      bottleneck = flowSource?.metadata?.flow_state === "ready_waiting_first_redemption"
        ? "La fuente de redenciones está lista, pero todavía no existe una redención real y el negocio sigue en borrador."
        : "El negocio todavía está en borrador.";
      nextAction = "Completar activación y esperar la primera señal verificable.";
    } else if (!businessEvents.length) {
      state = "ready_waiting_signal";
      bottleneck =
        flowSource?.metadata?.flow_state === "ready_waiting_first_reservation"
          ? "El adapter está activo; todavía no existe una reserva real."
          : "Las fuentes están activas, pero no hubo señales en las últimas 48 h.";
      nextAction = "Esperar la primera señal real; no fabricar actividad.";
    } else if (!activeMissions.length && businessEvents.length) {
      state = "signal_without_mission";
      bottleneck = "Llegaron señales, pero todavía no existe una misión persistente para darles continuidad.";
      nextAction = "La próxima señal externa debe auto-abrir una misión única por etapa.";
    } else if (sourceFeeds.length < activeSources.length) {
      state = "ready";
      bottleneck = "Hay fuentes activas que todavía no alimentan el flujo.";
      nextAction = "Revisar la política de ingestión de esa fuente.";
    }

    return {
      id: business.id,
      globalId: business.global_id,
      slug: business.slug,
      name: business.name,
      verificationStatus: business.verification_status,
      state,
      stateLabel: stateLabel(state),
      bottleneck,
      nextAction,
      metrics: {
        activeSources: activeSources.length,
        events48h: businessEvents.length,
        activeMissions: activeMissions.length,
        executableWork: executable.length,
        pendingApprovals: pendingApprovals.length,
        blockedHandoffs: blockedHandoffs.length,
      },
      currentMission: activeMissions[0]
        ? {
            code: activeMissions[0].mission_code,
            title: activeMissions[0].title,
            stage: activeMissions[0].stage_key,
            status: activeMissions[0].status,
          }
        : null,
      scopes: businessScopes.map((scope: Row) => ({
        stage: scope.stage_key,
        state: scope.state,
        focus: scope.current_focus,
      })),
      sources: businessSources.map((source: Row) => ({
        key: source.source_key,
        label: source.label,
        status: source.status,
        feedsLeads: source.feeds_sales_leads,
        feedsInteractions: source.feeds_interactions,
        flowState: source.metadata?.flow_state || null,
      })),
      blockedHandoffs: blockedHandoffs.map((handoff: Row) => ({
        from: handoff.from_stage_key,
        to: handoff.to_stage_key,
        blocker: handoff.blocker,
        summary: handoff.summary,
      })),
    };
  });

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    businesses: rows,
  });
}
