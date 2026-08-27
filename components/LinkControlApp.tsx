"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Client = {
  id: string; name: string; accent?: string | null; stage?: string; plan?: string; monthlyValue?: number; gestureCount?: number;
  calendar?: { calendar_name?: string; status?: string; timezone?: string; google_calendar_id?: string | null };
  strategy?: any; cycle?: any;
};
type Gesture = {
  id: string; client_id: string; title: string; description?: string | null; status: string; starts_at: string; ends_at?: string | null;
  recurrence_rule?: string | null; sync_status: string; location?: string | null; attendees?: any[]; reminders?: any[]; all_day?: boolean;
};
type Summary = { clients: Client[]; gestures: Gesture[]; operational?: any; services: any[]; recentEvents: any[] };
type View = "Inicio" | "Fichas 360" | "Gestos" | "Calendario" | "Actividad" | "Integraciones";
type CalMode = "Día" | "Semana" | "Mes" | "Año" | "Lista";
type Comment = { id: string; author_name: string; body: string; created_at: string };
type Occurrence = { key: string; gesture: Gesture; date: Date };

const NAV: View[] = ["Inicio", "Fichas 360", "Gestos", "Calendario", "Actividad", "Integraciones"];
const WD: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

export default function LinkControlApp(_props: { initialScope?: string } = {}) {
  const [view, setView] = useState<View>("Inicio");
  const [data, setData] = useState<Summary | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const [menu, setMenu] = useState(false);
  const [newGesture, setNewGesture] = useState(false);
  const [error, setError] = useState("");
  const [pull, setPull] = useState(0);
  const touch = useRef({ x: 0, y: 0, top: false });

  const load = useCallback(async () => {
    const r = await fetch("/api/system-summary", { cache: "no-store" });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Error cargando Control Central");
    setData(j);
    setError("");
  }, []);

  useEffect(() => { load().catch((e) => setError(e.message)); }, [load]);

  const go = (next: View) => { setView(next); setClientId(null); setGesture(null); setMenu(false); };
  const back = () => {
    if (gesture) return setGesture(null);
    if (clientId) return setClientId(null);
    if (view !== "Inicio") return setView("Inicio");
    setMenu(false);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY, top: window.scrollY <= 0 };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (touch.current.top && Math.abs(t.clientX - touch.current.x) < 35) setPull(Math.max(0, Math.min(92, t.clientY - touch.current.y)));
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.x;
    const dy = t.clientY - touch.current.y;
    if (touch.current.x < 28 && dx > 78 && Math.abs(dy) < 75) back();
    if (pull > 64) load().catch((err) => setError(err.message));
    setPull(0);
  };

  if (!data) return <div className="cc-loading">Cargando CONTROL CENTRAL…</div>;
  const client = data.clients.find((c) => c.id === clientId);

  return <div className={`cc-shell ${menu ? "menu-open" : ""}`} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
    <style jsx global>{styles}</style>
    <div className="cc-pull" style={{ transform: `translateY(${Math.min(pull - 50, 34)}px)`, opacity: pull ? 1 : 0 }}>{pull > 64 ? "Soltar para actualizar" : "Actualizar"}</div>
    <button className="cc-scrim" aria-label="Cerrar menú" onClick={() => setMenu(false)} />
    <aside className="cc-menu">
      <div className="cc-menu-head"><b>LINK CONTROL CENTRAL</b><button onClick={() => setMenu(false)}>×</button></div>
      {NAV.map((n) => <button key={n} className={(view === n && !clientId) ? "on" : ""} onClick={() => go(n)}><span>{navIcon(n)}</span><b>{n}</b></button>)}
    </aside>
    <main className="cc-main">
      <header className="cc-topbar">
        <button className="cc-square" onClick={() => setMenu(true)} aria-label="Abrir menú">☰</button>
        <div><small>CONTROL CENTRAL</small><strong>{client?.name || view}</strong></div>
        <button className="cc-add" onClick={() => setNewGesture(true)}>＋ Gesto</button>
      </header>
      {error && <div className="cc-error">{error}</div>}
      {client ? <Ficha360 client={client} gestures={data.gestures.filter((g) => g.client_id === client.id)} open={setGesture} add={() => setNewGesture(true)} reload={load} back={() => setClientId(null)} /> :
        view === "Inicio" ? <Home data={data} pick={setClientId} open={setGesture} reload={load} /> :
        view === "Fichas 360" ? <Fichas data={data} pick={setClientId} /> :
        view === "Gestos" ? <Gestos data={data} open={setGesture} reload={load} /> :
        view === "Calendario" ? <CalendarWorkspace data={data} open={setGesture} add={() => setNewGesture(true)} /> :
        view === "Actividad" ? <Actividad data={data} /> : <Integraciones data={data} />}
    </main>
    {(gesture || clientId || view !== "Inicio") && <button className="cc-nav-cube" onClick={back} aria-label="Volver">‹</button>}
    {newGesture && <NewGesture clients={data.clients} defaultClient={clientId || undefined} close={() => setNewGesture(false)} done={async () => { setNewGesture(false); await load(); }} />}
    {gesture && <GestureSheet gesture={gesture} client={data.clients.find((c) => c.id === gesture.client_id)} close={() => setGesture(null)} done={async () => { setGesture(null); await load(); }} />}
  </div>;
}

