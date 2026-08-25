"use client";

import { useMemo, useState } from "react";
import { ARTIFACTS, CLIENTS, CONTROLS, GATEWAYS } from "@/lib/mock-data";
import { STAGES, STAGE_BY_KEY } from "@/lib/crm/stages";
import type { Client360, Health, StageKey } from "@/lib/types";

type ViewKey =
  | "home" | "inbox" | "crm" | "kanban" | "calendar" | "explorer"
  | "products" | "intelligence" | "gateways" | "infrastructure" | "controls" | "activity";

const NAV: Array<{ key: ViewKey; label: string; icon: string; count?: number }> = [
  { key: "home", label: "Hoy", icon: "⌂", count: 8 },
  { key: "inbox", label: "Control Inbox", icon: "⌁", count: 5 },
  { key: "crm", label: "CRM 360", icon: "◎" },
  { key: "kanban", label: "Kanban", icon: "▦" },
  { key: "calendar", label: "Calendario", icon: "□" },
  { key: "explorer", label: "Explorador", icon: "⌘" },
  { key: "products", label: "Productos", icon: "◇" },
  { key: "intelligence", label: "Inteligencia", icon: "✦" },
];

const BUSINESS_NAV: Array<{ key: ViewKey; label: string; icon: string; count?: number }> = [
  { key: "crm", label: "CRM 360", icon: "◎" },
  { key: "kanban", label: "Kanban", icon: "▦" },
  { key: "calendar", label: "Calendario", icon: "□" },
  { key: "explorer", label: "Explorador", icon: "⌘" },
  { key: "products", label: "Productos", icon: "◇" },
];

const SCOPE_CLIENT_IDS: Record<string, string[]> = {
  root: CLIENTS.map((client) => client.id),
  link_empresa: ["client_link_empresa"],
  lama: ["client_lama"],
  hotel_experience: ["client_hotel"],
  link_cupones: ["client_cupones"],
};

const SYSTEM_NAV: Array<{ key: ViewKey; label: string; icon: string }> = [
  { key: "gateways", label: "Gateways", icon: "↔" },
  { key: "infrastructure", label: "Infraestructura", icon: "◉" },
  { key: "controls", label: "Controles", icon: "⊞" },
  { key: "activity", label: "Actividad", icon: "≡" },
];

const VIEW_LABELS: Record<ViewKey, string> = Object.fromEntries(
  [...NAV, ...SYSTEM_NAV].map((item) => [item.key, item.label]),
) as Record<ViewKey, string>;

const stageNumber: Record<StageKey, string> = {
  understand: "①", organize: "②", build: "③", activate: "④", support: "⑤", scale: "⑥",
};

function healthClass(value: Health) {
  if (value === "ok") return "ok";
  if (value === "warning") return "warn";
  if (value === "error") return "bad";
  return "off";
}

function ClientBadge({ client }: { client: Client360 }) {
  return (
    <div className="clientBadge" style={{ borderColor: `${client.accent}44`, color: client.accent }}>
      {client.shortCode}
    </div>
  );
}

function Progress({ value, accent }: { value: number; accent?: string }) {
  return <div className="progress"><i style={{ width: `${value}%`, background: accent ?? "#252525" }} /></div>;
}

function StageStrip({ client }: { client: Client360 }) {
  const activeOrder = STAGE_BY_KEY[client.stage].order;
  return (
    <div className="stageTrack">
      {STAGES.map((stage) => (
        <div key={stage.key} className={`stage ${stage.order < activeOrder ? "done" : ""} ${stage.key === client.stage ? "active" : ""}`}>
          <div className="stageN">0{stage.order}</div>
          <strong>{stage.name}</strong>
          <small>{stage.key === client.stage ? "etapa actual" : stage.order < activeOrder ? "completada" : "pendiente"}</small>
        </div>
      ))}
    </div>
  );
}

