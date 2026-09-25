"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import LinkThemeController from "@/components/LinkThemeController";

type GestureTask = {
  id: string;
  gesture_code: string;
  parent_gesture_code?: string | null;
  source_domain: string;
  entity_type?: string | null;
  global_id?: string | null;
  entity_name?: string | null;
  title: string;
  note?: string | null;
  context_summary?: string | null;
  objective?: string | null;
  resolution_criteria?: string | null;
  recommended_action?: string | null;
  status: "open" | "done" | "snoozed" | "cancelled";
  priority: number;
  task_kind?: string | null;
  financial_state?: string | null;
  requires_document?: boolean | null;
  transaction_id?: string | null;
  closure_id?: string | null;
  due_at?: string | null;
  origin_event_type?: string | null;
  created_at: string;
  completed_at?: string | null;
  schedule_status?: string | null;
  calendar_sync_status?: string | null;
  business_id?: string | null;
  business_name?: string | null;
  business_global_id?: string | null;
  business_color?: string | null;
  calendar_name?: string | null;
};

type AgendaEvent = {
  id: string;
  title: string;
  description?: string | null;
  starts_at: string;
  ends_at: string;
  event_url?: string | null;
  event_kind?: string | null;
  business_id?: string | null;
  business_name?: string | null;
  business_global_id?: string | null;
  business_color?: string | null;
  calendar_name?: string | null;
  priority?: number | null;
};

type TaskResponse = {
  ok: boolean;
  generatedAt: string;
  tasks: GestureTask[];
  agenda: AgendaEvent[];
  counts: { open: number; scheduled: number; done: number; world: number; agenda: number };
};

type Filter = "open" | "scheduled" | "agenda" | "finance" | "done" | "all";

