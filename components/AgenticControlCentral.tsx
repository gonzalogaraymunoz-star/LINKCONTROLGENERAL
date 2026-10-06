"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import LinkPulseButton from "@/components/LinkPulseButton";
import LiveLinkFeed from "@/components/LiveLinkFeed";
import CompactApprovals from "@/components/CompactApprovals";
import BusinessFlowHealth from "@/components/BusinessFlowHealth";

export type AgentCapability = {
  capability_key: string;
  label: string;
  description?: string | null;
  weight?: number | string | null;
  metadata?: Record<string, unknown> | null;
};

export type AgentMemory = {
  memory_key: string;
  kind: string;
  importance?: number | null;
  confidence?: number | string | null;
  source?: string | null;
  source_ref?: string | null;
  updated_at?: string | null;
};

export type AgentActivity = {
  id: string;
  event_type?: string | null;
  provider?: string | null;
  provider_label?: string | null;
  model?: string | null;
  status?: string | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  latency_ms?: number | null;
  created_at?: string | null;
};

export type AgentRecord = {
  id: string;
  globalId: string;
  slug: string;
  name: string;
  description: string;
  status: string;
  version?: string | null;
  activationMode?: string | null;
  metadata: Record<string, any>;
  capabilities: AgentCapability[];
  memories: AgentMemory[];
  activity: AgentActivity[];
  governance?: any;
  runtimeState?: {
    agent?: string;
    version?: string;
    mode?: string;
    runtime?: string;
    intelligence?: string;
    liveState?: string;
    doctrine?: string;
    model?: string;
    actions?: string[];
    mutatingActionsEnabled?: boolean;
  } | null;
};

type Section =
  | "Inicio"
  | "Actores"
  | "Trabajo"
  | "Espacios"
  | "Negocios"
  | "Conversaciones"
  | "Calendario"
  | "Evidencia"
  | "Conexiones"
  | "Sistema";

const PRIMARY: Array<{ id: Section; icon: string; hint: string }> = [
  { id: "Inicio", icon: "home", hint: "Dirección del crecimiento" },
  { id: "Negocios", icon: "grid", hint: "Células económicas" },
  { id: "Trabajo", icon: "check", hint: "Intervenciones necesarias" },
  { id: "Calendario", icon: "calendar", hint: "Ritmo y compromisos" },
];

const CONTEXT: Array<{ id: Section; icon: string; hint: string }> = [];

const MORE: Array<{ id: Section; icon: string; hint: string }> = [
  { id: "Actores", icon: "people", hint: "LINKDOT facilitadores" },
  { id: "Espacios", icon: "folder", hint: "Mesas y artefactos" },
  { id: "Conversaciones", icon: "chat", hint: "Contexto persistente" },
  { id: "Evidencia", icon: "pulse", hint: "Pruebas del organismo" },
  { id: "Conexiones", icon: "link", hint: "Sistemas conectados" },
  { id: "Sistema", icon: "settings", hint: "Detalles técnicos" },
];

const JOURNEY_ORDER = [
  "linkdot-marketing-rrss",
  "linkdot-ventas",
  "linkdot-cierre",
  "linkdot-onboarding",
  "linkdot-entrega",
  "linkdot-postventa",
];

function Icon({ name }: { name: string }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (name === "home") return <svg {...common}><path d="M3.5 10.5 12 3l8.5 7.5"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-6h5v6"/></svg>;
  if (name === "people") return <svg {...common}><circle cx="9" cy="8" r="3"/><path d="M3.5 20c.5-4 2.3-6 5.5-6s5 2 5.5 6"/><circle cx="17" cy="9" r="2.3"/><path d="M15.5 14.5c2.8-.3 4.5 1.4 5 4.5"/></svg>;
  if (name === "check") return <svg {...common}><path d="M9 11.5 11 14l4.5-5"/><rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 7h8M8 17h8"/></svg>;
  if (name === "folder") return <svg {...common}><path d="M3 7.5h7l2-2h9v13.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg>;
  if (name === "grid") return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>;
  if (name === "chat") return <svg {...common}><path d="M4 5h16v11H9l-5 4Z"/></svg>;
  if (name === "calendar") return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>;
  if (name === "pulse") return <svg {...common}><path d="M3 12h4l2-6 4 12 2-6h6"/></svg>;
  if (name === "link") return <svg {...common}><path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1"/></svg>;
  if (name === "settings") return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.7-1L14.5 3h-5l-.3 3.1a8 8 0 0 0-1.7 1l-2.4-1-2 3.4L5.1 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 1.7 1l.3 3.1h5l.3-3.1a8 8 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z"/></svg>;
  if (name === "panel") return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/></svg>;
  if (name === "menu") return <svg {...common}><path d="M4 7h16M4 12h16M4 17h16"/></svg>;
  if (name === "refresh") return <svg {...common}><path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M6.1 8.5A7 7 0 0 1 18 7l2 5M4 12l2 5a7 7 0 0 0 11.9-1.5"/></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="8"/></svg>;
}