function PageHead({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return (
    <div className="pageHead">
      <div><h1>{title}</h1><p>{description}</p></div>
      <div className="actions">{children}</div>
    </div>
  );
}

export default function LinkControlApp({ initialScope = "root" }: { initialScope?: string }) {
  const isRoot = initialScope === "root";
  const allowedIds = useMemo(() => new Set(SCOPE_CLIENT_IDS[initialScope] ?? []), [initialScope]);
  const visibleClients = useMemo(() => CLIENTS.filter((item) => allowedIds.has(item.id)), [allowedIds]);
  const [view, setView] = useState<ViewKey>(isRoot ? "home" : "crm");
  const [clientId, setClientId] = useState((visibleClients[0] ?? CLIENTS[0]).id);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ who: "ai" | "me"; text: string }>>([
    { who: "ai", text: "Estoy dentro de LINK CONTROL CENTRAL. Puedo trabajar con el contexto y scope activos." },
  ]);
  const [folders, setFolders] = useState(["LINK CONTROL CENTRAL", "Negocios", "LINK Empresa", "Lama Travelers", "Clientes", "Cliente Norte", "Herramientas", "Preview Studio", "Productos", "Websites", "Publicidad", "Memoria", "Principios", "Protocolos", "Patrones"]);
  const [folder, setFolder] = useState("LINK CONTROL CENTRAL");

  const client = useMemo(() => visibleClients.find((item) => item.id === clientId) ?? visibleClients[0] ?? CLIENTS[0], [clientId, visibleClients]);
  const activeNav = isRoot ? NAV : BUSINESS_NAV;
  const controlName = isRoot ? "LINK CONTROL CENTRAL" : (visibleClients[0]?.name ?? initialScope);

  const navigate = (next: ViewKey) => setView(next);
  const openClient = (id: string) => { setClientId(id); setView("crm"); };
  const toast = (message: string) => window.alert(message);
  const addGesture = () => {
    const title = window.prompt("Nombre del gesto manual");
    if (title) toast(`Gesto registrado en modo demo: ${title}`);
  };
  const addFolder = () => {
    const title = window.prompt("Nombre de la carpeta");
    if (!title) return;
    setFolders((current) => [...current, title]);
    setFolder(title);
  };
  const sendChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatMessages((current) => [...current, { who: "me", text }]);
    setChatInput("");
    const lower = text.toLowerCase();
    let reply = "En producción, esta instrucción pasaría por Gateway → identidad → scope → política → ejecución → Event Bus.";
    if (lower.includes("falta")) reply = `En ${client.name}, el próximo hito es: ${client.nextMilestone}. También revisaríamos acciones y gestos pendientes.`;
    if (lower.includes("memoria")) reply = "Puedo consultar memoria local, proponer inteligencia y enviarla al filtro central. Una app hija nunca escribe directamente en memoria maestra.";
    if (lower.includes("gateway")) reply = "Puedo revisar estado, permisos y scope de cada gateway sin modificar el núcleo inmutable.";
    setTimeout(() => setChatMessages((current) => [...current, { who: "ai", text: reply }]), 180);
  };

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="brand"><div className="logo">LC</div><div><strong>LINK CONTROL</strong><small>{isRoot ? "Central · Root workspace" : `Control · ${controlName}`}</small></div></div>
        <div className="sideScroll">
          <div className="sideTitle">Workspace</div>
          {activeNav.map((item) => <button key={item.key} className={`nav ${view === item.key ? "active" : ""}`} onClick={() => navigate(item.key)}><span>{item.icon}</span>{item.label}{item.count ? <b>{item.count}</b> : null}</button>)}
          {isRoot ? <><div className="sideTitle">Sistema</div>
          {SYSTEM_NAV.map((item) => <button key={item.key} className={`nav ${view === item.key ? "active" : ""}`} onClick={() => navigate(item.key)}><span>{item.icon}</span>{item.label}</button>)}</> : null}
          <div className="sideTitle">{isRoot ? "Árbol" : "Control"}</div>
          {visibleClients.map((item) => <button className="treeItem" key={item.id} onClick={() => openClient(item.id)}><i style={{ background: item.accent }} />{item.name}</button>)}
        </div>
        <div className="sidebarFoot"><div className="identity"><div className="avatar">GG</div><div><strong>{isRoot ? "Administrador raíz" : "Control de negocio"}</strong><span>{controlName}</span></div></div></div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="crumb"><b>{controlName}</b><span>/</span>{VIEW_LABELS[view]}</div>
          <div className="search"><span>⌕</span><input placeholder="Buscar cliente, memoria, producto, gesto, proyecto…" /></div>
          <button className="topBtn" onClick={() => toast("Comando universal: usa ChatGPT o conecta la API /api/gateway")}>Comando</button>
          <button className="topBtn dark" onClick={() => setChatOpen(true)}>✦ ChatGPT</button>
        </header>

        <main className="content">
          {view === "home" && <HomeView onClient={openClient} onNavigate={navigate} onGesture={addGesture} onChat={() => setChatOpen(true)} />}
          {view === "inbox" && <InboxView onClient={openClient} onNavigate={navigate} onChat={() => setChatOpen(true)} />}
          {view === "crm" && <CrmView client={client} clients={visibleClients} onSelect={setClientId} onGesture={addGesture} />}
          {view === "kanban" && <KanbanView clients={visibleClients} onClient={openClient} />}
          {view === "calendar" && <CalendarView onClient={openClient} onGesture={addGesture} />}
          {view === "explorer" && <ExplorerView folders={folders} folder={folder} setFolder={setFolder} onAdd={addFolder} allowedClientIds={allowedIds} />}
          {view === "products" && <ProductsView allowedClientIds={allowedIds} />}
          {view === "intelligence" && <IntelligenceView onChat={() => setChatOpen(true)} />}
          {view === "gateways" && <GatewaysView />}
          {view === "infrastructure" && <InfrastructureView onChat={() => setChatOpen(true)} />}
          {view === "controls" && <ControlsView />}
          {view === "activity" && <ActivityView />}
        </main>
      </section>

      <button className="chatFab" onClick={() => setChatOpen(true)}>✦ ChatGPT</button>
      <aside className={`chatPanel ${chatOpen ? "open" : ""}`}>
        <div className="chatHead"><div className="chatLogo">✦</div><div><strong>ChatGPT · LINK CONTROL</strong><span>scope activo · {isRoot ? (view === "crm" ? client.name : "ROOT") : initialScope}</span></div><button onClick={() => setChatOpen(false)}>×</button></div>
        <div className="contextBar">Contexto: {view === "crm" ? `${client.name} · ${STAGE_BY_KEY[client.stage].name}` : `${controlName} · ${VIEW_LABELS[view]}`}</div>
        <div className="chatLog">{chatMessages.map((message, index) => <div className={`msg ${message.who}`} key={`${message.who}-${index}`}>{message.text}</div>)}</div>
        <div className="chatComposer"><input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sendChat(); }} placeholder="Pregunta o ejecuta una acción…" /><button onClick={sendChat}>↑</button></div>
      </aside>
    </div>
  );
}

