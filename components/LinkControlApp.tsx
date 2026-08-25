"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { STAGES, STAGE_BY_KEY } from "@/lib/crm/stages";
import type { StageKey } from "@/lib/types";

type ViewKey = "clients" | "work" | "calendar" | "activity";

type ClientRow = {
  id: string;
  name: string;
  slug?: string | null;
  status: string;
  short_code?: string | null;
  accent?: string | null;
  control_id?: string | null;
};

type CycleRow = {
  id: string;
  client_id: string;
  need_id?: string | null;
  product_id?: string | null;
  stage: StageKey;
  progress: number;
  next_milestone?: string | null;
  status: string;
};

type NeedRow = {
  id: string;
  client_id: string;
  title: string;
  description?: string | null;
  status: string;
};

type ProductRow = {
  id: string;
  name: string;
  description?: string | null;
  product_type?: string | null;
  active?: boolean;
  metadata?: Record<string, unknown> | null;
};

type WorkItemRow = {
  id: string;
  client_id?: string | null;
  cycle_id?: string | null;
  stage?: StageKey | null;
  kind: "action" | "task" | "gesture" | string;
  title: string;
  description?: string | null;
  due_at?: string | null;
  priority?: number | null;
  status: string;
  source?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type EventRow = {
  id: string;
  client_id?: string | null;
  event_type: string;
  actor?: string | null;
  object_type?: string | null;
  object_id?: string | null;
  payload?: Record<string, unknown> | null;
  created_at: string;
};

type CentralData = {
  ok: boolean;
  configured?: boolean;
  clients: ClientRow[];
  cycles: CycleRow[];
  needs: NeedRow[];
  products: ProductRow[];
  workItems: WorkItemRow[];
  events: EventRow[];
};

const NAV: Array<{ key: ViewKey; label: string; icon: string }> = [
  { key: "clients", label: "Clientes", icon: "◎" },
  { key: "work", label: "Trabajo", icon: "▦" },
  { key: "calendar", label: "Calendario", icon: "□" },
  { key: "activity", label: "Actividad", icon: "≡" },
];

const stageNumber: Record<StageKey, string> = {
  understand: "①",
  organize: "②",
  build: "③",
  activate: "④",
  support: "⑤",
  scale: "⑥",
};

function safeStage(value?: string | null): StageKey {
  return STAGES.some((stage) => stage.key === value) ? (value as StageKey) : "understand";
}

function fmtDate(value?: string | null) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function shortCode(client: ClientRow) {
  return client.short_code || client.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

async function postAction(action: string, payload: Record<string, unknown>) {
  const response = await fetch("/api/central", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const body = await response.json();
  if (!response.ok || !body.ok) throw new Error(body.error || `HTTP ${response.status}`);
  return body;
}

export default function LinkControlApp() {
  const [view, setView] = useState<ViewKey>("clients");
  const [data, setData] = useState<CentralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/central", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error || `HTTP ${response.status}`);
      setData(body as CentralData);
      setClientId((current) => current || body.clients?.[0]?.id || null);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "No fue posible conectar con LINK CONTROL CENTRAL");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const filteredClients = useMemo(() => {
    const items = data?.clients ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((client) => client.name.toLowerCase().includes(q) || client.slug?.toLowerCase().includes(q));
  }, [data, search]);

  const selectedClient = useMemo(
    () => data?.clients.find((client) => client.id === clientId) ?? filteredClients[0] ?? null,
    [data, clientId, filteredClients],
  );

  const activeCycle = useMemo(
    () => data?.cycles.find((cycle) => cycle.client_id === selectedClient?.id && cycle.status === "active") ?? null,
    [data, selectedClient],
  );

  const need = useMemo(
    () => data?.needs.find((item) => item.id === activeCycle?.need_id) ?? data?.needs.find((item) => item.client_id === selectedClient?.id) ?? null,
    [data, activeCycle, selectedClient],
  );

  const product = useMemo(
    () => data?.products.find((item) => item.id === activeCycle?.product_id) ?? null,
    [data, activeCycle],
  );

  const clientWork = useMemo(
    () => (data?.workItems ?? []).filter((item) => item.client_id === selectedClient?.id && (!activeCycle || item.cycle_id === activeCycle.id)),
    [data, selectedClient, activeCycle],
  );

  async function run(action: string, payload: Record<string, unknown>, success: string) {
    setError(null);
    try {
      await postAction(action, payload);
      await reload();
      setNotice(success);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "La operación falló");
      return false;
    }
  }

  async function createClient() {
    const name = window.prompt("Nombre del cliente o empresa");
    if (!name?.trim()) return;
    const needTitle = window.prompt("¿Cuál es su necesidad principal?", "Necesidad por diagnosticar") || "Necesidad por diagnosticar";
    const productName = window.prompt("¿Cuál es el producto o servicio inicial?", "Producto por definir") || "Producto por definir";
    setError(null);
    try {
      const created = await postAction("create_client", { name: name.trim() });
      await postAction("create_cycle", {
        clientId: created.client.id,
        need: needTitle,
        product: productName,
        stage: "understand",
        nextMilestone: "Completar diagnóstico inicial",
      });
      await reload();
      setClientId(created.client.id);
      setNotice("Cliente creado y ciclo inicial registrado en Supabase");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible crear el cliente");
    }
  }

  async function createCycle(client: ClientRow) {
    const needTitle = window.prompt("Necesidad principal", "Nueva necesidad");
    if (!needTitle?.trim()) return;
    const productName = window.prompt("Producto o servicio", "Producto por definir");
    if (!productName?.trim()) return;
    await run("create_cycle", { clientId: client.id, need: needTitle, product: productName, stage: "understand" }, "Nuevo ciclo creado");
  }

  async function editNeed() {
    if (!need) return;
    const title = window.prompt("Necesidad", need.title);
    if (!title?.trim()) return;
    await run("update_need", { needId: need.id, title, description: need.description ?? null }, "Necesidad actualizada");
  }

  async function editProduct() {
    if (!product) return;
    const name = window.prompt("Producto", product.name);
    if (!name?.trim()) return;
    await run("update_product", { productId: product.id, name, description: product.description ?? null }, "Producto actualizado");
  }

  async function editMilestone() {
    if (!activeCycle) return;
    const value = window.prompt("Próximo hito", activeCycle.next_milestone || "");
    if (value === null) return;
    await run("update_cycle", { cycleId: activeCycle.id, nextMilestone: value }, "Próximo hito actualizado");
  }

  async function addWork(kind: "action" | "task" | "gesture") {
    if (!selectedClient || !activeCycle) return;
    const title = window.prompt(kind === "gesture" ? "Nombre del gesto" : kind === "task" ? "Nombre de la tarea" : "Nombre de la acción");
    if (!title?.trim()) return;
    const dueRaw = window.prompt("Fecha y hora opcional (AAAA-MM-DD HH:MM). Déjalo vacío si no corresponde.", "");
    const dueAt = dueRaw?.trim() ? new Date(dueRaw.replace(" ", "T")).toISOString() : null;
    await run("create_work_item", {
      clientId: selectedClient.id,
      cycleId: activeCycle.id,
      stage: activeCycle.stage,
      kind,
      title,
      dueAt,
      source: "manual",
    }, `${kind === "gesture" ? "Gesto" : kind === "task" ? "Tarea" : "Acción"} registrado`);
  }

  async function toggleWork(item: WorkItemRow) {
    await run("set_work_status", { workItemId: item.id, status: item.status === "done" ? "pending" : "done" }, item.status === "done" ? "Trabajo marcado pendiente" : "Trabajo completado");
  }

  async function advanceStage() {
    if (!activeCycle) return;
    const stage = safeStage(activeCycle.stage);
    const currentActions = clientWork.filter((item) => item.kind === "action" && safeStage(item.stage) === stage);
    const incomplete = currentActions.filter((item) => item.status !== "done");
    if (incomplete.length) {
      setNotice(`No avanza: faltan ${incomplete.length} acciones obligatorias de ${STAGE_BY_KEY[stage].name}.`);
      return;
    }
    const currentIndex = STAGES.findIndex((item) => item.key === stage);
    const next = STAGES[currentIndex + 1];
    if (!next) {
      setNotice("El ciclo ya está en Escalar. La siguiente decisión es abrir una nueva necesidad/ciclo.");
      return;
    }
    await run("update_cycle", { cycleId: activeCycle.id, stage: next.key }, `Cliente avanzado a ${next.name}`);
  }

  if (loading) {
    return <ConnectionScreen title="Conectando LINK CONTROL…" text="Verificando el Supabase Central. No se cargan datos demo." />;
  }

  if (error && !data) {
    return <ConnectionScreen title="LINK CONTROL no está conectado" text={`No mostramos información simulada. Backend: ${error}`} retry={reload} />;
  }

  if (!data) return null;

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="brand"><div className="logo">LC</div><div><strong>LINK CONTROL</strong><small>Operación real · Supabase</small></div></div>
        <div className="sideScroll">
          <div className="sideTitle">Operación</div>
          {NAV.map((item) => (
            <button key={item.key} className={`nav ${view === item.key ? "active" : ""}`} onClick={() => setView(item.key)}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
          <div className="sideTitle">Clientes activos</div>
          {data.clients.map((client) => (
            <button key={client.id} className="treeItem" onClick={() => { setClientId(client.id); setView("clients"); }}>
              <i style={{ background: client.accent || "#777" }} />{client.name}
            </button>
          ))}
        </div>
        <div className="sidebarFoot"><div className="identity"><div className="avatar">LC</div><div><strong>Fuente de verdad</strong><span>Supabase conectado</span></div></div></div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="crumb"><b>LINK CONTROL</b><span>/</span>{NAV.find((item) => item.key === view)?.label}</div>
          <div className="search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente…" /></div>
          <button className="topBtn" onClick={() => void reload()}>Actualizar</button>
        </header>

        <main className="content">
          {notice ? <div style={{ marginBottom: 14, padding: "10px 14px", border: "1px solid var(--line)", borderRadius: 12, background: "#fbfbfa", fontSize: 12 }}>{notice}</div> : null}
          {error ? <div style={{ marginBottom: 14, padding: "10px 14px", border: "1px solid #d7a8a4", borderRadius: 12, background: "#fff8f7", fontSize: 12 }}>{error}</div> : null}

          {view === "clients" ? (
            <ClientsView
              clients={filteredClients}
              selected={selectedClient}
              cycle={activeCycle}
              need={need}
              product={product}
              work={clientWork}
              onSelect={setClientId}
              onCreateClient={createClient}
              onCreateCycle={createCycle}
              onEditNeed={editNeed}
              onEditProduct={editProduct}
              onEditMilestone={editMilestone}
              onAddWork={addWork}
              onToggleWork={toggleWork}
              onAdvance={advanceStage}
            />
          ) : null}
          {view === "work" ? <WorkView data={data} onSelect={(id) => { setClientId(id); setView("clients"); }} /> : null}
          {view === "calendar" ? <CalendarView data={data} onSelect={(id) => { setClientId(id); setView("clients"); }} /> : null}
          {view === "activity" ? <ActivityView data={data} /> : null}
        </main>
      </section>
    </div>
  );
}

function ConnectionScreen({ title, text, retry }: { title: string; text: string; retry?: () => void | Promise<void> }) {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <section style={{ width: "min(620px,100%)", border: "1px solid var(--line)", borderRadius: 22, padding: 28, background: "#fbfbfa", boxShadow: "var(--shadow)" }}>
        <div className="logo" style={{ marginBottom: 20 }}>LC</div>
        <h1 style={{ margin: 0, fontSize: 28, letterSpacing: "-.04em" }}>{title}</h1>
        <p style={{ color: "var(--muted)", lineHeight: 1.55 }}>{text}</p>
        <p style={{ color: "var(--muted)", fontSize: 12 }}>Regla LINK: si una función no trabaja con datos reales, no la mostramos como operativa.</p>
        {retry ? <button className="btn primary" onClick={() => void retry()}>Reintentar conexión</button> : null}
      </section>
    </main>
  );
}

function ClientsView(props: {
  clients: ClientRow[];
  selected: ClientRow | null;
  cycle: CycleRow | null;
  need: NeedRow | null;
  product: ProductRow | null;
  work: WorkItemRow[];
  onSelect: (id: string) => void;
  onCreateClient: () => void;
  onCreateCycle: (client: ClientRow) => void;
  onEditNeed: () => void;
  onEditProduct: () => void;
  onEditMilestone: () => void;
  onAddWork: (kind: "action" | "task" | "gesture") => void;
  onToggleWork: (item: WorkItemRow) => void;
  onAdvance: () => void;
}) {
  const { clients, selected, cycle, need, product, work } = props;
  return (
    <>
      <div className="pageHead"><div><h1>Clientes</h1><p>Necesidad → producto → etapa → trabajo → siguiente paso. Todo lo que ves aquí proviene de Supabase.</p></div><div className="actions"><button className="btn primary" onClick={props.onCreateClient}>＋ Cliente</button></div></div>
      <div className="crmLayout">
        <div className="crmList">
          {clients.length ? clients.map((client) => {
            const clientCycle = cycle?.client_id === client.id ? cycle : null;
            return <button key={client.id} className={`clientRow ${selected?.id === client.id ? "active" : ""}`} onClick={() => props.onSelect(client.id)}><i style={{ background: client.accent || "#777" }} /><span><strong>{client.name}</strong><small>{clientCycle ? `${stageNumber[safeStage(clientCycle.stage)]} ${STAGE_BY_KEY[safeStage(clientCycle.stage)].name} · ${clientCycle.progress ?? 0}%` : "Sin ciclo activo"}</small></span></button>;
          }) : <p style={{ color: "var(--muted)", fontSize: 12 }}>No hay clientes que coincidan con la búsqueda.</p>}
        </div>
        <div className="crmMain">
          {!selected ? <p>No hay cliente seleccionado.</p> : !cycle ? (
            <div><div className="crmTitle"><div className="clientBadge" style={{ borderColor: `${selected.accent || "#777"}55`, color: selected.accent || "#777" }}>{shortCode(selected)}</div><div><h2>{selected.name}</h2><p>Sin ciclo activo</p></div></div><div style={{ marginTop: 24 }}><button className="btn primary" onClick={() => props.onCreateCycle(selected)}>Crear necesidad y producto inicial</button></div></div>
          ) : (
            <>
              <div className="crmTitle"><div className="clientBadge" style={{ borderColor: `${selected.accent || "#777"}55`, color: selected.accent || "#777" }}>{shortCode(selected)}</div><div><h2>{selected.name}</h2><p>{stageNumber[safeStage(cycle.stage)]} {STAGE_BY_KEY[safeStage(cycle.stage)].name} · {cycle.progress ?? 0}%</p></div></div>
              <div className="stageTrack" style={{ marginTop: 18 }}>{STAGES.map((stage) => { const current = STAGE_BY_KEY[safeStage(cycle.stage)].order; return <div key={stage.key} className={`stage ${stage.order < current ? "done" : ""} ${stage.key === safeStage(cycle.stage) ? "active" : ""}`}><div className="stageN">0{stage.order}</div><strong>{stage.name}</strong><small>{stage.key === safeStage(cycle.stage) ? "etapa actual" : stage.order < current ? "completada" : "pendiente"}</small></div>; })}</div>
              <div className="crmGrid">
                <button className="field" style={{ textAlign: "left" }} onClick={props.onEditNeed}><label>Necesidad · editar</label><strong>{need?.title || "Sin necesidad registrada"}</strong></button>
                <button className="field" style={{ textAlign: "left" }} onClick={props.onEditProduct}><label>Producto · editar</label><strong>{product?.name || "Sin producto registrado"}</strong></button>
                <button className="field" style={{ textAlign: "left", gridColumn: "1 / -1" }} onClick={props.onEditMilestone}><label>Próximo hito · editar</label><strong>{cycle.next_milestone || "Sin próximo hito"}</strong></button>
              </div>
              <div className="grid">
                <div className="card flat s6"><div className="cardHead"><h3>Trabajo de la etapa</h3><span>persistido en Supabase</span></div>{work.filter((item) => item.kind !== "gesture").map((item) => <RealWorkItem key={item.id} item={item} onToggle={props.onToggleWork} />)}<div className="actions topGap"><button className="btn" onClick={() => props.onAddWork("action")}>＋ Acción</button><button className="btn" onClick={() => props.onAddWork("task")}>＋ Tarea</button></div></div>
                <div className="card flat s6"><div className="cardHead"><h3>Gestos</h3><span>compromisos manuales</span></div>{work.filter((item) => item.kind === "gesture").map((item) => <RealWorkItem key={item.id} item={item} onToggle={props.onToggleWork} gesture />)}<button className="btn topGap" onClick={() => props.onAddWork("gesture")}>＋ Gesto</button></div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}><button className="btn primary" onClick={props.onAdvance}>Avanzar a la siguiente etapa</button></div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function RealWorkItem({ item, onToggle, gesture }: { item: WorkItemRow; onToggle: (item: WorkItemRow) => void; gesture?: boolean }) {
  const done = item.status === "done";
  return <div className={`actionItem ${gesture ? "gesture" : ""}`}><button className={`check ${done ? "done" : ""}`} onClick={() => onToggle(item)} aria-label={done ? "Marcar pendiente" : "Marcar completado"}>{done ? "✓" : ""}</button><div><strong>{item.title}</strong><small>{done ? "Completada" : item.due_at ? `Pendiente · ${fmtDate(item.due_at)}` : "Pendiente"}</small></div><b className="tag">{item.kind}</b></div>;
}

function WorkView({ data, onSelect }: { data: CentralData; onSelect: (id: string) => void }) {
  return <><div className="pageHead"><div><h1>Trabajo</h1><p>Kanban real calculado desde los ciclos y work_items actuales.</p></div></div><div className="card kanbanWrap"><div className="kanban">{STAGES.map((stage) => <div className="kcol" key={stage.key}><div className="khead"><strong>0{stage.order} {stage.name}</strong><span>{data.cycles.filter((cycle) => safeStage(cycle.stage) === stage.key && cycle.status === "active").length}</span></div>{data.cycles.filter((cycle) => safeStage(cycle.stage) === stage.key && cycle.status === "active").map((cycle) => { const client = data.clients.find((item) => item.id === cycle.client_id); if (!client) return null; const work = data.workItems.filter((item) => item.cycle_id === cycle.id); return <button key={cycle.id} className="kcard" onClick={() => onSelect(client.id)}><div className="kname"><i style={{ background: client.accent || "#777" }} />{client.name}</div><p>{data.needs.find((item) => item.id === cycle.need_id)?.title || "Sin necesidad registrada"}</p><div className="kfoot"><span>{work.filter((item) => item.status !== "done").length} pendientes</span><b>{cycle.progress ?? 0}%</b></div></button>; })}</div>)}</div></div></>;
}

function CalendarView({ data, onSelect }: { data: CentralData; onSelect: (id: string) => void }) {
  const scheduled = data.workItems.filter((item) => item.due_at).sort((a, b) => new Date(a.due_at || 0).getTime() - new Date(b.due_at || 0).getTime());
  return <><div className="pageHead"><div><h1>Calendario</h1><p>Solo muestra trabajo que tiene fecha real registrada.</p></div></div><div className="card"><div className="cardHead"><h3>Agenda</h3><span>{scheduled.length} elementos con fecha</span></div>{scheduled.length ? scheduled.map((item) => { const client = data.clients.find((entry) => entry.id === item.client_id); return <button key={item.id} className="work" style={{ width: "100%", border: 0, background: "transparent", textAlign: "left" }} onClick={() => item.client_id && onSelect(item.client_id)}><span>{fmtDate(item.due_at)}</span><div><strong>{item.title}</strong><small>{client?.name || "Sin cliente"} · {item.kind}</small></div><b className="tag">{item.status}</b></button>; }) : <p style={{ color: "var(--muted)", fontSize: 12 }}>No hay acciones, tareas o gestos con fecha. Agrégala al crear trabajo.</p>}</div></>;
}

function ActivityView({ data }: { data: CentralData }) {
  return <><div className="pageHead"><div><h1>Actividad</h1><p>Eventos reales registrados por el backend. No se muestran eventos de ejemplo.</p></div></div><div className="card tableWrap"><table><thead><tr><th>Fecha</th><th>Evento</th><th>Actor</th><th>Cliente</th><th>Objeto</th></tr></thead><tbody>{data.events.map((event) => { const client = data.clients.find((item) => item.id === event.client_id); return <tr key={event.id}><td>{fmtDate(event.created_at)}</td><td>{event.event_type}</td><td>{event.actor || "system"}</td><td>{client?.name || "—"}</td><td>{event.object_type || "—"}</td></tr>; })}</tbody></table></div></>;
}
