"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { draggable, dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import styles from "./OperationalBoard.module.css";

type WorkflowState = "inbox" | "to_resolve" | "scheduled" | "in_progress" | "waiting" | "resolved" | "financially_closed";
type ViewMode = "list" | "calendar" | "kanban";
type CalendarMode = "day" | "week" | "month" | "year";

type BoardTask = {
  id: string;
  gesture_code: string;
  source_domain: string;
  entity_type?: string | null;
  global_id?: string | null;
  title: string;
  note?: string | null;
  objective?: string | null;
  context_summary?: string | null;
  resolution_criteria?: string | null;
  recommended_action?: string | null;
  status: string;
  workflow_state: WorkflowState;
  priority: number;
  task_kind?: string | null;
  responsible?: string | null;
  waiting_for?: string | null;
  follow_up_at?: string | null;
  resolution_note?: string | null;
  due_at?: string | null;
  started_at?: string | null;
  created_at: string;
  business_id?: string | null;
  business_global_id?: string | null;
  business_name?: string | null;
  business_color?: string | null;
  link_id?: string | null;
  link_global_id?: string | null;
  link_name?: string | null;
  product_id?: string | null;
  product_global_id?: string | null;
  product_name?: string | null;
  entity_name?: string | null;
  calendar_sync_status?: string | null;
  finance?: Record<string, unknown> | null;
  documents?: Array<{
    id: string;
    drive_url: string;
    file_name: string;
    document_type: string;
    amount?: number | string | null;
    currency?: string | null;
    created_at: string;
  }>;
};

type BoardEvent = {
  id: string;
  title: string;
  description?: string | null;
  starts_at: string;
  ends_at: string;
  event_url?: string | null;
  event_kind?: string | null;
  business_id?: string | null;
  business_global_id?: string | null;
  business_name?: string | null;
  business_color?: string | null;
  link_name?: string | null;
  product_name?: string | null;
  priority?: number | null;
  calendar_name?: string | null;
};

type Business = { id: string; name: string; global_id?: string | null };
type LinkItem = { id: string; name: string; global_id?: string | null; business_id?: string | null };
type ProductItem = { id: string; name: string; global_id?: string | null; business_id?: string | null; client_id?: string | null };

type BoardData = {
  ok: boolean;
  generatedAt: string;
  tasks: BoardTask[];
  agenda: BoardEvent[];
  businesses: Business[];
  links: LinkItem[];
  products: ProductItem[];
  calendars: Array<Record<string, unknown>>;
  counts: { active: number; today: number; financial: number; waiting: number };
  preferences?: {
    view_mode?: ViewMode;
    calendar_mode?: CalendarMode;
    filters?: Record<string, string>;
  };
};

type Filters = {
  business: string;
  link: string;
  product: string;
  date: string;
  priority: string;
  state: string;
  type: string;
  origin: string;
  responsible: string;
  customStart: string;
  customEnd: string;
};

const DEFAULT_FILTERS: Filters = {
  business: "all",
  link: "all",
  product: "all",
  date: "all",
  priority: "all",
  state: "all",
  type: "all",
  origin: "all",
  responsible: "all",
  customStart: "",
  customEnd: "",
};

const WORKFLOW_COLUMNS: Array<{ id: WorkflowState; label: string; hint: string }> = [
  { id: "inbox", label: "Entrada", hint: "Recién detectado" },
  { id: "to_resolve", label: "Por resolver", hint: "Requiere decisión" },
  { id: "scheduled", label: "Programado", hint: "Tiene fecha" },
  { id: "in_progress", label: "En curso", hint: "Se está ejecutando" },
  { id: "waiting", label: "Esperando", hint: "Depende de respuesta" },
  { id: "resolved", label: "Resuelto", hint: "Resultado registrado" },
  { id: "financially_closed", label: "Cierre financiero", hint: "Pago + respaldo" },
];

