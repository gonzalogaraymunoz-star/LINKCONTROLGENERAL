import { NextResponse } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Row = Record<string, any>;

type Actor = {
  slug: string;
  dotSlug: string;
  name: string;
};

function cleanName(value: unknown) {
  return String(value || "LINK")
    .replace(/^LINKDOT\s*·?\s*/i, "")
    .replace(/^LINK\s*/i, "")
    .trim();
}

function actorFromSkill(row: Row): Actor {
  const metadata = row.metadata || {};
  return {
    slug: String(row.slug),
    dotSlug: String(metadata.dot_slug || row.slug),
    name: cleanName(metadata.display_label || row.name || row.slug),
  };
}

function actionLabel(value?: string | null) {
  const map: Record<string, string> = {
    "mission.create": "crear una misión",
    "stage.diagnosis.record": "registrar un diagnóstico",
    "evidence.request": "pedir evidencia",
    "agent.assign": "asignar una misión",
    "stage.escalate": "escalar un problema",
    "stage.block_scale": "frenar el avance",
    "stage.verify": "verificar una etapa",
    "stage.handoff.propose": "proponer una entrega",
    "stage.handoff.accept": "aceptar una entrega",
  };
  return map[String(value || "")] || String(value || "realizar una acción");
}

function failureSummary(error?: string | null) {
  const value = String(error || "");
  const lower = value.toLowerCase();
  if (lower.includes("no_governed_decision")) {
    return "El actor terminó su razonamiento, pero no devolvió una decisión gobernada que LINK pudiera ejecutar.";
  }
  if (lower.includes("aborted")) {
    return "El intento fue interrumpido antes de completar la acción.";
  }
  if (lower.includes("temporarily unavailable")) {
    return "El servicio que necesitaba el actor no estuvo disponible durante el intento.";
  }
  return value || "El intento no pudo completarse.";
}

function commandSummary(command: Row) {
  const payload = command.payload && typeof command.payload === "object" ? command.payload : {};
  if (command.action_key === "mission.create") {
    return payload.title
      ? `Propone abrir la misión “${payload.title}”.`
      : "Propone abrir una nueva misión.";
  }
  if (command.action_key === "evidence.request") {
    return payload.description
      ? String(payload.description).slice(0, 360)
      : "Necesita evidencia antes de continuar.";
  }
  if (command.action_key === "stage.escalate") {
    return payload.reason
      ? String(payload.reason).slice(0, 360)
      : "Necesita escalar un bloqueo a Dirección.";
  }
  return `Propone ${actionLabel(command.action_key)}.`;
}

function rescuePrompt(args: {
  actor: Actor;
  state: string;
  title: string;
  reason: string;
  missionCode?: string | null;
  missionTitle?: string | null;
  approvalAction?: string | null;
}) {
  const mission = args.missionCode
    ? ` La misión relacionada es ${args.missionCode}${args.missionTitle ? ` — ${args.missionTitle}` : ""}.`
    : "";
  const approval = args.approvalAction
    ? ` Hay una decisión humana pendiente sobre “${actionLabel(args.approvalAction)}”.`
    : "";

  return [
    `Revisa el bloqueo actual de ${args.actor.name} dentro de LINK.`,
    `Estado observado: ${args.state}. Problema: ${args.reason}.${mission}${approval}`,
    "Trabaja solo con evidencia real de Supabase, event_bus, command_bus y agent_work_queue; no inventes estados ni cierres.",
    "1) identifica la causa concreta y el último paso exitoso; 2) indica qué puede resolver el DOT por sí mismo; 3) si necesita una decisión humana, formula una sola decisión con impacto, riesgo y evidencia; 4) si el intento anterior falló, no lo repitas ciegamente: cambia la estrategia o explica qué dependencia falta; 5) deja un próximo paso verificable y dónde comprobar que quedó resuelto.",
  ].join("\n");
}

function eventTitle(eventType: string) {
  const map: Record<string, string> = {
    AGENT_WAKE_FAILED: "Intento fallido",
    AGENT_WAKE_PROPOSED: "Acción propuesta",
    AGENT_WAKE_INTERNAL: "Trabajo interno",
    AGENT_WAKE_NOOP: "Revisión sin acción",
  };
  return map[eventType] || eventType.replaceAll("_", " ");
}