function Home({ data, pick, open, reload }: { data: Summary; pick: (id: string) => void; open: (g: Gesture) => void; reload: () => Promise<void> }) {
  return <>
    <Hero title="Centro de Control" text="Operación viva por cliente." />
    <div className="cc-metrics"><Metric label="Clientes" value={data.clients.length} /><Metric label="En producción" value={data.gestures.filter((g) => g.status === "scheduled").length} /><Metric label="Pendientes" value={data.gestures.filter((g) => g.status === "planned").length} /></div>
    <Card title="Fichas 360">{data.clients.map((c) => <ClientCard key={c.id} client={c} onClick={() => pick(c.id)} />)}</Card>
    <Card title="Próximos gestos"><GestureRows gestures={data.gestures.slice(0, 10)} clients={data.clients} open={open} reload={reload} /></Card>
  </>;
}

function Fichas({ data, pick }: { data: Summary; pick: (id: string) => void }) {
  return <><Hero title="Fichas 360" text="Cada cliente es un espacio operacional completo." /><div className="cc-ficha-grid">{data.clients.map((c) => <ClientCard key={c.id} client={c} onClick={() => pick(c.id)} big />)}</div></>;
}

function ClientCard({ client, onClick, big }: { client: Client; onClick: () => void; big?: boolean }) {
  const color = clientColor(client);
  return <button className={`cc-client-card ${big ? "big" : ""}`} onClick={onClick} style={{ borderLeftColor: color }}>
    <span className="cc-client-dot" style={{ background: color }} />
    <div><b>{client.name}</b><small>{client.stage || "Cliente"} · {client.plan || "Sin plan"} · {client.gestureCount || 0} gestos</small></div><strong>360 →</strong>
  </button>;
}

