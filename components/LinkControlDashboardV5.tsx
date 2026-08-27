"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type ViewKey = "home" | "clients" | "crm" | "work" | "calendar" | "activity" | "memory" | "projects" | "integrations" | "settings";
type ServiceStatus = "connected" | "warning" | "error";
type Summary = {
  ok: boolean; generatedAt: string;
  metrics: { clients: number; actions: number; views: number; memories: number; pendingCommands: number };
  operational: { clients: number; opportunities: number; tasksOpen: number; tasksOverdue: number; pipelineAmount: number; projects: number; attention: number; source: string };
  services: Array<{ key: string; label: string; role: string; status: ServiceStatus; detail: string }>;
  recentEvents: Array<{ id: string; source_provider: string; event_type: string; global_id?: string | null; received_at: string }>;
  readiness: { dashboardFoundation: boolean; deepMemory: boolean; crmBridge: boolean; actionRegistry: boolean; clientIntakeEnabled: boolean };
};

const NAV: Array<{ key: ViewKey; label: string; icon: string; group: string }> = [
  { key: "home", label: "Centro de Control", icon: "⌂", group: "Inicio" },
  { key: "clients", label: "Clientes", icon: "◎", group: "Operación" },
  { key: "crm", label: "Oportunidades", icon: "◫", group: "Operación" },
  { key: "work", label: "Tareas", icon: "▦", group: "Operación" },
  { key: "calendar", label: "Calendario", icon: "□", group: "Operación" },
  { key: "activity", label: "Actividad", icon: "≡", group: "Inteligencia" },
  { key: "memory", label: "Memoria", icon: "✦", group: "Inteligencia" },
  { key: "projects", label: "Negocios", icon: "⌘", group: "Operación" },
  { key: "integrations", label: "Integraciones", icon: "⌁", group: "Sistema" },
  { key: "settings", label: "Configuración", icon: "⚙", group: "Sistema" },
];

