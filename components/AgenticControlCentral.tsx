"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AgentActionConsole from "@/components/AgentActionConsole";

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
  | "Agentes"
  | "Negocios"
  | "Trabajo"
  | "Calendario"
  | "Actividad"
  | "Integraciones"
  | "Sistema";

const NAV: Array<{ id: Section; icon: string; hint: string }> = [
  { id: "Inicio", icon: "home", hint: "Resumen vivo" },
  { id: "Agentes", icon: "spark", hint: "Equipo agéntico" },
  { id: "Negocios", icon: "grid", hint: "Células y clientes" },
  { id: "Trabajo", icon: "check", hint: "Trabajo en curso" },
  { id: "Calendario", icon: "calendar", hint: "Tiempo y próximos hitos" },
  { id: "Actividad", icon: "pulse", hint: "Eventos verificables" },
  { id: "Integraciones", icon: "link", hint: "Sistemas conectados" },
  { id: "Sistema", icon: "settings", hint: "Salud y capacidad" },
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
  if (name === "spark") return <svg {...common}><path d="m12 2 1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5L12 2Z"/><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z"/></svg>;
  if (name === "grid") return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>;
  if (name === "check") return <svg {...common}><path d="M9 11.5 11 14l4.5-5"/><rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 7h8M8 17h8"/></svg>;
  if (name === "calendar") return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>;
  if (name === "pulse") return <svg {...common}><path d="M3 12h4l2-6 4 12 2-6h6"/></svg>;
  if (name === "link") return <svg {...common}><path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1"/></svg>;
  if (name === "settings") return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.7-1L14.5 3h-5l-.3 3.1a8 8 0 0 0-1.7 1l-2.4-1-2 3.4L5.1 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 1.7 1l.3 3.1h5l.3-3.1a8 8 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z"/></svg>;
  if (name === "menu") return <svg {...common}><path d="M4 7h16M4 12h16M4 17h16"/></svg>;
  if (name === "panel") return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/></svg>;
  if (name === "refresh") return <svg {...common}><path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M6.1 8.5A7 7 0 0 1 18 7l2 5M4 12l2 5a7 7 0 0 0 11.9-1.5"/></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="8"/></svg>;
}

