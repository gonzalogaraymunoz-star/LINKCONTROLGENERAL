"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Responsive, WidthProvider } from "react-grid-layout/legacy";

const ResponsiveGrid = WidthProvider(Responsive);

type Business = {
  id: string;
  name: string;
  sector?: string | null;
  city?: string | null;
  country?: string | null;
  website?: string | null;
  summary?: string | null;
  verification_status?: string | null;
  updated_at: string;
  global_id?: string | null;
};

type Product = {
  id: string;
  business_id?: string | null;
  client_id?: string | null;
  name: string;
  code?: string | null;
  category?: string | null;
  stage?: string | null;
  currency?: string | null;
  acquisition_price?: number | null;
  public_price?: number | null;
  responsibility_percent?: number | null;
  client_benefit_share_percent?: number | null;
  link_share_percent?: number | null;
  minimum_link_share_percent?: number | null;
  economic_state?: string | null;
  responsibility_notes?: string | null;
  agreement_notes?: string | null;
  updated_at: string;
  global_id?: string | null;
};

type Client = {
  id: string;
  business_id?: string | null;
  name: string;
  role?: string | null;
  relationship_state?: string | null;
  city?: string | null;
  country?: string | null;
  website?: string | null;
  summary?: string | null;
  agreement_status?: string | null;
  owned_facts?: Record<string, unknown> | null;
  evidence?: unknown;
  created_at: string;
  updated_at: string;
  global_id?: string | null;
  business?: Business | null;
  products: Product[];
};

type Activity = {
  id: string;
  action: string;
  target_type: string;
  target_id?: string | null;
  origin?: string | null;
  note?: string | null;
  created_at: string;
};

type AttentionItem = {
  id: string;
  kind: string;
  severity: string;
  title: string;
  detail: string;
  targetId?: string;
};

type Organelle = {
  id: string;
  organelle_key: string;
  provider_domain?: string | null;
  resource_kind?: string | null;
  resource_name?: string | null;
  truth_role?: string | null;
  status?: string | null;
  type?: {
    biological_name?: string | null;
    system_name?: string | null;
    purpose?: string | null;
    required_for_cell?: boolean | null;
    sort_order?: number | null;
  } | null;
};

type Cell = {
  entity_id: string;
  lifecycle_stage?: string | null;
  health_status?: string | null;
  autonomy_level?: number | null;
  constitution_version?: string | null;
  updated_at: string;
  business?: Business | null;
  entity?: {
    global_id?: string | null;
    status?: string | null;
  } | null;
  organelles: Organelle[];
  activeOrganelles: number;
  requiredOrganelles: number;
};

type PersonalMission = {
  date: string;
  todayTasks: number;
  openTasks: number;
  minimumsDone: number;
  minimumsTotal: number;
  focusedSeconds: number;
  commercialMoves: number;
};

type GridItem = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
};

type GridLayouts = Record<string, GridItem[]>;

type DashboardData = {
  ok: boolean;
  generatedAt: string;
  clients: Client[];
  businesses: Business[];
  products: Product[];
  activity: Activity[];
  requests: unknown[];
  relations: unknown[];
  attention: AttentionItem[];
  cells: Cell[];
  personalMission: PersonalMission;
  availableWidgets: string[];
  preferences: {
    visibleWidgets: string[];
    layouts: GridLayouts;
    clientColumns: string[];
    widgetViews: Record<string, string>;
    updatedAt?: string | null;
  };
};

const WIDGETS = [
  { id: "clients", label: "Clientes", description: "Quién existe y en qué estado está" },
  { id: "attention", label: "Necesita atención", description: "Definiciones que impiden avanzar" },
  { id: "products", label: "Productos", description: "Oferta, etapa y economía" },
  { id: "activity", label: "Actividad LINK WORLD", description: "Qué cambió y dónde" },
  { id: "cell", label: "Célula", description: "Estado orgánico del negocio" },
  { id: "personal", label: "Misión personal", description: "Resumen mínimo de tu día" },
];