function when(value?: string | null) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function humanStatus(value?: string | null) {
  const map: Record<string, string> = {
    planned: "Pendiente",
    scheduled: "Programado",
    completed: "Completado",
    verified: "Verificado",
    active: "Activo",
    connected: "Conectado",
    warning: "Atención",
    pending: "Pendiente",
    processing: "Trabajando",
    succeeded: "Correcto",
    success: "Correcto",
    shadow: "Observando",
    blocked: "Bloqueado",
    waiting_evidence: "Espera evidencia",
    waiting_approval: "Espera aprobación",
    awaiting_approval: "Espera aprobación",
    queued: "En cola",
    retry_wait: "Reintentando",
    idle: "Disponible",
    watching: "Observando",
    working: "Trabajando",
    approved: "Aprobado",
    requested: "Solicitada",
    received: "Recibida",
    validated: "Validada",
  };
  return map[String(value || "")] || value || "—";
}

function operationalSlug(agent: AgentRecord) {
  return String(agent.metadata?.dot_slug || agent.slug);
}

function shortActorName(agent: AgentRecord) {
  return String(agent.metadata?.display_label || agent.name)
    .replace(/^LINKDOT\s*·?\s*/i, "")
    .replace(/^LINK\s*/i, "");
}

function actorArea(agent: AgentRecord) {
  return String(agent.metadata?.dot_area || agent.metadata?.stage_label || agent.metadata?.area || "Dirección")
    .replaceAll("_", " ");
}

function isSubdot(agent: AgentRecord) {
  return agent.metadata?.agent_kind === "linksubdot";
}

function orderedActors(agents: AgentRecord[]) {
  const director = agents.find((agent) => agent.slug === "link-director");
  const dots = agents
    .filter((agent) => agent.metadata?.agent_kind === "linkdot")
    .sort((a, b) => {
      const ai = JOURNEY_ORDER.indexOf(operationalSlug(a));
      const bi = JOURNEY_ORDER.indexOf(operationalSlug(b));
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });
  return director ? [director, ...dots.filter((dot) => dot.id !== director.id)] : dots;
}

function actorForSlug(slug: string | null | undefined, agents: AgentRecord[]) {
  if (!slug) return null;
  const exact = agents.find((agent) => agent.slug === slug || operationalSlug(agent) === slug);
  if (!exact) return null;
  if (isSubdot(exact) && exact.metadata?.parent_dot) {
    return agents.find((agent) => operationalSlug(agent) === exact.metadata.parent_dot) || exact;
  }
  return exact;
}

function actorLabelForSlug(slug: string | null | undefined, agents: AgentRecord[]) {
  const actor = actorForSlug(slug, agents);
  return actor ? shortActorName(actor) : slug || "Sin actor";
}

function actorResponsibility(agent: AgentRecord) {
  return String(agent.metadata?.responsibility || agent.description || "Responsabilidad todavía no descrita.");
}

function actorEntry(agent: AgentRecord) {
  return String(agent.metadata?.entry_boundary || "Entrada todavía no descrita.");
}

function actorExit(agent: AgentRecord) {
  return String(agent.metadata?.exit_boundary || agent.metadata?.handoff_boundary || "Entrega todavía no descrita.");
}

function Status({ value }: { value?: string | null }) {
  const v = String(value || "");
  const cls = /blocked|failed|error/.test(v)
    ? " is-danger"
    : /pending|waiting|awaiting|requested|warning|retry/.test(v)
      ? " is-warn"
      : /active|connected|completed|verified|success|succeeded|validated|approved/.test(v)
        ? " is-ok"
        : "";
  return <span className={"cc-status" + cls}>{humanStatus(value)}</span>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="cc-empty">{children}</div>;
}