export default function LinkControlDashboardV5() {
  const [view, setView] = useState<ViewKey>("home"); const [summary, setSummary] = useState<Summary | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const [mobileOpen, setMobileOpen] = useState(false);
  const load = useCallback(async () => { setLoading(true); setError(null); try { const response = await fetch("/api/system-summary", { cache: "no-store" }); const body = await response.json(); if (!response.ok || !body.ok) throw new Error(body.error || `HTTP ${response.status}`); setSummary(body as Summary); } catch (err) { setError(err instanceof Error ? err.message : "No fue posible cargar CONTROL CENTRAL"); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  const groups = useMemo(() => ["Inicio", "Operación", "Inteligencia", "Sistema"].map(group => ({ group, items: NAV.filter(item => item.group === group) })), []);
  const connected = summary?.services.filter(service => service.status === "connected").length ?? 0;
  return <div className="ccShell">{mobileOpen ? <button aria-label="Cerrar menú" className="ccScrim" onClick={() => setMobileOpen(false)} /> : null}<aside className={`ccSidebar ${mobileOpen ? "isOpen" : ""}`}><div className="ccBrand"><div className="ccLogo">LC</div><div><strong>LINK CONTROL</strong><small>CONTROL CENTRAL</small></div></div><nav className="ccNav">{groups.map(section => <div key={section.group} className="ccNavGroup"><span className="ccNavTitle">{section.group}</span>{section.items.map(item => <button key={item.key} className={`ccNavItem ${view === item.key ? "active" : ""}`} onClick={() => { setView(item.key); setMobileOpen(false); }}><span>{item.icon}</span>{item.label}</button>)}</div>)}</nav><div className="ccSidebarFoot"><div className="ccSystemState"><i className="ccDot ok" /><div><strong>{connected}/{summary?.services.length ?? 5} sistemas</strong><small>Salud técnica</small></div></div></div></aside><section className="ccWorkspace"><header className="ccTopbar"><button className="ccMenuBtn" onClick={() => setMobileOpen(true)} aria-label="Abrir menú">☰</button><div className="ccCrumb"><b>LINK CONTROL CENTRAL</b><span>/</span>{NAV.find(item => item.key === view)?.label}</div><button className="ccQuickAdd" title="Nueva acción">＋</button><button className="ccRefresh" onClick={() => void load()} aria-label="Actualizar">↻</button></header><main className="ccContent">{error ? <div className="ccAlert">{error}</div> : null}{loading && !summary ? <LoadingState /> : null}{!loading && summary ? <ViewRouter view={view} summary={summary} onNavigate={setView} /> : null}</main></section></div>;
}

function ViewRouter({ view, summary, onNavigate }: { view: ViewKey; summary: Summary; onNavigate: (view: ViewKey) => void }) {
  if (view === "home") return <Home summary={summary} onNavigate={onNavigate} />;
  if (view === "integrations") return <Connections summary={summary} />;
  if (view === "clients") return <LockedClients />;
  if (view === "activity") return <Activity summary={summary} />;
  if (view === "crm") return <Module title="Oportunidades" eyebrow="Twenty CRM" description="Pipeline comercial, empresas, prospectos y oportunidades. Twenty es el motor operacional; CONTROL CENTRAL es la experiencia." status={summary.readiness.crmBridge ? "CRM conectado" : "Bridge pendiente"} />;
  if (view === "memory") return <Module title="Memoria profunda" eyebrow="Supabase" description="Decisiones, relaciones, namespaces e historial independiente del CRM." status={summary.readiness.deepMemory ? "Lista" : "Pendiente"} />;
  if (view === "work") return <Module title="Tareas" eyebrow="Operación" description="Trabajo pendiente y órdenes gobernadas desde un único Action Registry." status={`${summary.operational.tasksOpen} pendientes`} />;
  if (view === "calendar") return <Module title="Calendario" eyebrow="Operación" description="Compromisos y tareas con fecha, sin duplicar la memoria." status="Base lista" />;
  if (view === "projects") return <Module title="Negocios" eyebrow="Madre → hijos" description="Hotel Experience, Wellness, LINK Digital, Web Factory y futuros Control Central subordinados." status="Modelo preparado" />;
  return <Module title="Configuración" eyebrow="Gobierno" description="Permisos, acciones, vistas declarativas y reglas inmutables del núcleo." status={`${summary.metrics.actions} acciones gobernadas`} />;
}

function Home({ summary, onNavigate }: { summary: Summary; onNavigate: (view: ViewKey) => void }) {
  const op = summary.operational;
  return <><div className="ccHero ccOperationalHero"><div><span className="ccEyebrow">Centro de Control</span><h1>¿Qué necesita atención?</h1><p>Vista operacional del ecosistema. Los datos técnicos y conexiones viven en Sistema → Integraciones.</p></div><div className="ccHeroBadge"><strong>{op.attention}</strong><span>requieren atención</span></div></div>
    <div className="ccMetricGrid ccOpsMetrics"><Metric label="Clientes activos" value={op.clients} note="Supabase + CRM" /><Metric label="Oportunidades" value={op.opportunities} note="Twenty" /><Metric label="Tareas abiertas" value={op.tasksOpen} note={op.tasksOverdue ? `${op.tasksOverdue} vencidas` : "Sin vencidas"} /><Metric label="Pipeline" value={money(op.pipelineAmount)} note="Valor comercial" /><Metric label="Negocios" value={op.projects} note="Controles hijos" /></div>
    <div className="ccTwoCol ccOpsGrid"><section className="ccPanel"><div className="ccPanelHead"><div><span className="ccEyebrow">Prioridades</span><h2>Atención ahora</h2></div><button className="ccTextBtn" onClick={() => onNavigate("work")}>Ver tareas →</button></div>{op.attention ? <div className="ccPriority"><i className="ccDot warning"/><div><strong>{op.attention} acciones pendientes</strong><small>Revisa el Command Bus y resuelve lo que bloquea la operación.</small></div></div> : <div className="ccQuiet">No hay alertas operacionales pendientes.</div>}</section>
    <section className="ccPanel"><div className="ccPanelHead"><div><span className="ccEyebrow">Pipeline</span><h2>Estado comercial</h2></div><button className="ccTextBtn" onClick={() => onNavigate("crm")}>Abrir CRM →</button></div><div className="ccPipelineSummary"><strong>{op.opportunities}</strong><span>oportunidades</span><b>{money(op.pipelineAmount)}</b><small>pipeline registrado</small></div></section></div>
    <section className="ccPanel"><div className="ccPanelHead"><div><span className="ccEyebrow">Actividad</span><h2>Últimos movimientos</h2></div><button className="ccTextBtn" onClick={() => onNavigate("activity")}>Ver actividad →</button></div><ActivityRows summary={summary} limit={5} /></section>
    <section className="ccPanel ccControlShortcuts"><div className="ccPanelHead"><div><span className="ccEyebrow">Control</span><h2>Ir a trabajar</h2></div></div><div className="ccShortcutGrid"><Shortcut label="Clientes" detail={`${op.clients} activos`} onClick={() => onNavigate("clients")} /><Shortcut label="Oportunidades" detail={`${op.opportunities} abiertas`} onClick={() => onNavigate("crm")} /><Shortcut label="Tareas" detail={`${op.tasksOpen} pendientes`} onClick={() => onNavigate("work")} /><Shortcut label="Negocios" detail={`${op.projects} conectados`} onClick={() => onNavigate("projects")} /></div></section></>;
}

function Connections({ summary }: { summary: Summary }) { return <><PageHead eyebrow="Sistema" title="Integraciones" description="Aquí sí vive la infraestructura: motores, gateways, sincronización y salud técnica." /><div className="ccConnectionGrid large">{summary.services.map(service => <ConnectionCard key={service.key} service={service} />)}</div></>; }
function LockedClients() { return <><PageHead eyebrow="Operación" title="Clientes" description="El ingreso permanece pausado hasta cerrar el Dashboard operacional." /><div className="ccEmptyState"><div className="ccEmptyIcon">◎</div><h2>Ingreso de clientes pausado</h2><p>La estructura está preparada. Abriremos onboarding cuando las superficies operacionales estén conectadas a acciones reales.</p><span className="ccPill">Dashboard primero</span></div></>; }
function Activity({ summary }: { summary: Summary }) { return <><PageHead eyebrow="Event Bus" title="Actividad" description="Historia operacional consolidada del ecosistema." /><section className="ccPanel"><ActivityRows summary={summary} /></section></>; }
function ActivityRows({ summary, limit }: { summary: Summary; limit?: number }) { const events = limit ? summary.recentEvents.slice(0, limit) : summary.recentEvents; return <div className="ccActivityList">{events.length ? events.map(event => <div className="ccActivityRow" key={event.id}><i className="ccDot ok" /><div><strong>{event.event_type}</strong><small>{event.source_provider}{event.global_id ? ` · ${event.global_id}` : ""}</small></div><time>{new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(event.received_at))}</time></div>) : <div className="ccQuiet">Todavía no hay actividad operacional registrada.</div>}</div>; }
function Module({ title, eyebrow, description, status }: { title: string; eyebrow: string; description: string; status: string }) { return <><PageHead eyebrow={eyebrow} title={title} description={description} /><section className="ccPanel ccModulePanel"><span className="ccPill">{status}</span><p>Esta superficie se habilita únicamente con operaciones reales. No se mostrarán controles decorativos o botones sin Action asociada.</p></section></>; }
function ConnectionCard({ service }: { service: Summary["services"][number] }) { return <article className="ccConnectionCard"><div className="ccConnectionTop"><div className="ccServiceIcon">{service.label.slice(0, 1)}</div><span className={`ccStatus ${service.status}`}><i />{service.status === "connected" ? "Conectado" : service.status === "warning" ? "Revisar" : "Error"}</span></div><h3>{service.label}</h3><p>{service.role}</p><small>{service.detail}</small></article>; }
function Metric({ label, value, note }: { label: string; value: number | string; note: string }) { return <div className="ccMetric"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>; }
function Shortcut({ label, detail, onClick }: { label: string; detail: string; onClick: () => void }) { return <button className="ccShortcut" onClick={onClick}><strong>{label}</strong><small>{detail}</small><span>→</span></button>; }
function PageHead({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) { return <div className="ccPageHead"><span className="ccEyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>; }
function LoadingState() { return <div className="ccLoading"><div className="ccLogo">LC</div><h1>Conectando CONTROL CENTRAL</h1><p>Leyendo la operación real.</p></div>; }
function money(value: number) { return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value); }
