"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type ViewKey = "home" | "clients" | "crm" | "work" | "calendar" | "activity" | "memory" | "projects" | "integrations" | "settings";
type ServiceStatus = "connected" | "warning" | "error";
type Summary = {
  ok: boolean;
  generatedAt: string;
  metrics: { clients: number; actions: number; views: number; memories: number; pendingCommands: number };
  services: Array<{ key: string; label: string; role: string; status: ServiceStatus; detail: string }>;
  recentEvents: Array<{ id: string; source_provider: string; event_type: string; global_id?: string | null; received_at: string }>;
  readiness: { dashboardFoundation: boolean; deepMemory: boolean; crmBridge: boolean; actionRegistry: boolean; clientIntakeEnabled: boolean };
};

const NAV: Array<{ key: ViewKey; label: string; icon: string; group: string }> = [
  { key: "home", label: "Inicio", icon: "⌂", group: "Sistema" },
  { key: "clients", label: "Clientes", icon: "◎", group: "Operación" },
  { key: "crm", label: "CRM", icon: "◫", group: "Operación" },
  { key: "work", label: "Trabajo", icon: "▦", group: "Operación" },
  { key: "calendar", label: "Calendario", icon: "□", group: "Operación" },
  { key: "activity", label: "Actividad", icon: "≡", group: "Operación" },
  { key: "memory", label: "Memoria", icon: "✦", group: "Sistema" },
  { key: "projects", label: "Controles hijos", icon: "⌘", group: "Sistema" },
  { key: "integrations", label: "Integraciones", icon: "⌁", group: "Sistema" },
  { key: "settings", label: "Configuración", icon: "⚙", group: "Sistema" },
];