export default function AgenticControlCentral({ initialAgents }: { initialAgents: AgentRecord[] }) {
  const [section, setSection] = useState<Section>("Inicio");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("link-control-simple-section") as Section | null;
      const all = [...PRIMARY, ...CONTEXT, ...MORE].map((item) => item.id);
      if (stored && all.includes(stored)) setSection(stored);
      setCollapsed(window.localStorage.getItem("link-control-sidebar-collapsed") === "true");
    } catch {}
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem("link-control-simple-section", section); } catch {}
  }, [section]);

  useEffect(() => {
    try { window.localStorage.setItem("link-control-sidebar-collapsed", String(collapsed)); } catch {}
  }, [collapsed]);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/system-summary", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "No se pudo leer Control Central");
      setSummary(payload);
      setError("");
    } catch (err: any) {
      setError(err?.message || "No se pudo leer Control Central");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadSummary(); }, [loadSummary]);

  const actors = useMemo(() => orderedActors(initialAgents), [initialAgents]);

  function go(next: Section) {
    setSection(next);
    setMobileOpen(false);
  }

  return (
    <div className={"cc-shell" + (collapsed ? " is-collapsed" : "")}>
      <button className={"cc-scrim" + (mobileOpen ? " is-visible" : "")} aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} />

      <aside className={"cc-sidebar" + (mobileOpen ? " is-mobile-open" : "")}>
        <header className="cc-brand">
          <span className="cc-mark">L</span>
          <span className="cc-brand-copy"><b>LINK</b><small>CONTROL CENTRAL</small></span>
          <button className="cc-icon-button cc-collapse" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Abrir menú" : "Replegar menú"}>
            <Icon name="panel" />
          </button>
        </header>

        <div className="cc-side-scroll">
          <NavGroup label="NAVEGAR" items={PRIMARY} section={section} go={go} collapsed={collapsed} />
          {CONTEXT.length ? <NavGroup label="CONTEXTO" items={CONTEXT} section={section} go={go} collapsed={collapsed} /> : null}

          <div className="cc-nav-group">
            <button className="cc-more-toggle" onClick={() => setMoreOpen((v) => !v)}>
              <span>•••</span>
              <span className="cc-nav-copy"><b>Más</b><small>Herramientas y sistema</small></span>
              {!collapsed ? <em>{moreOpen ? "−" : "+"}</em> : null}
            </button>
            {moreOpen ? <NavGroup items={MORE} section={section} go={go} collapsed={collapsed} compact /> : null}
            {moreOpen ? (
              <>
                <a className="cc-nav-item" href="/micelio">
                  <Icon name="grid" />
                  <span className="cc-nav-copy"><b>Micelio</b><small>Organismo y relaciones</small></span>
                </a>
                <a className="cc-nav-item" href="/linkguide">
                  <Icon name="grid" />
                  <span className="cc-nav-copy"><b>LINK Guide</b><small>Mapa y direcciones</small></span>
                </a>
              </>
            ) : null}
          </div>

          <div className="cc-actors-quick">
            <div className="cc-side-label">FACILITADORES</div>
            {actors.filter((actor) => actor.slug !== "link-director").map((actor) => (
              <a key={actor.id} href={"/dots/" + operationalSlug(actor)} title={collapsed ? shortActorName(actor) : undefined}>
                <span className="cc-actor-pip" />
                <span><b>{shortActorName(actor)}</b><small>{actorArea(actor)}</small></span>
              </a>
            ))}
          </div>
        </div>

        <footer className="cc-side-foot">
          <span className={"cc-source-dot" + (error ? " is-warn" : "")} />
          <span><b>Fuente viva</b><small>{error ? "Revisar conexión" : "Supabase conectado"}</small></span>
        </footer>
      </aside>

      <main className="cc-main">
        <header className="cc-topbar">
          <button className="cc-icon-button cc-mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Abrir menú"><Icon name="menu" /></button>
          <div className="cc-breadcrumb"><small>CONTROL CENTRAL</small><b>{section}</b></div>
          <div className="cc-top-actions">
            <LinkPulseButton />
            <button className="cc-sync" onClick={() => void loadSummary()} disabled={loading}><Icon name="refresh" /><span>{loading ? "Leyendo…" : "Actualizar"}</span></button>
          </div>
        </header>

        <div className="cc-canvas">
          {error ? <div className="cc-alert"><b>No pudimos leer todo LINK.</b><span>{error}</span></div> : null}
          {section === "Inicio" ? <HomeView actors={actors} summary={summary} go={go} /> : null}
          {section === "Actores" ? <ActorsView actors={actors} allAgents={initialAgents} summary={summary} /> : null}
          {section === "Trabajo" ? <WorkView actors={actors} allAgents={initialAgents} summary={summary} loading={loading} /> : null}
          {section === "Espacios" ? <SpacesView actors={actors} allAgents={initialAgents} summary={summary} loading={loading} /> : null}
          {section === "Negocios" ? <BusinessesView summary={summary} loading={loading} /> : null}
          {section === "Conversaciones" ? <ConversationsView allAgents={initialAgents} summary={summary} loading={loading} /> : null}
          {section === "Calendario" ? <CalendarView summary={summary} loading={loading} /> : null}
          {section === "Evidencia" ? <EvidenceView allAgents={initialAgents} summary={summary} loading={loading} /> : null}
          {section === "Conexiones" ? <ConnectionsView summary={summary} loading={loading} /> : null}
          {section === "Sistema" ? <SystemView actors={actors} summary={summary} loading={loading} /> : null}
        </div>
      </main>
    </div>
  );
}

function NavGroup({ label, items, section, go, collapsed, compact = false }: {
  label?: string;
  items: Array<{ id: Section; icon: string; hint: string }>;
  section: Section;
  go: (section: Section) => void;
  collapsed: boolean;
  compact?: boolean;
}) {
  return (
    <nav className={"cc-nav-group" + (compact ? " is-compact" : "")}>
      {label && !collapsed ? <div className="cc-side-label">{label}</div> : null}
      {items.map((item) => (
        <button key={item.id} className={"cc-nav-item" + (section === item.id ? " is-active" : "")} onClick={() => go(item.id)} title={collapsed ? item.id : undefined}>
          <Icon name={item.icon} />
          <span className="cc-nav-copy"><b>{item.id}</b><small>{item.hint}</small></span>
        </button>
      ))}
    </nav>
  );
}