function Ficha360({ client, gestures, open, add, reload, back }: { client: Client; gestures: Gesture[]; open: (g: Gesture) => void; add: () => void; reload: () => Promise<void>; back: () => void }) {
  const [accent, setAccent] = useState(clientColor(client));
  const pending = gestures.filter((g) => g.status === "planned");
  const production = gestures.filter((g) => g.status === "scheduled");
  const done = gestures.filter((g) => g.status === "completed");
  async function saveColor(value: string) {
    setAccent(value);
    await fetch("/api/central", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update_client", clientId: client.id, accent: value }) });
    await reload();
  }
  return <>
    <div className="cc-ficha-head" style={{ borderColor: accent }}><button onClick={back}>‹ Fichas</button><div><small>FICHA 360</small><h1>{client.name}</h1></div><label>Color <input type="color" value={accent} onChange={(e) => saveColor(e.target.value)} /></label></div>
    <div className="cc-metrics"><Metric label="Pendientes" value={pending.length} /><Metric label="En producción" value={production.length} /><Metric label="Cumplidos" value={done.length} /></div>
    <div className="cc-two"><Card title="Estrategia"><p>{client.strategy?.objective || client.strategy?.approach || "Sin estrategia detallada."}</p><small>Próximo hito</small><b>{client.cycle?.next_milestone || "—"}</b></Card><Card title="Calendar Workspace"><p>{client.calendar?.calendar_name || `${client.name} · Workspace`}</p><small>{client.calendar?.status === "connected" ? "Google Calendar conectado" : "Workspace local activo · Google pendiente"}</small><button className="cc-action" onClick={add}>＋ Crear gesto</button></Card></div>
    <Card title="Todos los gestos"><GestureRows gestures={gestures} clients={[client]} open={open} reload={reload} /></Card>
  </>;
}

function Gestos({ data, open, reload }: { data: Summary; open: (g: Gesture) => void; reload: () => Promise<void> }) {
  return <><Hero title="Gestos" text="Acciones, producción y cumplimiento por cliente." /><Card title="Todos los gestos"><GestureRows gestures={data.gestures} clients={data.clients} open={open} reload={reload} /></Card></>;
}

function GestureRows({ gestures, clients, open, reload }: { gestures: Gesture[]; clients: Client[]; open: (g: Gesture) => void; reload: () => Promise<void> }) {
  async function status(g: Gesture, value: string) {
    await fetch(`/api/gestures/${g.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: value }) });
    await reload();
  }
  if (!gestures.length) return <div className="cc-empty">Sin gestos.</div>;
  return <div className="cc-gesture-list">{gestures.map((g) => {
    const c = clients.find((x) => x.id === g.client_id); const color = clientColor(c);
    return <div className="cc-gesture-row" key={g.id} style={{ borderLeftColor: color }}>
      <button className="cc-gesture-main" onClick={() => open(g)}><span className="cc-client-dot" style={{ background: color }} /><div><b>{clean(g.title)}</b><small>{c?.name || "Cliente"} · {new Date(g.starts_at).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" })}</small></div><strong>›</strong></button>
      <select className={`cc-status ${g.status}`} value={g.status} onChange={(e) => status(g, e.target.value)} aria-label="Estado del gesto"><option value="planned">Pendiente</option><option value="scheduled">En producción</option><option value="completed">Cumplido</option><option value="cancelled">Cancelado</option></select>
    </div>;
  })}</div>;
}

function CalendarWorkspace({ data, open, add }: { data: Summary; open: (g: Gesture) => void; add: () => void }) {
  const [cid, setCid] = useState(data.clients[0]?.id || "");
  const [mode, setMode] = useState<CalMode>("Mes");
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState(new Date());
  const [query, setQuery] = useState("");
  const client = data.clients.find((c) => c.id === cid);
  const color = clientColor(client);
  const gestures = data.gestures.filter((g) => g.client_id === cid && g.status !== "cancelled" && (!query || `${g.title} ${g.description || ""}`.toLowerCase().includes(query.toLowerCase())));
  const month = useMemo(() => expand(gestures, new Date(cursor.getFullYear(), cursor.getMonth(), 1)), [gestures, cursor]);
  const day = month.filter((o) => same(o.date, selected));
  const weekDays = getWeek(selected);
  const week = month.filter((o) => weekDays.some((d) => same(d, o.date)));
  const move = (delta: number) => {
    if (mode === "Año") setCursor(new Date(cursor.getFullYear() + delta, 0, 1));
    else if (mode === "Mes" || mode === "Lista") setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
    else { const d = new Date(selected); d.setDate(d.getDate() + (mode === "Semana" ? 7 : 1) * delta); setSelected(d); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); }
  };
  const today = () => { const d = new Date(); setSelected(d); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); };
  return <>
    <div className="cc-calendar-head"><div><small>CLIENT CALENDAR WORKSPACE</small><h1>Calendario</h1></div><button className="cc-action" onClick={add}>＋ Crear</button></div>
    <div className="cc-calendar-select" style={{ borderLeftColor: color }}><span className="cc-client-dot" style={{ background: color }} /><select value={cid} onChange={(e) => setCid(e.target.value)}>{data.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><small>{client?.calendar?.status === "connected" ? "Google conectado" : "Supabase activo"}</small></div>
    <div className="cc-cal-toolbar"><button onClick={today}>Hoy</button><button onClick={() => move(-1)}>‹</button><button onClick={() => move(1)}>›</button><strong>{calendarTitle(mode, cursor, selected)}</strong><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar" /></div>
    <div className="cc-cal-modes">{(["Día", "Semana", "Mes", "Año", "Lista"] as CalMode[]).map((m) => <button className={mode === m ? "on" : ""} onClick={() => setMode(m)} key={m}>{m}</button>)}</div>
    {mode === "Mes" ? <Month cursor={cursor} occ={month} color={color} open={open} select={(d) => { setSelected(d); setMode("Día"); }} /> : mode === "Día" ? <Agenda day={selected} occ={day} color={color} open={open} /> : mode === "Semana" ? <Week days={weekDays} occ={week} color={color} open={open} select={(d) => { setSelected(d); setMode("Día"); }} /> : mode === "Año" ? <Year year={cursor.getFullYear()} gestures={gestures} choose={(m) => { setCursor(new Date(cursor.getFullYear(), m, 1)); setMode("Mes"); }} /> : <List occ={month} color={color} open={open} />}
  </>;
}

function Month({ cursor, occ, color, open, select }: { cursor: Date; occ: Occurrence[]; color: string; open: (g: Gesture) => void; select: (d: Date) => void }) {
  const days = calendarDays(cursor);
  return <div className="cc-month"><div className="cc-weekdays">{["L", "M", "X", "J", "V", "S", "D"].map((x) => <b key={x}>{x}</b>)}</div><div className="cc-month-grid">{days.map((d) => { const items = occ.filter((o) => same(o.date, d)); return <div className={`cc-day ${d.getMonth() === cursor.getMonth() ? "" : "muted"}`} key={d.toISOString()}><button onClick={() => select(d)}>{d.getDate()}</button><div className="cc-day-events">{items.slice(0, 3).map((o) => <button key={o.key} style={{ background: color }} title={o.gesture.title} onClick={() => open(o.gesture)}><span>{clean(o.gesture.title)}</span></button>)}{items.length > 3 && <small>+{items.length - 3}</small>}</div></div>; })}</div></div>;
}
function Agenda({ day, occ, color, open }: { day: Date; occ: Occurrence[]; color: string; open: (g: Gesture) => void }) { return <div className="cc-agenda"><h3>{new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "long" }).format(day)}</h3>{occ.length ? occ.map((o) => <button key={o.key} onClick={() => open(o.gesture)} style={{ borderLeftColor: color }}><time>{o.gesture.all_day ? "Todo el día" : o.date.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</time><div><b>{clean(o.gesture.title)}</b><small>{o.gesture.location || o.gesture.description || "Sin detalles"}</small></div></button>) : <div className="cc-empty">Sin gestos este día.</div>}</div>; }
function Week({ days, occ, color, open, select }: { days: Date[]; occ: Occurrence[]; color: string; open: (g: Gesture) => void; select: (d: Date) => void }) { return <div className="cc-week-view">{days.map((d) => <section key={d.toISOString()}><button className="cc-week-date" onClick={() => select(d)}><small>{new Intl.DateTimeFormat("es-CL", { weekday: "short" }).format(d)}</small><b>{d.getDate()}</b></button>{occ.filter((o) => same(o.date, d)).map((o) => <button className="cc-week-event" style={{ borderLeftColor: color }} key={o.key} onClick={() => open(o.gesture)}>{clean(o.gesture.title)}</button>)}</section>)}</div>; }
function Year({ year, gestures, choose }: { year: number; gestures: Gesture[]; choose: (m: number) => void }) { return <div className="cc-year">{Array.from({ length: 12 }, (_, m) => <button key={m} onClick={() => choose(m)}><b>{new Intl.DateTimeFormat("es-CL", { month: "long" }).format(new Date(year, m, 1))}</b><small>{expand(gestures, new Date(year, m, 1)).length} gestos</small></button>)}</div>; }
function List({ occ, color, open }: { occ: Occurrence[]; color: string; open: (g: Gesture) => void }) { return <div className="cc-list-cal">{occ.map((o) => <button key={o.key} onClick={() => open(o.gesture)} style={{ borderLeftColor: color }}><time>{o.date.getDate()}<small>{new Intl.DateTimeFormat("es-CL", { month: "short" }).format(o.date)}</small></time><div><b>{clean(o.gesture.title)}</b><small>{o.gesture.description || "Abrir ficha"}</small></div></button>)}</div>; }

function GestureSheet({ gesture, client, close, done }: { gesture: Gesture; client?: Client; close: () => void; done: () => Promise<void> }) {
  const [edit, setEdit] = useState(false); const [title, setTitle] = useState(gesture.title); const [desc, setDesc] = useState(gesture.description || ""); const [start, setStart] = useState(toLocal(gesture.starts_at)); const [end, setEnd] = useState(gesture.ends_at ? toLocal(gesture.ends_at) : ""); const [location, setLocation] = useState(gesture.location || ""); const [comments, setComments] = useState<Comment[]>([]); const [comment, setComment] = useState(""); const color = clientColor(client);
  useEffect(() => { fetch(`/api/gestures/${gesture.id}/comments`, { cache: "no-store" }).then((r) => r.json()).then((j) => setComments(j.comments || [])).catch(() => {}); }, [gesture.id]);
  async function patch(body: any, finish = false) { const r = await fetch(`/api/gestures/${gesture.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); if (r.ok && finish) await done(); }
  async function setStatus(status: string) { await patch({ status }, true); }
  async function save() { await patch({ title, description: desc, startsAt: start, endsAt: end || null, location }, true); }
  async function addComment() { if (!comment.trim()) return; const r = await fetch(`/api/gestures/${gesture.id}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: comment }) }); const j = await r.json(); if (r.ok) { setComments((v) => [...v, j.comment]); setComment(""); } }
  return <div className="cc-sheet-wrap"><aside className="cc-sheet" style={{ borderTopColor: color }}><header><div><small>{client?.name || "Cliente"} · Gesto</small><h2>{clean(gesture.title)}</h2></div><button onClick={close}>×</button></header><div className="cc-sheet-status"><button className={gesture.status === "planned" ? "on" : ""} onClick={() => setStatus("planned")}>Pendiente</button><button className={gesture.status === "scheduled" ? "on" : ""} onClick={() => setStatus("scheduled")}>En producción</button><button className={gesture.status === "completed" ? "on" : ""} onClick={() => setStatus("completed")}>Cumplido</button></div>{edit ? <div className="cc-form"><label>Título<input value={title} onChange={(e) => setTitle(e.target.value)} /></label><label>Inicio<input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /></label><label>Fin<input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} /></label><label>Ubicación<input value={location} onChange={(e) => setLocation(e.target.value)} /></label><label>Fundamento / descripción<textarea value={desc} onChange={(e) => setDesc(e.target.value)} /></label><footer><button onClick={() => setEdit(false)}>Cancelar</button><button onClick={save}>Guardar</button></footer></div> : <><details open><summary>Fundamento / descripción</summary><p>{gesture.description || "Sin fundamento escrito todavía."}</p></details><details><summary>Datos del gesto</summary><div className="cc-facts"><span><small>Inicio</small><b>{new Date(gesture.starts_at).toLocaleString("es-CL")}</b></span><span><small>Fin</small><b>{gesture.ends_at ? new Date(gesture.ends_at).toLocaleString("es-CL") : "—"}</b></span><span><small>Repetición</small><b>{repeatLabel(gesture.recurrence_rule)}</b></span><span><small>Ubicación</small><b>{gesture.location || "—"}</b></span></div></details><button className="cc-action" onClick={() => setEdit(true)}>Editar gesto</button></>}<details className="cc-comments" open><summary>Comentarios ({comments.length})</summary>{comments.map((c) => <article key={c.id}><b>{c.author_name}</b><p>{c.body}</p><small>{new Date(c.created_at).toLocaleString("es-CL")}</small></article>)}<textarea placeholder="Agregar avance, acuerdo o contexto…" value={comment} onChange={(e) => setComment(e.target.value)} /><button className="cc-action" onClick={addComment}>Comentar</button></details></aside></div>;
}

function NewGesture({ clients, defaultClient, close, done }: { clients: Client[]; defaultClient?: string; close: () => void; done: () => Promise<void> }) {
  const [cid, setCid] = useState(defaultClient || clients[0]?.id || ""); const [title, setTitle] = useState(""); const [at, setAt] = useState(toLocal(new Date().toISOString())); const [desc, setDesc] = useState("");
  async function save() { if (!title.trim()) return; const r = await fetch("/api/gestures", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId: cid, title, startsAt: at, description: desc }) }); if (r.ok) await done(); }
  return <div className="cc-modal"><div><h2>Crear gesto</h2><label>Cliente<select value={cid} onChange={(e) => setCid(e.target.value)}>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Gesto<input value={title} onChange={(e) => setTitle(e.target.value)} /></label><label>Fecha y hora<input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} /></label><label>Fundamento / descripción<textarea value={desc} onChange={(e) => setDesc(e.target.value)} /></label><footer><button onClick={close}>Cancelar</button><button onClick={save}>Guardar</button></footer></div></div>;
}

function Actividad({ data }: { data: Summary }) { return <><Hero title="Actividad" text="Trazabilidad del sistema." /><Card title="Event Bus">{data.recentEvents.map((e: any) => <div className="cc-activity" key={e.id}><b>{e.event_type}</b><small>{e.source_provider} · {new Date(e.received_at).toLocaleString("es-CL")}</small></div>)}</Card></>; }
function Integraciones({ data }: { data: Summary }) { return <><Hero title="Integraciones" text="Protocolos, estado y salud técnica." /><div className="cc-service-grid">{data.services.map((s: any) => <Card key={s.key} title={s.label}><p>{s.role}</p><b>{s.status}</b></Card>)}</div></>; }
function Hero({ title, text }: { title: string; text: string }) { return <section className="cc-hero"><small>OPERACIÓN</small><h1>{title}</h1><p>{text}</p></section>; }
function Card({ title, children }: { title: string; children: React.ReactNode }) { return <section className="cc-card"><h2>{title}</h2>{children}</section>; }
function Metric({ label, value }: { label: string; value: string | number }) { return <div className="cc-metric"><small>{label}</small><b>{value}</b></div>; }
function navIcon(v: View) { return v === "Inicio" ? "⌂" : v === "Fichas 360" ? "◎" : v === "Gestos" ? "✓" : v === "Calendario" ? "□" : v === "Actividad" ? "≡" : "⌁"; }
function clientColor(client?: Client) { return client?.accent || "#b78a45"; }
function clean(s: string) { return s.replace(/^[^·]+·\s*/, ""); }
function same(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function getWeek(d: Date) { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return Array.from({ length: 7 }, (_, i) => { const n = new Date(x); n.setDate(x.getDate() + i); return n; }); }
function calendarDays(m: Date) { const f = new Date(m.getFullYear(), m.getMonth(), 1), l = new Date(m.getFullYear(), m.getMonth() + 1, 0), s = new Date(f), e = new Date(l); s.setDate(f.getDate() - ((f.getDay() + 6) % 7)); e.setDate(l.getDate() + (6 - ((l.getDay() + 6) % 7))); const out: Date[] = []; for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) out.push(new Date(d)); return out; }
function expand(gs: Gesture[], m: Date) { const start = new Date(m.getFullYear(), m.getMonth(), 1), end = new Date(m.getFullYear(), m.getMonth() + 1, 0, 23, 59), out: Occurrence[] = []; for (const g of gs) { const base = new Date(g.starts_at), rule = g.recurrence_rule || ""; if (!rule) { if (base >= start && base <= end) out.push({ key: g.id, gesture: g, date: base }); continue; } for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) { if (d < new Date(base.getFullYear(), base.getMonth(), base.getDate())) continue; let ok = false; if (rule.includes("FREQ=DAILY")) ok = true; else if (rule.includes("FREQ=WEEKLY")) { const by = rule.match(/BYDAY=([^;]+)/)?.[1]?.split(","); ok = by ? by.some((x) => WD[x] === d.getDay()) : d.getDay() === base.getDay(); } else if (rule.includes("FREQ=MONTHLY")) ok = d.getDate() === base.getDate(); if (ok) { const x = new Date(d); x.setHours(base.getHours(), base.getMinutes(), 0, 0); out.push({ key: g.id + x.toISOString(), gesture: g, date: x }); } } } return out.sort((a, b) => +a.date - +b.date); }
function calendarTitle(mode: CalMode, cursor: Date, selected: Date) { if (mode === "Año") return String(cursor.getFullYear()); if (mode === "Día") return new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "long" }).format(selected); if (mode === "Semana") return `Semana del ${getWeek(selected)[0].getDate()}`; return new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric" }).format(cursor); }
function repeatLabel(r?: string | null) { if (!r) return "No repite"; if (r.includes("DAILY")) return "Diario"; if (r.includes("WEEKLY")) return "Semanal"; if (r.includes("MONTHLY")) return "Mensual"; return "Recurrente"; }
function toLocal(v: string) { const d = new Date(v), p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; }

const styles = `
*{box-sizing:border-box}html,body{margin:0;background:#101010;color:#f4f4f1;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.cc-shell{min-height:100vh;background:#101010}.cc-main{margin-left:236px;padding:0 24px 42px}.cc-topbar{height:62px;position:sticky;top:0;z-index:20;display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;background:rgba(16,16,16,.94);backdrop-filter:blur(14px);border-bottom:1px solid #292927}.cc-topbar>div{display:grid;min-width:0}.cc-topbar small,.cc-hero small,.cc-calendar-head small,.cc-ficha-head small{font-size:9px;letter-spacing:.15em;color:#7f7f7a}.cc-topbar strong{font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cc-square,.cc-add,.cc-action,.cc-topbar button,.cc-main button,.cc-modal button,.cc-sheet button{min-height:44px;border:1px solid #333;background:#1b1b1a;color:#f1f1ee;border-radius:12px;padding:10px 14px;font:inherit}.cc-square{display:none;min-width:46px}.cc-menu{position:fixed;inset:0 auto 0 0;width:236px;padding:18px 12px;background:#171716;border-right:1px solid #2a2a28;z-index:40}.cc-menu-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}.cc-menu-head b{font-size:12px;letter-spacing:.05em}.cc-menu-head button{display:none}.cc-menu>button{width:100%;display:flex;align-items:center;gap:12px;min-height:46px;border:0;background:transparent;color:#aaa;border-radius:11px;text-align:left;padding:10px 12px}.cc-menu>button.on{background:#292927;color:#fff}.cc-menu>button b{font-weight:500}.cc-scrim{display:none}.cc-hero{padding:24px 0 14px}.cc-hero h1,.cc-calendar-head h1,.cc-ficha-head h1{font-size:30px;line-height:1.05;margin:4px 0 6px}.cc-hero p{color:#8d8d88;margin:0}.cc-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}.cc-metric,.cc-card{border:1px solid #2d2d2b;background:#181817;border-radius:16px}.cc-metric{padding:13px}.cc-metric small{display:block;color:#7d7d78;font-size:10px;margin-bottom:7px}.cc-metric b{font-size:22px}.cc-card{padding:15px;margin-bottom:12px}.cc-card h2{font-size:17px;margin:0 0 10px}.cc-card p{color:#aaa;line-height:1.45}.cc-two{display:grid;grid-template-columns:1fr 1fr;gap:12px}.cc-client-card{width:100%;min-height:62px;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;text-align:left;border:1px solid #2d2d2b;border-left:4px solid;background:#181817;color:#eee;border-radius:14px;padding:12px 14px;margin-bottom:8px}.cc-client-card.big{min-height:82px}.cc-client-card div{display:grid;gap:4px}.cc-client-card small,.cc-gesture-main small{color:#868681}.cc-client-dot{width:9px;height:9px;border-radius:50%;display:inline-block;flex:0 0 auto}.cc-ficha-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.cc-gesture-list{display:grid}.cc-gesture-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;border-bottom:1px solid #2b2b29;border-left:4px solid;padding:6px 0 6px 10px}.cc-gesture-main{display:grid!important;grid-template-columns:auto 1fr auto!important;gap:10px;align-items:center;width:100%;text-align:left;background:transparent!important;border:0!important;padding:10px 4px!important;min-height:58px!important}.cc-gesture-main>div{display:grid;gap:4px}.cc-status{min-height:44px;border:1px solid #343431;border-radius:11px;background:#20201e;color:#ddd;padding:8px;max-width:138px}.cc-status.scheduled{border-color:#b88b45}.cc-status.completed{border-color:#4d9263}.cc-ficha-head{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:13px;border-bottom:2px solid;padding:18px 0 12px;margin-bottom:12px}.cc-ficha-head>button{background:transparent;border:0;color:#aaa}.cc-ficha-head label{font-size:10px;color:#888;display:grid;gap:4px}.cc-ficha-head input[type=color]{width:48px;height:34px;border:0;background:none}.cc-calendar-head{display:flex;align-items:end;justify-content:space-between;padding:20px 0 10px}.cc-calendar-select{display:flex;align-items:center;gap:10px;border:1px solid #2d2d2b;border-left:4px solid;border-radius:13px;padding:9px 12px;margin-bottom:8px}.cc-calendar-select select,.cc-cal-toolbar input,.cc-modal input,.cc-modal select,.cc-modal textarea,.cc-sheet input,.cc-sheet textarea{background:#121211;border:1px solid #333;color:#eee;border-radius:10px;padding:10px;font:inherit}.cc-calendar-select select{flex:1}.cc-calendar-select small{color:#888}.cc-cal-toolbar{display:grid;grid-template-columns:auto auto auto 1fr 200px;gap:7px;align-items:center;padding:7px 0}.cc-cal-toolbar strong{text-transform:capitalize}.cc-cal-modes{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin:4px 0 10px}.cc-cal-modes button.on{background:#f2f1ed;color:#111}.cc-month{border:1px solid #2d2d2b;border-radius:15px;overflow:hidden}.cc-weekdays,.cc-month-grid{display:grid;grid-template-columns:repeat(7,1fr)}.cc-weekdays b{padding:8px;text-align:center;color:#777;font-size:10px}.cc-day{min-height:104px;border-top:1px solid #292927;border-right:1px solid #292927;padding:5px}.cc-day.muted{opacity:.35}.cc-day>button{min-height:30px!important;padding:3px 7px!important;background:transparent!important;border:0!important}.cc-day-events{display:grid;gap:3px}.cc-day-events>button{min-height:22px!important;padding:3px 5px!important;border:0!important;border-radius:5px!important;text-align:left;font-size:9px}.cc-day-events>button span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cc-agenda,.cc-list-cal{display:grid;gap:7px}.cc-agenda h3{text-transform:capitalize}.cc-agenda>button,.cc-list-cal>button{display:grid;grid-template-columns:92px 1fr;gap:12px;align-items:center;text-align:left;border-left:4px solid!important}.cc-agenda div,.cc-list-cal div{display:grid;gap:4px}.cc-agenda small,.cc-list-cal small{color:#888}.cc-list-cal time{font-size:20px}.cc-list-cal time small{font-size:10px;display:block}.cc-week-view{display:grid;grid-template-columns:repeat(7,minmax(130px,1fr));gap:2px;overflow:auto}.cc-week-view section{background:#181817;border-radius:10px;min-height:300px;padding:5px}.cc-week-date{width:100%;background:transparent!important;border:0!important;display:grid}.cc-week-event{width:100%;text-align:left;border-left:4px solid!important;margin-top:4px;font-size:10px}.cc-year{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.cc-year button{display:grid;gap:18px;text-align:left;min-height:92px}.cc-year b{text-transform:capitalize}.cc-year small{color:#888}.cc-empty{padding:26px;text-align:center;color:#777}.cc-service-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.cc-activity{padding:10px 0;border-bottom:1px solid #292927;display:grid;gap:4px}.cc-activity small{color:#888}.cc-sheet-wrap,.cc-modal{position:fixed;inset:0;background:rgba(0,0,0,.66);z-index:80}.cc-sheet-wrap{display:flex;justify-content:flex-end}.cc-sheet{width:min(620px,100%);height:100%;overflow:auto;background:#181817;border-top:4px solid;padding:18px 18px max(24px,env(safe-area-inset-bottom));box-shadow:-15px 0 40px rgba(0,0,0,.35)}.cc-sheet>header{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #2c2c2a;padding-bottom:10px}.cc-sheet h2{font-size:25px;margin:4px 0}.cc-sheet header small{color:#888;letter-spacing:.12em;font-size:9px}.cc-sheet-status{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:12px 0}.cc-sheet-status button.on{background:#f2f1ed;color:#111}.cc-sheet details{border-top:1px solid #2d2d2b;padding:13px 0}.cc-sheet summary{font-weight:650;cursor:pointer}.cc-sheet details p{color:#aaa;line-height:1.55;white-space:pre-wrap}.cc-facts{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px}.cc-facts span{display:grid;gap:5px;padding:10px;border:1px solid #2d2d2b;border-radius:10px}.cc-facts small{color:#777}.cc-form,.cc-modal>div{display:grid;gap:9px}.cc-form label,.cc-modal label{display:grid;gap:5px;color:#999;font-size:11px}.cc-form textarea,.cc-modal textarea,.cc-comments textarea{min-height:90px}.cc-form footer,.cc-modal footer{display:flex;justify-content:flex-end;gap:8px}.cc-comments article{padding:9px 0;border-bottom:1px solid #292927}.cc-comments article p{color:#ddd;margin:5px 0}.cc-comments article small{color:#777}.cc-comments textarea{width:100%;margin:10px 0}.cc-modal{display:grid;place-items:center;padding:16px}.cc-modal>div{width:min(520px,100%);background:#1a1a19;border:1px solid #333;border-radius:18px;padding:18px}.cc-error{background:#40211d;padding:10px;border-radius:10px;margin-top:8px}.cc-nav-cube{position:fixed;left:16px;bottom:max(18px,env(safe-area-inset-bottom));z-index:60;width:50px;height:50px;border-radius:15px!important;background:#050505!important;border:1px solid #333!important;font-size:30px!important;padding:0!important;box-shadow:0 8px 24px rgba(0,0,0,.3)}.cc-pull{position:fixed;top:max(8px,env(safe-area-inset-top));left:50%;translate:-50% 0;z-index:100;background:#222;border:1px solid #3a3a37;border-radius:20px;padding:7px 12px;font-size:10px;transition:opacity .15s}.cc-loading{min-height:100vh;display:grid;place-items:center;background:#101010;color:#eee}
@media(max-width:800px){.cc-main{margin-left:0;padding:0 12px 28px}.cc-menu{width:min(86vw,320px);transform:translateX(-104%);transition:transform .2s ease;padding-top:max(14px,env(safe-area-inset-top))}.menu-open .cc-menu{transform:translateX(0)}.cc-menu-head button{display:block}.cc-scrim{position:fixed;inset:0;z-index:35;background:rgba(0,0,0,.52);border:0}.menu-open .cc-scrim{display:block}.cc-square{display:block}.cc-topbar{height:auto;min-height:52px;padding-top:max(2px,env(safe-area-inset-top));padding-bottom:4px}.cc-topbar small{display:none}.cc-topbar strong{font-size:17px}.cc-add{min-width:94px;padding:9px 10px}.cc-hero{padding:14px 0 10px}.cc-hero h1,.cc-calendar-head h1,.cc-ficha-head h1{font-size:26px}.cc-metrics{gap:6px}.cc-metric{padding:10px}.cc-metric b{font-size:19px}.cc-card{padding:12px;border-radius:14px}.cc-two,.cc-ficha-grid,.cc-service-grid{grid-template-columns:1fr}.cc-client-card{min-height:68px}.cc-gesture-row{grid-template-columns:1fr 126px}.cc-gesture-main{min-height:64px!important}.cc-status{width:126px}.cc-ficha-head{grid-template-columns:auto 1fr auto;padding-top:12px}.cc-calendar-head{padding:12px 0 8px}.cc-cal-toolbar{grid-template-columns:auto auto auto 1fr}.cc-cal-toolbar strong{grid-column:1/-1;grid-row:2;font-size:15px}.cc-cal-toolbar input{grid-column:1/-1;width:100%}.cc-cal-modes button{padding:8px 4px!important;font-size:10px;min-height:40px}.cc-weekdays b{padding:6px 2px}.cc-month-grid{min-width:0}.cc-day{min-height:62px;padding:2px}.cc-day>button{min-width:30px}.cc-day-events{display:flex;gap:2px;flex-wrap:wrap;padding:1px 3px}.cc-day-events>button{width:7px!important;height:7px!important;min-width:7px!important;min-height:7px!important;padding:0!important;border-radius:50%!important}.cc-day-events>button span{display:none}.cc-day-events small{font-size:8px;color:#777}.cc-agenda>button,.cc-list-cal>button{grid-template-columns:74px 1fr;min-height:64px}.cc-week-view{min-width:870px}.cc-year{grid-template-columns:1fr 1fr}.cc-sheet{width:100%;padding-top:max(12px,env(safe-area-inset-top))}.cc-sheet h2{font-size:23px;line-height:1.08}.cc-facts{grid-template-columns:1fr}.cc-sheet-status{position:sticky;top:0;background:#181817;z-index:4;padding:8px 0}.cc-nav-cube{left:12px;width:52px;height:52px}.cc-form footer button,.cc-modal footer button,.cc-action{min-height:48px}}
`;