function when(value?: string | null) {
  if (!value) return "Sin fecha";
  try {
    return new Intl.DateTimeFormat("es-CL", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function dayKey(value?: string | null) {
  if (!value) return "Sin fecha";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
}

function wakeActionLabel(value?: string | null) {
  const map: Record<string, string> = {
    "stage.diagnosis.record": "registró un diagnóstico",
    "mission.create": "propuso crear una misión",
    "agent.assign": "propuso asignar un agente",
    "evidence.request": "pidió evidencia",
    "stage.escalate": "propuso escalar",
    "stage.block_scale": "propuso bloquear escala",
    "stage.verify": "propuso verificar una etapa",
  };
  return map[value || ""] || value || "sin acción";
}

function wakeStateLabel(value?: string | null) {
  if (value === "AGENT_WAKE_PROPOSED") return "DESPERTÓ";
  if (value === "AGENT_WAKE_NOOP") return "DESPERTÓ · OBSERVÓ";
  if (value === "AGENT_WAKE_FAILED") return "INTENTO FALLIDO";
  return value || "EVENTO";
}

function operatingStateLabel(value?: string | null) {
  const map: Record<string, string> = {
    watching: "Vigilando",
    working: "En misión",
    queued: "En cola",
    processing: "Trabajando",
    waiting_approval: "Espera aprobación",
    retry_wait: "Reintento programado",
    blocked: "Bloqueado",
    idle: "En espera",
  };
  return map[value || ""] || value || "—";
}

function operatingStateRank(value?: string | null) {
  const rank: Record<string, number> = {
    blocked: 90,
    waiting_approval: 80,
    processing: 70,
    queued: 60,
    retry_wait: 50,
    working: 40,
    watching: 20,
    idle: 10,
  };
  return rank[value || ""] || 0;
}

function dotKind(agent: AgentRecord) {
  if (agent.metadata?.agent_kind === "linksubdot") return "LINKSUBDOT";
  if (agent.metadata?.agent_kind === "linkdot") return "LINKDOT";
  return "AGENTE";
}

function dotOperationalSlug(agent: AgentRecord) {
  return agent.metadata?.dot_slug || agent.slug;
}

function humanStatus(value?: string | null) {
  const map: Record<string, string> = {
    planned: "Pendiente",
    scheduled: "En producción",
    completed: "Cumplido",
    active: "Activo",
    connected: "Conectado",
    warning: "Atención",
    pending: "Pendiente",
    processing: "Procesando",
    success: "Correcto",
    shadow: "SHADOW",
  };
  return map[value || ""] || value || "—";
}

export default function AgenticControlCentral({
  initialAgents,
}: {
  initialAgents: AgentRecord[];
}) {
  const [section, setSection] = useState<Section>("Inicio");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(
    initialAgents[0]?.id || null,
  );
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const storedSection = window.localStorage.getItem("link-control-section") as Section | null;
      if (storedSection && NAV.some((item) => item.id === storedSection)) setSection(storedSection);
      const storedAgent = window.localStorage.getItem("link-control-agent");
      if (storedAgent && initialAgents.some((item) => item.id === storedAgent)) setSelectedAgent(storedAgent);
      const storedSidebar = window.localStorage.getItem("link-control-sidebar-collapsed");
      if (storedSidebar === "true") setCollapsed(true);
    } catch {
      // Local persistence is optional; Supabase remains the source of truth.
    }
  }, [initialAgents]);

  useEffect(() => {
    try { window.localStorage.setItem("link-control-section", section); } catch {}
  }, [section]);

  useEffect(() => {
    try { window.localStorage.setItem("link-control-sidebar-collapsed", String(collapsed)); } catch {}
  }, [collapsed]);

  useEffect(() => {
    if (!selectedAgent) return;
    try { window.localStorage.setItem("link-control-agent", selectedAgent); } catch {}
  }, [selectedAgent]);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/system-summary", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "No se pudo leer CONTROL CENTRAL");
      setSummary(payload);
      setError("");
    } catch (err: any) {
      setError(err?.message || "No se pudo leer CONTROL CENTRAL");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const agent = useMemo(
    () => initialAgents.find((item) => item.id === selectedAgent) || initialAgents[0] || null,
    [initialAgents, selectedAgent],
  );

  function go(next: Section) {
    setSection(next);
    setMobileOpen(false);
  }

  return (
    <div className={"agentic-shell" + (collapsed ? " is-collapsed" : "")}>
      <button
        className={"agentic-scrim" + (mobileOpen ? " is-visible" : "")}
        aria-label="Cerrar menú"
        onClick={() => setMobileOpen(false)}
      />

      <aside className={"agentic-sidebar" + (mobileOpen ? " is-mobile-open" : "")}>
        <div className="agentic-brand">
          <div className="agentic-mark">L</div>
          <div className="agentic-brand-copy">
            <b>LINK</b>
            <span>CONTROL CENTRAL</span>
          </div>
          <button
            className="icon-button agentic-collapse"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Abrir menú lateral" : "Cerrar menú lateral"}
            title={collapsed ? "Abrir menú lateral" : "Cerrar menú lateral"}
          >
            <Icon name="panel" />
          </button>
        </div>

        <div className="agentic-sidebar-scroll">
          <nav className="agentic-nav" aria-label="Secciones de CONTROL CENTRAL">
            {NAV.map((item) => (
              <button
                key={item.id}
                className={section === item.id ? "is-active" : ""}
                onClick={() => go(item.id)}
                title={collapsed ? item.id : undefined}
              >
                <Icon name={item.icon} />
                <span>
                  <b>{item.id}</b>
                  <small>{item.hint}</small>
                </span>
              </button>
            ))}
            <a
              className="agentic-guide-link"
              href="/linkguide"
              title={collapsed ? "LINK Guide" : undefined}
            >
              <Icon name="grid" />
              <span>
                <b>LINK Guide</b>
                <small>Mapa y direcciones</small>
              </span>
            </a>
          </nav>

          <div className="agentic-sidebar-section">
            <div className="agentic-sidebar-label">LINKDOTS</div>
            {initialAgents.length ? (
              initialAgents.map((item) => (
                <button
                  key={item.id}
                  className={
                    "agentic-agent-nav" +
                    (section === "Agentes" && selectedAgent === item.id ? " is-active" : "")
                  }
                  onClick={() => {
                    setSelectedAgent(item.id);
                    go("Agentes");
                  }}
                  title={collapsed ? item.name : undefined}
                >
                  <span className="live-dot" />
                  <span>
                    <b>{item.name}</b>
                    <small>{humanStatus(item.runtimeState?.mode || item.metadata?.autonomy_mode)}</small>
                  </span>
                </button>
              ))
            ) : (
              <div className="agentic-empty-mini">Sin agentes registrados</div>
            )}
          </div>
        </div>

        <div className="agentic-sidebar-footer">
          <span className="live-dot" />
          <div>
            <b>LINK CONTROL CENTRAL</b>
            <small>{error ? "Con atención" : "Fuente viva conectada"}</small>
          </div>
        </div>
      </aside>

      <main className="agentic-main">
        <header className="agentic-topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="Abrir menú"
            onClick={() => setMobileOpen(true)}
          >
            <Icon name="menu" />
          </button>
          <div className="agentic-breadcrumb">
            <small>CONTROL CENTRAL / LINKDOT OS</small>
            <b>{section}</b>
          </div>
          <button className="sync-button" onClick={() => void loadSummary()} disabled={loading}>
            <Icon name="refresh" />
            <span>{loading ? "Leyendo…" : "Sincronizar"}</span>
          </button>
        </header>

        <div className="agentic-canvas">
          {error ? (
            <div className="agentic-alert">
              <b>No pudimos leer el estado operacional completo.</b>
              <span>{error}</span>
            </div>
          ) : null}

          {section === "Inicio" && (
            <HomePanel agents={initialAgents} summary={summary} loading={loading} openAgent={(id) => {
              setSelectedAgent(id);
              go("Agentes");
            }} />
          )}
          {section === "Agentes" && (
            <AgentsPanel agents={initialAgents} agent={agent} select={setSelectedAgent} summary={summary} />
          )}
          {section === "Negocios" && <BusinessesPanel summary={summary} loading={loading} />}
          {section === "Trabajo" && <WorkPanel summary={summary} loading={loading} />}
          {section === "Calendario" && <CalendarPanel summary={summary} loading={loading} />}
          {section === "Actividad" && <ActivityPanel summary={summary} loading={loading} />}
          {section === "Integraciones" && <IntegrationsPanel summary={summary} loading={loading} />}
          {section === "Sistema" && <SystemPanel summary={summary} agents={initialAgents} loading={loading} />}
        </div>
      </main>
    </div>
  );
}