function HomeView({ onClient, onNavigate, onGesture, onChat }: { onClient: (id: string) => void; onNavigate: (view: ViewKey) => void; onGesture: () => void; onChat: () => void }) {
  const mission = CLIENTS[0];
  return <>
    <PageHead title="Hoy" description="Una sola vista para saber qué ocurre, qué requiere decisión y qué debe avanzar."><button className="btn" onClick={onGesture}>＋ Gesto</button><button className="btn primary" onClick={onChat}>Preguntar a ChatGPT</button></PageHead>
    <div className="metrics"><Metric label="Controles activos" value="12" sub="11 operativos · 1 alerta"/><Metric label="Clientes" value="38" sub="7 con acción hoy"/><Metric label="Gestos pendientes" value="21" sub="5 requieren intervención"/><Metric label="Gateways" value="14/15" sub="1 integración degradada"/></div>
    <div className="grid">
      <div className="card s7"><div className="cardHead"><h3>Misión actual</h3><span>{mission.name} · {mission.progress}%</span></div><div className="mission"><ClientBadge client={mission}/><div className="grow"><strong>{mission.product}</strong><small>{mission.need}</small><Progress value={mission.progress}/></div><span className="tag dark">{stageNumber[mission.stage]} {STAGE_BY_KEY[mission.stage].name}</span></div><div className="spacer"/><StageStrip client={mission}/></div>
      <div className="card s5"><div className="cardHead"><h3>Control Inbox</h3><span>5 decisiones</span></div><Alert status="bad" title="Lama Travelers · Vercel" text="Deployment con alerta. Requiere revisión." action="Ver" onClick={() => onNavigate("infrastructure")}/><Alert status="warn" title="Cliente Norte" text="Construir detenido 11 días por material pendiente." action="Abrir" onClick={() => onClient("client_norte")}/><Alert status="warn" title="Inteligencia candidata" text="Patrón listo para revisión central." action="Revisar" onClick={() => onNavigate("intelligence")}/><Alert status="ok" title="LINK Cupones" text="Etapa lista para revisar avance." action="Kanban" onClick={() => onNavigate("kanban")}/></div>
      <div className="card s7"><div className="cardHead"><h3>Agenda operacional</h3><span>24 agosto 2026</span></div><Work time="09:30" title="Diagnóstico comercial" meta="Cliente Norte · Entender · Acción estándar" kind="Acción"/><Work time="11:00" title="Aprobar campaña" meta="Lama Travelers · Activar · Gesto manual" kind="Gesto"/><Work time="15:30" title="Revisar propuesta B2B" meta="Hotel Experience · Ordenar · Tarea" kind="Tarea"/><Work time="18:00" title="Validar artifact v4" meta="LINK Empresa · Construir · Producto" kind="Artifact"/></div>
      <div className="card s5"><div className="cardHead"><h3>Infraestructura</h3><span>salud transversal</span></div><InfraRow name="ChatGPT / MCP" text="Complemento central operativo" state="ok"/><InfraRow name="Supabase" text="Datos · memoria · inteligencia" state="ok"/><InfraRow name="GitHub" text="Código y evolución técnica" state="ok"/><InfraRow name="Vercel" text="1 deployment requiere atención" state="warning"/></div>
    </div>
  </>;
}

