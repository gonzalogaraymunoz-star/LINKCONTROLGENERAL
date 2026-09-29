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
        </nav>

        <div className="agentic-sidebar-section">
          <div className="agentic-sidebar-label">AGENTES</div>
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
            <small>CONTROL CENTRAL / SUCURSAL AGÉNTICA</small>
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
          <b>{agents.length} agente{agents.length === 1 ? "" : "s"} registrado{agents.length === 1 ? "" : "s"}</b>
          <small>{loading ? "Leyendo sistema…" : "Estado vivo"}</small>
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
          <SectionHead eyebrow="EQUIPO" title="Agentes en turno" note="Solo habitantes registrados realmente." />
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
                  <span>{humanStatus(item.runtimeState?.mode || item.metadata?.autonomy_mode)}</span>
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
  if (!agents.length) return <EmptyPage title="Agentes" text="No hay agentes reales registrados todavía." />;

  return (
    <section className="agents-layout">
      <aside className="agent-index surface">
        <SectionHead eyebrow="AGENTES" title="Equipo LINK" note="Cada agente tiene misión y límites propios." />
        {agents.map((item) => (
          <button
            key={item.id}
            className={"agent-index-row" + (agent?.id === item.id ? " is-active" : "")}
            onClick={() => select(item.id)}
          >
            <span className="agent-avatar small">{item.name.slice(0, 2).toUpperCase()}</span>
            <span><b>{item.name}</b><small>{humanStatus(item.runtimeState?.mode || item.metadata?.autonomy_mode)}</small></span>
            <span className="live-dot" />
          </button>
        ))}
      </aside>
      {agent ? <AgentFicha agent={agent} summary={summary} /> : null}
    </section>
  );
}

