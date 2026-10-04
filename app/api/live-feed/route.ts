import { NextResponse } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Row = Record<string, any>;

const STATE_RANK: Record<string, number> = {
  processing: 80,
  blocked: 70,
  retry_wait: 60,
  waiting_approval: 50,
  queued: 40,
  working: 30,
  watching: 20,
  idle: 10,
};

function plainState(state?: string | null) {
  const map: Record<string, string> = {
    processing: "Trabajando ahora",
    blocked: "Bloqueado",
    retry_wait: "Reintentando",
    waiting_approval: "Esperando aprobación",
    queued: "Tiene trabajo en cola",
    working: "Trabajando en una misión",
    watching: "Observando señales",
    idle: "Disponible",
  };
  return map[String(state || "")] || "Observando";
}

function actionText(action?: string | null) {
  const map: Record<string, string> = {
    "mission.create": "crear una misión",
    "stage.diagnosis.record": "registrar un diagnóstico",
    "evidence.request": "pedir evidencia",
    "agent.assign": "asignar una misión",
    "stage.escalate": "escalar un problema",
    "stage.block_scale": "frenar el avance de una etapa",
    "stage.verify": "verificar una etapa",
    "stage.handoff.propose": "proponer una entrega a otro actor",
    "stage.handoff.accept": "aceptar una entrega",
  };
  return map[String(action || "")] || String(action || "una acción");
}

function proposalDetail(action?: string | null) {
  const map: Record<string, string> = {
    "mission.create": "Detectó un problema que considera suficientemente importante para abrir una misión. La propuesta espera aprobación.",
    "stage.diagnosis.record": "Encontró un diagnóstico respaldado por las señales que leyó. Espera aprobación para dejarlo registrado.",
    "evidence.request": "Le falta una prueba concreta para continuar. Preparó una solicitud de evidencia.",
    "agent.assign": "Identificó quién debería hacerse cargo del siguiente trabajo y preparó la asignación.",
    "stage.escalate": "Encontró un bloqueo que necesita subir a Dirección para poder continuar.",
    "stage.block_scale": "Detectó un riesgo y propone no seguir escalando hasta resolverlo.",
    "stage.verify": "Considera que la etapa puede verificarse con la evidencia disponible.",
    "stage.handoff.propose": "Considera que el trabajo está listo para pasar al siguiente actor.",
    "stage.handoff.accept": "Considera que puede recibir el trabajo entregado por otro actor.",
  };
  return map[String(action || "")] || "Preparó una acción interna y está esperando el siguiente paso.";
}

function failedDetail(error?: string | null, retry?: boolean) {
  const value = String(error || "").toLowerCase();
  if (value.includes("gateway") || value.includes("aborted") || value.includes("temporarily unavailable")) {
    return retry
      ? "El modelo no respondió a tiempo. LINK dejó el trabajo preparado para reintentarlo."
      : "El modelo no respondió correctamente y el intento quedó registrado para revisión.";
  }
  return retry
    ? "El intento falló. LINK lo dejó preparado para un nuevo intento."
    : "El intento falló y quedó registrado para revisión.";
}

function eventRoute(eventType: string, provider: string) {
  const value = `${provider} ${eventType}`.toLowerCase();
  if (/lead|prospect|contact|form|whatsapp|message|inbox/.test(value)) return "director-ventas";
  if (/payment|paid|checkout|purchase|sale|quote|cotiza|invoice|mercado.?pago/.test(value)) return "director-cierre";
  if (/onboard|welcome|activation|accepted.?commitment|booking.?confirmed|reservation.?confirmed/.test(value)) return "director-onboarding";
  if (/delivery|delivered|service|tour|arrival|attendance|fulfilled|fulfillment/.test(value)) return "director-entrega";
  if (/review|nps|referral|repeat|recompra|retention|testimonial|postventa/.test(value)) return "director-postventa";
  if (/rrss|social|post|campaign|traffic|attention|reach|click|impression|utm/.test(value)) return "director-marketing";
  return "link-director";
}