function InboxView({ onClient, onNavigate, onChat }: { onClient: (id: string) => void; onNavigate: (view: ViewKey) => void; onChat: () => void }) {
  return <><PageHead title="Control Inbox" description="Decisiones, bloqueos, anomalías y solicitudes que escalan desde los controles hijos."><button className="btn primary" onClick={onChat}>Priorizar con ChatGPT</button></PageHead><div className="card tableWrap"><table><thead><tr><th>Prioridad</th><th>Control</th><th>Evento</th><th>Origen</th><th>Estado</th><th>Acción</th></tr></thead><tbody>
    <tr><td><span className="status bad"/></td><td>Lama Travelers</td><td>deployment.failed</td><td>Vercel Gateway</td><td><span className="tag">requiere decisión</span></td><td><button className="btn" onClick={() => onNavigate("infrastructure")}>Abrir</button></td></tr>
    <tr><td><span className="status warn"/></td><td>Cliente Norte</td><td>stage.stalled</td><td>Event Bus</td><td><span className="tag">11 días</span></td><td><button className="btn" onClick={() => onClient("client_norte")}>Ficha 360</button></td></tr>
    <tr><td><span className="status warn"/></td><td>LINK Empresa</td><td>memory.proposed</td><td>ChatGPT Negocio</td><td><span className="tag">candidato central</span></td><td><button className="btn" onClick={() => onNavigate("intelligence")}>Revisar</button></td></tr>
    <tr><td><span className="status ok"/></td><td>LINK Cupones</td><td>stage.ready</td><td>CRM</td><td><span className="tag">listo para avanzar</span></td><td><button className="btn" onClick={() => onNavigate("kanban")}>Ver etapa</button></td></tr>
  </tbody></table></div></>;
}