function HomeView({ actors, summary, go }: {
  actors: AgentRecord[];
  summary: any;
  go: (section: Section) => void;
}) {
  const missions = (summary?.agentMissions || []).filter((mission: any) =>
    ["approved", "active", "blocked", "waiting_evidence"].includes(String(mission.status)),
  );
  const spaces = summary?.dotWorkspaces || [];
  const blocked = missions.filter((mission: any) =>
    ["blocked", "waiting_evidence"].includes(String(mission.status)),
  );
  const working = missions.filter((mission: any) =>
    ["approved", "active"].includes(String(mission.status)),
  );

  return (
    <section className="cc-stack cc-od-home">
      <section className="cc-od-hero">
        <div className="cc-od-hero-copy">
          <span className="cc-eyebrow">LINK · CONTROL DESDE ARRIBA</span>
          <h1>¿Qué célula necesita crecer ahora?</h1>
          <p>Control Central no administra paneles por administrar. Observa cada célula económica, su misión, su evidencia y el siguiente movimiento. Los LINKDOT participan como facilitadores de las seis etapas.</p>
        </div>
        <div className="cc-od-hero-actions">
          <button className="cc-od-primary" onClick={() => go("Negocios")}>Ver células →</button>
          <button onClick={() => go("Trabajo")}>Ver intervenciones necesarias</button>
        </div>
      </section>

      <section className="cc-card cc-flow-health-card">
        <Head
          eyebrow="CÉLULAS · CRECIMIENTO"
          title="Qué negocio necesita avanzar"
          note="Misión, estado de crecimiento, prueba económica, etapa pendiente y LINKDOT facilitador. La ingeniería queda debajo."
        />
        <BusinessFlowHealth />
      </section>

      <CompactApprovals />

      <div className="cc-od-status-row">
        <button className={blocked.length ? "is-attention" : ""} onClick={() => go("Trabajo")}>
          <strong>{blocked.length}</strong>
          <span>intervenciones que frenan células</span>
          <small>{blocked.length ? "resolver ahora →" : "sin bloqueo material"}</small>
        </button>
        <button onClick={() => go("Negocios")}>
          <strong>{summary?.world?.nodes?.filter((node: any) => node.entity_type === "business").length || 0}</strong>
          <span>negocios observados</span>
          <small>ver crecimiento →</small>
        </button>
        <button onClick={() => go("Calendario")}>
          <strong>{summary?.tasks?.filter((task: any) => task.dueAt).length || 0}</strong>
          <span>compromisos con fecha</span>
          <small>ver ritmo →</small>
        </button>
        <button onClick={() => go("Actores")}>
          <strong>{actors.filter((actor) => actor.slug !== "link-director").length}</strong>
          <span>LINKDOT facilitadores</span>
          <small>ver participantes →</small>
        </button>
      </div>

      <section className="cc-card">
        <Head
          eyebrow="PRINCIPIO"
          title="La célula es protagonista; el LINKDOT facilita"
          note="MAR, Ventas, Cierre, Boarding, Opera y Postventa existen para que el negocio avance. Si una actividad no mejora la misión ni produce evidencia, no ocupa la pantalla principal."
        />
      </section>
    </section>
  );
}

function AgentActivityPanel({ actors, summary, go }: {
  actors: AgentRecord[];
  summary: any;
  go: (section: Section) => void;
}) {
  const wakes = (summary?.agentWakeEvidence || [])
    .filter((wake: any) => !wake.recovered)
    .slice(0, 8);

  return (
    <section className="cc-card cc-agent-activity-card">
      <div className="cc-agent-activity-head">
        <Head
          eyebrow="ACTIVIDAD AGÉNTICA"
          title="Qué hicieron los LINKDOT"
          note="En palabras simples: quién trabajó, qué revisó y en qué quedó."
        />
        <button onClick={() => go("Evidencia")}>Ver evidencia completa →</button>
      </div>

      <div className="cc-agent-activity-list">
        {wakes.map((wake: any) => {
          const actor = actorForSlug(wake.agentSlug, actors);
          const actorName = actor ? shortActorName(actor) : actorLabelForSlug(wake.agentSlug, actors);
          const activity = genericAgentActivity(wake, actorName);
          return (
            <a
              className="cc-agent-activity-row"
              href={actor ? "/dots/" + operationalSlug(actor) : "#"}
              key={wake.id}
            >
              <span className={"cc-agent-activity-dot " + activity.tone} />
              <div className="cc-agent-activity-copy">
                <div className="cc-agent-activity-meta">
                  <span>{actorName}</span>
                  <time>{when(wake.occurredAt)}</time>
                </div>
                <b>{activity.title}</b>
                <p>{activity.description}</p>
              </div>
              <span className={"cc-agent-activity-state " + activity.tone}>{activity.status}</span>
            </a>
          );
        })}
        {!wakes.length ? (
          <Empty>Todavía no hay actividad agéntica reciente para mostrar.</Empty>
        ) : null}
      </div>
    </section>
  );
}

function genericAgentActivity(wake: any, actorName: string) {
  const eventType = String(wake?.sourceEventType || "").toLowerCase();
  const actionKey = String(wake?.actionKey || "").toLowerCase();
  const decision = String(wake?.decision || "").toLowerCase();
  const failed = wake?.eventType === "AGENT_WAKE_FAILED";
  const approval = Boolean(wake?.requiresApproval) || wake?.approvalStatus === "pending" || decision === "propose";

  if (failed) {
    return {
      title: "Intento de trabajo con error",
      description: `${actorName} intentó procesar una tarea, pero el sistema no pudo terminarla. El detalle técnico quedó guardado en Evidencia.`,
      status: "Revisar",
      tone: "is-danger",
    };
  }

  if (approval) {
    if (actionKey.includes("evidence.request")) {
      return {
        title: "Preparó una solicitud de evidencia",
        description: `${actorName} encontró información que falta para poder avanzar con seguridad y dejó preparada una solicitud para que la apruebes.`,
        status: "Tu decisión",
        tone: "is-warn",
      };
    }
    return {
      title: "Preparó una decisión para aprobar",
      description: `${actorName} encontró un siguiente paso útil, pero no lo ejecutó porque necesita autorización humana.`,
      status: "Tu decisión",
      tone: "is-warn",
    };
  }

  if (eventType === "sale.confirmed") {
    return {
      title: "Revisión de venta confirmada",
      description: `${actorName} recibió una venta o reserva confirmada, revisó su respaldo y actualizó el caso sin asumir que existía pago si no había prueba.`,
      status: "Hecho",
      tone: "is-ok",
    };
  }

  if (eventType === "lead.created") {
    return {
      title: "Revisión de nuevo prospecto",
      description: `${actorName} recibió un nuevo prospecto, revisó la información disponible y dejó claro qué falta antes de pasarlo a la siguiente etapa.`,
      status: "Hecho",
      tone: "is-ok",
    };
  }

  if (eventType === "mission.review") {
    if (decision === "noop") {
      return {
        title: "Revisión sin cambios",
        description: `${actorName} revisó una misión y no encontró información nueva que justificara moverla o crear más trabajo.`,
        status: "Sin cambio",
        tone: "is-neutral",
      };
    }
    return {
      title: "Revisión de misión",
      description: `${actorName} revisó el estado de una misión, ordenó lo que encontró y dejó preparado el siguiente paso verificable.`,
      status: "Hecho",
      tone: "is-ok",
    };
  }

  if (decision === "noop") {
    return {
      title: "Revisión sin cambios",
      description: `${actorName} comprobó el caso y decidió correctamente no actuar porque no había una señal nueva suficiente.`,
      status: "Sin cambio",
      tone: "is-neutral",
    };
  }

  if (decision === "internal_work" || decision === "internal") {
    return {
      title: "Trabajo interno",
      description: `${actorName} revisó información del sistema, ordenó el caso y dejó persistido el resultado para el siguiente ciclo.`,
      status: "Hecho",
      tone: "is-ok",
    };
  }

  return {
    title: "Revisión del sistema",
    description: `${actorName} recibió una señal, la revisó y dejó registrado el resultado para mantener continuidad.`,
    status: "Hecho",
    tone: "is-ok",
  };
}