export async function GET() {
  const supabase = getCentralSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "central_supabase_not_configured" }, { status: 503 });
  }

  const [skillsResult, scopesResult, queueResult, commandsResult, eventsResult] = await Promise.all([
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
      .select("id,agent_slug,status,reason,work_type,mission_id,updated_at,created_at")
      .in("status", ["queued", "processing", "awaiting_approval", "retry_wait", "blocked"])
      .order("updated_at", { ascending: false })
      .limit(150),
    supabase
      .from("command_bus")
      .select("id,actor,action_key,status,approval_status,requires_approval,requested_at,processed_at")
      .order("requested_at", { ascending: false })
      .limit(120),
    supabase
      .from("event_bus")
      .select("id,event_type,source_provider,payload,global_id,occurred_at,received_at")
      .order("occurred_at", { ascending: false })
      .limit(120),
  ]);

  for (const result of [skillsResult, scopesResult, queueResult, commandsResult, eventsResult]) {
    if (result.error) {
      return NextResponse.json({ ok: false, error: result.error.message }, { status: 500 });
    }
  }

  const skills = (skillsResult.data || []).filter((row: Row) =>
    row.slug === "link-director" || row.metadata?.agent_kind === "linkdot",
  );

  const actorMap = new Map<string, { slug: string; dotSlug: string; name: string; area: string }>();
  for (const row of skills) {
    const metadata = row.metadata || {};
    const actor = {
      slug: row.slug,
      dotSlug: metadata.dot_slug || row.slug,
      name: String(metadata.display_label || row.name || row.slug)
        .replace(/^LINKDOT\s*·?\s*/i, "")
        .replace(/^LINK\s*/i, ""),
      area: String(metadata.dot_area || metadata.stage_label || metadata.area || "Dirección").replaceAll("_", " "),
    };
    actorMap.set(row.slug, actor);
    actorMap.set(actor.dotSlug, actor);
  }

  const scopes = scopesResult.data || [];
  const queue = queueResult.data || [];
  const commands = commandsResult.data || [];

  const actorStates = skills.map((skill: Row) => {
    const metadata = skill.metadata || {};
    const dotSlug = metadata.dot_slug || skill.slug;
    const actorScopes = scopes.filter((row: Row) => row.agent_slug === skill.slug);
    const actorQueue = queue.filter((row: Row) => row.agent_slug === skill.slug);
    const selected = [...actorScopes].sort(
      (a: Row, b: Row) => (STATE_RANK[b.state] || 0) - (STATE_RANK[a.state] || 0),
    )[0];

    const queueCounts = actorQueue.reduce((acc: Record<string, number>, row: Row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    }, {});

    const pendingApprovals = commands.filter(
      (row: Row) => row.actor === skill.slug && row.approval_status === "pending",
    ).length;

    return {
      slug: skill.slug,
      dotSlug,
      name: String(metadata.display_label || skill.name || skill.slug)
        .replace(/^LINKDOT\s*·?\s*/i, "")
        .replace(/^LINK\s*/i, ""),
      area: String(metadata.dot_area || metadata.stage_label || metadata.area || "Dirección").replaceAll("_", " "),
      state: selected?.state || (actorQueue.length ? actorQueue[0].status : "watching"),
      stateLabel: plainState(selected?.state || (actorQueue.length ? actorQueue[0].status : "watching")),
      focus: selected?.current_focus || actorQueue[0]?.reason || null,
      lastWakeAt: selected?.last_wake_at || null,
      lastSuccessAt: selected?.last_success_at || null,
      lastFailureAt: selected?.last_failure_at || null,
      pendingApprovals,
      queue: queueCounts,
      href: `/dots/${dotSlug}`,
    };
  });

  const relevantEvents = (eventsResult.data || []).filter((event: Row) => {
    if (["AGENT_WAKE_PROPOSED", "AGENT_WAKE_NOOP", "AGENT_WAKE_FAILED", "system.link_pulse.completed"].includes(event.event_type)) return true;
    if (event.source_provider === "control-central" && event.event_type !== "AGENT_ACTION_PROPOSED" && event.payload?.agent_slug) return true;
    if (["lead.created", "sale.confirmed", "operation.completed", "feedback.closed", "product.available"].includes(event.event_type)) return true;
    return false;
  });

  const stories = relevantEvents.slice(0, 24).map((event: Row) => {
    const payload = event.payload || {};
    const agentSlug = payload.agent_slug || eventRoute(String(event.event_type || ""), String(event.source_provider || ""));
    const actor = actorMap.get(agentSlug) || {
      slug: agentSlug,
      dotSlug: agentSlug,
      name: agentSlug === "link-director" ? "Director" : "LINK",
      area: "LINK",
    };

    if (event.event_type === "AGENT_WAKE_PROPOSED") {
      return {
        id: event.id,
        at: event.occurred_at || event.received_at,
        actor: actor.name,
        actorSlug: actor.slug,
        tone: "attention",
        headline: `${actor.name} propuso ${actionText(payload.action_key)}.`,
        detail: proposalDetail(payload.action_key),
        href: `/dots/${actor.dotSlug}`,
      };
    }

    if (event.event_type === "AGENT_WAKE_NOOP") {
      return {
        id: event.id,
        at: event.occurred_at || event.received_at,
        actor: actor.name,
        actorSlug: actor.slug,
        tone: "quiet",
        headline: `${actor.name} revisó su trabajo y decidió esperar.`,
        detail: "No encontró evidencia suficiente para actuar sin inventar información.",
        href: `/dots/${actor.dotSlug}`,
      };
    }

    if (event.event_type === "AGENT_WAKE_FAILED") {
      return {
        id: event.id,
        at: event.occurred_at || event.received_at,
        actor: actor.name,
        actorSlug: actor.slug,
        tone: "problem",
        headline: `${actor.name} intentó trabajar, pero se encontró con un problema.`,
        detail: failedDetail(payload.error, Boolean(payload.retry_scheduled)),
        href: `/dots/${actor.dotSlug}`,
      };
    }

    if (event.event_type === "system.link_pulse.completed") {
      const issues = Array.isArray(payload.issues) ? payload.issues.length : 0;
      return {
        id: event.id,
        at: event.occurred_at || event.received_at,
        actor: "Director",
        actorSlug: "link-director",
        tone: issues ? "attention" : "success",
        headline: issues
          ? `Pulso LINK terminó con ${issues} señal${issues === 1 ? "" : "es"} de atención.`
          : "Pulso LINK terminó sin señales críticas.",
        detail: issues
          ? "El sistema revisó sus conexiones y dejó los puntos que requieren atención para Dirección."
          : "Las conexiones revisadas no mostraron problemas críticos.",
        href: "/dots/link-director",
      };
    }

    if (event.source_provider === "control-central" && payload.action_key) {
      return {
        id: event.id,
        at: event.occurred_at || event.received_at,
        actor: actor.name,
        actorSlug: actor.slug,
        tone: "success",
        headline: `${actor.name} completó ${actionText(payload.action_key)}.`,
        detail: "El resultado quedó registrado dentro de LINK.",
        href: `/dots/${actor.dotSlug}`,
      };
    }

    const external: Record<string, { headline: string; detail: string }> = {
      "lead.created": {
        headline: "Llegó un nuevo lead a LINK.",
        detail: "La señal quedó registrada para que Ventas la revise.",
      },
      "sale.confirmed": {
        headline: "Se confirmó una venta.",
        detail: "La señal quedó disponible para Cierre y las etapas siguientes.",
      },
      "operation.completed": {
        headline: "Se completó una operación.",
        detail: "Entrega puede contrastar la promesa con la ejecución real.",
      },
      "feedback.closed": {
        headline: "Se cerró una señal de postventa.",
        detail: "Postventa puede usarla para seguimiento, reputación o recompra.",
      },
      "product.available": {
        headline: "Hay un producto disponible en el ecosistema.",
        detail: "Director recibió la señal para decidir si requiere alguna acción.",
      },
    };
    const info = external[event.event_type] || {
      headline: `LINK recibió: ${event.event_type}`,
      detail: "La señal quedó registrada en el organismo.",
    };

    return {
      id: event.id,
      at: event.occurred_at || event.received_at,
      actor: actor.name,
      actorSlug: actor.slug,
      tone: "signal",
      headline: info.headline,
      detail: info.detail,
      href: `/dots/${actor.dotSlug}`,
    };
  });

  const lastWakeAt = actorStates
    .map((row: Row) => row.lastWakeAt)
    .filter(Boolean)
    .sort()
    .at(-1) || null;

  const pendingApprovals = commands.filter((row: Row) => row.approval_status === "pending").length;
  const activeQueue = queue.length;
  const workingNow = actorStates.filter((row: Row) =>
    ["processing", "working", "queued", "retry_wait"].includes(row.state),
  ).length;
  const blocked = actorStates.filter((row: Row) => row.state === "blocked").length;

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    refreshMs: 5000,
    engine: {
      cadence: "cada 5 min",
      activeAgents: actorStates.length,
      workingNow,
      pendingApprovals,
      activeQueue,
      blocked,
      lastWakeAt,
    },
    actors: actorStates,
    stories,
  });
}