function CrmView({ client, clients, onSelect, onGesture }: { client: Client360; clients: Client360[]; onSelect: (id: string) => void; onGesture: () => void }) {
  return <><PageHead title="CRM 360" description="Cliente → necesidad → producto → etapa → acciones → gestos → resultados → siguiente necesidad."><button className="btn primary">＋ Cliente</button></PageHead><div className="crmLayout"><div className="crmList"><input className="crmSearch" placeholder="Buscar cliente…"/>{clients.map((item) => <button key={item.id} onClick={() => onSelect(item.id)} className={`clientRow ${item.id === client.id ? "active" : ""}`}><i style={{ background: item.accent }}/><span><strong>{item.name}</strong><small>{stageNumber[item.stage]} {STAGE_BY_KEY[item.stage].name} · {item.progress}%</small></span></button>)}</div><div className="crmMain"><div className="crmTitle"><ClientBadge client={client}/><div><h2>{client.name}</h2><p>{stageNumber[client.stage]} {STAGE_BY_KEY[client.stage].name} · {client.progress}% · Control operativo</p></div><span className="tag push">scope: {client.id.replace("client_", "")}</span></div><div className="crmTabs"><b>Resumen</b><span>Necesidad</span><span>Producto</span><span>6 etapas</span><span>Acciones</span><span>Gestos</span><span>Memoria</span><span>Artifacts</span><span>Actividad</span></div><StageStrip client={client}/><div className="crmGrid"><Field label="Necesidad" value={client.need}/><Field label="Producto actual" value={client.product}/><Field label="Próximo hito" value={client.nextMilestone}/><Field label="Inteligencia local" value={client.localIntelligence}/></div><div className="grid"><div className="card flat s6"><div className="cardHead"><h3>Acciones de etapa</h3><span>método LINK</span></div>{client.actions.map((item) => <ActionItem key={item.id} title={item.title} done={item.done} kind="Acción"/>)}</div><div className="card flat s6"><div className="cardHead"><h3>Gestos</h3><span>manuales</span></div>{client.gestures.map((item) => <ActionItem key={item.id} title={item.title} done={item.done} kind="Gesto" gesture/>)}<button className="btn topGap" onClick={onGesture}>＋ Agregar gesto</button></div></div></div></div></>;
}

function KanbanView({ clients, onClient }: { clients: Client360[]; onClient: (id: string) => void }) {
  return <><PageHead title="Kanban de progreso" description="Las columnas son las seis etapas LINK. El avance depende de criterios de salida, no solo de mover una tarjeta."><button className="btn primary">＋ Trabajo</button></PageHead><div className="card kanbanWrap"><div className="kanban">{STAGES.map((stage) => <div className="kcol" key={stage.key}><div className="khead"><strong>0{stage.order} {stage.name}</strong><span>{clients.filter((c) => c.stage === stage.key).length}</span></div>{clients.filter((c) => c.stage === stage.key).map((item) => <button key={item.id} className="kcard" onClick={() => onClient(item.id)}><div className="kname"><i style={{ background: item.accent }}/>{item.name}</div><p>{item.need}</p><div className="kfoot"><span>{item.gestures.filter((g) => !g.done).length} gestos · {item.actions.filter((a) => !a.done).length} acciones</span><b>{item.progress}%</b></div></button>)}</div>)}</div></div></>;
}