function ActorJourney({ actors }: { actors: AgentRecord[] }) {
  return (
    <div className="cc-journey">
      {actors.map((actor, index) => (
        <div className="cc-journey-wrap" key={actor.id}>
          <a href={"/dots/" + operationalSlug(actor)}>
            <span>{index + 1}</span><b>{shortActorName(actor)}</b><small>{actorResponsibility(actor)}</small>
          </a>
          {index < actors.length - 1 ? <i>→</i> : null}
        </div>
      ))}
    </div>
  );
}

function ActorsView({ actors, allAgents, summary }: { actors: AgentRecord[]; allAgents: AgentRecord[]; summary: any }) {
  const production = summary?.agentProduction || [];
  return (
    <section className="cc-stack">
      <Intro eyebrow="ACTORES" title="Quién hace qué" text="Cada LINKDOT tiene una responsabilidad clara. Los LINKSUBDOT aparecen dentro de su actor cuando necesita una especialidad." />
      <section className="cc-card">
        <Head eyebrow="DIRECCIÓN" title="LINK Director" note="Coordina; no reemplaza a los demás actores." />
        {actors.filter((actor) => actor.slug === "link-director").map((actor) => (
          <ActorCard key={actor.id} actor={actor} allAgents={allAgents} production={production} />
        ))}
      </section>
      <div className="cc-actor-grid">
        {actors.filter((actor) => actor.slug !== "link-director").map((actor) => (
          <ActorCard key={actor.id} actor={actor} allAgents={allAgents} production={production} />
        ))}
      </div>
    </section>
  );
}

function ActorCard({ actor, allAgents, production }: { actor: AgentRecord; allAgents: AgentRecord[]; production: any[] }) {
  const prod = production.find((row: any) => row.agentSlug === actor.slug) || {};
  const current = prod?.missions?.current || null;
  const subdots = allAgents.filter((item) => item.metadata?.parent_dot === operationalSlug(actor));
  const isDirector = actor.slug === "link-director";

  if (isDirector) {
    const directDots = orderedActors(allAgents).filter((item) => item.slug !== "link-director");
    return (
      <article className="cc-actor-card cc-director-card">
        <header>
          <div className="cc-actor-avatar is-director">L·</div>
          <div><span className="cc-eyebrow">DIRECCIÓN DE LINK</span><h2>Director</h2></div>
          <Status value={actor.runtimeState?.mode || actor.metadata?.autonomy_mode || actor.status} />
        </header>

        <div className="cc-director-body">
          <div>
            <small>SU FUNCIÓN</small>
            <p>{actor.description}</p>
          </div>
          <div className="cc-director-now">
            <small>AHORA</small>
            <b>{current?.title || "Observando el organismo"}</b>
            <span>{current ? humanStatus(current.status) : "Disponible"}</span>
          </div>
        </div>

        <div className="cc-director-team">
          <small>COORDINA A</small>
          <div>
            {directDots.map((dot) => (
              <a key={dot.id} href={"/dots/" + operationalSlug(dot)}>{shortActorName(dot)} →</a>
            ))}
          </div>
        </div>

        <footer>
          <span>No ejecuta el trabajo de los demás LINKDOT.</span>
          <a href={"/dots/" + operationalSlug(actor)}>Trabajar con Director →</a>
        </footer>
      </article>
    );
  }

  return (
    <article className="cc-actor-card">
      <header>
        <div className="cc-actor-avatar">{shortActorName(actor).slice(0, 2).toUpperCase()}</div>
        <div><span className="cc-eyebrow">LINKDOT · {actorArea(actor)}</span><h2>{shortActorName(actor)}</h2></div>
        <Status value={actor.runtimeState?.mode || actor.metadata?.autonomy_mode || actor.status} />
      </header>

      <div className="cc-role-story">
        <div>
          <small>RECIBE</small>
          <p>{actorEntry(actor)}</p>
        </div>
        <div className="is-main">
          <small>SU TRABAJO</small>
          <p>{actorResponsibility(actor)}</p>
        </div>
        <div>
          <small>ENTREGA</small>
          <p>{actorExit(actor)}</p>
        </div>
      </div>

      <div className="cc-actor-now">
        <small>AHORA</small>
        <b>{current?.title || "Sin misión activa"}</b>
        <span>{current ? humanStatus(current.status) : "Disponible"}</span>
      </div>

      <footer>
        <span>{subdots.length} especialista{subdots.length === 1 ? "" : "s"}</span>
        <a href={"/dots/" + operationalSlug(actor)}>Trabajar con {shortActorName(actor)} →</a>
      </footer>
    </article>
  );
}