const CLIENT_COLUMNS = [
  { id: "name", label: "Cliente" },
  { id: "business", label: "Negocio" },
  { id: "role", label: "Rol" },
  { id: "relationship_state", label: "Relación" },
  { id: "agreement_status", label: "Acuerdo" },
  { id: "city", label: "Ciudad" },
  { id: "country", label: "País" },
  { id: "website", label: "Website" },
  { id: "products", label: "Productos" },
  { id: "updated_at", label: "Actividad" },
];

const VIEW_OPTIONS: Record<string, Array<{ id: string; label: string }>> = {
  clients: [
    { id: "table", label: "Tabla" },
    { id: "cards", label: "Tarjetas" },
    { id: "compact", label: "Compacto" },
  ],
  products: [
    { id: "list", label: "Lista" },
    { id: "pipeline", label: "Pipeline" },
    { id: "economy", label: "Economía" },
  ],
  activity: [
    { id: "timeline", label: "Timeline" },
    { id: "day", label: "Por día" },
    { id: "entity", label: "Por entidad" },
  ],
  cell: [
    { id: "summary", label: "Resumen" },
    { id: "organelles", label: "Orgánulos" },
  ],
};

export default function LinkWorldDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [visibleWidgets, setVisibleWidgets] = useState<string[]>([]);
  const [layouts, setLayouts] = useState<GridLayouts>({});
  const [clientColumns, setClientColumns] = useState<string[]>([]);
  const [widgetViews, setWidgetViews] = useState<Record<string, string>>({});
  const [snapshot, setSnapshot] = useState<{
    visibleWidgets: string[];
    layouts: GridLayouts;
    clientColumns: string[];
    widgetViews: Record<string, string>;
  } | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/link-world/dashboard", { cache: "no-store" });
    const json = (await response.json()) as DashboardData & { error?: string };
    if (!response.ok) throw new Error(json.error || "No se pudo cargar LINK WORLD");
    setData(json);
    setVisibleWidgets(json.preferences.visibleWidgets);
    setLayouts(json.preferences.layouts);
    setClientColumns(json.preferences.clientColumns);
    setWidgetViews(json.preferences.widgetViews || {});
    setSnapshot({
      visibleWidgets: json.preferences.visibleWidgets,
      layouts: json.preferences.layouts,
      clientColumns: json.preferences.clientColumns,
      widgetViews: json.preferences.widgetViews || {},
    });
    setError("");
  }, []);

  useEffect(() => {
    load().catch((reason: Error) => setError(reason.message));
  }, [load]);

  const selectedClient = useMemo(
    () => data?.clients.find((client) => client.id === selectedClientId) || null,
    [data?.clients, selectedClientId],
  );

  const effectiveVisibleWidgets = useMemo(() => {
    if (!data) return [];
    return visibleWidgets.filter((id) => data.availableWidgets.includes(id));
  }, [data, visibleWidgets]);

  function startEditing() {
    setSnapshot({ visibleWidgets, layouts, clientColumns, widgetViews });
    setEditing(true);
  }

  function cancelEditing() {
    if (snapshot) {
      setVisibleWidgets(snapshot.visibleWidgets);
      setLayouts(snapshot.layouts);
      setClientColumns(snapshot.clientColumns);
      setWidgetViews(snapshot.widgetViews);
    }
    setEditing(false);
  }

  async function savePreferences() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/link-world/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_preferences",
          visibleWidgets,
          layouts,
          clientColumns,
          widgetViews,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "No se pudo guardar el panel");
      setSnapshot({ visibleWidgets, layouts, clientColumns, widgetViews });
      setEditing(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo guardar el panel");
    } finally {
      setSaving(false);
    }
  }

  function toggleWidget(id: string) {
    setVisibleWidgets((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function toggleClientColumn(id: string) {
    setClientColumns((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function setWidgetView(widget: string, view: string) {
    setWidgetViews((current) => ({ ...current, [widget]: view }));
  }

  if (!data) {
    return (
      <main className="lw-shell">
        <div className="lw-loading">Cargando actividad real de LINK WORLD…</div>
        {error ? <p className="lw-error">{error}</p> : null}
      </main>
    );
  }

  return (
    <main className="lw-shell">
      <header className="lw-topbar">
        <div className="lw-brand">
          <span className="lw-mark" aria-hidden="true" />
          <div>
            <small>CONTROL CENTRAL</small>
            <h1>LINK WORLD</h1>
          </div>
        </div>

        <div className="lw-top-actions">
          <span className="lw-live"><i /> EN VIVO</span>
          <button className="lw-refresh" onClick={() => load().catch((reason: Error) => setError(reason.message))}>Actualizar</button>
          <Link className="lw-operation" href="/operacion">Operación</Link>
          {editing ? (
            <>
              <button className="lw-secondary" onClick={cancelEditing}>Cancelar</button>
              <button className="lw-primary" disabled={saving} onClick={savePreferences}>
                {saving ? "Guardando…" : "Guardar panel"}
              </button>
            </>
          ) : (
            <button className="lw-primary" onClick={startEditing}>Editar panel</button>
          )}
        </div>
      </header>

      <section className="lw-overview">
        <div>
          <small>LINK WORLD · ESTADO ACTUAL</small>
          <h2>Ver. Entender. Decidir.</h2>
        </div>
        <div className="lw-summary">
          <Metric value={data.businesses.length} label="negocios" />
          <Metric value={data.clients.length} label="clientes" />
          <Metric value={data.products.length} label="productos" />
          <Metric value={data.activity.length} label="movimientos" />
          <Metric value={data.attention.length} label="atención" emphasis={data.attention.length > 0} />
        </div>
      </section>

      {error ? <div className="lw-error">{error}</div> : null}

      {editing ? (
        <section className="lw-editor">
          <div>
            <small>EDITANDO PANEL</small>
            <strong>Elige lo que quieres ver. Arrastra cada módulo desde su cabecera y cambia su tamaño desde la esquina.</strong>
          </div>
          <div className="lw-widget-picker">
            {WIDGETS.filter((widget) => data.availableWidgets.includes(widget.id)).map((widget) => (
              <label key={widget.id}>
                <input type="checkbox" checked={visibleWidgets.includes(widget.id)} onChange={() => toggleWidget(widget.id)} />
                <span>
                  <b>{widget.label}</b>
                  <small>{widget.description}</small>
                </span>
              </label>
            ))}
          </div>
        </section>
      ) : null}

      <ResponsiveGrid
        className="lw-grid"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 780, sm: 0 }}
        cols={{ lg: 12, md: 8, sm: 4 }}
        rowHeight={54}
        margin={[12, 12]}
        containerPadding={[0, 0]}
        isDraggable={editing}
        isResizable={editing}
        draggableHandle=".lw-widget-drag"
        onLayoutChange={(_current, next) => setLayouts(next as GridLayouts)}
      >
        {effectiveVisibleWidgets.includes("clients") ? (
          <div key="clients">
            <Widget
              title="Clientes"
              eyebrow={String(data.clients.length) + " EN LINK WORLD"}
              editing={editing}
              viewControl={<ViewControl widget="clients" value={widgetViews.clients || "table"} setView={setWidgetView} />}
              action={
                <details className="lw-columns">
                  <summary>Campos</summary>
                  <div>
                    {CLIENT_COLUMNS.map((column) => (
                      <label key={column.id}>
                        <input type="checkbox" checked={clientColumns.includes(column.id)} onChange={() => toggleClientColumn(column.id)} />
                        {column.label}
                      </label>
                    ))}
                  </div>
                </details>
              }
            >
              <ClientsView
                clients={data.clients}
                columns={clientColumns}
                mode={widgetViews.clients || "table"}
                selectClient={setSelectedClientId}
              />
            </Widget>
          </div>
        ) : null}

        {effectiveVisibleWidgets.includes("attention") ? (
          <div key="attention">
            <Widget title="Necesita atención" eyebrow={String(data.attention.length) + " DEFINICIONES"} editing={editing}>
              <AttentionList items={data.attention} />
            </Widget>
          </div>
        ) : null}

        {effectiveVisibleWidgets.includes("products") ? (
          <div key="products">
            <Widget
              title="Productos"
              eyebrow={String(data.products.length) + " EN LINK WORLD"}
              editing={editing}
              viewControl={<ViewControl widget="products" value={widgetViews.products || "list"} setView={setWidgetView} />}
            >
              <ProductsView products={data.products} clients={data.clients} mode={widgetViews.products || "list"} />
            </Widget>
          </div>
        ) : null}

        {effectiveVisibleWidgets.includes("activity") ? (
          <div key="activity">
            <Widget
              title="Actividad LINK WORLD"
              eyebrow="CAMBIOS REALES"
              editing={editing}
              viewControl={<ViewControl widget="activity" value={widgetViews.activity || "timeline"} setView={setWidgetView} />}
            >
              <ActivityView items={data.activity} mode={widgetViews.activity || "timeline"} />
            </Widget>
          </div>
        ) : null}

        {effectiveVisibleWidgets.includes("cell") ? (
          <div key="cell">
            <Widget
              title="Célula"
              eyebrow={String(data.cells.length) + " NEGOCIO ORGÁNICO"}
              editing={editing}
              viewControl={<ViewControl widget="cell" value={widgetViews.cell || "summary"} setView={setWidgetView} />}
            >
              <CellsView cells={data.cells} mode={widgetViews.cell || "summary"} />
            </Widget>
          </div>
        ) : null}

        {effectiveVisibleWidgets.includes("personal") ? (
          <div key="personal">
            <PersonalStrip mission={data.personalMission} editing={editing} />
          </div>
        ) : null}
      </ResponsiveGrid>

      <footer className="lw-footer">
        <span>CONTROL CENTRAL · interpretación visual de LINK WORLD</span>
        <span>Actualizado {formatDateTime(data.generatedAt)}</span>
      </footer>

      {selectedClient ? <ClientDrawer client={selectedClient} close={() => setSelectedClientId(null)} /> : null}
    </main>
  );
}

function Widget({
  title,
  eyebrow,
  editing,
  viewControl,
  action,
  children,
}: {
  title: string;
  eyebrow: string;
  editing: boolean;
  viewControl?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="lw-widget">
      <header className={editing ? "lw-widget-drag editable" : "lw-widget-drag"}>
        <div>
          <small>{eyebrow}</small>
          <h3>{title}</h3>
        </div>
        <div className="lw-widget-tools">
          {viewControl}
          {action}
          {editing ? <span className="lw-grip" aria-label="Mover panel">⠿</span> : null}
        </div>
      </header>
      <div className="lw-widget-body">{children}</div>
    </section>
  );
}

function ViewControl({ widget, value, setView }: { widget: string; value: string; setView: (widget: string, view: string) => void }) {
  const options = VIEW_OPTIONS[widget] || [];
  return (
    <div className="lw-view-switch">
      {options.map((option) => (
        <button key={option.id} className={value === option.id ? "on" : ""} onClick={() => setView(widget, option.id)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Metric({ value, label, emphasis }: { value: number; label: string; emphasis?: boolean }) {
  return (
    <div className={"lw-metric" + (emphasis ? " attention" : "")}>
      <strong>{String(value).padStart(2, "0")}</strong>
      <small>{label}</small>
    </div>
  );
}

function ClientsView({ clients, columns, mode, selectClient }: {
  clients: Client[];
  columns: string[];
  mode: string;
  selectClient: (id: string) => void;
}) {
  if (!clients.length) return <Empty text="LINK WORLD todavía no tiene clientes." />;
  if (mode === "cards") {
    return (
      <div className="lw-client-cards">
        {clients.map((client) => (
          <button key={client.id} onClick={() => selectClient(client.id)}>
            <div className="lw-client-card-top"><b>{client.name}</b><span>›</span></div>
            <small>{client.business?.name || "Sin negocio"}</small>
            <p>{client.summary || "Sin resumen."}</p>
            <div><Status value={client.relationship_state} /><Status value={client.agreement_status} /></div>
            <footer>{client.products.length} producto{client.products.length === 1 ? "" : "s"} · {relativeTime(client.updated_at)}</footer>
          </button>
        ))}
      </div>
    );
  }
  if (mode === "compact") {
    return (
      <div className="lw-client-compact">
        {clients.map((client) => (
          <button key={client.id} onClick={() => selectClient(client.id)}>
            <div><b>{client.name}</b><small>{client.business?.name || "Sin negocio"}</small></div>
            <Status value={client.relationship_state} />
            <span>{client.products.length}</span>
            <time>{relativeTime(client.updated_at)}</time>
            <em>›</em>
          </button>
        ))}
      </div>
    );
  }

  const visible = CLIENT_COLUMNS.filter((column) => columns.includes(column.id));
  return (
    <div className="lw-table-wrap">
      <table className="lw-table">
        <thead><tr>{visible.map((column) => <th key={column.id}>{column.label}</th>)}<th /></tr></thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id} onClick={() => selectClient(client.id)}>
              {visible.map((column) => <td key={column.id}>{renderClientCell(client, column.id)}</td>)}
              <td className="lw-arrow">›</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderClientCell(client: Client, column: string) {
  switch (column) {
    case "name": return <b>{client.name}</b>;
    case "business": return client.business?.name || "—";
    case "role": return humanize(client.role);
    case "relationship_state": return <Status value={client.relationship_state} />;
    case "agreement_status": return <Status value={client.agreement_status} />;
    case "city": return client.city || "—";
    case "country": return client.country || "—";
    case "website": return client.website ? "Disponible" : "—";
    case "products": return client.products.length ? String(client.products.length) : "—";
    case "updated_at": return relativeTime(client.updated_at);
    default: return "—";
  }
}

function AttentionList({ items }: { items: AttentionItem[] }) {
  if (!items.length) return <Empty text="Nada requiere definición en este momento." />;
  return (
    <div className="lw-attention-list">
      {items.map((item) => (
        <article key={item.id}>
          <span className={"lw-attention-dot " + item.severity} />
          <div><b>{item.title}</b><p>{item.detail}</p><small>{humanize(item.kind)}</small></div>
        </article>
      ))}
    </div>
  );
}

function ProductsView({ products, clients, mode }: { products: Product[]; clients: Client[]; mode: string }) {
  if (!products.length) return <Empty text="Todavía no hay productos en LINK WORLD." />;
  const clientById = new Map(clients.map((client) => [client.id, client.name]));

  if (mode === "pipeline") {
    const groups = Array.from(new Set(products.map((product) => product.stage || "sin_etapa")));
    return (
      <div className="lw-pipeline">
        {groups.map((group) => (
          <section key={group}>
            <header><b>{humanize(group)}</b><span>{products.filter((product) => (product.stage || "sin_etapa") === group).length}</span></header>
            {products.filter((product) => (product.stage || "sin_etapa") === group).map((product) => (
              <article key={product.id}>
                <b>{product.name}</b>
                <small>{product.client_id ? clientById.get(product.client_id) || "Sin cliente" : "Sin cliente"}</small>
                <Status value={product.economic_state} />
              </article>
            ))}
          </section>
        ))}
      </div>
    );
  }

  if (mode === "economy") {
    return (
      <div className="lw-economy">
        {products.map((product) => (
          <article key={product.id}>
            <div><b>{product.name}</b><small>{humanize(product.economic_state || product.stage)}</small></div>
            <EconomicValue label="Público" value={product.public_price} currency={product.currency} />
            <EconomicValue label="Adquisición" value={product.acquisition_price} currency={product.currency} />
            <div className="lw-economic-value"><small>LINK</small><strong>{product.link_share_percent === null || product.link_share_percent === undefined ? "Pendiente" : String(product.link_share_percent) + "%"}</strong></div>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="lw-product-list">
      {products.map((product) => (
        <article key={product.id}>
          <div>
            <small>{product.category || "PRODUCTO"}</small>
            <b>{product.name}</b>
            <span>{product.client_id ? clientById.get(product.client_id) || "Sin cliente" : "Sin cliente"}</span>
          </div>
          <div className="lw-product-economy">
            <Status value={product.economic_state || product.stage} />
            {product.public_price !== null && product.public_price !== undefined ? <strong>{money(product.public_price, product.currency)}</strong> : <small>Sin precio</small>}
            {product.link_share_percent !== null && product.link_share_percent !== undefined ? <small>LINK {product.link_share_percent}%</small> : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function EconomicValue({ label, value, currency }: { label: string; value?: number | null; currency?: string | null }) {
  return <div className="lw-economic-value"><small>{label}</small><strong>{value === null || value === undefined ? "Pendiente" : money(value, currency)}</strong></div>;
}

function ActivityView({ items, mode }: { items: Activity[]; mode: string }) {
  if (!items.length) return <Empty text="No hay actividad registrada." />;

  if (mode === "entity") {
    const grouped = new Map<string, Activity[]>();
    for (const item of items) {
      const key = item.target_type || "otro";
      grouped.set(key, [...(grouped.get(key) || []), item]);
    }
    return (
      <div className="lw-activity-groups">
        {Array.from(grouped.entries()).map(([type, rows]) => (
          <section key={type}>
            <header><b>{humanize(type)}</b><span>{rows.length}</span></header>
            {rows.slice(0, 6).map((item) => (
              <article key={item.id}><b>{item.note || humanize(item.action)}</b><small>{humanize(item.action)} · {relativeTime(item.created_at)}</small></article>
            ))}
          </section>
        ))}
      </div>
    );
  }

  if (mode === "day") {
    const grouped = new Map<string, Activity[]>();
    for (const item of items) {
      const key = new Date(item.created_at).toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" });
      grouped.set(key, [...(grouped.get(key) || []), item]);
    }
    return (
      <div className="lw-day-groups">
        {Array.from(grouped.entries()).map(([day, rows]) => (
          <section key={day}>
            <header><b>{day}</b><span>{rows.length}</span></header>
            {rows.map((item) => (
              <article key={item.id}><i /><div><b>{item.note || humanize(item.target_type)}</b><small>{humanize(item.action)} · {humanize(item.target_type)} · {item.origin || "LINK WORLD"}</small></div></article>
            ))}
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="lw-timeline">
      {items.slice(0, 30).map((item) => (
        <article key={item.id}>
          <i />
          <div>
            <b>{item.note || humanize(item.target_type)}</b>
            <p>{humanize(item.action)} · {humanize(item.target_type)}</p>
            <small>{relativeTime(item.created_at)} · {item.origin || "LINK WORLD"}</small>
          </div>
        </article>
      ))}
    </div>
  );
}

function CellsView({ cells, mode }: { cells: Cell[]; mode: string }) {
  if (!cells.length) return <Empty text="Todavía no hay células registradas." />;

  if (mode === "organelles") {
    return (
      <div className="lw-cells-organelles">
        {cells.map((cell) => (
          <section key={cell.entity_id}>
            <div className="lw-cell-title">
              <div><small>CÉLULA</small><b>{cell.business?.name || cell.entity?.global_id || "Negocio LINK"}</b></div>
              <span>{cell.activeOrganelles}/{cell.organelles.length}</span>
            </div>
            <div className="lw-organelle-grid">
              {cell.organelles.map((organelle) => (
                <article key={organelle.id}>
                  <div className="lw-organelle-head"><b>{organelle.type?.biological_name || humanize(organelle.organelle_key)}</b><Status value={organelle.status} /></div>
                  <strong>{organelle.type?.system_name || organelle.resource_name || "—"}</strong>
                  <p>{organelle.type?.purpose || "Sin propósito documentado."}</p>
                  <small>{organelle.provider_domain || "core"} · {organelle.truth_role || "—"}{organelle.type?.required_for_cell ? " · requerido" : ""}</small>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="lw-cell-summary">
      {cells.map((cell) => (
        <article key={cell.entity_id}>
          <div className="lw-cell-orbit">
            <strong>{cell.activeOrganelles}</strong>
            <small>orgánulos</small>
          </div>
          <div className="lw-cell-copy">
            <small>CÉLULA · {cell.entity?.global_id || "LINK"}</small>
            <h4>{cell.business?.name || "Negocio LINK"}</h4>
            <p>{cell.business?.summary || "Célula registrada en el organismo LINK."}</p>
          </div>
          <div className="lw-cell-states">
            <Detail label="Ciclo" value={humanize(cell.lifecycle_stage)} />
            <Detail label="Salud" value={humanize(cell.health_status)} />
            <Detail label="Autonomía" value={cell.autonomy_level === null || cell.autonomy_level === undefined ? "—" : String(cell.autonomy_level)} />
            <Detail label="Constitución" value={cell.constitution_version || "—"} />
          </div>
        </article>
      ))}
    </div>
  );
}

function PersonalStrip({ mission, editing }: { mission: PersonalMission; editing: boolean }) {
  return (
    <section className={"lw-personal-strip" + (editing ? " lw-widget-drag editable" : "")}>
      <div><small>MISIÓN PERSONAL</small><b>{mission.todayTasks} tarea{mission.todayTasks === 1 ? "" : "s"} hoy</b></div>
      <span>{mission.minimumsDone}/{mission.minimumsTotal} mínimos</span>
      <span>{mission.commercialMoves} movimiento{mission.commercialMoves === 1 ? "" : "s"} comercial{mission.commercialMoves === 1 ? "" : "es"}</span>
      <Link href="/mision-personal">Abrir →</Link>
      {editing ? <em className="lw-grip">⠿</em> : null}
    </section>
  );
}

function ClientDrawer({ client, close }: { client: Client; close: () => void }) {
  const facts = client.owned_facts && typeof client.owned_facts === "object" ? Object.entries(client.owned_facts) : [];
  return (
    <div className="lw-drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <aside className="lw-drawer">
        <header>
          <div>
            <small>CLIENTE · LINK WORLD</small>
            <h2>{client.name}</h2>
            <p>{client.summary || "Sin resumen registrado."}</p>
          </div>
          <button onClick={close} aria-label="Cerrar">×</button>
        </header>

        <section className="lw-drawer-grid">
          <Detail label="Negocio" value={client.business?.name || "—"} />
          <Detail label="Rol" value={humanize(client.role)} />
          <Detail label="Relación" value={humanize(client.relationship_state)} />
          <Detail label="Acuerdo" value={humanize(client.agreement_status)} />
          <Detail label="Ubicación" value={[client.city, client.country].filter(Boolean).join(", ") || "—"} />
          <Detail label="Actualizado" value={formatDateTime(client.updated_at)} />
        </section>

        {client.website ? <a className="lw-client-link" href={client.website} target="_blank" rel="noreferrer">Abrir website ↗</a> : null}

        <section className="lw-drawer-section">
          <div className="lw-section-head"><small>PRODUCTOS</small><span>{client.products.length}</span></div>
          {client.products.length ? client.products.map((product) => (
            <article className="lw-drawer-product" key={product.id}>
              <div><b>{product.name}</b><small>{product.category || "Sin categoría"} · {humanize(product.economic_state || product.stage)}</small></div>
              <div>
                {product.public_price !== null && product.public_price !== undefined ? <strong>{money(product.public_price, product.currency)}</strong> : <span>Sin precio</span>}
                {product.link_share_percent !== null && product.link_share_percent !== undefined ? <small>LINK {product.link_share_percent}%</small> : null}
              </div>
            </article>
          )) : <Empty text="Este cliente todavía no tiene productos." />}
        </section>

        {facts.length ? (
          <section className="lw-drawer-section">
            <div className="lw-section-head"><small>DATOS PROPIOS</small><span>{facts.length}</span></div>
            <div className="lw-facts">
              {facts.map(([key, value]) => <Detail key={key} label={humanize(key)} value={formatFact(value)} />)}
            </div>
          </section>
        ) : null}

        <section className="lw-drawer-section lw-identifiers">
          <div className="lw-section-head"><small>IDENTIDAD</small></div>
          <Detail label="Global ID" value={client.global_id || "—"} />
          <Detail label="UUID" value={client.id} />
        </section>
      </aside>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="lw-detail"><small>{label}</small><b>{value || "—"}</b></div>;
}

function Status({ value }: { value?: string | null }) {
  if (!value) return <span className="lw-status neutral">—</span>;
  const clean = value.toLowerCase();
  const tone = clean.includes("active") || clean.includes("verified") || clean.includes("approved") || clean.includes("ready")
    ? "good"
    : clean.includes("blocked") || clean.includes("rejected")
      ? "bad"
      : "neutral";
  return <span className={"lw-status " + tone}>{humanize(value)}</span>;
}

function Empty({ text }: { text: string }) {
  return <div className="lw-empty">{text}</div>;
}

function humanize(value?: string | null) {
  if (!value) return "—";
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function relativeTime(value: string) {
  const date = new Date(value);
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
  const ranges: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, size] of ranges) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit);
  }
  return "ahora";
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" });
}

function money(value: number, currency?: string | null) {
  try {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: currency || "CLP",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return String(value);
  }
}

function formatFact(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((item) => formatFact(item)).join(", ");
  return JSON.stringify(value);
}