function CalendarView({ onClient, onGesture }: { onClient: (id: string) => void; onGesture: () => void }) {
  const days = ["Lun 24", "Mar 25", "Mié 26", "Jue 27", "Vie 28", "Sáb 29", "Dom 30"];
  const hours = ["09:00", "11:00", "15:00", "18:00"];
  return <>
    <PageHead title="Calendario Workspace" description="Calendario, gestos y tarjetas 360 son la misma información vista en el tiempo.">
      <button className="btn">↔ Google Calendar</button><button className="btn primary" onClick={onGesture}>＋ Gesto</button>
    </PageHead>
    <div className="card calendarCard">
      <div className="calendarTop"><div><strong>24–30 agosto 2026</strong><small>Workspace · semana operacional</small></div><div className="segment"><span>Mes</span><b>Semana</b><span>Día</span></div></div>
      <div className="calendarScroll"><div className="week">
        <div className="whead"/>{days.map((d) => <div className="whead" key={d}>{d}</div>)}
        {hours.map((hour, row) => (
          <div className="calendarRow" key={hour} style={{ display: "contents" }}>
            <div className="hour">{hour}</div>
            {days.map((day, col) => (
              <div className="slot" key={`${hour}-${day}`}>
                {row === 0 && col === 0 ? <Event title="Diagnóstico" client="Cliente Norte" accent="#6b9d74" onClick={() => onClient("client_norte")}/> : null}
                {row === 1 && col === 0 ? <Event title="Aprobar campaña" client="Lama Travelers" accent="#8666d8" onClick={() => onClient("client_lama")}/> : null}
                {row === 2 && col === 0 ? <Event title="Propuesta B2B" client="Hotel Experience" accent="#477fbe" onClick={() => onClient("client_hotel")}/> : null}
                {row === 3 && col === 0 ? <Event title="Artifact review" client="LINK Empresa" accent="#6c5ce7" onClick={() => onClient("client_link_empresa")}/> : null}
              </div>
            ))}
          </div>
        ))}
      </div></div>
    </div>
  </>;
}

function ExplorerView({ folders, folder, setFolder, onAdd, allowedClientIds }: { folders: string[]; folder: string; setFolder: (folder: string) => void; onAdd: () => void; allowedClientIds: Set<string> }) {
  return <><PageHead title="Explorador" description="Carpetas virtuales sobre Supabase para memorias, proyectos y resultados. La carpeta es una unidad de contexto, no la fuente de verdad."><button className="btn" onClick={onAdd}>＋ Carpeta</button><button className="btn primary">Abrir con ChatGPT</button></PageHead><div className="explorer"><div className="folders">{folders.map((item, index) => <button key={`${item}-${index}`} className={folder === item ? "active" : ""} onClick={() => setFolder(item)}>{index % 3 === 0 ? "⌄" : "▸"} {item}</button>)}</div><div className="explorerMain"><div className="explorerHead"><div><small>LINK CONTROL CENTRAL / {folder}</small><h3>Resultados y contexto</h3></div><div className="actions"><button className="btn">Renombrar</button><button className="btn">Archivar</button></div></div><ArtifactGrid limit={6} allowedClientIds={allowedClientIds}/></div></div></>;
}

function ProductsView({ allowedClientIds }: { allowedClientIds: Set<string> }) { return <><PageHead title="Productos" description="Todo resultado generado queda versionado y relacionado con cliente, necesidad, etapa, acción y herramienta."><button className="btn">Versiones</button><button className="btn primary">＋ Registrar artifact</button></PageHead><div className="card"><ArtifactGrid allowedClientIds={allowedClientIds}/></div></>; }

function IntelligenceView({ onChat }: { onChat: () => void }) {
  return <><PageHead title="Inteligencia" description="Supabase separa hechos, memoria e inteligencia. Nada entra automáticamente a la memoria maestra."><button className="btn">Candidatos</button><button className="btn primary" onClick={onChat}>Analizar con ChatGPT</button></PageHead><div className="intelGrid"><div className="card"><div className="cardHead"><h3>Candidatos a memoria central</h3><span>requieren filtro</span></div><IntelCard eyebrow="Patrón · LINK Empresa" title="La website de entrada funciona mejor como inicio de relación, no como producto aislado." text="Propuesta transversal: entrada pequeña → diagnóstico → evolución." evidence="4 proyectos · confianza 0.86"/><IntelCard eyebrow="Protocolo · Infraestructura" title="Resolver identidad y scope antes de operar GitHub, Supabase o Vercel." text="Evita trabajar accidentalmente sobre el repo, proyecto o cliente equivocado." evidence="confianza 0.94"/></div><div className="card"><div className="cardHead"><h3>Constitución de memoria</h3><span>núcleo</span></div>{[["Principios","Reglas de gobierno, seguridad e identidad."],["Protocolos","Cómo ejecutamos acciones repetibles."],["Arquitectura","Cómo se conectan las piezas."],["Patrones","Soluciones comprobadas y reutilizables."],["Evolución","Qué cambió, por qué y qué reemplazó."]].map(([a,b]) => <div className="infoRow" key={a}><span className="tag">{a}</span><div><strong>{b}</strong><small>Versionado · auditable · gobernado por Central</small></div></div>)}</div></div></>;
}