function WorkView({ actors, allAgents, summary, loading }: { actors: AgentRecord[]; allAgents: AgentRecord[]; summary: any; loading: boolean }) {
  const missions = summary?.agentMissions || [];
  const active = missions.filter((mission: any) => ["approved", "active", "blocked", "waiting_evidence"].includes(String(mission.status)));
  const legacyTasks = summary?.tasks || [];
  return (
    <section className="cc-stack">
      <Intro eyebrow="INTERVENCIONES" title="Qué necesita una célula para avanzar" text="Aquí sólo debe aparecer trabajo que destraba o mejora una célula. El LINKDOT es responsable de facilitar la etapa; la misión económica del negocio manda." />
      <div className="cc-work-columns">
        {actors.map((actor) => {
          const actorMissions = active.filter((mission: any) => actorForSlug(mission.assigned_agent_slug || mission.created_by_agent, allAgents)?.id === actor.id);
          return (
            <section className="cc-work-column cc-card" key={actor.id}>
              <header><div><span className="cc-actor-pip" /><b>{shortActorName(actor)}</b></div><span>{actorMissions.length}</span></header>
              <div>
                {actorMissions.map((mission: any) => (
                  <a href={"/dots/" + operationalSlug(actor)} key={mission.id} className="cc-mission-card">
                    <Status value={mission.status} /><h3>{mission.title}</h3><p>{mission.problem_statement || mission.diagnosis || "Sin explicación adicional."}</p>
                    <small>{mission.mission_code || "Misión"} · prioridad {mission.priority ?? "—"}</small>
                  </a>
                ))}
                {!actorMissions.length ? <span className="cc-column-empty">Sin misión activa</span> : null}
              </div>
            </section>
          );
        })}
      </div>
      <section className="cc-card">
        <Head eyebrow="COMPROMISOS" title="Trabajo con fecha ligado a la operación" note="Sólo importa si sostiene una entrega, cierre, evidencia o siguiente movimiento de una célula." />
        <div className="cc-table">
          {legacyTasks.map((task: any) => <div key={task.id}><b>{task.title}</b><span>{task.client || "Personal"}</span><Status value={task.status} /><span>{when(task.dueAt)}</span></div>)}
          {!legacyTasks.length && !loading ? <Empty>No hay tareas de negocio abiertas. Esto no significa que los LINKDOT estén sin trabajo.</Empty> : null}
        </div>
      </section>
    </section>
  );
}

function SpacesView({ allAgents, summary, loading }: { actors: AgentRecord[]; allAgents: AgentRecord[]; summary: any; loading: boolean }) {
  const workspaces = summary?.dotWorkspaces || [];
  const subdots = summary?.dotSubdots || [];
  const artifacts = summary?.dotArtifacts || [];
  return (
    <section className="cc-stack">
      <Intro eyebrow="ESPACIOS" title="Dónde trabaja cada actor" text="Un espacio es la casa de un contexto de trabajo. Dentro viven sus especialistas y artefactos." />
      <div className="cc-space-grid">
        {workspaces.map((space: any) => {
          const owner = actorForSlug(space.owner_linkdot_slug || space.owner_director_slug, allAgents);
          const spaceSubdots = subdots.filter((item: any) => item.workspace_id === space.id);
          const spaceArtifacts = artifacts.filter((item: any) => item.workspace_id === space.id);
          return (
            <article className="cc-space-card" key={space.id}>
              <div className="cc-space-icon">▢</div>
              <header><div><span className="cc-eyebrow">{owner ? shortActorName(owner) : "LINK"}</span><h2>{space.name}</h2></div><Status value={space.status} /></header>
              <p>{space.description || "Espacio registrado sin descripción."}</p>
              <div className="cc-space-meta"><span>{spaceSubdots.length} especialista{spaceSubdots.length === 1 ? "" : "s"}</span><span>{spaceArtifacts.length} artefacto{spaceArtifacts.length === 1 ? "" : "s"}</span></div>
              {spaceArtifacts.length ? <div className="cc-space-tools">{spaceArtifacts.slice(0, 4).map((artifact: any) => <span key={artifact.id}>{artifact.name}</span>)}</div> : null}
              <footer>{owner ? <a href={"/dots/" + operationalSlug(owner)}>Ver con {shortActorName(owner)} →</a> : null}{space.route ? <a href={space.route}>Abrir espacio ↗</a> : null}</footer>
            </article>
          );
        })}
        {!workspaces.length && !loading ? <Empty>No hay espacios LINKDOT registrados.</Empty> : null}
      </div>
    </section>
  );
}