function HomePanel({
  agents,
  summary,
  loading,
  openAgent,
}: {
  agents: AgentRecord[];
  summary: any;
  loading: boolean;
  openAgent: (id: string) => void;
}) {
  const tasks = summary?.tasks || [];
  const clients = summary?.clients || [];
  const operating = summary?.agentOperatingState || [];
  const wakeEvidence = (summary?.agentWakeEvidence || []).filter(
    (wake: any) => wake.eventType === "AGENT_WAKE_PROPOSED" || wake.eventType === "AGENT_WAKE_NOOP",
  );
  const awakeSlugs = new Set(wakeEvidence.map((wake: any) => wake.agentSlug).filter(Boolean));
  return (
    <section className="panel-stack">
      <div className="hero-card">
        <div>
          <div className="eyebrow">LINK · CONTROL CENTRAL</div>
          <h1>Trabajo agéntico, en un solo lugar.</h1>
          <p>
            Esta es la sucursal donde observamos agentes, negocios, trabajo y evidencia
            sin duplicar la realidad que vive en Supabase.
          </p>
        </div>
        <div className="hero-live">
          <span className="live-dot" />
          <b>{awakeSlugs.size ? `${awakeSlugs.size} agente${awakeSlugs.size === 1 ? "" : "s"} despertaron` : `${agents.length} agentes registrados`}</b>
          <small>{loading ? "Leyendo sistema…" : wakeEvidence[0] ? `Último despertar · ${when(wakeEvidence[0].occurredAt)}` : "Estado vivo"}</small>
        </div>
      </div>

      <div className="metric-grid">
        <Metric label="Agentes" value={agents.length} accent />
        <Metric label="Negocios / clientes" value={summary?.metrics?.clients ?? "—"} />
        <Metric label="Trabajo abierto" value={tasks.length || summary?.operational?.tasksOpen || 0} />
        <Metric label="Comandos pendientes" value={summary?.metrics?.pendingCommands ?? "—"} />
      </div>

      <div className="workspace-grid">
        <section className="surface span-2">
          <SectionHead
            eyebrow="FOCO PERSISTENTE"
            title="Quién se ocupa de qué"
            note="Supabase conserva territorio, misión, cola y próximo foco aunque cierres el panel."
          />
          <div className="compact-list">
            {agents.map((item) => {
              const scopes = operating
                .filter((row: any) => row.agent_slug === item.slug)
                .sort((a: any, b: any) =>
                  (operatingStateRank(b.state) - operatingStateRank(a.state)) ||
                  (Number(b.priority || 0) - Number(a.priority || 0))
                );
              const focus = scopes[0];
              return (
                <div className="compact-row" key={item.slug}>
                  <span className={"status-pip" + (focus?.state !== "blocked" ? " on" : "")} />
                  <div>
                    <b>{item.name} · {operatingStateLabel(focus?.state)}</b>
                    <small>
                      {focus
                        ? `${focus.business_name || "LINK"} · ${focus.stage_name || "Transversal"} → ${focus.current_focus}`
                        : "Sin territorio persistido"}
                    </small>
                  </div>
                  <span className="state-pill">{Number(focus?.queued_count || 0) + Number(focus?.waiting_approval_count || 0)} pendientes</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="surface span-2">
          <SectionHead
            eyebrow="PRUEBA DE VIDA"
            title="Despertares reales"
            note="Cada fila existe porque Vercel ejecutó un agente y escribió evidencia en Supabase."
          />
          <div className="compact-list">
            {wakeEvidence.slice(0, 6).map((wake: any) => {
              const agentName = agents.find((item) => item.slug === wake.agentSlug)?.name || wake.agentSlug || "Agente";
              return (
                <div className="compact-row" key={wake.id}>
                  <span className="status-pip on" />
                  <div>
                    <b>{agentName} · {wakeStateLabel(wake.eventType)}</b>
                    <small>
                      {wake.sourceEventType || "señal"} → {wakeActionLabel(wake.actionKey)}
                      {" · "}{when(wake.occurredAt)}
                      {wake.approvalStatus ? ` · aprobación: ${humanStatus(wake.approvalStatus)}` : ""}
                    </small>
                  </div>
                </div>
              );
            })}
            {!wakeEvidence.length && !loading && <Empty text="Todavía no hay un despertar exitoso registrado." />}
          </div>
        </section>

        <section className="surface span-2">
          <SectionHead eyebrow="EQUIPO" title="LINKDOTS en turno" note="Responsabilidades persistentes y sus subagentes especializados." />
          <div className="agent-card-grid">
            {agents.map((item) => (
              <button className="agent-card" key={item.id} onClick={() => openAgent(item.id)}>
                <div className="agent-card-head">
                  <span className="agent-avatar">{item.name.slice(0, 2).toUpperCase()}</span>
                  <span className="agent-state"><i className="live-dot" />{humanStatus(item.status)}</span>
                </div>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
                <div className="agent-card-meta">
                  <span>{dotKind(item)}</span>
                  <span>{dotOperationalSlug(item)}</span>
                  <span>{item.capabilities.length} capacidades</span>
                </div>
              </button>
            ))}
            {!agents.length && <Empty text="Todavía no hay agentes registrados." />}
          </div>
        </section>

        <section className="surface">
          <SectionHead eyebrow="ATENCIÓN" title="Trabajo próximo" note="Señales operativas reales." />
          <div className="compact-list">
            {tasks.slice(0, 7).map((task: any) => (
              <div className="compact-row" key={task.id}>
                <span className="status-pip" data-status={task.status} />
                <div><b>{task.title}</b><small>{task.client || "Personal"} · {when(task.dueAt)}</small></div>
              </div>
            ))}
            {!tasks.length && !loading && <Empty text="No hay trabajo abierto." />}
          </div>
        </section>

        <section className="surface">
          <SectionHead eyebrow="CÉLULAS" title="Negocios activos" note="Vista rápida del organismo." />
          <div className="compact-list">
            {clients.slice(0, 7).map((client: any) => (
              <div className="compact-row" key={client.id}>
                <span className="business-badge">{String(client.name || "?").slice(0, 1)}</span>
                <div><b>{client.name}</b><small>{client.stage || "Sin etapa"} · {client.gestureCount || 0} trabajos</small></div>
              </div>
            ))}
            {!clients.length && !loading && <Empty text="No hay negocios activos." />}
          </div>
        </section>
      </div>
    </section>
  );
}

function AgentsPanel({
  agents,
  agent,
  select,
  summary,
}: {
  agents: AgentRecord[];
  agent: AgentRecord | null;
  select: (id: string) => void;
  summary: any;
}) {
  const [mode, setMode] = useState<"production" | "agent">("production");
  if (!agents.length) return <EmptyPage title="Agentes" text="No hay agentes reales registrados todavía." />;

  return (
    <section className="panel-stack">
      <div className="agent-view-switch">
        <button className={mode === "production" ? "is-active" : ""} onClick={() => setMode("production")}>
          Producción
        </button>
        <button className={mode === "agent" ? "is-active" : ""} onClick={() => setMode("agent")}>
          Ficha del agente
        </button>
        <a href="https://link-world-delta.vercel.app/?space=micelio&view=processes" target="_blank" rel="noopener noreferrer">
          Ver Micelio ↗
        </a>
      </div>

      {mode === "production" ? (
        <AgentProductionBoard agents={agents} summary={summary} selectAgent={(id) => { select(id); setMode("agent"); }} />
      ) : (
        <section className="agents-layout">
          <aside className="agent-index surface">
            <SectionHead eyebrow="LINKDOT OS" title="Equipo LINK" note="LINKDOT mantiene un área; LINKSUBDOT recibe trabajo especializado por delegación." />
            {agents.map((item) => (
              <button
                key={item.id}
                className={"agent-index-row" + (agent?.id === item.id ? " is-active" : "")}
                onClick={() => select(item.id)}
              >
                <span className="agent-avatar small">{item.name.slice(0, 2).toUpperCase()}</span>
                <span><b>{item.name}</b><small>{dotKind(item)} · {dotOperationalSlug(item)}</small></span>
                <span className="live-dot" />
              </button>
            ))}
          </aside>
          {agent ? <AgentFicha agent={agent} agents={agents} summary={summary} /> : null}
        </section>
      )}
    </section>
  );
}

function trendLabel(value: string) {
  if (value === "improving") return "Mejorando";
  if (value === "declining") return "Empeorando";
  if (value === "flat") return "Sin cambio";
  if (value === "measured") return "Medido";
  return "Sin medición";
}

function parameterValue(observation: any) {
  if (!observation) return "—";
  if (observation.value_numeric != null) return String(observation.value_numeric);
  return observation.value_text || "—";
}

function AgentProductionBoard({
  agents,
  summary,
  selectAgent,
}: {
  agents: AgentRecord[];
  summary: any;
  selectAgent: (id: string) => void;
}) {
  const production = summary?.agentProduction || [];
  const actions = summary?.agentActions || [];
  const bySlug = new Map(production.map((row: any) => [row.agentSlug, row]));
  const [copied, setCopied] = useState("");

  async function copyPrompt(slug: string, prompt: string) {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(slug);
      window.setTimeout(() => setCopied(""), 1600);
    } catch {
      setCopied("");
    }
  }

  const parameters = production.flatMap((row: any) =>
    (row.parameters || []).map((parameter: any) => ({ ...parameter, agentSlug: row.agentSlug })),
  );

  return (
    <>
      <section className="surface agent-production-head">
        <SectionHead
          eyebrow="PRODUCCIÓN AGÉNTICA"
          title="Qué está moviendo el organismo"
          note="Misiones, órdenes, evidencia y parámetros reales. Sin actividad inventada."
        />
        <div className="production-kpis">
          <div><strong>{actions.length}</strong><span>acciones registradas</span></div>
          <div><strong>{production.reduce((sum: number, row: any) => sum + Number(row.missions?.active || 0), 0)}</strong><span>misiones activas</span></div>
          <div><strong>{production.reduce((sum: number, row: any) => sum + Number(row.commands?.pendingApproval || 0), 0)}</strong><span>esperan aprobación</span></div>
          <div><strong>{parameters.filter((row: any) => row.trend === "improving").length}</strong><span>parámetros mejorando</span></div>
        </div>
      </section>

      <section className="surface">
        <SectionHead eyebrow="LINKDOT OS" title="Estado operativo" note="LINKDOT y LINKSUBDOT comparten memoria, permisos, evidencia y cola persistente." />
        <div className="agent-production-table">
          <div className="agent-production-row is-head">
            <span>Agente</span><span>Etapa</span><span>Misión</span><span>Acciones</span><span>Evidencia</span><span>Siguiente movimiento</span>
          </div>
          {agents.map((agent) => {
            const row: any = bySlug.get(agent.slug) || {};
            const current = row.missions?.current;
            return (
              <div className="agent-production-row" key={agent.id}>
                <button className="production-agent-cell" onClick={() => selectAgent(agent.id)}>
                  <span className="agent-avatar small">{agent.name.slice(0, 2).toUpperCase()}</span>
                  <span><b>{agent.name}</b><small>{humanStatus(agent.runtimeState?.mode || agent.metadata?.autonomy_mode)}</small></span>
                </button>
                <span className="production-stage">{row.stageKey || agent.metadata?.stage_key || "transversal"}</span>
                <span>
                  <b>{current?.title || "Sin misión activa"}</b>
                  <small>{current?.mission_code || "Esperando diagnóstico"}</small>
                </span>
                <span>
                  <b>{row.commands?.total || 0}</b>
                  <small>{row.commands?.pendingApproval || 0} por aprobar</small>
                </span>
                <span>
                  <b>{row.evidence?.validated || 0}</b>
                  <small>{row.evidence?.requestedOrReceived || 0} pendiente(s)</small>
                </span>
                <span className="production-next">
                  <b>{row.suggestion || "Observar y medir."}</b>
                  <button onClick={() => copyPrompt(agent.slug, row.prompt || "")}>
                    {copied === agent.slug ? "Copiado ✓" : "Copiar prompt"}
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="surface">
        <SectionHead eyebrow="PARÁMETROS" title="Qué debe mejorar cada Director" note="Solo mostramos tendencia cuando existen observaciones con evidencia." />
        <div className="parameter-table">
          <div className="parameter-row is-head">
            <span>Director</span><span>Parámetro</span><span>Anterior</span><span>Actual</span><span>Tendencia</span><span>Última señal</span>
          </div>
          {parameters.map((parameter: any) => (
            <div className="parameter-row" key={parameter.id}>
              <span><b>{agents.find((item) => item.slug === parameter.agentSlug)?.name || parameter.agentSlug}</b><small>{parameter.stage_key}</small></span>
              <span><b>{parameter.label}</b><small>{parameter.direction === "down" ? "mejora al bajar" : "mejora al subir"}</small></span>
              <span>{parameterValue(parameter.previous)}</span>
              <span>{parameterValue(parameter.latest)}</span>
              <span><i className={"trend-dot is-" + parameter.trend} />{trendLabel(parameter.trend)}</span>
              <span>{parameter.latest?.observed_at ? when(parameter.latest.observed_at) : "Esperando señal"}</span>
            </div>
          ))}
          {!parameters.length && <Empty text="Todavía no hay parámetros registrados." />}
        </div>
      </section>

      <section className="surface">
        <SectionHead eyebrow="ACCIONES" title="Todo lo que han ordenado" note="Command bus completo de los agentes, de más reciente a más antiguo." />
        <div className="action-ledger">
          <div className="action-ledger-row is-head">
            <span>Fecha</span><span>Agente</span><span>Acción</span><span>Negocio</span><span>Aprobación</span><span>Resultado</span>
          </div>
          {actions.map((action: any) => (
            <div className="action-ledger-row" key={action.id}>
              <span>{when(action.requested_at)}</span>
              <span><b>{agents.find((item) => item.slug === action.actor)?.name || action.actor}</b></span>
              <span><code>{action.action_key}</code></span>
              <span>{action.global_id || "Transversal"}</span>
              <span className="state-pill">{action.approval_status}</span>
              <span><b>{action.status}</b>{action.error ? <small>{action.error}</small> : null}</span>
            </div>
          ))}
          {!actions.length && <Empty text="Todavía no existen acciones de agentes." />}
        </div>
      </section>
    </>
  );
}

function AgentFicha({ agent, agents, summary }: { agent: AgentRecord; agents: AgentRecord[]; summary: any }) {
  const runtime = agent.runtimeState;
  const production = (summary?.agentProduction || []).find((row: any) => row.agentSlug === agent.slug) || {};
  const currentMission = production?.missions?.current || null;
  const parameters = production?.parameters || [];
  const kind = dotKind(agent);
  const operationalSlug = dotOperationalSlug(agent);
  const subdots = agents.filter((item) => item.metadata?.parent_dot === operationalSlug);
  const parentDot = agent.metadata?.parent_dot
    ? agents.find((item) => dotOperationalSlug(item) === agent.metadata?.parent_dot)
    : null;

  return (
    <article className="agent-ficha">
      <header className="agent-ficha-head is-compact">
        <div className="agent-ficha-identity">
          <span className="agent-avatar hero">{agent.name.slice(0, 2).toUpperCase()}</span>
          <div>
            <div className="eyebrow">{kind} · {agent.metadata?.dot_area || agent.metadata?.area || agent.metadata?.stage_key || "DIRECCIÓN"}</div>
            <h1>{agent.name}</h1>
            <p>{agent.description}</p>
          </div>
        </div>
        <div className="agent-ficha-state">
          <span><i className="live-dot" />{humanStatus(agent.status)}</span>
          <b>{humanStatus(runtime?.mode || agent.metadata?.autonomy_mode)}</b>
          <a className="sync-button" href="https://link-world-delta.vercel.app/?space=micelio&view=processes" target="_blank" rel="noopener noreferrer">
            Ver en Micelio ↗
          </a>
        </div>
      </header>

      <div className="metric-grid agent-metrics">
        <Metric label="Misiones activas" value={production?.missions?.active || 0} accent />
        <Metric label="Acciones emitidas" value={production?.commands?.total || 0} />
        <Metric label="Por aprobar" value={production?.commands?.pendingApproval || 0} />
        <Metric label="Evidencias validadas" value={production?.evidence?.validated || 0} />
      </div>

      <div className="agent-detail-grid">
        <section className="surface span-2 current-mission">
          <SectionHead eyebrow="AHORA" title={currentMission?.title || "Sin misión activa"} note={currentMission?.mission_code || "Esperando una restricción verificable."} />
          <p className="body-copy">{currentMission?.problem_statement || production?.suggestion || "El agente todavía no tiene trabajo abierto."}</p>
          <div className="mission-facts">
            <span><small>Etapa</small><b>{production?.stageKey || agent.metadata?.stage_key || "—"}</b></span>
            <span><small>Estado</small><b>{currentMission?.status || "observación"}</b></span>
            <span><small>Evidencia pendiente</small><b>{production?.evidence?.requestedOrReceived || 0}</b></span>
          </div>
        </section>

        {(kind === "LINKDOT" || kind === "LINKSUBDOT") ? (
          <section className="surface span-2">
            <SectionHead
              eyebrow="CONSTITUCIÓN DOT"
              title={kind === "LINKDOT" ? "Responsabilidad y delegación" : "Especialidad delegada"}
              note={operationalSlug}
            />
            <div className="mission-facts">
              <span><small>Tipo</small><b>{kind}</b></span>
              <span><small>Autonomía</small><b>{humanStatus(runtime?.mode || agent.metadata?.autonomy_mode)}</b></span>
              <span><small>Fuente</small><b>{agent.metadata?.source_of_truth || "supabase"}</b></span>
            </div>
            <p className="body-copy">
              {agent.metadata?.responsibility || agent.description}
            </p>
            {agent.metadata?.handoff_boundary ? (
              <p className="body-copy"><b>Límite de entrega:</b> {agent.metadata.handoff_boundary}</p>
            ) : null}
            {kind === "LINKDOT" ? (
              <div className="capability-grid">
                {subdots.map((subdot) => (
                  <div className="capability-card" key={subdot.id}>
                    <div><b>{subdot.name}</b><code>{subdot.slug}</code></div>
                    <p>{subdot.metadata?.responsibility || subdot.description}</p>
                  </div>
                ))}
                {!subdots.length && <Empty text="Este LINKDOT todavía no tiene LINKSUBDOT registrados." />}
              </div>
            ) : parentDot ? (
              <div className="compact-row">
                <span className="live-dot" />
                <div><b>Depende de {parentDot.name}</b><small>{dotOperationalSlug(parentDot)}</small></div>
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="surface span-2 suggestion-card">
          <SectionHead eyebrow="SIGUIENTE MOVIMIENTO" title={production?.suggestion || "Observar y medir"} note="Prompt listo para continuar conmigo." />
          <pre>{production?.prompt || "Todavía no existe una sugerencia operativa."}</pre>
          <button onClick={() => navigator.clipboard.writeText(production?.prompt || "")}>Copiar prompt para ChatGPT</button>
        </section>

        <section className="surface span-2">
          <SectionHead eyebrow="PARÁMETROS" title="Evolución de la etapa" note="No mostramos mejora sin evidencia." />
          <div className="parameter-table compact">
            {parameters.map((parameter: any) => (
              <div className="parameter-row" key={parameter.id}>
                <span><b>{parameter.label}</b><small>{parameter.direction === "down" ? "mejora al bajar" : "mejora al subir"}</small></span>
                <span>{parameterValue(parameter.previous)}</span>
                <span>{parameterValue(parameter.latest)}</span>
                <span><i className={"trend-dot is-" + parameter.trend} />{trendLabel(parameter.trend)}</span>
                <span>{parameter.latest?.observed_at ? when(parameter.latest.observed_at) : "Esperando señal"}</span>
              </div>
            ))}
            {!parameters.length && <Empty text="Este agente no tiene parámetros de etapa definidos." />}
          </div>
        </section>

        <AgentActionConsole
          agentSlug={agent.slug}
          agentName={agent.name}
          stageKey={agent.metadata?.stage_key || null}
          businesses={(summary?.world?.nodes || []).filter((node: any) => node.entity_type === "business")}
        />

        <details className="surface span-2 agent-secondary">
          <summary>Capacidades, memoria y configuración técnica</summary>
          <div className="secondary-grid">
            <section>
              <h3>Capacidades</h3>
              <div className="capability-grid">
                {agent.capabilities.map((capability) => (
                  <div className="capability-card" key={capability.capability_key}>
                    <div><b>{capability.label}</b><code>{capability.capability_key}</code></div>
                    <p>{capability.description || "Sin descripción adicional."}</p>
                  </div>
                ))}
              </div>
            </section>
            <section>
              <h3>Gobierno y runtime</h3>
              <dl className="fact-list">
                <Fact term="Autonomía" value={humanStatus(runtime?.mode || agent.metadata?.autonomy_mode)} />
                <Fact term="Runtime" value={runtime?.runtime || agent.metadata?.runtime || "—"} />
                <Fact term="Activación" value={agent.activationMode || "—"} />
                <Fact term="Gobierno" value={agent.governance?.label || "Sin relación registrada"} />
                <Fact term="Versión" value={agent.version || runtime?.version || "—"} />
              </dl>
            </section>
            <section>
              <h3>Memoria</h3>
              <div className="memory-list">
                {agent.memories.map((memory) => (
                  <div className="memory-row" key={memory.memory_key}>
                    <div><b>{memory.memory_key}</b><small>{memory.kind} · importancia {memory.importance ?? "—"}/5</small></div>
                    <span>{when(memory.updated_at)}</span>
                  </div>
                ))}
                {!agent.memories.length && <Empty text="No hay memorias persistentes visibles." />}
              </div>
            </section>
          </div>
        </details>
      </div>
    </article>
  );
}

function BusinessesPanel({ summary, loading }: { summary: any; loading: boolean }) {
  const clients = summary?.clients || [];
  const worldBusinesses = (summary?.world?.nodes || []).filter((node: any) => node.entity_type === "business");
  return (
    <section className="panel-stack">
      <PageIntro eyebrow="CÉLULAS" title="Negocios y clientes" text="CONTROL CENTRAL y LINK WORLD leen el mismo grafo vivo; no duplicamos la realidad." />
      <section className="surface">
        <SectionHead eyebrow="LINK WORLD" title="Células del organismo" note="Fuente canónica: link_world_businesses + ecosystem_entities." />
        <div className="business-grid">
          {worldBusinesses.map((business: any) => (
            <article className="business-card" key={business.global_id}>
              <div className="business-card-head">
                <span className="business-avatar">{String(business.label || "?").slice(0, 2).toUpperCase()}</span>
                <span className="state-pill">{business.verification_status || business.status || "active"}</span>
              </div>
              <h3>{business.label}</h3>
              <p>{business.slug || business.global_id}</p>
              <div className="business-facts">
                <span><small>Dominio</small><b>{business.owner_domain}</b></span>
                <span><small>Tipo</small><b>{business.entity_type}</b></span>
                <span><small>Estado</small><b>{business.status}</b></span>
              </div>
              <small className="last-line">{business.global_id}</small>
            </article>
          ))}
          {!worldBusinesses.length && !loading && <Empty text="LINK WORLD no reportó negocios al grafo compartido." />}
        </div>
      </section>
      <section className="surface">
        <SectionHead eyebrow="CONTROL CENTRAL" title="Clientes operacionales" note="CRM y trabajo propio de CONTROL CENTRAL." />
        <div className="business-grid">
          {clients.map((client: any) => (
            <article className="business-card" key={client.id}>
              <div className="business-card-head">
                <span className="business-avatar" style={{ borderColor: client.accent || undefined }}>{String(client.name || "?").slice(0, 2).toUpperCase()}</span>
                <span className="state-pill">{client.status || "active"}</span>
              </div>
              <h3>{client.name}</h3>
              <p>{client.strategy?.objective || client.strategy?.approach || "Sin objetivo estratégico registrado."}</p>
              <div className="business-facts">
                <span><small>Etapa</small><b>{client.stage || "—"}</b></span>
                <span><small>Plan</small><b>{client.plan || "—"}</b></span>
                <span><small>Trabajo</small><b>{client.gestureCount || 0}</b></span>
              </div>
              <small className="last-line">Próximo: {when(client.nextGestureAt)}</small>
            </article>
          ))}
          {!clients.length && !loading && <Empty text="No hay clientes operacionales activos." />}
        </div>
      </section>
    </section>
  );
}

function WorkPanel({ summary, loading }: { summary: any; loading: boolean }) {
  const tasks = summary?.tasks || [];
  return (
    <section className="panel-stack">
      <PageIntro eyebrow="TRABAJO" title="Cola operacional" text="Una vista simple de lo que está abierto, sin inventar tareas nuevas." />
      <section className="surface">
        <div className="table-list">
          <div className="table-head"><span>Trabajo</span><span>Negocio</span><span>Estado</span><span>Fecha</span></div>
          {tasks.map((task: any) => (
            <div className="table-row" key={task.id}>
              <b>{task.title}</b>
              <span>{task.client || "Personal"}</span>
              <span className="state-pill">{humanStatus(task.status)}</span>
              <span>{when(task.dueAt)}</span>
            </div>
          ))}
          {!tasks.length && !loading && <Empty text="No hay trabajo abierto." />}
        </div>
      </section>
    </section>
  );
}

function CalendarPanel({ summary, loading }: { summary: any; loading: boolean }) {
  const tasks = summary?.tasks || [];
  const groups = tasks.reduce((acc: Record<string, any[]>, task: any) => {
    const key = dayKey(task.dueAt);
    (acc[key] ||= []).push(task);
    return acc;
  }, {});
  return (
    <section className="panel-stack">
      <PageIntro eyebrow="CALENDARIO" title="Tiempo del organismo" text="Trabajo real agrupado por fecha." />
      <div className="calendar-stream">
        {Object.entries(groups).map(([day, items]) => (
          <section className="calendar-day surface" key={day}>
            <h3>{day}</h3>
            <div>
              {(items as any[]).map((task) => (
                <article key={task.id}>
                  <span className="status-pip" data-status={task.status} />
                  <div><b>{task.title}</b><small>{task.client || "Personal"} · {when(task.dueAt)}</small></div>
                  <span className="state-pill">{humanStatus(task.status)}</span>
                </article>
              ))}
            </div>
          </section>
        ))}
        {!tasks.length && !loading && <Empty text="No hay fechas operacionales registradas." />}
      </div>
    </section>
  );
}

function ActivityPanel({ summary, loading }: { summary: any; loading: boolean }) {
  const events = summary?.recentEvents || [];
  const allWakes = summary?.agentWakeEvidence || [];
  const recoveredFailures = allWakes.filter((wake: any) => wake.eventType === "AGENT_WAKE_FAILED" && wake.recovered);
  const wakes = allWakes.filter((wake: any) => !(wake.eventType === "AGENT_WAKE_FAILED" && wake.recovered));
  return (
    <section className="panel-stack">
      <PageIntro eyebrow="ACTIVIDAD" title="Evidencia reciente" text="Lo que efectivamente entró al bus de eventos." />
      <section className="surface">
        <SectionHead
          eyebrow="AGENTES"
          title="Despertares verificables"
          note={recoveredFailures.length
            ? `Runtime Vercel → Supabase → comando gobernado · ${recoveredFailures.length} fallo(s) antiguos ya recuperados ocultos.`
            : "Runtime Vercel → evidencia Supabase → comando gobernado."}
        />
        <div className="compact-list">
          {wakes.slice(0, 12).map((wake: any) => (
            <div className="compact-row" key={wake.id}>
              <span className={"status-pip" + (wake.eventType === "AGENT_WAKE_PROPOSED" || wake.eventType === "AGENT_WAKE_NOOP" ? " on" : "")} />
              <div>
                <b>{wake.agentSlug || "agente"} · {wakeStateLabel(wake.eventType)}</b>
                <small>
                  {wake.sourceEventType || "señal"} → {wakeActionLabel(wake.actionKey)}
                  {" · "}{when(wake.occurredAt)}
                  {wake.commandId ? ` · comando ${String(wake.commandId).slice(0, 8)}` : ""}
                  {wake.approvalStatus ? ` · ${humanStatus(wake.approvalStatus)}` : ""}
                </small>
              </div>
            </div>
          ))}
          {!wakes.length && !loading && <Empty text="No hay despertares registrados todavía." />}
        </div>
      </section>
      <section className="surface event-stream">
        {events.map((event: any) => (
          <article key={event.id}>
            <span className="event-node" />
            <div><b>{event.event_type}</b><small>{event.source_provider || "core"} · {event.global_id || "sin entidad"}</small></div>
            <time>{when(event.received_at)}</time>
          </article>
        ))}
        {!events.length && !loading && <Empty text="No hay eventos recientes." />}
      </section>
    </section>
  );
}

function IntegrationsPanel({ summary, loading }: { summary: any; loading: boolean }) {
  const services = summary?.services || [];
  return (
    <section className="panel-stack">
      <PageIntro eyebrow="INTEGRACIONES" title="Sistemas conectados" text="Estado reportado por CONTROL CENTRAL." />
      <div className="integration-grid">
        {services.map((service: any) => (
          <article className="integration-card" key={service.key}>
            <div><span className="live-dot" data-state={service.status} /><b>{service.label}</b></div>
            <p>{service.role}</p>
            <small>{service.detail}</small>
          </article>
        ))}
        {!services.length && !loading && <Empty text="No hay servicios reportados." />}
      </div>
    </section>
  );
}

function SystemPanel({
  summary,
  agents,
  loading,
}: {
  summary: any;
  agents: AgentRecord[];
  loading: boolean;
}) {
  const readiness = summary?.readiness || {};
  return (
    <section className="panel-stack">
      <PageIntro eyebrow="SISTEMA" title="Salud de CONTROL CENTRAL" text="Capacidades que ya están conectadas de verdad." />
      <div className="metric-grid">
        <Metric label="Agentes" value={agents.length} accent />
        <Metric label="Cola agéntica" value={summary?.metrics?.agentQueue ?? 0} />
        <Metric label="Por aprobar" value={summary?.metrics?.agentWaitingApproval ?? 0} />
        <Metric label="Bloqueados" value={summary?.metrics?.agentBlocked ?? 0} />
      </div>
      <div className="workspace-grid">
        <section className="surface">
          <SectionHead eyebrow="READINESS" title="Capacidades activas" />
          <div className="readiness-list">
            {Object.entries(readiness).map(([key, value]) => (
              <div key={key}><span className={"status-pip" + (value ? " on" : "")} /><b>{key}</b><small>{value ? "Disponible" : "Pendiente"}</small></div>
            ))}
            {!Object.keys(readiness).length && !loading && <Empty text="Sin información de readiness." />}
          </div>
        </section>
        <section className="surface">
          <SectionHead eyebrow="LÍMITE" title="Qué no toca este panel" />
          <p className="body-copy">
            Este dashboard reorganiza la superficie de trabajo. No modifica por sí mismo
            Supabase, RLS, command bus, event bus, integraciones ni contratos de las aplicaciones.
            Las acciones reales siguen pasando por sus rutas y protocolos existentes.
          </p>
        </section>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return <div className={"metric-card" + (accent ? " is-accent" : "")}><span>{label}</span><strong>{value}</strong></div>;
}

function SectionHead({
  eyebrow,
  title,
  note,
}: {
  eyebrow: string;
  title: string;
  note?: string;
}) {
  return <header className="section-head"><div><small>{eyebrow}</small><h2>{title}</h2></div>{note ? <p>{note}</p> : null}</header>;
}

function PageIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <header className="page-intro"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{text}</p></header>;
}

function Fact({ term, value, mono }: { term: string; value: any; mono?: boolean }) {
  return <div><dt>{term}</dt><dd className={mono ? "mono" : ""}>{String(value ?? "—")}</dd></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

function EmptyPage({ title, text }: { title: string; text: string }) {
  return <section className="empty-page"><div className="eyebrow">CONTROL CENTRAL</div><h1>{title}</h1><p>{text}</p></section>;
}