function GatewaysView() { return <><PageHead title="Gateway Registry" description="Las tecnologías y alianzas viven alrededor del núcleo. Se pueden activar, limitar o retirar sin modificar LINK CONTROL CENTRAL."><button className="btn primary">＋ Gateway</button></PageHead><div className="gatewayGrid">{GATEWAYS.map((gateway) => <div className="gateway" key={gateway.id}><div className="gatewayTitle"><strong>{gateway.name}</strong><span className={`status ${healthClass(gateway.health)}`}/></div><p>{gateway.description}</p><div className="permList">{gateway.permissions.map((p) => <span key={p}>{p}</span>)}</div></div>)}</div></>; }

function InfrastructureView({ onChat }: { onChat: () => void }) { return <><PageHead title="Infraestructura" description="Dos data planes gratuitos, múltiples Controles lógicos: Central comparte LINK PREVIEW y la operación especializada entra únicamente por Gateway."><button className="btn primary" onClick={onChat}>Diagnosticar con ChatGPT</button></PageHead><div className="grid"><div className="card s6"><div className="cardHead"><h3>Supabase · Central Data Plane</h3><span>FREE #1</span></div><InfraRow name="LINK PREVIEW → LINK CONTROL CENTRAL" text="CRM, controls/scopes, Preview Studio, memoria, inteligencia, artifacts y Event Bus." state="ok"/><div className="infoRow"><span className="status ok"/><div className="grow"><strong>Regla de crecimiento</strong><small>Nuevo negocio = control_id + membership + RLS. No se crea otro proyecto Supabase.</small></div><span className="tag">MULTI-TENANT</span></div></div><div className="card s6"><div className="cardHead"><h3>Supabase · Operational Data Plane</h3><span>FREE #2</span></div><InfraRow name="Proyecto operacional existente" text="Hotel Experience, turismo, reservas, proveedores, pagos, comisiones y políticas." state="ok"/><div className="infoRow"><span className="status ok"/><div className="grow"><strong>Acceso desde Central</strong><small>Solo mediante Gateway server-side y scope autorizado; no se duplica la operación en la memoria central.</small></div><span className="tag">GATEWAY</span></div></div><div className="card tableWrap" style={{gridColumn:"1 / -1"}}><table><thead><tr><th>Control</th><th>ChatGPT</th><th>Data plane</th><th>GitHub</th><th>Vercel</th><th>MCP</th><th>Owner</th></tr></thead><tbody>{CONTROLS.map((control) => <tr key={control.id}><td>{control.name}</td><td>{control.chatgptConnection}</td><td>Central compartido <HealthDot value={control.supabase}/></td><td><HealthDot value={control.github}/></td><td><HealthDot value={control.vercel}/></td><td><HealthDot value={control.mcp}/></td><td>{control.owner}</td></tr>)}</tbody></table></div></div></>; }

function ControlsView() { return <><PageHead title="Controles" description="Cada negocio hereda el contrato central, tiene memoria local, complemento propio y scope aislado para el ChatGPT autorizado."><button className="btn primary">＋ Crear Control</button></PageHead><div className="controlGrid">{CONTROLS.map((control) => <div className="controlCard" key={control.id}><h3>{control.name}</h3><p>scope: {control.scope} · {control.chatgptConnection}</p><div className="healthGrid"><span>Supabase <HealthDot value={control.supabase}/></span><span>GitHub <HealthDot value={control.github}/></span><span>Vercel <HealthDot value={control.vercel}/></span><span>MCP <HealthDot value={control.mcp}/></span></div><small>Owner técnico: {control.owner}</small></div>)}</div></>; }

function ActivityView() { return <><PageHead title="Actividad y Event Bus" description="Todo cambio importante deja un evento auditable: quién, qué, dónde, cuándo y resultado."/><div className="card tableWrap"><table><thead><tr><th>Hora</th><th>Evento</th><th>Actor</th><th>Control</th><th>Objeto</th><th>Resultado</th></tr></thead><tbody><tr><td>23:41</td><td>artifact.created</td><td>ChatGPT Personal</td><td>LINK Empresa</td><td>Campaña entrada v4</td><td><span className="tag">ok</span></td></tr><tr><td>22:16</td><td>gesture.completed</td><td>Gonzalo</td><td>Lama Travelers</td><td>Aprobar campaña</td><td><span className="tag">ok</span></td></tr><tr><td>21:52</td><td>memory.proposed</td><td>ChatGPT Negocio</td><td>LINK Empresa</td><td>Patrón adquisición</td><td><span className="tag">review</span></td></tr><tr><td>20:44</td><td>deployment.failed</td><td>Vercel Gateway</td><td>Lama Travelers</td><td>production</td><td><span className="tag">warning</span></td></tr></tbody></table></div></>; }

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) { return <div className="metric"><small>{label}</small><strong>{value}</strong><span>{sub}</span></div>; }
function Alert({ status, title, text, action, onClick }: { status: string; title: string; text: string; action: string; onClick: () => void }) { return <div className="infoRow"><span className={`status ${status}`}/><div className="grow"><strong>{title}</strong><small>{text}</small></div><button className="btn" onClick={onClick}>{action}</button></div>; }
function Work({ time, title, meta, kind }: { time: string; title: string; meta: string; kind: string }) { return <div className="work"><span>{time}</span><div><strong>{title}</strong><small>{meta}</small></div><b className="tag">{kind}</b></div>; }
function InfraRow({ name, text, state }: { name: string; text: string; state: Health }) { return <div className="infoRow"><span className={`status ${healthClass(state)}`}/><div className="grow"><strong>{name}</strong><small>{text}</small></div><span className="tag">{state === "ok" ? "OK" : "CHECK"}</span></div>; }
function Field({ label, value }: { label: string; value: string }) { return <div className="field"><label>{label}</label><strong>{value}</strong></div>; }
function ActionItem({ title, done, kind, gesture }: { title: string; done: boolean; kind: string; gesture?: boolean }) { return <div className={`actionItem ${gesture ? "gesture" : ""}`}><span className={`check ${done ? "done" : ""}`}>{done ? "✓" : ""}</span><div><strong>{title}</strong><small>{done ? "Completada" : "Pendiente"}</small></div><b className="tag">{kind}</b></div>; }
function Event({ title, client, accent, onClick }: { title: string; client: string; accent: string; onClick: () => void }) { return <button className="event" style={{ borderColor: accent }} onClick={onClick}><strong>{title}</strong><span>{client}</span></button>; }
function ArtifactGrid({ limit, allowedClientIds }: { limit?: number; allowedClientIds?: Set<string> }) { const scoped = allowedClientIds && allowedClientIds.size < CLIENTS.length ? ARTIFACTS.filter((item) => item.clientId && allowedClientIds.has(item.clientId)) : ARTIFACTS; const list = limit ? scoped.slice(0, limit) : scoped; return <div className="artifactGrid">{list.map((item) => <div className="artifact" key={item.id}><div className="thumb"><span>{item.type}</span></div><div className="artifactInfo"><strong>{item.name}</strong><small>{item.version} · {item.stage === "system" ? "Sistema" : STAGE_BY_KEY[item.stage].name} · {item.source}</small></div></div>)}</div>; }
function IntelCard({ eyebrow, title, text, evidence }: { eyebrow: string; title: string; text: string; evidence: string }) { return <div className="intelCard"><small>{eyebrow}</small><h4>{title}</h4><p>{text}</p><span>{evidence}</span><div className="actions topGap"><button className="btn">Mantener local</button><button className="btn primary">Promover</button></div></div>; }
function HealthDot({ value }: { value: Health }) { return <span className="healthDot"><i className={`status ${healthClass(value)}`}/>{value}</span>; }