function WorkspaceStrip({ summary, actors }: { summary: any; actors: AgentRecord[] }) {
  const workspaces = summary?.dotWorkspaces || [];
  const artifacts = summary?.dotArtifacts || [];
  return (
    <div className="cc-workspace-strip">
      {workspaces.slice(0, 6).map((space: any) => {
        const owner = actors.find((actor) => operationalSlug(actor) === space.owner_linkdot_slug);
        const count = artifacts.filter((item: any) => item.workspace_id === space.id).length;
        return (
          <a key={space.id} href={owner ? "/dots/" + operationalSlug(owner) : space.route || "#"}>
            <span className="cc-space-icon small">▢</span><div><b>{space.name}</b><small>{owner ? shortActorName(owner) : "LINK"} · {count} artefactos</small></div><em>→</em>
          </a>
        );
      })}
      {!workspaces.length ? <Empty>No hay espacios disponibles.</Empty> : null}
    </div>
  );
}

function BusinessesView({ summary, loading }: { summary: any; loading: boolean }) {
  return (
    <section className="cc-stack">
      <Intro
        eyebrow="CÉLULAS ECONÓMICAS"
        title="Controlar crecimiento negocio por negocio"
        text="Cada negocio se mira desde arriba: misión, modelo, evidencia económica, Concha y siguiente movimiento. Los LINKDOT entran como participantes y facilitadores cuando una etapa necesita ayuda."
      />
      <section className="cc-card cc-flow-health-card">
        <Head
          eyebrow="PORTAFOLIO VIVO"
          title="Células, misión y crecimiento"
          note="No mostramos handoffs como producto final. Mostramos qué debe mejorar cada célula y qué evidencia falta para avanzar."
        />
        <BusinessFlowHealth />
      </section>
      {!loading && !(summary?.world?.nodes || []).some((node: any) => node.entity_type === "business")
        ? <Empty>No hay negocios visibles en LINK WORLD.</Empty>
        : null}
    </section>
  );
}

function ConversationsView({ allAgents, summary, loading }: { allAgents: AgentRecord[]; summary: any; loading: boolean }) {
  const sessions = summary?.dotSessions || [];
  return (
    <section className="cc-stack">
      <Intro eyebrow="CONVERSACIONES" title="Los asuntos que los actores recuerdan" text="Una conversación mantiene el contexto. No es una misión ni una tarea: es el hilo donde el actor recuerda de qué estamos hablando." />
      <div className="cc-chat-list">
        {sessions.map((session: any) => {
          const meta = session.metadata || {};
          const actor = actorForSlug(meta.agent_slug || meta.dot_slug, allAgents);
          return (
            <article key={session.id}><span className="cc-chat-icon">◌</span><div><h3>{session.title || "Conversación sin título"}</h3><p>{actor ? shortActorName(actor) : meta.agent_slug || meta.dot_slug || "LINK"} · {session.channel || "LINK"}</p><small>Última actividad {when(session.updated_at)}</small></div>{actor ? <a href={"/dots/" + operationalSlug(actor)}>Abrir actor →</a> : null}</article>
          );
        })}
        {!sessions.length && !loading ? <Empty>No hay conversaciones persistentes registradas todavía.</Empty> : null}
      </div>
    </section>
  );
}

function CalendarView({ summary, loading }: { summary: any; loading: boolean }) {
  const tasks = summary?.tasks || [];
  const groups = tasks.reduce((acc: Record<string, any[]>, task: any) => {
    const key = task.dueAt ? new Date(task.dueAt).toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" }) : "Sin fecha";
    (acc[key] ||= []).push(task);
    return acc;
  }, {});
  return (
    <section className="cc-stack">
      <Intro eyebrow="CALENDARIO" title="Qué tiene fecha" text="Solo aparece trabajo que realmente tiene una fecha registrada." />
      <div className="cc-calendar">
        {Object.entries(groups).map(([day, items]) => (
          <section className="cc-card" key={day}><h2>{day}</h2><div className="cc-simple-list">{(items as any[]).map((task) => <div className="cc-static-row" key={task.id}><span className="cc-list-dot" /><div><b>{task.title}</b><small>{task.client || "Personal"} · {when(task.dueAt)}</small></div><Status value={task.status} /></div>)}</div></section>
        ))}
        {!tasks.length && !loading ? <Empty>No hay trabajo con fecha registrado.</Empty> : null}
      </div>
    </section>
  );
}

function EvidenceView({ allAgents, summary, loading }: { allAgents: AgentRecord[]; summary: any; loading: boolean }) {
  const evidence = summary?.agentEvidence || [];
  const wakes = (summary?.agentWakeEvidence || []).filter((wake: any) => !wake.recovered);
  const commands = summary?.agentActions || [];
  const waiting = commands.filter((row: any) => row.requires_approval && row.approval_status === "pending");
  return (
    <section className="cc-stack">
      <Intro eyebrow="EVIDENCIA" title="Qué ocurrió de verdad" text="Esta sección existe para comprobar el trabajo. Primero mostramos el significado y dejamos la ingeniería para diagnóstico." />
      {waiting.length ? (
        <section className="cc-card is-attention"><Head eyebrow="ESPERA TU DECISIÓN" title="Acciones por aprobar" /><div className="cc-simple-list">{waiting.map((command: any) => <div className="cc-static-row" key={command.id}><span className="cc-list-dot is-warn" /><div><b>{command.action_key || command.command_type}</b><small>{actorLabelForSlug(command.actor, allAgents)} · solicitada {when(command.requested_at)}</small></div><Status value={command.approval_status} /></div>)}</div></section>
      ) : null}
      <div className="cc-two">
        <section className="cc-card"><Head eyebrow="PRUEBAS" title="Evidencia de misiones" /><div className="cc-simple-list">{evidence.slice(0, 20).map((item: any) => <div className="cc-static-row" key={item.id}><span className="cc-list-dot" /><div><b>{item.description || item.requirement_key}</b><small>{item.evidence_type || "evidencia"} · {when(item.validated_at || item.received_at || item.requested_at)}</small></div><Status value={item.status} /></div>)}{!evidence.length && !loading ? <Empty>No hay evidencia de misiones registrada.</Empty> : null}</div></section>
        <section className="cc-card"><Head eyebrow="ACTIVIDAD" title="Últimas acciones de los actores" /><div className="cc-simple-list">{wakes.slice(0, 12).map((wake: any) => <div className="cc-static-row" key={wake.id}><span className="cc-list-dot" /><div><b>{actorLabelForSlug(wake.agentSlug, allAgents)}</b><small>{plainWake(wake)} · {when(wake.occurredAt)}</small></div><Status value={wake.eventType === "AGENT_WAKE_FAILED" ? "blocked" : "completed"} /></div>)}{!wakes.length && !loading ? <Empty>No hay actividad reciente de actores.</Empty> : null}</div></section>
      </div>
    </section>
  );
}