export default function LinkControlDashboardV5() {
  const [view, setView] = useState<ViewKey>("home");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/system-summary", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error || `HTTP ${response.status}`);
      setSummary(body as Summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar CONTROL CENTRAL");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const groups = useMemo(() => ["Operación", "Sistema"].map(group => ({ group, items: NAV.filter(item => item.group === group) })), []);
  const connected = summary?.services.filter(service => service.status === "connected").length ?? 0;

  return (
    <div className="ccShell">
      {mobileOpen ? <button aria-label="Cerrar menú" className="ccScrim" onClick={() => setMobileOpen(false)} /> : null}
      <aside className={`ccSidebar ${mobileOpen ? "isOpen" : ""}`}>
        <div className="ccBrand"><div className="ccLogo">LC</div><div><strong>LINK CONTROL</strong><small>CONTROL CENTRAL</small></div></div>
        <nav className="ccNav">
          {groups.map(section => (
            <div key={section.group} className="ccNavGroup">
              <span className="ccNavTitle">{section.group}</span>
              {section.items.map(item => (
                <button key={item.key} className={`ccNavItem ${view === item.key ? "active" : ""}`} onClick={() => { setView(item.key); setMobileOpen(false); }}>
                  <span>{item.icon}</span>{item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="ccSidebarFoot">
          <div className="ccSystemState"><i className="ccDot ok" /><div><strong>{connected}/{summary?.services.length ?? 5} conexiones</strong><small>Estado del ecosistema</small></div></div>
        </div>
      </aside>

      <section className="ccWorkspace">
        <header className="ccTopbar">
          <button className="ccMenuBtn" onClick={() => setMobileOpen(true)} aria-label="Abrir menú">☰</button>
          <div className="ccCrumb"><b>LINK CONTROL CENTRAL</b><span>/</span>{NAV.find(item => item.key === view)?.label}</div>
          <button className="ccRefresh" onClick={() => void load()} aria-label="Actualizar">↻</button>
        </header>

        <main className="ccContent">
          {error ? <div className="ccAlert">{error}</div> : null}
          {loading && !summary ? <LoadingState /> : null}
          {!loading && summary ? <ViewRouter view={view} summary={summary} onNavigate={setView} /> : null}
        </main>
      </section>
    </div>
  );
}

function ViewRouter({ view, summary, onNavigate }: { view: ViewKey; summary: Summary; onNavigate: (view: ViewKey) => void }) {
  if (view === "home") return <Home summary={summary} onNavigate={onNavigate} />;
  if (view === "integrations") return <Connections summary={summary} />;
  if (view === "clients") return <LockedClients />;
  if (view === "crm") return <Module title="CRM" eyebrow="Twenty" description="Empresas, prospectos, oportunidades, tareas y pipeline operacional. La memoria profunda permanece fuera del CRM." status={summary.readiness.crmBridge ? "Conectado" : "Pendiente"} />;
  if (view === "memory") return <Module title="Memoria profunda" eyebrow="Supabase" description="Namespaces, memorias, relaciones, búsqueda e historial independiente de Twenty y de cualquier CRM futuro." status={summary.readiness.deepMemory ? "Lista" : "Pendiente"} />;
  if (view === "work") return <Module title="Trabajo" eyebrow="Command Bus" description="Acciones, tareas y órdenes gobernadas. La interfaz y ChatGPT comparten el mismo lenguaje de acciones." status={`${summary.metrics.pendingCommands} comandos pendientes`} />;
  if (view === "calendar") return <Module title="Calendario" eyebrow="Operación" description="Superficie para tareas y compromisos con fecha. Se conectará a tareas internas y Twenty sin duplicar la memoria." status="Base lista" />;
  if (view === "activity") return <Activity summary={summary} />;
  if (view === "projects") return <Module title="Controles hijos" eyebrow="Arquitectura madre → hijos" description="Aquí vivirán Hotel Experience, Wellness, LINK Digital y los nuevos Control Central de negocio subordinados." status="Modelo preparado" />;
  return <Module title="Configuración" eyebrow="Gobierno" description="Permisos, acciones, integraciones, vistas declarativas y reglas del núcleo. El núcleo permanece separado de las apps hijas." status={`${summary.metrics.actions} acciones gobernadas`} />;
}

function Home({ summary, onNavigate }: { summary: Summary; onNavigate: (view: ViewKey) => void }) {
  const readyCount = Object.values(summary.readiness).filter(Boolean).length;
  return (
    <>
      <div className="ccHero"><div><span className="ccEyebrow">Sistema operativo madre</span><h1>CONTROL CENTRAL</h1><p>Resumen vivo del ecosistema antes de comenzar el ingreso de clientes.</p></div><div className="ccHeroBadge"><strong>{readyCount}/5</strong><span>capas listas</span></div></div>
      <div className="ccMetricGrid">
        <Metric label="Clientes" value={summary.metrics.clients} note="Ingreso pausado" />
        <Metric label="Acciones" value={summary.metrics.actions} note="Registry activo" />
        <Metric label="Vistas" value={summary.metrics.views} note="Declarativas" />
        <Metric label="Memorias" value={summary.metrics.memories} note="Deep Memory" />
        <Metric label="Comandos" value={summary.metrics.pendingCommands} note="Pendientes" />
      </div>
      <section className="ccPanel">
        <div className="ccPanelHead"><div><span className="ccEyebrow">Conexiones</span><h2>Mapa del sistema</h2></div><button className="ccTextBtn" onClick={() => onNavigate("integrations")}>Ver todas →</button></div>
        <div className="ccConnectionGrid">{summary.services.map(service => <ConnectionCard key={service.key} service={service} />)}</div>
      </section>
      <div className="ccTwoCol">
        <section className="ccPanel"><div className="ccPanelHead"><div><span className="ccEyebrow">Preparación</span><h2>MVP producción</h2></div></div><Readiness summary={summary} /></section>
        <section className="ccPanel"><div className="ccPanelHead"><div><span className="ccEyebrow">Arquitectura</span><h2>Quién hace qué</h2></div></div><div className="ccRoleList"><Role name="CONTROL CENTRAL" text="Gobierno · identidad · orquestación" /><Role name="Supabase" text="Memoria profunda · eventos · relaciones" /><Role name="Twenty" text="CRM operacional" /><Role name="GitHub" text="Código y versiones" /><Role name="Vercel" text="Aplicación y APIs" /></div></section>
      </div>
    </>
  );
}

function Connections({ summary }: { summary: Summary }) {
  return <><PageHead eyebrow="Sistema" title="Integraciones" description="Sumario de conexiones de la madre con sus motores y gateways." /><div className="ccConnectionGrid large">{summary.services.map(service => <ConnectionCard key={service.key} service={service} />)}</div></>;
}

function LockedClients() {
  return <><PageHead eyebrow="Operación" title="Clientes" description="El ingreso de clientes queda deliberadamente pausado hasta cerrar el Dashboard." /><div className="ccEmptyState"><div className="ccEmptyIcon">◎</div><h2>Ingreso de clientes pausado</h2><p>Primero estabilizamos navegación, conexiones, CRM, memoria, trabajo, actividad y controles hijos. Después abrimos onboarding.</p><span className="ccPill">Dashboard primero</span></div></>;
}

function Activity({ summary }: { summary: Summary }) {
  return <><PageHead eyebrow="Event Bus" title="Actividad" description="Eventos recientes recibidos desde motores externos." /><section className="ccPanel"><div className="ccActivityList">{summary.recentEvents.length ? summary.recentEvents.map(event => <div className="ccActivityRow" key={event.id}><i className="ccDot ok" /><div><strong>{event.event_type}</strong><small>{event.source_provider}{event.global_id ? ` · ${event.global_id}` : ""}</small></div><time>{new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(event.received_at))}</time></div>) : <div className="ccQuiet">Todavía no hay eventos externos. Eso es normal antes del ingreso de clientes.</div>}</div></section></>;
}

function Module({ title, eyebrow, description, status }: { title: string; eyebrow: string; description: string; status: string }) {
  return <><PageHead eyebrow={eyebrow} title={title} description={description} /><section className="ccPanel ccModulePanel"><span className="ccPill">{status}</span><div className="ccModuleDiagram"><div>Dashboard</div><span>→</span><div>Action API</div><span>→</span><div>{eyebrow}</div></div><p>Esta superficie ya existe en la navegación. Sus acciones se irán habilitando únicamente cuando estén conectadas a operaciones reales.</p></section></>;
}

function ConnectionCard({ service }: { service: Summary["services"][number] }) {
  return <article className="ccConnectionCard"><div className="ccConnectionTop"><div className="ccServiceIcon">{service.label.slice(0, 1)}</div><span className={`ccStatus ${service.status}`}><i />{service.status === "connected" ? "Conectado" : service.status === "warning" ? "Revisar" : "Error"}</span></div><h3>{service.label}</h3><p>{service.role}</p><small>{service.detail}</small></article>;
}

function Readiness({ summary }: { summary: Summary }) {
  const items = [
    ["Shell del Dashboard", summary.readiness.dashboardFoundation],
    ["Memoria profunda", summary.readiness.deepMemory],
    ["Bridge CRM Twenty", summary.readiness.crmBridge],
    ["Action Registry", summary.readiness.actionRegistry],
    ["Ingreso de clientes", summary.readiness.clientIntakeEnabled],
  ] as const;
  return <div className="ccReadiness">{items.map(([label, ready]) => <div key={label}><span>{label}</span><b className={ready ? "ready" : "hold"}>{ready ? "LISTO" : "PAUSADO"}</b></div>)}</div>;
}

function Metric({ label, value, note }: { label: string; value: number; note: string }) { return <div className="ccMetric"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>; }
function Role({ name, text }: { name: string; text: string }) { return <div className="ccRole"><strong>{name}</strong><span>{text}</span></div>; }
function PageHead({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) { return <div className="ccPageHead"><span className="ccEyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>; }
function LoadingState() { return <div className="ccLoading"><div className="ccLogo">LC</div><h1>Conectando CONTROL CENTRAL</h1><p>Leyendo el estado real del ecosistema.</p></div>; }