export async function GET() {
  const supabase = getCentralSupabase();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "central_supabase_not_configured" },
      { status: 503 },
    );
  }

  const [
    skillsResult,
    scopesResult,
    queueResult,
    commandsResult,
    eventsResult,
  ] = await Promise.all([
    supabase
      .from("link_skills")
      .select("slug,name,status,metadata")
      .eq("status", "active")
      .order("name"),
    supabase
      .from("agent_scope_state")
      .select("agent_slug,state,current_focus,current_mission_code,last_wake_at,last_success_at,last_failure_at,priority,updated_at")
      .order("updated_at", { ascending: false })
      .limit(250),
    supabase
      .from("agent_work_queue")
      .select("id,agent_slug,status,reason,work_type,mission_id,command_id,business_global_id,stage_key,created_at,updated_at,metadata")
      .in("status", ["blocked", "retry_wait", "awaiting_approval"])
      .order("updated_at", { ascending: false })
      .limit(100),
    supabase
      .from("command_bus")
      .select("id,actor,action_key,status,approval_status,requires_approval,requested_at,processed_at,error,payload,global_id")
      .order("requested_at", { ascending: false })
      .limit(160),
    supabase
      .from("event_bus")
      .select("id,event_type,source_provider,payload,global_id,occurred_at,received_at")
      .in("event_type", ["AGENT_WAKE_FAILED", "AGENT_WAKE_PROPOSED", "AGENT_WAKE_INTERNAL", "AGENT_WAKE_NOOP"])
      .order("occurred_at", { ascending: false })
      .limit(100),
  ]);

  for (const result of [skillsResult, scopesResult, queueResult, commandsResult, eventsResult]) {
    if (result.error) {
      return NextResponse.json(
        { ok: false, error: result.error.message },
        { status: 500 },
      );
    }
  }

  const actors = new Map<string, Actor>();
  for (const skill of skillsResult.data || []) {
    const metadata = skill.metadata || {};
    const isActor =
      skill.slug === "link-director" ||
      metadata.agent_kind === "linkdot" ||
      metadata.agent_kind === "linksubdot";
    if (!isActor) continue;
    const actor = actorFromSkill(skill);
    actors.set(actor.slug, actor);
    actors.set(actor.dotSlug, actor);
  }

  const queue = queueResult.data || [];
  const missionIds = queue.map((row: Row) => row.mission_id).filter(Boolean);
  const businessIds = queue.map((row: Row) => row.business_global_id).filter(Boolean);

  const [missionsResult, businessesResult] = await Promise.all([
    missionIds.length
      ? supabase
          .from("agent_missions")
          .select("id,mission_code,title,status,priority,assigned_agent_slug,updated_at")
          .in("id", missionIds)
      : Promise.resolve({ data: [] as Row[], error: null }),
    businessIds.length
      ? supabase
          .from("link_world_businesses")
          .select("global_id,name,slug")
          .in("global_id", businessIds)
      : Promise.resolve({ data: [] as Row[], error: null }),
  ]);

  const missions = new Map(
    (missionsResult.data || []).map((row: Row) => [String(row.id), row]),
  );
  const businesses = new Map(
    (businessesResult.data || []).map((row: Row) => [String(row.global_id), row]),
  );
  const commands = commandsResult.data || [];

  const attention = queue.map((work: Row) => {
    const actor = actors.get(String(work.agent_slug)) || {
      slug: String(work.agent_slug),
      dotSlug: String(work.agent_slug),
      name: cleanName(work.agent_slug),
    };
    const mission = missions.get(String(work.mission_id || ""));
    const business = businesses.get(String(work.business_global_id || ""));
    const linkedCommand = work.command_id
      ? commands.find((row: Row) => String(row.id) === String(work.command_id))
      : null;
    const recentCommand = commands.find((row: Row) => row.actor === actor.slug);
    const command = linkedCommand || recentCommand || null;

    let title = "Necesita atención";
    let reason = String(work.reason || "LINK detectó un trabajo que no puede continuar todavía.");
    let severity: "critical" | "attention" | "decision" = "attention";
    let tab = "trabajo";

    if (work.status === "blocked") {
      title = "Trabajo bloqueado";
      severity = "critical";
    } else if (work.status === "retry_wait") {
      title = "El DOT está reintentando";
      severity = "attention";
      const scope = (scopesResult.data || []).find(
        (row: Row) => row.agent_slug === actor.slug && row.state === "retry_wait",
      );
      if (scope?.current_focus) reason = String(scope.current_focus);
    } else if (work.status === "awaiting_approval") {
      title = "Esperando tu decisión";
      severity = "decision";
      tab = "detalles";
      if (command) reason = commandSummary(command);
    }

    const latestFailure = (eventsResult.data || []).find((event: Row) => {
      const payload = event.payload || {};
      return (
        event.event_type === "AGENT_WAKE_FAILED" &&
        payload.agent_slug === actor.slug &&
        (!work.id || payload.work_id === work.id || work.status === "retry_wait")
      );
    });

    const failure = latestFailure
      ? failureSummary(latestFailure.payload?.error)
      : null;

    const prompt = rescuePrompt({
      actor,
      state: String(work.status),
      title,
      reason: failure || reason,
      missionCode: mission?.mission_code || work.metadata?.mission_code || null,
      missionTitle: mission?.title || null,
      approvalAction:
        work.status === "awaiting_approval" ? command?.action_key || null : null,
    });

    return {
      id: String(work.id),
      kind:
        work.status === "awaiting_approval"
          ? "approval"
          : work.status === "retry_wait"
            ? "retry"
            : "blocked",
      severity,
      actorSlug: actor.slug,
      dotSlug: actor.dotSlug,
      actorName: actor.name,
      state: String(work.status),
      title,
      summary: reason,
      failure,
      missionCode: mission?.mission_code || work.metadata?.mission_code || null,
      missionTitle: mission?.title || null,
      businessGlobalId: work.business_global_id || null,
      businessName: business?.name || null,
      commandId: command?.id || null,
      commandAction: command?.action_key || null,
      commandStatus: command?.status || null,
      approvalStatus: command?.approval_status || null,
      updatedAt: work.updated_at || work.created_at,
      location: {
        label:
          work.status === "awaiting_approval"
            ? `${actor.name} · decisiones`
            : mission
              ? `${actor.name} · ${mission.title}`
              : `${actor.name} · trabajo actual`,
        href: `/dots/${actor.dotSlug}?tab=${tab}`,
      },
      prompt,
    };
  });

  const pendingApprovals = commands
    .filter(
      (command: Row) =>
        command.requires_approval &&
        command.status === "pending" &&
        command.approval_status === "pending",
    )
    .slice(0, 40)
    .map((command: Row) => {
      const actor = actors.get(String(command.actor)) || {
        slug: String(command.actor),
        dotSlug: String(command.actor),
        name: cleanName(command.actor),
      };
      return {
        id: String(command.id),
        actorSlug: actor.slug,
        dotSlug: actor.dotSlug,
        actorName: actor.name,
        actionKey: command.action_key,
        actionLabel: actionLabel(command.action_key),
        summary: commandSummary(command),
        requestedAt: command.requested_at,
        globalId: command.global_id || null,
        href: `/dots/${actor.dotSlug}?tab=detalles`,
        prompt: rescuePrompt({
          actor,
          state: "awaiting_approval",
          title: "Esperando aprobación",
          reason: commandSummary(command),
          approvalAction: command.action_key,
        }),
      };
    });

  const recentEvents = (eventsResult.data || [])
    .slice(0, 32)
    .map((event: Row) => {
      const payload = event.payload || {};
      const actorSlug = String(payload.agent_slug || "link-director");
      const actor = actors.get(actorSlug) || {
        slug: actorSlug,
        dotSlug: actorSlug,
        name: cleanName(actorSlug),
      };
      const isFailure = event.event_type === "AGENT_WAKE_FAILED";
      const detail = isFailure
        ? failureSummary(payload.error)
        : event.event_type === "AGENT_WAKE_PROPOSED"
          ? `${actor.name} propuso ${actionLabel(payload.action_key)}.`
          : event.event_type === "AGENT_WAKE_INTERNAL"
            ? String(payload.internal_summary || payload.reason || "Avanzó trabajo interno.")
            : "Revisó una señal y decidió no actuar todavía.";

      return {
        id: String(event.id),
        eventType: event.event_type,
        title: eventTitle(event.event_type),
        detail,
        actorSlug: actor.slug,
        dotSlug: actor.dotSlug,
        actorName: actor.name,
        at: event.occurred_at || event.received_at,
        tone: isFailure ? "problem" : event.event_type === "AGENT_WAKE_PROPOSED" ? "attention" : "quiet",
        href: `/dots/${actor.dotSlug}?tab=${isFailure ? "detalles" : "trabajo"}`,
      };
    });

  const scopes = (scopesResult.data || []).map((row: Row) => {
    const actor = actors.get(String(row.agent_slug));
    return {
      actorSlug: row.agent_slug,
      dotSlug: actor?.dotSlug || row.agent_slug,
      actorName: actor?.name || cleanName(row.agent_slug),
      state: row.state,
      focus: row.current_focus,
      missionCode: row.current_mission_code,
      lastWakeAt: row.last_wake_at,
      lastSuccessAt: row.last_success_at,
      lastFailureAt: row.last_failure_at,
      updatedAt: row.updated_at,
    };
  });

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    counts: {
      attention: attention.length,
      approvals: pendingApprovals.length,
      recentEvents: recentEvents.length,
    },
    attention,
    approvals: pendingApprovals,
    events: recentEvents,
    scopes,
  });
}