export default function GestureTaskApp() {
  const [data, setData] = useState<TaskResponse | null>(null);
  const [filter, setFilter] = useState<Filter>("open");
  const [worldOnly, setWorldOnly] = useState(false);
  const [businessFilter, setBusinessFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/gesture-tasks", { cache: "no-store" });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || "No se pudieron cargar los gestos");
    setData(json);
    setError("");
  }, []);

  useEffect(() => {
    load().catch((reason: Error) => setError(reason.message));
    const id = window.setInterval(() => load().catch(() => undefined), 30000);
    return () => window.clearInterval(id);
  }, [load]);

  const businessOptions = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { key: string; name: string; color: string }>();
    for (const task of data.tasks) {
      const name = task.business_name || "Sin negocio";
      const key = task.business_global_id || "name:" + name;
      if (!map.has(key)) map.set(key, { key, name, color: task.business_color || "#d7d4cc" });
    }
    for (const event of data.agenda) {
      const name = event.business_name || event.calendar_name || "Sin negocio";
      const key = event.business_global_id || "name:" + name;
      if (!map.has(key)) map.set(key, { key, name, color: event.business_color || "#d7d4cc" });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [data]);

  const filteredTasks = useMemo(() => {
    if (!data) return [];
    return data.tasks.filter((task) => {
      const businessKey = task.business_global_id || "name:" + (task.business_name || "Sin negocio");
      const taskDate = task.due_at || task.created_at;
      if (businessFilter !== "all" && businessKey !== businessFilter) return false;
      if (priorityFilter !== "all" && String(task.priority) !== priorityFilter) return false;
      if (!matchesDateFilter(taskDate, dateFilter)) return false;
      if (worldOnly && task.source_domain !== "world") return false;
      return true;
    });
  }, [data, businessFilter, dateFilter, priorityFilter, worldOnly]);

  const filteredAgenda = useMemo(() => {
    if (!data) return [];
    return data.agenda.filter((event) => {
      const businessKey = event.business_global_id || "name:" + (event.business_name || event.calendar_name || "Sin negocio");
      if (businessFilter !== "all" && businessKey !== businessFilter) return false;
      if (priorityFilter !== "all" && String(event.priority || 3) !== priorityFilter) return false;
      if (!matchesDateFilter(event.starts_at, dateFilter)) return false;
      return true;
    });
  }, [data, businessFilter, dateFilter, priorityFilter]);

  const visible = useMemo(() => {
    return filteredTasks.filter((task) => {
      if (filter === "open" && (task.status === "done" || Boolean(task.due_at))) return false;
      if (filter === "scheduled" && (task.status === "done" || !task.due_at)) return false;
      if (filter === "agenda") return false;
      if (filter === "finance" && !["financial_transaction","financial_closure"].includes(String(task.task_kind || ""))) return false;
      if (filter === "done" && task.status !== "done") return false;
      return true;
    });
  }, [filteredTasks, filter]);

  async function act(action: string, id: string, payload: Record<string, unknown> = {}) {
    setBusy(id);
    setError("");
    try {
      const response = await fetch("/api/gesture-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id, ...payload }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "No se pudo actualizar el gesto");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo actualizar el gesto");
    } finally {
      setBusy(null);
    }
  }

  async function createTask() {
    const title = draft.trim();
    if (!title) return;
    setBusy("create");
    setError("");
    try {
      const response = await fetch("/api/gesture-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", title }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "No se pudo crear la tarea");
      setDraft("");
      setFilter("open");
      setWorldOnly(false);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo crear la tarea");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="gt-page">
      <LinkThemeController />
      <style>{css}</style>

      <aside className="gt-nav">
        <div className="gt-logo">
          <span />
          <div><b>LINK CONTROL</b><b>CENTRAL</b></div>
        </div>
        <nav>
          <Link href="/">Inicio</Link>
          <Link className="active" href="/operacion">Operación</Link>
          <Link href="/mision-personal">Misión personal</Link>
        </nav>
        <div className="gt-nav-foot">GESTOS ↔ LINK WORLD</div>
      </aside>

      <section className={"gt-main" + (viewMode === "kanban" ? " wide" : "")}>
        <header className="gt-head">
          <div>
            <small>OPERACIÓN</small>
            <h1>Gestos</h1>
            <p>Lo que LINK WORLD necesita que pase.</p>
          </div>
          <div className="gt-sync"><i /> Sincronizado</div>
        </header>

        <div className="gt-create">
          <button aria-label="Nueva tarea">＋</button>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") createTask(); }}
            placeholder="Añadir una tarea o gesto"
          />
          {draft.trim() ? (
            <button className="gt-add" disabled={busy === "create"} onClick={createTask}>
              {busy === "create" ? "…" : "Añadir"}
            </button>
          ) : null}
        </div>

        <div className="gt-filters">
          <div>
            <button className={filter === "open" && viewMode === "list" ? "on" : ""} onClick={() => { setViewMode("list"); setFilter("open"); }}>
              Pendientes <span>{data?.counts.open || 0}</span>
            </button>
            <button className={filter === "scheduled" && viewMode === "list" ? "on" : ""} onClick={() => { setViewMode("list"); setFilter("scheduled"); }}>
              Programados <span>{data?.counts.scheduled || 0}</span>
            </button>
            <button className={filter === "agenda" && viewMode === "list" ? "on" : ""} onClick={() => { setViewMode("list"); setFilter("agenda"); }}>
              Agenda <span>{data?.counts.agenda || 0}</span>
            </button>
            <button className={filter === "finance" && viewMode === "list" ? "on" : ""} onClick={() => { setViewMode("list"); setFilter("finance"); }}>
              Finanzas <span>{data?.tasks.filter((task) => ["financial_transaction","financial_closure"].includes(String(task.task_kind || "")) && task.status !== "done").length || 0}</span>
            </button>
            <button className={filter === "done" && viewMode === "list" ? "on" : ""} onClick={() => { setViewMode("list"); setFilter("done"); }}>
              Completadas <span>{data?.counts.done || 0}</span>
            </button>
            <button className={filter === "all" && viewMode === "list" ? "on" : ""} onClick={() => { setViewMode("list"); setFilter("all"); }}>Todas</button>
          </div>
          <button className={"gt-world-filter" + (worldOnly ? " on" : "")} onClick={() => setWorldOnly((current) => !current)}>
            LINK WORLD
          </button>
        </div>

        <div className="gt-filterbar">
          <label>
            <span>NEGOCIO</span>
            <div className="gt-select-wrap">
              <i style={{ background: businessFilter === "all" ? "#b8b8b2" : businessOptions.find((item) => item.key === businessFilter)?.color || "#d7d4cc" }} />
              <select value={businessFilter} onChange={(event) => setBusinessFilter(event.target.value)}>
                <option value="all">Todos los negocios</option>
                {businessOptions.map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}
              </select>
            </div>
          </label>
          <label>
            <span>FECHA</span>
            <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
              <option value="all">Todas</option>
              <option value="today">Hoy</option>
              <option value="7d">Próximos 7 días</option>
              <option value="30d">Próximos 30 días</option>
            </select>
          </label>
          <label>
            <span>PRIORIDAD</span>
            <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
              <option value="all">Todas</option>
              <option value="1">Alta</option>
              <option value="2">Media</option>
              <option value="3">Baja</option>
            </select>
          </label>
          <div className="gt-view-toggle">
            <span>VISTA</span>
            <div>
              <button className={viewMode === "list" ? "on" : ""} onClick={() => setViewMode("list")}>Lista</button>
              <button className={viewMode === "kanban" ? "on" : ""} onClick={() => { setViewMode("kanban"); setFilter("all"); }}>Kanban</button>
            </div>
          </div>
        </div>

        <div className="gt-business-legend">
          {businessOptions.map((item) => (
            <button key={item.key} className={businessFilter === item.key ? "on" : ""} onClick={() => setBusinessFilter(businessFilter === item.key ? "all" : item.key)}>
              <i style={{ background: item.color }} />{item.name}
            </button>
          ))}
        </div>

        {error ? <div className="gt-error">{error}</div> : null}

        <section className={"gt-list " + (viewMode === "kanban" ? "kanban-mode" : "")}>
          {!data ? <div className="gt-empty">Cargando gestos…</div> : null}
          {viewMode === "kanban" ? (
            <KanbanBoard tasks={filteredTasks} events={filteredAgenda} act={act} busy={busy} />
          ) : filter === "agenda" ? (
            <AgendaList events={filteredAgenda} />
          ) : (
            <>
              {data && !visible.length ? (
                <div className="gt-empty">
                  <span>✓</span>
                  <b>{filter === "done" ? "Todavía no hay gestos completados." : filter === "scheduled" ? "No hay gestos programados." : "No hay gestos pendientes en esta vista."}</b>
                  <p>Prueba cambiar negocio, fecha o prioridad.</p>
                </div>
              ) : null}
              {visible.map((task) => (
                <GestureRow key={task.id} task={task} busy={busy === task.id} act={act} />
              ))}
            </>
          )}
        </section>

        <footer className="gt-footer">
          <span>{data?.counts.world || 0} gestos recibidos desde LINK WORLD</span>
          <span>Cada cambio realizado aquí vuelve al bus de gestos.</span>
        </footer>
      </section>
    </main>
  );
}