function ConnectionsView({ summary, loading }: { summary: any; loading: boolean }) {
  const services = summary?.services || [];
  return (
    <section className="cc-stack">
      <Intro eyebrow="CONEXIONES" title="Con qué sistemas trabaja LINK" text="Solo mostramos conexiones que Control Central puede verificar." />
      <div className="cc-connection-grid">
        {services.map((service: any) => <article key={service.key}><span className={"cc-source-dot" + (service.status === "connected" ? "" : " is-warn")} /><div><h2>{service.label}</h2><p>{service.role}</p><small>{service.detail}</small></div><Status value={service.status} /></article>)}
        {!services.length && !loading ? <Empty>No hay conexiones reportadas.</Empty> : null}
      </div>
    </section>
  );
}

function SystemView({ actors, summary, loading }: { actors: AgentRecord[]; summary: any; loading: boolean }) {
  const readiness = summary?.readiness || {};
  return (
    <section className="cc-stack">
      <Intro eyebrow="SISTEMA" title="La parte técnica" text="Aquí dejamos lo que sostiene a LINK por debajo. No necesitas esta sección para trabajar día a día con un DOT." />
      <div className="cc-two">
        <section className="cc-card"><Head eyebrow="SALUD" title="Capacidades disponibles" /><div className="cc-simple-list">{Object.entries(readiness).map(([key, value]) => <div className="cc-static-row" key={key}><span className={"cc-source-dot" + (value ? "" : " is-warn")} /><div><b>{friendlyReadiness(key)}</b><small>{key}</small></div><span>{value ? "Disponible" : "Pendiente"}</span></div>)}{!Object.keys(readiness).length && !loading ? <Empty>No hay información de salud.</Empty> : null}</div></section>
        <section className="cc-card"><Head eyebrow="DATOS" title="Qué sostiene esta experiencia" /><div className="cc-system-facts"><div><small>Actores principales</small><b>{actors.length}</b></div><div><small>Misiones registradas</small><b>{summary?.agentMissions?.length || 0}</b></div><div><small>Espacios DOT</small><b>{summary?.dotWorkspaces?.length || 0}</b></div><div><small>Artefactos</small><b>{summary?.dotArtifacts?.length || 0}</b></div><div><small>Conversaciones</small><b>{summary?.dotSessions?.length || 0}</b></div><div><small>Comandos</small><b>{summary?.agentActions?.length || 0}</b></div></div></section>
      </div>
      <section className="cc-card"><Head eyebrow="REGLA" title="Arquitectura abajo, trabajo arriba" /><p className="cc-body">Supabase, runtime, permisos, command bus, event bus, handoffs y conectores siguen funcionando como antes. Control Central solo cambia la forma de explicarlos: primero muestra actores, trabajo y contexto; la ingeniería queda disponible aquí para diagnóstico.</p></section>
    </section>
  );
}

function Head({ eyebrow, title, note }: { eyebrow: string; title: string; note?: string }) {
  return <header className="cc-head"><div><span className="cc-eyebrow">{eyebrow}</span><h2>{title}</h2></div>{note ? <p>{note}</p> : null}</header>;
}

function Intro({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <header className="cc-intro"><span className="cc-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{text}</p></header>;
}

function dotHrefForSlug(slug: string | null | undefined, agents: AgentRecord[]) {
  const actor = actorForSlug(slug, agents);
  return actor ? "/dots/" + operationalSlug(actor) : "#";
}

function plainWake(wake: any) {
  if (wake.eventType === "AGENT_WAKE_FAILED") return wake.reason || "Intentó actuar y falló";
  if (wake.actionKey) return "Propuso: " + String(wake.actionKey).replaceAll(".", " ");
  if (wake.decision) return wake.decision;
  return "Revisó una señal del sistema";
}

function friendlyReadiness(key: string) {
  const map: Record<string, string> = {
    dashboardFoundation: "Base de Control Central",
    deepMemory: "Memoria profunda",
    crmBridge: "Puente con CRM",
    actionRegistry: "Registro de acciones",
    clientIntakeEnabled: "Ingreso de clientes",
    calendarWorkspace: "Calendario de trabajo",
    linkWorldBridge: "Puente con LINK WORLD",
  };
  return map[key] || key;
}