function AgentFicha({ agent, summary }: { agent: AgentRecord; summary: any }) {
  const runtime = agent.runtimeState;
  const latest = agent.activity[0];
  const inputTokens = agent.activity.reduce((sum, item) => sum + Number(item.input_tokens || 0), 0);
  const outputTokens = agent.activity.reduce((sum, item) => sum + Number(item.output_tokens || 0), 0);
  const mutationsAllowed = runtime?.mutatingActionsEnabled === true;

  return (
    <article className="agent-ficha">
      <header className="agent-ficha-head">
        <div className="agent-ficha-identity">
          <span className="agent-avatar hero">{agent.name.slice(0, 2).toUpperCase()}</span>
          <div>
            <div className="eyebrow">FICHA DE AGENTE · {agent.globalId}</div>
            <h1>{agent.name}</h1>
            <p>{agent.description}</p>
          </div>
        </div>
        <div className="agent-ficha-state">
          <span><i className="live-dot" />{humanStatus(agent.status)}</span>
          <b>{humanStatus(runtime?.mode || agent.metadata?.autonomy_mode)}</b>
          <a
            className="sync-button"
            href="https://link-world-delta.vercel.app/?space=micelio&view=processes"
            target="_blank"
            rel="noopener noreferrer"
          >
            Ver en Micelio ↗
          </a>
        </div>
      </header>

      <div className="metric-grid agent-metrics">
        <Metric label="Capacidades" value={agent.capabilities.length} accent />
        <Metric label="Memorias visibles" value={agent.memories.length} />
        <Metric label="Intervenciones" value={agent.activity.length} />
        <Metric label="Mutaciones" value={mutationsAllowed ? "Habilitadas" : "Bloqueadas"} />
      </div>

      <div className="agent-detail-grid">
        <section className="surface">
          <SectionHead eyebrow="MANDATO" title="Qué tiene que cuidar" />
          <p className="body-copy">
            Mantener LINK coherente, operativo, conectado y verificable. Antes de crear algo
            nuevo debe revisar lo que ya existe, respetar protocolos y preferir movimientos
            reversibles con evidencia.
          </p>
          <div className="chip-row">
            <span>Observar</span><span>Conectar</span><span>Reclutar</span><span>Proponer</span>
          </div>
        </section>

        <section className="surface">
          <SectionHead eyebrow="RUNTIME" title="Dónde y cómo trabaja" />
          <dl className="fact-list">
            <Fact term="Runtime" value={runtime?.runtime || agent.metadata?.runtime || "—"} />
            <Fact term="Ruta" value={agent.metadata?.runtime_route || "—"} mono />
            <Fact term="Inteligencia" value={runtime?.intelligence || agent.metadata?.intelligence || "—"} />
            <Fact term="Modelo" value={runtime?.model || "No reportado"} mono />
            <Fact term="Estado vivo" value={runtime?.liveState || agent.metadata?.live_state || "Supabase"} />
          </dl>
        </section>

        <section className="surface span-2">
          <SectionHead eyebrow="CAPACIDADES" title="Qué sabe hacer" note="Registro real de LINK CONTROL CENTRAL." />
          <div className="capability-grid">
            {agent.capabilities.map((capability) => (
              <div className="capability-card" key={capability.capability_key}>
                <div><b>{capability.label}</b><code>{capability.capability_key}</code></div>
                <p>{capability.description || "Sin descripción adicional."}</p>
                <span>{Math.round(Number(capability.weight || 0) * 100)}%</span>
              </div>
            ))}
          </div>
        </section>

        <section className="surface">
          <SectionHead eyebrow="GOBIERNO" title="Permisos y límites" />
          <dl className="fact-list">
            <Fact term="Autonomía" value={humanStatus(runtime?.mode || agent.metadata?.autonomy_mode)} />
            <Fact term="Mutaciones" value={mutationsAllowed ? "Permitidas" : "No permitidas"} />
            <Fact term="Activación" value={agent.activationMode || "—"} />
            <Fact term="Gobierno" value={agent.governance?.label || "Sin relación de gobierno registrada"} />
            <Fact term="Versión" value={agent.version || runtime?.version || "—"} />
          </dl>
          <p className="boundary-note">
            El agente puede preparar movimientos; una propuesta, un evento o una conversación no
            equivalen a ejecución.
          </p>
        </section>

        <section className="surface">
          <SectionHead eyebrow="DOCTRINA" title="De dónde aprende a comportarse" />
          <dl className="fact-list">
            <Fact term="Doctrina" value={runtime?.doctrine || agent.metadata?.doctrine_mode || "GitHub"} />
            <Fact term="Repositorio" value={agent.metadata?.doctrine_repo || "gonzalogaraymunoz-star/link-world"} mono />
            <Fact term="Commit registrado" value={agent.metadata?.doctrine_commit || "—"} mono />
            <Fact term="Fuente de verdad" value={agent.metadata?.source_of_truth || "supabase"} />
          </dl>
        </section>

        <section className="surface">
          <SectionHead eyebrow="MEMORIA" title="Qué recuerda" note="Se muestran claves, no contenido sensible." />
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

        <AgentActionConsole
          agentSlug={agent.slug}
          agentName={agent.name}
          stageKey={agent.metadata?.stage_key || null}
          businesses={(summary?.world?.nodes || []).filter((node: any) => node.entity_type === "business")}
        />

        <section className="surface">
          <SectionHead eyebrow="ACTIVIDAD" title="Qué ha hecho" note="Intervenciones registradas del agente." />
          <div className="activity-summary">
            <div><b>{agent.activity.length}</b><span>intervenciones leídas</span></div>
            <div><b>{inputTokens + outputTokens}</b><span>tokens registrados</span></div>
          </div>
          <div className="memory-list">
            {agent.activity.slice(0, 6).map((item) => (
              <div className="memory-row" key={item.id}>
                <div><b>{item.event_type || "intervención"}</b><small>{item.model || item.provider || "modelo no reportado"} · {humanStatus(item.status)}</small></div>
                <span>{when(item.created_at)}</span>
              </div>
            ))}
            {!agent.activity.length && <Empty text="Aún no hay intervenciones registradas para este agente." />}
          </div>
          {latest ? <small className="last-line">Última actividad: {when(latest.created_at)}</small> : null}
        </section>
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
  return (
    <section className="panel-stack">
      <PageIntro eyebrow="ACTIVIDAD" title="Evidencia reciente" text="Lo que efectivamente entró al bus de eventos." />
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
        <Metric label="Acciones registradas" value={summary?.metrics?.actions ?? "—"} />
        <Metric label="Memorias" value={summary?.metrics?.memories ?? "—"} />
        <Metric label="Vistas registradas" value={summary?.metrics?.views ?? "—"} />
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