function GestureRow({
  task,
  busy,
  act,
}: {
  task: GestureTask;
  busy: boolean;
  act: (action: string, id: string, payload?: Record<string, unknown>) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const done = task.status === "done";

  return (
    <article className={"gt-row" + (done ? " done" : "")} style={{ borderLeftColor: task.business_color || "#d7d4cc" }}>
      <button
        className="gt-check"
        disabled={busy}
        onClick={() => act(done ? "reopen" : "complete", task.id)}
        aria-label={done ? "Reabrir" : "Completar"}
      >
        {done ? "✓" : ""}
      </button>

      <button className="gt-row-copy" onClick={() => setOpen((current) => !current)}>
        <b>{task.title}</b>
        <span>
          {task.task_kind === "financial_closure" ? "CIERRE FINANCIERO" : task.task_kind === "financial_transaction" ? "FINANZAS" : task.source_domain === "world" ? "LINK WORLD" : "CONTROL CENTRAL"}
          {task.business_name ? " · " + task.business_name : ""}{task.entity_name && task.entity_name !== task.business_name ? " · " + task.entity_name : ""}
        </span>
        {task.objective ? <em>{task.objective}</em> : null}
      </button>

      <div className="gt-row-meta">
        {task.financial_state ? <time>{humanize(task.financial_state)}</time> : task.due_at ? <time className="scheduled">◷ {formatDueTime(task.due_at)}</time> : null}
        <span className={task.source_domain === "world" ? "world" : "control"}>
          {task.source_domain === "world" ? "↓" : "↑"}
        </span>
        <button className="gt-more" onClick={() => setOpen((current) => !current)}>•••</button>
      </div>

      {open ? (
        <div className="gt-detail">
          <section className="gt-explain gt-context">
            <small>QUÉ PASÓ</small>
            <p>{task.context_summary || task.note || "LINK WORLD generó este gesto."}</p>
          </section>

          <section className="gt-explain gt-resolve">
            <small>QUÉ HAY QUE RESOLVER</small>
            <b>{task.recommended_action || "Revisar el contexto y registrar una decisión."}</b>
          </section>

          <section className="gt-explain">
            <small>OBJETIVO</small>
            <p>{task.objective || "Resolver el gesto y devolver un estado claro a LINK WORLD."}</p>
          </section>

          <section className="gt-explain">
            <small>SE CONSIDERA RESUELTO CUANDO</small>
            <p>{task.resolution_criteria || "Existe un resultado verificable y el gesto queda actualizado."}</p>
          </section>

          <div className="gt-detail-actions">
            {!done ? (
              <>
                <button className="primary" onClick={() => act("complete", task.id)}>Marcar resuelto</button>
                <button onClick={() => act("schedule", task.id, { dueAt: tomorrowAtNine() })}>Mañana 09:00</button>
                <button onClick={() => act("schedule", task.id, { dueAt: nextWeekAtNine() })}>Próxima semana</button>
                <button onClick={() => setScheduleOpen((current) => !current)}>Elegir fecha…</button>
              </>
            ) : (
              <button onClick={() => act("reopen", task.id)}>Reabrir</button>
            )}
            <button className="danger" onClick={() => act("cancel", task.id)}>Quitar</button>
          </div>

          {scheduleOpen ? (
            <div className="gt-scheduler">
              <label>
                <span>FECHA Y HORA</span>
                <input type="datetime-local" value={customDate} onChange={(event) => setCustomDate(event.target.value)} />
              </label>
              <button
                disabled={!customDate}
                onClick={() => customDate && act("schedule", task.id, { dueAt: new Date(customDate).toISOString() })}
              >
                Programar gesto
              </button>
            </div>
          ) : null}

          {task.due_at ? (
            <div className="gt-scheduled-note">
              Programado para <b>{formatDueTime(task.due_at)}</b>
              {task.calendar_sync_status === "pending" ? <span> · pendiente de sincronizar con Google Calendar</span> : null}
            </div>
          ) : null}

          <details className="gt-trace">
            <summary>Trazabilidad técnica</summary>
            <div className="gt-trace-grid">
              {task.task_kind?.startsWith("financial_") ? <div><small>TIPO</small><b>{task.task_kind === "financial_closure" ? "Cierre financiero" : "Transacción"}</b></div> : null}
              <div><small>GESTO</small><code>{task.gesture_code}</code></div>
              {task.entity_type ? <div><small>ENTIDAD</small><b>{humanize(task.entity_type)}</b></div> : null}
              {task.global_id ? <div><small>GLOBAL ID</small><code>{task.global_id}</code></div> : null}
              {task.origin_event_type ? <div><small>EVENTO</small><b>{humanize(task.origin_event_type)}</b></div> : null}
            </div>
          </details>
        </div>
      ) : null}
    </article>
  );
}

function formatDue(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

function formatDueTime(value: string) {
  const date = new Date(value);
  return date.toLocaleString("es-CL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function AgendaList({ events }: { events: AgendaEvent[] }) {
  if (!events.length) return <div className="gt-empty"><span>◷</span><b>No hay eventos próximos con estos filtros.</b></div>;
  return (
    <div className="gt-agenda">
      {events.map((event) => (
        <a
          key={event.id}
          href={event.event_url || "#"}
          target={event.event_url ? "_blank" : undefined}
          rel="noreferrer"
          style={{ borderLeftColor: event.business_color || "#d7d4cc" }}
        >
          <time>
            {new Date(event.starts_at).toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" })}
            <b>{new Date(event.starts_at).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</b>
          </time>
          <div>
            <strong>{event.title}</strong>
            <span>
              <i style={{ background: event.business_color || "#d7d4cc" }} />
              {event.business_name || event.calendar_name || "Sin negocio"} · {event.event_kind === "gesture" ? "Gesto" : event.event_kind === "financial" ? "Finanzas" : "Calendario"}
              <em className="gt-priority-tag">{priorityLabel(event.priority || 3)}</em>
            </span>
          </div>
          <em>↗</em>
        </a>
      ))}
    </div>
  );
}

function KanbanBoard({
  tasks,
  events,
  act,
  busy,
}: {
  tasks: GestureTask[];
  events: AgendaEvent[];
  act: (action: string, id: string, payload?: Record<string, unknown>) => Promise<void>;
  busy: string | null;
}) {
  const open = tasks.filter((task) => task.status !== "done");
  const inbox = open.filter((task) => !task.due_at);
  const today = open.filter((task) => task.due_at && isTodayOrOverdue(task.due_at));
  const next = open.filter((task) => task.due_at && !isTodayOrOverdue(task.due_at));
  const done = tasks.filter((task) => task.status === "done").slice(0, 12);
  const upcomingEvents = events.slice(0, 8);

  return (
    <div className="gt-board-shell">
      <div className="gt-board-head">
        <div>
          <small>TABLERO DE TRABAJO</small>
          <b>{open.length} gestos activos</b>
        </div>
        <div className="gt-board-stats">
          <span><strong>{inbox.length}</strong> sin fecha</span>
          <span><strong>{today.length}</strong> hoy / vencidos</span>
          <span><strong>{next.length}</strong> programados</span>
        </div>
      </div>

      {upcomingEvents.length ? (
        <section className="gt-calendar-context">
          <header>
            <div><small>GOOGLE CALENDAR</small><b>Próximos eventos</b></div>
            <span>{events.length} en agenda</span>
          </header>
          <div>
            {upcomingEvents.map((event) => (
              <a key={event.id} href={event.event_url || "#"} target={event.event_url ? "_blank" : undefined} rel="noreferrer" style={{ borderTopColor: event.business_color || "#d7d4cc" }}>
                <time>{new Date(event.starts_at).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}<b>{new Date(event.starts_at).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</b></time>
                <div><strong>{event.title}</strong><span><i style={{ background: event.business_color || "#d7d4cc" }} />{event.business_name || event.calendar_name || "Sin negocio"}</span></div>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <div className="gt-kanban">
        <KanbanColumn title="Por resolver" count={inbox.length} hint="Gestos sin fecha">
          {inbox.length ? inbox.map((task) => (
            <TaskCard key={task.id} task={task} busy={busy === task.id} act={act} />
          )) : <KanbanEmpty text="Nada esperando decisión." />}
        </KanbanColumn>

        <KanbanColumn title="Hoy" count={today.length} hint="Hoy y vencidos">
          {today.length ? today.map((task) => (
            <TaskCard key={task.id} task={task} busy={busy === task.id} act={act} />
          )) : <KanbanEmpty text="Nada urgente para hoy." />}
        </KanbanColumn>

        <KanbanColumn title="Programados" count={next.length} hint="Próximas acciones">
          {next.length ? next.map((task) => (
            <TaskCard key={task.id} task={task} busy={busy === task.id} act={act} />
          )) : <KanbanEmpty text="No hay gestos programados." />}
        </KanbanColumn>

        <KanbanColumn title="Resueltos" count={tasks.filter((task) => task.status === "done").length} hint="Últimos 12">
          {done.length ? done.map((task) => (
            <TaskCard key={task.id} task={task} busy={busy === task.id} act={act} />
          )) : <KanbanEmpty text="Todavía no hay cierres." />}
        </KanbanColumn>
      </div>
    </div>
  );
}

function KanbanColumn({
  title,
  count,
  hint,
  children,
}: {
  title: string;
  count: number;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="gt-kanban-column">
      <header>
        <div><b>{title}</b><small>{hint}</small></div>
        <span>{count}</span>
      </header>
      <div>{children}</div>
    </section>
  );
}

function TaskCard({
  task,
  busy,
  act,
}: {
  task: GestureTask;
  busy: boolean;
  act: (action: string, id: string, payload?: Record<string, unknown>) => Promise<void>;
}) {
  const done = task.status === "done";
  return (
    <article className={"gt-kanban-card" + (done ? " done" : "")} style={{ borderTopColor: task.business_color || "#d7d4cc" }}>
      <div className="gt-card-meta">
        <span><i style={{ background: task.business_color || "#d7d4cc" }} />{task.business_name || "Sin negocio"}</span>
        <em className={"p" + task.priority}>{priorityLabel(task.priority)}</em>
      </div>
      <b>{task.title}</b>
      {task.objective ? <p>{task.objective}</p> : null}
      <div className="gt-card-time">
        {task.due_at ? <>◷ {formatDueTime(task.due_at)}</> : "Sin fecha"}
      </div>
      <div className="gt-card-actions">
        {done ? (
          <button disabled={busy} onClick={() => act("reopen", task.id)}>Reabrir</button>
        ) : (
          <>
            <button className="primary" disabled={busy} onClick={() => act("complete", task.id)}>Resolver</button>
            {!task.due_at ? <button disabled={busy} onClick={() => act("schedule", task.id, { dueAt: tomorrowAtNine() })}>Mañana</button> : null}
          </>
        )}
      </div>
    </article>
  );
}

function KanbanEmpty({ text }: { text: string }) {
  return <div className="gt-kanban-empty">{text}</div>;
}

function isTodayOrOverdue(value: string) {
  const date = new Date(value);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return date <= end;
}

function matchesDateFilter(value: string | null | undefined, filter: string) {
  if (filter === "all") return true;
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const endToday = new Date(now);
  endToday.setHours(23, 59, 59, 999);
  if (filter === "today") return date >= startToday && date <= endToday;
  const end = new Date(now);
  end.setDate(end.getDate() + (filter === "7d" ? 7 : 30));
  return date >= now && date <= end;
}

function priorityLabel(priority?: number | null) {
  if (priority === 1) return "Alta";
  if (priority === 2) return "Media";
  return "Baja";
}

function humanize(value: string) {
  const clean = value.toLowerCase();
  if (clean === "counterparty") return "Link";
  if (clean === "counterparty.registered") return "Link registrado";
  return value.replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function tomorrowAtNine() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return date.toISOString();
}

function nextWeekAtNine() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  date.setHours(9, 0, 0, 0);
  return date.toISOString();
}

const css = `

.gt-filterbar{display:grid;grid-template-columns:minmax(170px,1.3fr) 1fr 1fr auto;gap:8px;padding:10px 0 8px;border-bottom:1px solid var(--link-soft,#e9e9e4)}
.gt-filterbar>label,.gt-view-toggle{min-width:0}.gt-filterbar>label>span,.gt-view-toggle>span{display:block;font-size:7px;letter-spacing:.12em;color:#999;margin:0 0 5px 3px}
.gt-filterbar select{width:100%;height:34px;border:1px solid var(--link-line,#ddd);border-radius:9px;background:var(--link-surface,#fff);color:inherit;padding:0 9px;font-size:9px;outline:none}
.gt-select-wrap{position:relative}.gt-select-wrap i{position:absolute;left:9px;top:50%;transform:translateY(-50%);width:7px;height:7px;border-radius:50%;z-index:1}.gt-select-wrap select{padding-left:23px}
.gt-view-toggle>div{display:flex;height:34px;border:1px solid var(--link-line,#ddd);border-radius:9px;padding:2px;background:var(--link-surface,#fff)}
.gt-view-toggle button{border:0;background:transparent;color:#777;border-radius:7px;padding:0 10px;font-size:9px;cursor:pointer}.gt-view-toggle button.on{background:#1f1f1d;color:#fff}
.gt-business-legend{display:flex;gap:6px;overflow:auto;padding:8px 0 4px;scrollbar-width:none}.gt-business-legend::-webkit-scrollbar{display:none}.gt-business-legend button{flex:none;border:1px solid var(--link-line,#ddd);background:transparent;color:#777;border-radius:999px;padding:5px 8px;font-size:8px;display:flex;align-items:center;gap:6px;cursor:pointer}.gt-business-legend button.on{background:var(--link-surface-2,#ecece8);color:#222}.gt-business-legend i,.gt-agenda span i,.gt-card-meta i{width:7px;height:7px;border-radius:50%;display:inline-block;flex:none}
.gt-row{border-left:3px solid transparent;padding-left:8px}
.gt-agenda>a{border-left:3px solid transparent;padding-left:9px}
.gt-agenda span{display:flex!important;align-items:center;gap:5px}.gt-priority-tag{font-style:normal;border-left:1px solid #ddd;padding-left:6px;color:#999!important;font-size:8px!important}
.gt-list.kanban-mode{margin-top:12px;overflow:visible}
.gt-board-shell{display:grid;gap:12px}
.gt-board-head{display:flex;align-items:end;justify-content:space-between;gap:20px;padding:4px 2px 2px}.gt-board-head small{display:block;font-size:7px;letter-spacing:.14em;color:#999;margin-bottom:4px}.gt-board-head b{font-size:14px}
.gt-board-stats{display:flex;gap:16px}.gt-board-stats span{font-size:8px;color:#888;white-space:nowrap}.gt-board-stats strong{font-size:13px;color:#222;margin-right:3px}
.gt-calendar-context{border:1px solid var(--link-line,#ddd);border-radius:13px;background:var(--link-surface,#fff);padding:9px 10px}.gt-calendar-context>header{display:flex;justify-content:space-between;align-items:end;padding:1px 2px 8px}.gt-calendar-context>header small{display:block;font-size:7px;letter-spacing:.12em;color:#999}.gt-calendar-context>header b{font-size:10px}.gt-calendar-context>header>span{font-size:8px;color:#888}.gt-calendar-context>div{display:flex;gap:7px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none}.gt-calendar-context>div::-webkit-scrollbar{display:none}.gt-calendar-context a{flex:0 0 200px;display:grid;grid-template-columns:58px 1fr;gap:8px;border:1px solid #e7e7e2;border-top:3px solid #d7d4cc;border-radius:9px;padding:8px;color:inherit;text-decoration:none;background:#fafaf8}.gt-calendar-context time{font-size:7px;color:#888;text-transform:capitalize}.gt-calendar-context time b{display:block;font-size:9px;color:#333;margin-top:3px}.gt-calendar-context strong{display:block;font-size:9px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.gt-calendar-context span{display:flex;align-items:center;gap:5px;font-size:7px;color:#888;margin-top:4px}.gt-calendar-context span i{width:6px;height:6px;border-radius:50%}
.gt-kanban{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;align-items:start}
.gt-kanban-column{background:var(--link-surface-2,#efefeb);border:1px solid var(--link-line,#ddd);border-radius:13px;padding:8px;min-height:280px}
.gt-kanban-column>header{display:flex;align-items:flex-start;justify-content:space-between;padding:4px 4px 9px}.gt-kanban-column>header>div b{display:block;font-size:10px}.gt-kanban-column>header small{display:block;font-size:7px;color:#999;margin-top:2px;font-weight:400}.gt-kanban-column>header>span{font-size:8px;color:#888;background:var(--link-surface,#fff);border-radius:999px;padding:3px 6px}
.gt-kanban-column>div{display:grid;gap:7px}
.gt-kanban-card{display:block;border:1px solid #dfdfda;border-top:3px solid #d7d4cc;border-radius:10px;background:var(--link-surface,#fff);padding:10px;color:inherit;box-shadow:0 1px 1px rgba(0,0,0,.02)}.gt-kanban-card.done{opacity:.62}
.gt-kanban-card>b{display:block;font-size:10.5px;line-height:1.35;margin:7px 0 5px}.gt-kanban-card p{margin:0;font-size:8px;line-height:1.4;color:#74746f;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.gt-card-meta{display:flex;align-items:center;justify-content:space-between;gap:8px}.gt-card-meta span{display:flex;align-items:center;gap:5px;font-size:7.5px;color:#777;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.gt-card-meta em{font-style:normal;font-size:6.5px;text-transform:uppercase;letter-spacing:.06em;padding:2px 5px;border-radius:999px;background:#eee;color:#777}.gt-card-meta em.p1{background:#f1e3df;color:#8c5146}.gt-card-meta em.p2{background:#f2eadb;color:#8c6d35}.gt-card-meta em.p3{background:#e9ece8;color:#617064}
.gt-card-time{margin-top:8px;font-size:7.5px;color:#888}
.gt-card-actions{display:flex;gap:5px;margin-top:8px;padding-top:7px;border-top:1px solid #ecece7}.gt-card-actions button{border:1px solid #deded9;background:#fff;color:#555;border-radius:7px;padding:5px 7px;font-size:7.5px;cursor:pointer}.gt-card-actions button.primary{background:#20201e;color:#fff;border-color:#20201e}.gt-card-actions button:disabled{opacity:.45}
.gt-kanban-empty{border:1px dashed #d8d8d2;border-radius:10px;padding:18px 10px;text-align:center;color:#999;font-size:8px;background:rgba(255,255,255,.35)}
@media(max-width:1050px){.gt-main.wide{width:calc(100vw - 240px)}.gt-kanban{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:760px){.gt-filterbar{grid-template-columns:1fr 1fr}.gt-view-toggle>div{width:100%}.gt-view-toggle button{flex:1}.gt-main.wide{width:100%}.gt-kanban{grid-template-columns:1fr}.gt-board-head{display:block}.gt-board-stats{margin-top:8px;overflow:auto}.gt-calendar-context a{flex-basis:180px}}
.gt-page{min-height:100vh;background:var(--link-bg,#f5f5f2);color:var(--link-text,#1e1e1c);display:grid;grid-template-columns:220px 1fr;font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif}
.gt-nav{position:sticky;top:0;height:100vh;border-right:1px solid var(--link-line,#deded8);background:var(--link-surface,#f9f9f7);padding:22px 12px;display:flex;flex-direction:column}
.gt-logo{display:flex;align-items:center;gap:10px;padding:2px 7px 28px}.gt-logo>span{width:25px;height:25px;border:1px solid currentColor;border-radius:50%}.gt-logo b{display:block;font-size:10px;letter-spacing:.2em;line-height:1.35}
.gt-nav nav{display:grid;gap:5px}.gt-nav nav a{padding:11px 13px;border-radius:12px;color:var(--link-muted,#686865);text-decoration:none;font-size:12px}.gt-nav nav a.active{background:var(--link-surface-2,#e9e9e5);color:var(--link-text,#1e1e1c);font-weight:650}
.gt-nav-foot{margin-top:auto;padding:12px 7px;font-size:8px;letter-spacing:.15em;color:var(--link-faint,#999)}
.gt-main{width:min(900px,calc(100vw - 260px));margin:0 auto;padding:54px 20px 70px;transition:width .18s ease}.gt-main.wide{width:min(1480px,calc(100vw - 250px))}
.gt-head{display:flex;justify-content:space-between;align-items:end;gap:20px;padding-bottom:22px}.gt-head small{font-size:9px;letter-spacing:.18em;color:var(--link-faint,#999)}.gt-head h1{font-size:38px;letter-spacing:-.05em;margin:4px 0 4px}.gt-head p{margin:0;color:var(--link-muted,#777);font-size:12px}
.gt-sync{font-size:9px;color:var(--link-muted,#777);display:flex;align-items:center;gap:7px}.gt-sync i{width:7px;height:7px;border-radius:50%;background:#699a73;box-shadow:0 0 0 4px rgba(105,154,115,.12)}
.gt-create{height:50px;background:var(--link-surface,#fff);border:1px solid var(--link-line,#ddd);border-radius:14px;display:flex;align-items:center;padding:0 8px 0 10px;box-shadow:var(--link-shadow,0 1px 2px rgba(0,0,0,.04))}
.gt-create>button:first-child{border:0;background:transparent;font-size:19px;color:var(--link-muted,#777);width:30px}.gt-create input{flex:1;border:0;outline:0;background:transparent;color:inherit;font-size:13px;padding:0 8px}.gt-create input::placeholder{color:var(--link-faint,#999)}.gt-add{border:0;background:var(--link-accent,#1e1e1c);color:var(--link-accent-text,#fff);border-radius:9px;padding:8px 12px;font-size:10px;font-weight:650}
.gt-filters{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 2px 8px;border-bottom:1px solid var(--link-line,#ddd)}.gt-filters>div{display:flex;gap:4px}.gt-filters button{border:0;background:transparent;color:var(--link-muted,#777);font-size:10px;padding:7px 9px;border-radius:9px;cursor:pointer}.gt-filters button.on{background:var(--link-surface-2,#e9e9e5);color:var(--link-text,#222)}.gt-filters button span{margin-left:4px;color:var(--link-faint,#999)}
.gt-world-filter{letter-spacing:.08em}.gt-world-filter.on{background:#171716!important;color:#fff!important}
.gt-list{margin-top:0}.gt-row{position:relative;display:grid;grid-template-columns:32px minmax(0,1fr) auto;gap:9px;align-items:center;min-height:64px;border-bottom:1px solid var(--link-soft,#e9e9e4);padding:7px 4px}.gt-row.done .gt-row-copy b{text-decoration:line-through;color:var(--link-faint,#999)}
.gt-check{width:21px;height:21px;border:1.4px solid #969a96;border-radius:50%;background:transparent;color:#fff;font-size:11px;cursor:pointer}.gt-row.done .gt-check{background:#5f8f69;border-color:#5f8f69}.gt-check:disabled{opacity:.5}
.gt-row-copy{border:0;background:transparent;color:inherit;text-align:left;min-width:0;cursor:pointer}.gt-row-copy b{display:block;font-size:13px;font-weight:560;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.gt-row-copy span{display:block;font-size:9px;color:var(--link-muted,#777);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.gt-row-copy em{display:block;margin-top:5px;font-style:normal;font-size:10px;line-height:1.35;color:var(--link-muted,#666);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gt-row-meta{display:flex;align-items:center;gap:8px}.gt-row-meta time{font-size:9px;color:var(--link-muted,#777)}.gt-row-meta time.scheduled{color:#5c705f;font-weight:600}.gt-row-meta>span{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:10px}.gt-row-meta>span.world{background:#e8efe8;color:#42674a}.gt-row-meta>span.control{background:#ededeb;color:#555}.gt-more{border:0;background:transparent;color:#888;padding:5px;cursor:pointer}
.gt-detail{grid-column:2/-1;border-left:1px solid var(--link-line,#ddd);margin:4px 0 10px;padding:10px 0 8px 16px;display:grid;grid-template-columns:1fr 1fr;gap:8px}.gt-detail small{display:block;font-size:8px;letter-spacing:.12em;color:var(--link-faint,#999);margin-bottom:5px}.gt-explain{border:1px solid var(--link-soft,#e7e7e2);background:var(--link-surface,#fff);border-radius:10px;padding:11px 12px;min-height:78px}.gt-explain p{margin:0;font-size:10px;line-height:1.5;color:var(--link-muted,#666)}.gt-explain b{display:block;font-size:11px;line-height:1.45;font-weight:600}.gt-context{grid-column:1/-1;min-height:auto;background:var(--link-surface-2,#f1f1ee)}.gt-resolve{grid-column:1/-1;min-height:auto;border-color:#d4d4ce}.gt-detail-actions{grid-column:1/-1;display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}.gt-detail-actions button{border:1px solid var(--link-line,#ddd);background:var(--link-surface,#fff);color:inherit;border-radius:8px;padding:7px 9px;font-size:9px;cursor:pointer}.gt-detail-actions button.primary{background:var(--link-accent,#1e1e1c);color:var(--link-accent-text,#fff);border-color:var(--link-accent,#1e1e1c)}.gt-detail-actions button.danger{color:#8d5549}.gt-scheduler{grid-column:1/-1;display:flex;align-items:end;gap:8px;padding:9px;border:1px solid var(--link-line,#ddd);border-radius:10px;background:var(--link-surface-2,#f1f1ee)}.gt-scheduler label{flex:1}.gt-scheduler label span{display:block;font-size:8px;letter-spacing:.1em;color:#888;margin-bottom:5px}.gt-scheduler input{width:100%;border:1px solid var(--link-line,#ddd);background:var(--link-surface,#fff);color:inherit;border-radius:8px;padding:8px;font-size:10px}.gt-scheduler button{border:0;border-radius:8px;background:#1e1e1c;color:#fff;padding:9px 11px;font-size:9px}.gt-scheduled-note{grid-column:1/-1;font-size:9px;color:#5d6b60;background:#edf2ed;border-radius:9px;padding:8px 10px}.gt-agenda{display:grid}.gt-agenda>a{display:grid;grid-template-columns:100px 1fr 20px;gap:12px;align-items:center;padding:12px 4px;border-bottom:1px solid var(--link-soft,#e9e9e4);color:inherit;text-decoration:none}.gt-agenda time{font-size:9px;color:#777;text-transform:capitalize}.gt-agenda time b{display:block;font-size:11px;color:inherit;margin-top:3px}.gt-agenda strong{display:block;font-size:12px}.gt-agenda span{display:block;font-size:9px;color:#888;margin-top:4px}.gt-agenda em{font-style:normal;color:#999}.gt-trace{grid-column:1/-1;margin-top:3px;border-top:1px solid var(--link-soft,#e7e7e2);padding-top:8px}.gt-trace summary{cursor:pointer;font-size:8px;letter-spacing:.08em;color:var(--link-faint,#999);list-style:none}.gt-trace summary::-webkit-details-marker{display:none}.gt-trace-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px 18px;padding-top:10px}.gt-trace-grid b,.gt-trace-grid code{font-size:9px;font-family:inherit;overflow-wrap:anywhere}
.gt-empty{padding:50px 10px;text-align:center;color:var(--link-muted,#777)}.gt-empty span{width:34px;height:34px;border-radius:50%;border:1px solid var(--link-line,#ddd);display:grid;place-items:center;margin:0 auto 12px}.gt-empty b{display:block;font-size:12px}.gt-empty p{font-size:10px;margin:5px 0}
.gt-error{margin:10px 0;border:1px solid #e4c9c3;background:#f4e8e5;color:#7b4c42;border-radius:10px;padding:10px 12px;font-size:10px}
.gt-footer{display:flex;justify-content:space-between;gap:20px;border-top:1px solid var(--link-line,#ddd);margin-top:28px;padding-top:12px;color:var(--link-faint,#999);font-size:8px;letter-spacing:.04em}
@media(max-width:760px){.gt-page{display:block}.gt-nav{position:relative;width:100%;height:auto;border-right:0;border-bottom:1px solid var(--link-line,#ddd);padding:10px 12px}.gt-logo{display:none}.gt-nav nav{display:flex}.gt-nav nav a{padding:8px 10px}.gt-nav-foot{display:none}.gt-main{width:100%;padding:26px 14px 50px}.gt-head h1{font-size:32px}.gt-detail{grid-column:1/-1;margin-left:32px;grid-template-columns:1fr}.gt-context,.gt-resolve{grid-column:auto}.gt-trace-grid{grid-template-columns:1fr}.gt-footer{display:block;line-height:1.8}}
`;