export default function OperationalBoard() {
  const [data, setData] = useState<BoardData | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("week");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [search, setSearch] = useState("");
  const [activeDate, setActiveDate] = useState(() => new Date());
  const [selectedTask, setSelectedTask] = useState<BoardTask | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<BoardEvent | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ task: BoardTask; target: WorkflowState } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const initialized = useRef(false);
  const saveTimer = useRef<number | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/operational-board", { cache: "no-store" });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || "No se pudo cargar la pizarra");
    setData(json);
    if (!initialized.current) {
      initialized.current = true;
      if (json.preferences?.view_mode) setViewMode(json.preferences.view_mode);
      if (json.preferences?.calendar_mode) setCalendarMode(json.preferences.calendar_mode);
      if (json.preferences?.filters) setFilters({ ...DEFAULT_FILTERS, ...json.preferences.filters });
    }
    setError("");
  }, []);

  useEffect(() => {
    load().catch((reason: Error) => setError(reason.message));
  }, [load]);

  useEffect(() => {
    if (!initialized.current) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      fetch("/api/operational-board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_preferences",
          viewMode,
          calendarMode,
          filters,
        }),
      }).catch(() => undefined);
    }, 450);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [viewMode, calendarMode, filters]);

  const links = useMemo(() => {
    if (!data) return [];
    return data.links.filter((item) => filters.business === "all" || item.business_id === filters.business);
  }, [data, filters.business]);

  const products = useMemo(() => {
    if (!data) return [];
    return data.products.filter((item) => {
      if (filters.business !== "all" && item.business_id !== filters.business) return false;
      if (filters.link !== "all" && item.client_id !== filters.link) return false;
      return true;
    });
  }, [data, filters.business, filters.link]);

  const responsibleOptions = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.tasks.map((task) => task.responsible).filter(Boolean) as string[])).sort((a,b)=>a.localeCompare(b,"es"));
  }, [data]);

  const filteredTasks = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.tasks.filter((task) => {
      if (filters.business !== "all" && task.business_id !== filters.business) return false;
      if (filters.link !== "all" && task.link_id !== filters.link && task.global_id !== data.links.find((item)=>item.id===filters.link)?.global_id) return false;
      if (filters.product !== "all" && task.product_id !== filters.product && task.global_id !== data.products.find((item)=>item.id===filters.product)?.global_id) return false;
      if (filters.priority !== "all" && String(task.priority) !== filters.priority) return false;
      if (filters.state !== "all" && task.workflow_state !== filters.state) return false;
      if (filters.responsible !== "all" && (task.responsible || "") !== filters.responsible) return false;
      if (!matchTaskType(task, filters.type)) return false;
      if (!matchOrigin(task.source_domain, filters.origin)) return false;
      if (!matchDate(task.due_at || task.created_at, filters)) return false;
      if (q && ![
        task.title, task.objective, task.note, task.business_name, task.link_name,
        task.product_name, task.responsible, task.entity_name
      ].filter(Boolean).join(" ").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, filters, search]);

  const filteredEvents = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.agenda.filter((event) => {
      if (filters.business !== "all" && event.business_id !== filters.business) return false;
      if (filters.link !== "all" && event.link_name !== data.links.find((item)=>item.id===filters.link)?.name) return false;
      if (filters.product !== "all" && event.product_name !== data.products.find((item)=>item.id===filters.product)?.name) return false;
      if (filters.priority !== "all" && String(event.priority || 3) !== filters.priority) return false;
      if (filters.state !== "all" && filters.state !== "scheduled") return false;
      if (!matchEventType(event, filters.type)) return false;
      if (filters.origin !== "all" && filters.origin !== "calendar") return false;
      if (!matchDate(event.starts_at, filters)) return false;
      if (q && ![event.title,event.description,event.business_name,event.link_name,event.product_name,event.calendar_name].filter(Boolean).join(" ").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, filters, search]);

  async function post(payload: Record<string, unknown>) {
    setBusy(String(payload.id || payload.action || "busy"));
    setError("");
    try {
      const response = await fetch("/api/operational-board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(errorText(json.error));
      await load();
      return json;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo actualizar la pizarra");
      throw reason;
    } finally {
      setBusy("");
    }
  }

  function requestMove(taskId: string, target: WorkflowState) {
    const task = data?.tasks.find((item) => item.id === taskId);
    if (!task || task.workflow_state === target) return;
    if (["scheduled","waiting","resolved"].includes(target)) {
      setPendingMove({ task, target });
      return;
    }
    post({ action: "move_workflow", id: task.id, workflowState: target }).catch(()=>undefined);
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS);
    setSearch("");
  }

  return (
    <main className={styles.boardPage}>
      <header className={styles.topbar}>
        <div className={styles.topLeft}>
          <Link href="/operacion" className={styles.back}>← Operación</Link>
          <div>
            <small>PIZARRA OPERATIVA</small>
            <h1>LINK WORLD</h1>
          </div>
        </div>
        <div className={styles.topActions}>
          <div className={styles.sync}><i /> {data ? "Datos cargados" : "Cargando"}</div>
          <button className={styles.createButton} onClick={()=>setCreateOpen(true)}>＋ Nuevo gesto</button>
        </div>
      </header>

      <section className={styles.toolbar}>
        <div className={styles.searchBox}>
          <span>⌕</span>
          <input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Buscar gesto, negocio, Link, producto, responsable…" />
        </div>
        <div className={styles.views}>
          <button className={viewMode==="list"?styles.activeView:""} onClick={()=>setViewMode("list")}>Lista</button>
          <button className={viewMode==="calendar"?styles.activeView:""} onClick={()=>setViewMode("calendar")}>Calendario</button>
          <button className={viewMode==="kanban"?styles.activeView:""} onClick={()=>setViewMode("kanban")}>Kanban</button>
        </div>
      </section>

      <BoardFilters
        data={data}
        filters={filters}
        setFilters={setFilters}
        links={links}
        products={products}
        responsibles={responsibleOptions}
        clear={clearFilters}
      />

      <section className={styles.workspace}>
        {error ? <div className={styles.error}>{error}</div> : null}
        {!data ? <div className={styles.loading}>Cargando LINK WORLD…</div> : null}

        {data && viewMode==="list" ? (
          <ListView tasks={filteredTasks} events={filteredEvents} openTask={setSelectedTask} openEvent={setSelectedEvent} />
        ) : null}

        {data && viewMode==="calendar" ? (
          <CalendarView
            tasks={filteredTasks}
            events={filteredEvents}
            mode={calendarMode}
            setMode={setCalendarMode}
            activeDate={activeDate}
            setActiveDate={setActiveDate}
            openTask={setSelectedTask}
            openEvent={setSelectedEvent}
          />
        ) : null}

        {data && viewMode==="kanban" ? (
          <KanbanView tasks={filteredTasks} onDropTask={requestMove} openTask={setSelectedTask} />
        ) : null}
      </section>

      {selectedTask ? (
        <TaskDrawer
          task={selectedTask}
          close={()=>setSelectedTask(null)}
          save={(payload)=>post({action:"update",id:selectedTask.id,...payload}).then(()=>setSelectedTask(null))}
          move={(target)=>{ const taskId=selectedTask.id; setSelectedTask(null); requestMove(taskId,target); }}
          busy={busy===selectedTask.id}
        />
      ) : null}

      {selectedEvent ? <EventDrawer event={selectedEvent} close={()=>setSelectedEvent(null)} /> : null}

      {createOpen && data ? (
        <CreateGestureModal
          businesses={data.businesses}
          links={data.links}
          products={data.products}
          close={()=>setCreateOpen(false)}
          create={(payload)=>post({action:"create",...payload}).then(()=>setCreateOpen(false))}
        />
      ) : null}

      {pendingMove ? (
        <MoveModal
          task={pendingMove.task}
          target={pendingMove.target}
          close={()=>setPendingMove(null)}
          confirm={(payload)=>post({
            action:"move_workflow",
            id:pendingMove.task.id,
            workflowState:pendingMove.target,
            ...payload,
          }).then(()=>setPendingMove(null))}
        />
      ) : null}
    </main>
  );
}

function BoardFilters({
  data, filters, setFilters, links, products, responsibles, clear,
}: {
  data: BoardData | null;
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  links: LinkItem[];
  products: ProductItem[];
  responsibles: string[];
  clear: ()=>void;
}) {
  const update=(key:keyof Filters,value:string)=>setFilters((current)=>({...current,[key]:value}));
  return (
    <section className={styles.filters}>
      <Filter label="Negocio">
        <select value={filters.business} onChange={(event)=>{update("business",event.target.value);update("link","all");update("product","all");}}>
          <option value="all">Todos</option>
          {(data?.businesses||[]).map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </Filter>
      <Filter label="Link">
        <select value={filters.link} onChange={(event)=>{update("link",event.target.value);update("product","all");}}>
          <option value="all">Todos</option>
          {links.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </Filter>
      <Filter label="Producto">
        <select value={filters.product} onChange={(event)=>update("product",event.target.value)}>
          <option value="all">Todos</option>
          {products.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </Filter>
      <Filter label="Fecha">
        <select value={filters.date} onChange={(event)=>update("date",event.target.value)}>
          <option value="all">Todas</option>
          <option value="today">Hoy</option>
          <option value="tomorrow">Mañana</option>
          <option value="this_week">Esta semana</option>
          <option value="next_week">Próxima semana</option>
          <option value="this_month">Este mes</option>
          <option value="next_month">Próximo mes</option>
          <option value="year">Este año</option>
          <option value="custom">Rango…</option>
        </select>
      </Filter>
      <Filter label="Prioridad">
        <select value={filters.priority} onChange={(event)=>update("priority",event.target.value)}>
          <option value="all">Todas</option>
          <option value="1">Alta</option>
          <option value="2">Media</option>
          <option value="3">Baja</option>
        </select>
      </Filter>
      <Filter label="Estado">
        <select value={filters.state} onChange={(event)=>update("state",event.target.value)}>
          <option value="all">Todos</option>
          {WORKFLOW_COLUMNS.map((item)=><option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </Filter>
      <Filter label="Tipo">
        <select value={filters.type} onChange={(event)=>update("type",event.target.value)}>
          <option value="all">Todos</option>
          <option value="gesture">Gesto</option>
          <option value="calendar">Calendario</option>
          <option value="commercial">Comercial</option>
          <option value="finance">Finanzas</option>
          <option value="closure">Cierre</option>
          <option value="document">Documento</option>
        </select>
      </Filter>
      <Filter label="Origen">
        <select value={filters.origin} onChange={(event)=>update("origin",event.target.value)}>
          <option value="all">Todos</option>
          <option value="world">LINK WORLD</option>
          <option value="calendar">Google Calendar</option>
          <option value="control">Control Central</option>
          <option value="manual">Manual</option>
        </select>
      </Filter>
      <Filter label="Responsable">
        <select value={filters.responsible} onChange={(event)=>update("responsible",event.target.value)}>
          <option value="all">Todos</option>
          {responsibles.map((item)=><option key={item} value={item}>{item}</option>)}
        </select>
      </Filter>
      {filters.date==="custom" ? (
        <>
          <Filter label="Desde"><input type="date" value={filters.customStart} onChange={(event)=>update("customStart",event.target.value)} /></Filter>
          <Filter label="Hasta"><input type="date" value={filters.customEnd} onChange={(event)=>update("customEnd",event.target.value)} /></Filter>
        </>
      ) : null}
      <button className={styles.clearFilters} onClick={clear}>Limpiar</button>
    </section>
  );
}

function Filter({label,children}:{label:string;children:React.ReactNode}) {
  return <label className={styles.filter}><span>{label}</span>{children}</label>;
}


type ListSortKey = "date" | "business" | "link" | "product" | "type" | "title" | "state" | "priority" | "responsible";
type ListGroup = "none" | "business" | "date";

type UnifiedListRow =
  | {
      kind: "task";
      id: string;
      date: string;
      business: string;
      businessColor: string;
      link: string;
      product: string;
      type: string;
      title: string;
      objective: string;
      state: string;
      priority: number;
      responsible: string;
      support: string;
      task: BoardTask;
    }
  | {
      kind: "event";
      id: string;
      date: string;
      business: string;
      businessColor: string;
      link: string;
      product: string;
      type: string;
      title: string;
      objective: string;
      state: string;
      priority: number;
      responsible: string;
      support: string;
      event: BoardEvent;
    };

function ListView({
  tasks, events, openTask, openEvent,
}: {
  tasks: BoardTask[];
  events: BoardEvent[];
  openTask:(task:BoardTask)=>void;
  openEvent:(event:BoardEvent)=>void;
}) {
  const [sortKey,setSortKey]=useState<ListSortKey>("date");
  const [sortDirection,setSortDirection]=useState<"asc"|"desc">("asc");
  const [groupBy,setGroupBy]=useState<ListGroup>("none");

  const rows=useMemo<UnifiedListRow[]>(()=>[
    ...tasks.map((task)=>({
      kind:"task" as const,
      id:task.id,
      date:task.due_at||task.created_at,
      business:task.business_name||"Sin negocio",
      businessColor:task.business_color||"#d7d4cc",
      link:task.link_name||"—",
      product:task.product_name||"—",
      type:taskTypeLabel(task),
      title:task.title,
      objective:task.objective||task.recommended_action||"",
      state:workflowLabel(task.workflow_state),
      priority:task.priority||3,
      responsible:task.responsible||"—",
      support:taskSupportLabel(task),
      task,
    })),
    ...events.map((event)=>({
      kind:"event" as const,
      id:event.id,
      date:event.starts_at,
      business:event.business_name||event.calendar_name||"Google Calendar",
      businessColor:event.business_color||"#d7d4cc",
      link:event.link_name||"—",
      product:event.product_name||"—",
      type:eventTypeLabel(event),
      title:event.title,
      objective:event.description||"",
      state:"Agenda",
      priority:event.priority||3,
      responsible:"—",
      support:event.event_url?"Calendar":"—",
      event,
    })),
  ],[tasks,events]);

  const sortedRows=useMemo(()=>{
    const copy=[...rows];
    copy.sort((a,b)=>{
      let comparison=0;
      if(sortKey==="date") comparison=new Date(a.date).getTime()-new Date(b.date).getTime();
      else if(sortKey==="priority") comparison=a.priority-b.priority;
      else {
        const av=String(a[sortKey]||"").toLocaleLowerCase("es");
        const bv=String(b[sortKey]||"").toLocaleLowerCase("es");
        comparison=av.localeCompare(bv,"es",{numeric:true,sensitivity:"base"});
      }
      return sortDirection==="asc"?comparison:-comparison;
    });
    return copy;
  },[rows,sortKey,sortDirection]);

  const groups=useMemo(()=>{
    if(groupBy==="none") return [{key:"all",label:"Todos los ítems",rows:sortedRows}];
    const map=new Map<string,UnifiedListRow[]>();
    for(const row of sortedRows){
      const key=groupBy==="business"
        ? row.business
        : new Date(row.date).toLocaleDateString("es-CL",{year:"numeric",month:"long",day:"numeric"});
      const current=map.get(key)||[];
      current.push(row);
      map.set(key,current);
    }
    return Array.from(map.entries()).map(([key,items])=>({key,label:key,rows:items}));
  },[sortedRows,groupBy]);

  function toggleSort(key:ListSortKey){
    if(sortKey===key) setSortDirection((current)=>current==="asc"?"desc":"asc");
    else {setSortKey(key);setSortDirection("asc");}
  }

  if(!rows.length) return <Empty text="No hay elementos para estos filtros." />;

  return (
    <div className={styles.tableShell}>
      <div className={styles.tableToolbar}>
        <div>
          <small>VISTA LISTA</small>
          <b>{rows.length} ítems</b>
        </div>
        <label>
          <span>Agrupar</span>
          <select value={groupBy} onChange={(event)=>setGroupBy(event.target.value as ListGroup)}>
            <option value="none">Sin agrupar</option>
            <option value="business">Por negocio</option>
            <option value="date">Por fecha</option>
          </select>
        </label>
      </div>

      <div className={styles.tableScroll}>
        <div className={styles.tableHeader}>
          <SortableHead label="Fecha" active={sortKey==="date"} direction={sortDirection} onClick={()=>toggleSort("date")} />
          <SortableHead label="Negocio" active={sortKey==="business"} direction={sortDirection} onClick={()=>toggleSort("business")} />
          <SortableHead label="Link" active={sortKey==="link"} direction={sortDirection} onClick={()=>toggleSort("link")} />
          <SortableHead label="Producto" active={sortKey==="product"} direction={sortDirection} onClick={()=>toggleSort("product")} />
          <SortableHead label="Tipo" active={sortKey==="type"} direction={sortDirection} onClick={()=>toggleSort("type")} />
          <SortableHead label="Ítem / objetivo" active={sortKey==="title"} direction={sortDirection} onClick={()=>toggleSort("title")} />
          <SortableHead label="Estado" active={sortKey==="state"} direction={sortDirection} onClick={()=>toggleSort("state")} />
          <SortableHead label="Prioridad" active={sortKey==="priority"} direction={sortDirection} onClick={()=>toggleSort("priority")} />
          <SortableHead label="Responsable" active={sortKey==="responsible"} direction={sortDirection} onClick={()=>toggleSort("responsible")} />
          <span className={styles.tableHeaderStatic}>Soporte</span>
          <span className={styles.tableHeaderStatic}>Abrir</span>
        </div>

        {groups.map((group)=>(
          <section key={group.key} className={styles.tableGroup}>
            {groupBy!=="none"?(
              <header className={styles.tableGroupHeader}>
                <b>{group.label}</b>
                <span>{group.rows.length}</span>
              </header>
            ):null}
            {group.rows.map((row)=>(
              <button
                key={row.kind+"-"+row.id}
                className={styles.tableRow}
                onClick={()=>row.kind==="task"?openTask(row.task):openEvent(row.event)}
              >
                <time className={styles.tableDate}>{formatListDate(row.date)}</time>
                <span className={styles.tableBusiness}><i style={{background:row.businessColor}} />{row.business}</span>
                <span className={styles.tableCell}>{row.link}</span>
                <span className={styles.tableCell}>{row.product}</span>
                <span className={styles.tableType}>{row.type}</span>
                <span className={styles.tableTitle}><b>{row.title}</b>{row.objective?<small>{row.objective}</small>:null}</span>
                <span className={styles.tableState}>{row.state}</span>
                <span className={styles["tablePriority"+row.priority]}>{priorityLabel(row.priority)}</span>
                <span className={styles.tableCell}>{row.responsible}</span>
                <span className={styles.tableSupport}>{row.support}</span>
                <em className={styles.tableOpen}>›</em>
              </button>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

function SortableHead({
  label,active,direction,onClick,
}: {
  label:string;active:boolean;direction:"asc"|"desc";onClick:()=>void;
}) {
  return (
    <button className={styles.sortHead+(active?" "+styles.sortHeadActive:"")} onClick={onClick}>
      {label}<span>{active?(direction==="asc"?"↑":"↓"):"↕"}</span>
    </button>
  );
}

function taskTypeLabel(task:BoardTask){
  if(task.task_kind==="financial_transaction") return "Finanzas";
  if(task.task_kind==="financial_closure") return "Cierre";
  if(task.entity_type==="product") return "Producto";
  if(task.entity_type==="counterparty"||task.entity_type==="client") return "Link";
  if(task.entity_type==="business") return "Negocio";
  return "Gesto";
}

function eventTypeLabel(event:BoardEvent){
  if(event.event_kind==="financial") return "Finanzas";
  if(event.event_kind==="gesture") return "Gesto Calendar";
  return "Calendario";
}

function taskSupportLabel(task:BoardTask){
  const docs=task.documents?.length||0;
  if(task.task_kind==="financial_transaction"||task.task_kind==="financial_closure"){
    if(docs) return docs+" doc"+(docs===1?"":"s");
    return "Sin respaldo";
  }
  if(docs) return docs+" doc"+(docs===1?"":"s");
  if(task.calendar_sync_status==="pending") return "Calendar pendiente";
  if(task.due_at) return "Programado";
  return "—";
}

function formatListDate(value:string){
  const date=new Date(value);
  const today=new Date();
  const same=sameDay(date,today);
  return (same?"Hoy · ":"")+date.toLocaleString("es-CL",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
}

function KanbanView({
  tasks,onDropTask,openTask,
}: {
  tasks:BoardTask[];
  onDropTask:(taskId:string,target:WorkflowState)=>void;
  openTask:(task:BoardTask)=>void;
}) {
  return (
    <div className={styles.kanban}>
      {WORKFLOW_COLUMNS.map((column)=>(
        <KanbanColumn key={column.id} column={column} tasks={tasks.filter((task)=>task.workflow_state===column.id)} onDropTask={onDropTask} openTask={openTask} />
      ))}
    </div>
  );
}

function KanbanColumn({
  column,tasks,onDropTask,openTask,
}: {
  column:{id:WorkflowState;label:string;hint:string};
  tasks:BoardTask[];
  onDropTask:(taskId:string,target:WorkflowState)=>void;
  openTask:(task:BoardTask)=>void;
}) {
  const ref=useRef<HTMLDivElement|null>(null);
  const [over,setOver]=useState(false);
  useEffect(()=>{
    const element=ref.current;
    if(!element) return;
    return dropTargetForElements({
      element,
      canDrop:({source})=>source.data.type==="board-task",
      getData:()=>({workflowState:column.id}),
      onDragEnter:()=>setOver(true),
      onDragLeave:()=>setOver(false),
      onDrop:({source})=>{
        setOver(false);
        const taskId=String(source.data.taskId||"");
        if(taskId) onDropTask(taskId,column.id);
      },
    });
  },[column.id,onDropTask]);

  return (
    <section ref={ref} className={styles.kanbanColumn+(over?" "+styles.dropOver:"")}>
      <header><div><b>{column.label}</b><small>{column.hint}</small></div><span>{tasks.length}</span></header>
      <div className={styles.cards}>
        {tasks.map((task)=><KanbanCard key={task.id} task={task} open={()=>openTask(task)} />)}
        {!tasks.length?<div className={styles.columnEmpty}>Arrastra aquí</div>:null}
      </div>
    </section>
  );
}

function KanbanCard({task,open}:{task:BoardTask;open:()=>void}) {
  const ref=useRef<HTMLDivElement|null>(null);
  const [dragging,setDragging]=useState(false);
  useEffect(()=>{
    const element=ref.current;
    if(!element) return;
    return draggable({
      element,
      getInitialData:()=>({type:"board-task",taskId:task.id}),
      onDragStart:()=>setDragging(true),
      onDrop:()=>setDragging(false),
    });
  },[task.id]);

  return (
    <article ref={ref} className={styles.card+(dragging?" "+styles.dragging:"")} style={{borderTopColor:task.business_color||"#d7d4cc"}} onClick={open}>
      <div className={styles.cardMeta}><span><i style={{background:task.business_color||"#d7d4cc"}} />{task.business_name||"Sin negocio"}</span><em className={styles["priority"+task.priority]}>{priorityLabel(task.priority)}</em></div>
      <h3>{task.title}</h3>
      {task.objective?<p>{task.objective}</p>:null}
      <div className={styles.cardRelations}>{task.link_name?<span>Link · {task.link_name}</span>:null}{task.product_name?<span>Producto · {task.product_name}</span>:null}</div>
      <footer><span>{task.due_at?formatDateTime(task.due_at):"Sin fecha"}</span><span>{task.responsible||sourceLabel(task)}</span></footer>
    </article>
  );
}

function CalendarView({
  tasks,events,mode,setMode,activeDate,setActiveDate,openTask,openEvent,
}: {
  tasks:BoardTask[];
  events:BoardEvent[];
  mode:CalendarMode;
  setMode:(mode:CalendarMode)=>void;
  activeDate:Date;
  setActiveDate:(date:Date)=>void;
  openTask:(task:BoardTask)=>void;
  openEvent:(event:BoardEvent)=>void;
}) {
  const items=[
    ...tasks.filter((task)=>task.due_at).map((task)=>({kind:"task" as const,start:new Date(task.due_at as string),task,color:task.business_color||"#d7d4cc",title:task.title})),
    ...events.map((event)=>({kind:"event" as const,start:new Date(event.starts_at),event,color:event.business_color||"#d7d4cc",title:event.title})),
  ];

  return (
    <div className={styles.calendar}>
      <header className={styles.calendarHeader}>
        <div className={styles.calendarNav}><button onClick={()=>setActiveDate(shiftDate(activeDate,mode,-1))}>‹</button><button onClick={()=>setActiveDate(new Date())}>Hoy</button><button onClick={()=>setActiveDate(shiftDate(activeDate,mode,1))}>›</button><b>{periodTitle(activeDate,mode)}</b></div>
        <div className={styles.calendarModes}>{(["day","week","month","year"] as CalendarMode[]).map((item)=><button key={item} className={mode===item?styles.calendarModeOn:""} onClick={()=>setMode(item)}>{calendarModeLabel(item)}</button>)}</div>
      </header>
      {mode==="day"?<DayCalendar date={activeDate} items={items} openTask={openTask} openEvent={openEvent}/>:null}
      {mode==="week"?<WeekCalendar date={activeDate} items={items} openTask={openTask} openEvent={openEvent}/>:null}
      {mode==="month"?<MonthCalendar date={activeDate} items={items} openTask={openTask} openEvent={openEvent}/>:null}
      {mode==="year"?<YearCalendar date={activeDate} items={items} chooseMonth={(month)=>{setActiveDate(new Date(activeDate.getFullYear(),month,1));setMode("month");}}/>:null}
    </div>
  );
}

type CalendarItem =
  | {kind:"task";start:Date;task:BoardTask;color:string;title:string}
  | {kind:"event";start:Date;event:BoardEvent;color:string;title:string};

function DayCalendar({date,items,openTask,openEvent}:{date:Date;items:CalendarItem[];openTask:(task:BoardTask)=>void;openEvent:(event:BoardEvent)=>void}) {
  const dayItems=items.filter((item)=>sameDay(item.start,date)).sort((a,b)=>a.start.getTime()-b.start.getTime());
  return <div className={styles.dayCalendar}>{dayItems.length?dayItems.map((item)=><CalendarItemRow key={item.kind+"-"+(item.kind==="task"?item.task.id:item.event.id)} item={item} openTask={openTask} openEvent={openEvent}/>):<Empty text="Sin eventos para este día."/>}</div>;
}

function WeekCalendar({date,items,openTask,openEvent}:{date:Date;items:CalendarItem[];openTask:(task:BoardTask)=>void;openEvent:(event:BoardEvent)=>void}) {
  const start=startOfWeek(date);
  const days=Array.from({length:7},(_,i)=>addDays(start,i));
  return <div className={styles.weekGrid}>{days.map((day)=><section key={day.toISOString()} className={styles.weekDay}><header><small>{day.toLocaleDateString("es-CL",{weekday:"short"})}</small><b>{day.getDate()}</b></header><div>{items.filter((item)=>sameDay(item.start,day)).sort((a,b)=>a.start.getTime()-b.start.getTime()).map((item)=><CalendarChip key={item.kind+"-"+(item.kind==="task"?item.task.id:item.event.id)} item={item} openTask={openTask} openEvent={openEvent}/>)}</div></section>)}</div>;
}

function MonthCalendar({date,items,openTask,openEvent}:{date:Date;items:CalendarItem[];openTask:(task:BoardTask)=>void;openEvent:(event:BoardEvent)=>void}) {
  const first=new Date(date.getFullYear(),date.getMonth(),1);
  const gridStart=startOfWeek(first);
  const days=Array.from({length:42},(_,i)=>addDays(gridStart,i));
  return <div className={styles.monthGrid}>{days.map((day)=>{const dayItems=items.filter((item)=>sameDay(item.start,day));const muted=day.getMonth()!==date.getMonth();return <section key={day.toISOString()} className={styles.monthDay+(muted?" "+styles.mutedDay:"")}><header>{day.getDate()}</header><div>{dayItems.slice(0,4).map((item)=><CalendarChip compact key={item.kind+"-"+(item.kind==="task"?item.task.id:item.event.id)} item={item} openTask={openTask} openEvent={openEvent}/>)}</div>{dayItems.length>4?<small>+{dayItems.length-4} más</small>:null}</section>;})}</div>;
}

function YearCalendar({date,items,chooseMonth}:{date:Date;items:CalendarItem[];chooseMonth:(month:number)=>void}) {
  return <div className={styles.yearGrid}>{Array.from({length:12},(_,month)=>{const count=items.filter((item)=>item.start.getFullYear()===date.getFullYear()&&item.start.getMonth()===month).length;return <button key={month} onClick={()=>chooseMonth(month)}><b>{new Date(date.getFullYear(),month,1).toLocaleDateString("es-CL",{month:"long"})}</b><strong>{count}</strong><span>elementos</span></button>;})}</div>;
}

function CalendarItemRow({item,openTask,openEvent}:{item:CalendarItem;openTask:(task:BoardTask)=>void;openEvent:(event:BoardEvent)=>void}) {
  return <button className={styles.calendarRow} onClick={()=>item.kind==="task"?openTask(item.task):openEvent(item.event)}><time>{item.start.toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"})}</time><i style={{background:item.color}}/><div><b>{item.title}</b><span>{item.kind==="task"?(item.task.business_name||"Gesto"):(item.event.business_name||"Google Calendar")}</span></div></button>;
}

function CalendarChip({item,openTask,openEvent,compact}:{item:CalendarItem;openTask:(task:BoardTask)=>void;openEvent:(event:BoardEvent)=>void;compact?:boolean}) {
  return <button className={styles.calendarChip+(compact?" "+styles.compactChip:"")} style={{borderLeftColor:item.color}} onClick={()=>item.kind==="task"?openTask(item.task):openEvent(item.event)}><b>{compact?"":item.start.toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"})+" "}{item.title}</b></button>;
}

function TaskDrawer({
  task,close,save,move,busy,
}: {
  task:BoardTask;close:()=>void;save:(payload:Record<string,unknown>)=>Promise<unknown>;move:(target:WorkflowState)=>void;busy:boolean;
}) {
  const [title,setTitle]=useState(task.title);
  const [objective,setObjective]=useState(task.objective||"");
  const [responsible,setResponsible]=useState(task.responsible||"");
  const [priority,setPriority]=useState(String(task.priority));
  return <div className={styles.overlay} onMouseDown={(event)=>{if(event.target===event.currentTarget)close();}}><aside className={styles.drawer}>
    <header><div><small>{task.business_name||"LINK WORLD"} · {workflowLabel(task.workflow_state)}</small><h2>{task.title}</h2></div><button onClick={close}>×</button></header>
    <section className={styles.drawerSection}><h3>Editar</h3><label>Título<input value={title} onChange={(event)=>setTitle(event.target.value)}/></label><label>Objetivo<textarea value={objective} onChange={(event)=>setObjective(event.target.value)}/></label><div className={styles.twoFields}><label>Prioridad<select value={priority} onChange={(event)=>setPriority(event.target.value)}><option value="1">Alta</option><option value="2">Media</option><option value="3">Baja</option></select></label><label>Responsable<input value={responsible} onChange={(event)=>setResponsible(event.target.value)} placeholder="Por definir"/></label></div><button className={styles.primary} disabled={busy} onClick={()=>save({title,objective,responsible,priority:Number(priority)})}>Guardar cambios</button></section>
    <section className={styles.drawerSection}><h3>Contexto</h3>{task.context_summary?<p>{task.context_summary}</p>:null}{task.recommended_action?<Info label="Qué hay que resolver" value={task.recommended_action}/>:null}{task.resolution_criteria?<Info label="Se considera resuelto cuando" value={task.resolution_criteria}/>:null}</section>
    <section className={styles.drawerSection}><h3>Relaciones</h3><div className={styles.infoGrid}><Info label="Negocio" value={task.business_name||"—"}/><Info label="Link" value={task.link_name||"—"}/><Info label="Producto" value={task.product_name||"—"}/><Info label="Responsable" value={task.responsible||"—"}/></div></section>
    {task.documents?.length?<section className={styles.drawerSection}><h3>Documentos</h3><div className={styles.docs}>{task.documents.map((doc)=><a key={doc.id} href={doc.drive_url} target="_blank" rel="noreferrer"><div><b>{doc.file_name}</b><small>{doc.document_type}</small></div><span>↗</span></a>)}</div></section>:null}
    <section className={styles.drawerSection}><h3>Mover a</h3><div className={styles.moveButtons}>{WORKFLOW_COLUMNS.filter((item)=>item.id!==task.workflow_state).map((item)=><button key={item.id} onClick={()=>move(item.id)}>{item.label}</button>)}</div></section>
    <details className={styles.trace}><summary>Trazabilidad técnica</summary><Info label="Gesto" value={task.gesture_code}/><Info label="Global ID" value={task.global_id||"—"}/></details>
  </aside></div>;
}

function EventDrawer({event,close}:{event:BoardEvent;close:()=>void}) {
  return <div className={styles.overlay} onMouseDown={(e)=>{if(e.target===e.currentTarget)close();}}><aside className={styles.drawer}><header><div><small>GOOGLE CALENDAR · {event.business_name||"Sin negocio"}</small><h2>{event.title}</h2></div><button onClick={close}>×</button></header><section className={styles.drawerSection}><div className={styles.infoGrid}><Info label="Inicio" value={formatDateTime(event.starts_at)}/><Info label="Fin" value={formatDateTime(event.ends_at)}/><Info label="Link" value={event.link_name||"—"}/><Info label="Producto" value={event.product_name||"—"}/></div>{event.description?<p>{event.description}</p>:null}{event.event_url?<a className={styles.externalLink} href={event.event_url} target="_blank" rel="noreferrer">Abrir en Google Calendar ↗</a>:null}</section></aside></div>;
}

function CreateGestureModal({
  businesses,links,products,close,create,
}: {
  businesses:Business[];links:LinkItem[];products:ProductItem[];close:()=>void;create:(payload:Record<string,unknown>)=>Promise<unknown>;
}) {
  const [title,setTitle]=useState("");
  const [objective,setObjective]=useState("");
  const [business,setBusiness]=useState("all");
  const [link,setLink]=useState("all");
  const [product,setProduct]=useState("all");
  const [priority,setPriority]=useState("2");
  const [responsible,setResponsible]=useState("");
  const [dueAt,setDueAt]=useState("");
  const availableLinks=links.filter((item)=>business==="all"||item.business_id===business);
  const availableProducts=products.filter((item)=>(business==="all"||item.business_id===business)&&(link==="all"||item.client_id===link));
  async function submit(){
    let globalId:string|null=null;let entityType="gesture_task";
    const selectedProduct=products.find((item)=>item.id===product);
    const selectedLink=links.find((item)=>item.id===link);
    const selectedBusiness=businesses.find((item)=>item.id===business);
    if(selectedProduct?.global_id){globalId=selectedProduct.global_id;entityType="product";}
    else if(selectedLink?.global_id){globalId=selectedLink.global_id;entityType="counterparty";}
    else if(selectedBusiness?.global_id){globalId=selectedBusiness.global_id;entityType="business";}
    await create({title,objective,priority:Number(priority),responsible,dueAt:dueAt||null,globalId,entityType});
  }
  return <div className={styles.modalOverlay}><div className={styles.modal}><header><div><small>NUEVO GESTO</small><h2>¿Qué debe pasar?</h2></div><button onClick={close}>×</button></header><label>Título<input autoFocus value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Ej. Confirmar acuerdo con Wine Experience"/></label><label>Objetivo<textarea value={objective} onChange={(e)=>setObjective(e.target.value)} placeholder="Resultado que buscamos conseguir"/></label><div className={styles.twoFields}><label>Negocio<select value={business} onChange={(e)=>{setBusiness(e.target.value);setLink("all");setProduct("all");}}><option value="all">Sin asignar</option>{businesses.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Link<select value={link} onChange={(e)=>{setLink(e.target.value);setProduct("all");}}><option value="all">Sin Link</option>{availableLinks.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><div className={styles.twoFields}><label>Producto<select value={product} onChange={(e)=>setProduct(e.target.value)}><option value="all">Sin producto</option>{availableProducts.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Prioridad<select value={priority} onChange={(e)=>setPriority(e.target.value)}><option value="1">Alta</option><option value="2">Media</option><option value="3">Baja</option></select></label></div><div className={styles.twoFields}><label>Responsable<input value={responsible} onChange={(e)=>setResponsible(e.target.value)} /></label><label>Fecha y hora<input type="datetime-local" value={dueAt} onChange={(e)=>setDueAt(e.target.value)} /></label></div><footer><button onClick={close}>Cancelar</button><button className={styles.primary} disabled={!title.trim()} onClick={submit}>Crear gesto</button></footer></div></div>;
}

function MoveModal({
  task,target,close,confirm,
}: {
  task:BoardTask;target:WorkflowState;close:()=>void;confirm:(payload:Record<string,unknown>)=>Promise<unknown>;
}) {
  const [dueAt,setDueAt]=useState(task.due_at?toLocalInput(task.due_at):"");
  const [waitingFor,setWaitingFor]=useState(task.waiting_for||"");
  const [followUp,setFollowUp]=useState(task.follow_up_at?toLocalInput(task.follow_up_at):"");
  const [resolution,setResolution]=useState(task.resolution_note||"");
  async function submit(){
    if(target==="scheduled") await confirm({dueAt:new Date(dueAt).toISOString()});
    else if(target==="waiting") await confirm({waitingFor,followUpAt:followUp?new Date(followUp).toISOString():null});
    else if(target==="resolved") await confirm({resolutionNote:resolution});
  }
  return <div className={styles.modalOverlay}><div className={styles.modal}><header><div><small>MOVER GESTO</small><h2>{workflowLabel(target)}</h2><p>{task.title}</p></div><button onClick={close}>×</button></header>{target==="scheduled"?<label>Fecha y hora<input type="datetime-local" value={dueAt} onChange={(e)=>setDueAt(e.target.value)}/></label>:null}{target==="waiting"?<><label>¿De quién esperamos respuesta?<input value={waitingFor} onChange={(e)=>setWaitingFor(e.target.value)} placeholder="Persona, cliente, proveedor…"/></label><label>Seguimiento<input type="datetime-local" value={followUp} onChange={(e)=>setFollowUp(e.target.value)}/></label></>:null}{target==="resolved"?<label>¿Qué se resolvió?<textarea value={resolution} onChange={(e)=>setResolution(e.target.value)} placeholder="Resultado breve"/></label>:null}<footer><button onClick={close}>Cancelar</button><button className={styles.primary} disabled={target==="scheduled"&&!dueAt} onClick={submit}>Confirmar</button></footer></div></div>;
}

function Info({label,value}:{label:string;value:string}) {return <div className={styles.info}><small>{label}</small><b>{value}</b></div>;}
function Empty({text}:{text:string}) {return <div className={styles.empty}>{text}</div>;}

function matchTaskType(task:BoardTask,type:string) {
  if(type==="all"||type==="gesture") return type==="all"||!["financial_transaction","financial_closure"].includes(String(task.task_kind||""));
  if(type==="finance") return task.task_kind==="financial_transaction";
  if(type==="closure") return task.task_kind==="financial_closure";
  if(type==="document") return Boolean(task.documents?.length);
  if(type==="commercial") return ["counterparty","product","business"].includes(String(task.entity_type||""));
  if(type==="calendar") return false;
  return true;
}
function matchEventType(event:BoardEvent,type:string) {
  if(type==="all"||type==="calendar") return true;
  if(type==="finance") return event.event_kind==="financial";
  if(type==="gesture") return event.event_kind==="gesture";
  return false;
}
function matchOrigin(source:string,origin:string) {
  if(origin==="all") return true;
  if(origin==="world") return source==="world";
  if(origin==="control"||origin==="manual") return source==="control";
  if(origin==="calendar") return false;
  return true;
}
function matchDate(value:string|undefined|null,filters:Filters) {
  if(filters.date==="all") return true;
  if(!value) return false;
  const date=new Date(value); const now=new Date();
  const startToday=new Date(now);startToday.setHours(0,0,0,0);
  const endToday=new Date(now);endToday.setHours(23,59,59,999);
  if(filters.date==="today") return date>=startToday&&date<=endToday;
  if(filters.date==="tomorrow"){const s=addDays(startToday,1);const e=new Date(s);e.setHours(23,59,59,999);return date>=s&&date<=e;}
  if(filters.date==="this_week"){const s=startOfWeek(now);const e=addDays(s,7);return date>=s&&date<e;}
  if(filters.date==="next_week"){const s=addDays(startOfWeek(now),7);const e=addDays(s,7);return date>=s&&date<e;}
  if(filters.date==="this_month") return date.getFullYear()===now.getFullYear()&&date.getMonth()===now.getMonth();
  if(filters.date==="next_month"){const n=new Date(now.getFullYear(),now.getMonth()+1,1);return date.getFullYear()===n.getFullYear()&&date.getMonth()===n.getMonth();}
  if(filters.date==="year") return date.getFullYear()===now.getFullYear();
  if(filters.date==="custom"){const s=filters.customStart?new Date(filters.customStart+"T00:00:00"):null;const e=filters.customEnd?new Date(filters.customEnd+"T23:59:59"):null;return (!s||date>=s)&&(!e||date<=e);}
  return true;
}
function workflowLabel(value:WorkflowState) {return WORKFLOW_COLUMNS.find((item)=>item.id===value)?.label||value;}
function priorityLabel(value:number) {return value===1?"Alta":value===2?"Media":"Baja";}
function sourceLabel(task:BoardTask) {return task.source_domain==="world"?"LINK WORLD":"Control";}
function errorText(value:string) {
  const map:Record<string,string>={
    due_at_required:"Debes elegir fecha y hora.",
    financial_task_required:"Solo los gestos financieros pueden pasar a cierre financiero.",
    financial_document_missing:"Falta el respaldo documental de esta transacción.",
    financial_closure_not_ready:"El cierre financiero todavía tiene pendientes.",
  };
  if(map[value]) return map[value];
  if(!value || value==="operational_board_action_failed" || /^[a-z0-9_.-]+$/i.test(value)) {
    return "No se pudo completar la acción. Revisa los datos e inténtalo nuevamente.";
  }
  return "No se pudo completar la acción. "+value;
}
function formatDateTime(value:string) {return new Date(value).toLocaleString("es-CL",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});}
function toLocalInput(value:string) {const d=new Date(value);const pad=(n:number)=>String(n).padStart(2,"0");return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+"T"+pad(d.getHours())+":"+pad(d.getMinutes());}
function addDays(date:Date,days:number){const next=new Date(date);next.setDate(next.getDate()+days);return next;}
function sameDay(a:Date,b:Date){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();}
function startOfWeek(date:Date){const d=new Date(date);d.setHours(0,0,0,0);const day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);return d;}
function shiftDate(date:Date,mode:CalendarMode,direction:number){const d=new Date(date);if(mode==="day")d.setDate(d.getDate()+direction);if(mode==="week")d.setDate(d.getDate()+7*direction);if(mode==="month")d.setMonth(d.getMonth()+direction);if(mode==="year")d.setFullYear(d.getFullYear()+direction);return d;}
function periodTitle(date:Date,mode:CalendarMode){if(mode==="day")return date.toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"long"});if(mode==="week"){const s=startOfWeek(date),e=addDays(s,6);return s.toLocaleDateString("es-CL",{day:"numeric",month:"short"})+" – "+e.toLocaleDateString("es-CL",{day:"numeric",month:"short"});}if(mode==="month")return date.toLocaleDateString("es-CL",{month:"long",year:"numeric"});return String(date.getFullYear());}
function calendarModeLabel(mode:CalendarMode){return mode==="day"?"Día":mode==="week"?"Semana":mode==="month"?"Mes":"Año";}
