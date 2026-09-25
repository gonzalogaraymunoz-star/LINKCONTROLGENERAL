"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";
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

type DocumentRoute = {
  id: string;
  route_key: string;
  folder_name: string;
  folder_url: string;
};

type DocumentSpace = {
  id: string;
  business_name: string;
  folder_url: string;
  status: string;
  routes: DocumentRoute[];
};

type FinancialSummary = {
  open_transactions?: number | null;
  missing_documents?: number | null;
  open_closures?: number | null;
  open_financial_tasks?: number | null;
  pending_income?: number | string | null;
  pending_expense?: number | string | null;
  last_financial_movement_at?: string | null;
};

type FinanceTransaction = {
  id: string;
  status: string;
  direction: string;
  transaction_type: string;
  amount?: number | string | null;
  currency?: string | null;
  documentary_status?: string | null;
  occurred_at: string;
};

type LinkDocument = {
  id: string;
  document_type: string;
  route_key?: string | null;
  drive_url: string;
  file_name: string;
  issue_date?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  created_at: string;
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
  documentSpace?: DocumentSpace | null;
  financial?: FinancialSummary | null;
  recentTransactions?: FinanceTransaction[];
  recentDocuments?: LinkDocument[];
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
  alive?: boolean;
  actionCount?: number;
  completion?: number;
  efficiency?: number;
  nextGesture?: string;
  prompt?: string;
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
  potentialOrganelles?: number;
  completion?: number;
  efficiency?: number;
  healthCalculated?: string;
  missingRequired?: Array<{ key: string; label: string; prompt: string }>;
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

type ChatGuideState = {
  x: number;
  y: number;
  below: boolean;
  action: string;
} | null;

type GuideHandler = (event: ReactMouseEvent<HTMLElement>, action: string) => void;

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
  { id: "clients", label: "Links", description: "Personas, comercios y entidades conectadas" },
  { id: "attention", label: "Necesita atención", description: "Definiciones que impiden avanzar" },
  { id: "products", label: "Productos", description: "Oferta, etapa y economía" },
  { id: "activity", label: "Actividad LINK WORLD", description: "Qué cambió y dónde" },
  { id: "cell", label: "Negocios", description: "Estado y áreas activas de cada negocio" },
  { id: "personal", label: "Misión personal", description: "Resumen mínimo de tu día" },
];

const CLIENT_COLUMNS = [
  { id: "name", label: "Link" },
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
    { id: "organelles", label: "Áreas" },
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
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [chatGuide, setChatGuide] = useState<ChatGuideState>(null);

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

  useEffect(() => {
    if (!chatGuide) return;
    const timer = window.setTimeout(() => setChatGuide(null), 5200);
    return () => window.clearTimeout(timer);
  }, [chatGuide]);

  const selectedClient = useMemo(
    () => data?.clients.find((client) => client.id === selectedClientId) || null,
    [data?.clients, selectedClientId],
  );

  const selectedProduct = useMemo(
    () => data?.products.find((product) => product.id === selectedProductId) || null,
    [data?.products, selectedProductId],
  );

  const selectedProductLink = useMemo(
    () => selectedProduct?.client_id
      ? data?.clients.find((client) => client.id === selectedProduct.client_id) || null
      : null,
    [data?.clients, selectedProduct],
  );

  const selectedCell = useMemo(
    () => data?.cells.find((cell) => cell.entity_id === selectedCellId) || null,
    [data?.cells, selectedCellId],
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

  function guideToChat(event: ReactMouseEvent<HTMLElement>, action: string) {
    const rect = event.currentTarget.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    const x = Math.min(window.innerWidth - 150, Math.max(150, center));
    const below = rect.top < 160;
    const y = below ? Math.min(window.innerHeight - 120, rect.bottom + 10) : Math.max(110, rect.top - 10);
    setChatGuide({ x, y, below, action });
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
        draggableCancel=".lw-widget-tools, .lw-personal-strip a"
        onLayoutChange={(_current, next) => setLayouts(next as GridLayouts)}
      >
        {effectiveVisibleWidgets.includes("clients") ? (
          <div key="clients">
            <Widget
              title="Links"
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
              <AttentionList items={data.attention} guide={guideToChat} />
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
              <ProductsView
                products={data.products}
                clients={data.clients}
                mode={widgetViews.products || "list"}
                selectProduct={setSelectedProductId}
              />
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
              title="Negocios"
              eyebrow={String(data.cells.length) + " EN LINK WORLD"}
              editing={editing}
              viewControl={<ViewControl widget="cell" value={widgetViews.cell || "summary"} setView={setWidgetView} />}
            >
              <CellsView cells={data.cells} mode={widgetViews.cell || "summary"} selectCell={setSelectedCellId} />
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

      {selectedClient ? <ClientDrawer client={selectedClient} close={() => setSelectedClientId(null)} guide={guideToChat} /> : null}
      {selectedProduct ? (
        <ProductDrawer
          product={selectedProduct}
          link={selectedProductLink}
          close={() => setSelectedProductId(null)}
          guide={guideToChat}
        />
      ) : null}
      {selectedCell ? <CellDrawer cell={selectedCell} close={() => setSelectedCellId(null)} guide={guideToChat} /> : null}
      <ChatGuide guide={chatGuide} close={() => setChatGuide(null)} />
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
  if (!clients.length) return <Empty text="LINK WORLD todavía no tiene Links." />;
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

function AttentionList({ items, guide }: { items: AttentionItem[]; guide: GuideHandler }) {
  if (!items.length) return <Empty text="Nada requiere definición en este momento." />;
  return (
    <div className="lw-attention-list">
      {items.map((item) => (
        <button className="lw-attention-action" key={item.id} onClick={(event) => guide(event, "@link-world Revisa " + item.title + " en su estado actual dentro de LINK WORLD. Quiero resolver: " + item.detail + ". Propón el cambio y no escribas nada hasta que lo apruebe.")}>
          <span className={"lw-attention-dot " + item.severity} />
          <div><b>{item.title}</b><p>{item.detail}</p><small>{humanize(item.kind)} · pedir cambio ↗</small></div>
        </button>
      ))}
    </div>
  );
}

function ProductsView({
  products,
  clients,
  mode,
  selectProduct,
}: {
  products: Product[];
  clients: Client[];
  mode: string;
  selectProduct: (id: string) => void;
}) {
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
              <button className="lw-product-card" key={product.id} onClick={() => selectProduct(product.id)}>
                <b>{product.name}</b>
                <small>{product.client_id ? clientById.get(product.client_id) || "Sin Link" : "Sin Link"}</small>
                <Status value={product.economic_state} />
              </button>
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
          <button className="lw-economy-row" key={product.id} onClick={() => selectProduct(product.id)}>
            <div><b>{product.name}</b><small>{humanize(product.economic_state || product.stage)}</small></div>
            <EconomicValue label="Público" value={product.public_price} currency={product.currency} />
            <EconomicValue label="Adquisición" value={product.acquisition_price} currency={product.currency} />
            <div className="lw-economic-value"><small>LINK</small><strong>{product.link_share_percent === null || product.link_share_percent === undefined ? "Pendiente" : String(product.link_share_percent) + "%"}</strong></div>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="lw-product-list">
      {products.map((product) => (
        <button className="lw-product-row" key={product.id} onClick={() => selectProduct(product.id)}>
          <div>
            <small>{product.category || "PRODUCTO"}</small>
            <b>{product.name}</b>
            <span>{product.client_id ? clientById.get(product.client_id) || "Sin Link" : "Sin Link"}</span>
          </div>
          <div className="lw-product-economy">
            <Status value={product.economic_state || product.stage} />
            {product.public_price !== null && product.public_price !== undefined ? <strong>{money(product.public_price, product.currency)}</strong> : <small>Sin precio</small>}
            {product.link_share_percent !== null && product.link_share_percent !== undefined ? <small>LINK {product.link_share_percent}%</small> : null}
          </div>
        </button>
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

function CellsView({ cells, mode, selectCell }: { cells: Cell[]; mode: string; selectCell: (id: string) => void }) {
  if (!cells.length) return <Empty text="Todavía no hay negocios registrados." />;

  if (mode === "organelles") {
    return (
      <div className="lw-cells-organelles">
        {cells.map((cell) => (
          <button className="lw-cell-organelles-card" type="button" key={cell.entity_id} onClick={() => selectCell(cell.entity_id)}>
            <div className="lw-cell-title">
              <div><small>NEGOCIO</small><b>{cell.business?.name || cell.entity?.global_id || "Negocio LINK"}</b></div>
              <span>{cell.completion ?? 0}%</span>
            </div>
            <div className="lw-organelle-mini-row">
              {cell.organelles.length ? cell.organelles.slice(0, 8).map((organelle) => (
                <span key={organelle.id} title={organelle.type?.purpose || ""}>
                  <i />
                  {businessAreaLabel(organelle)}
                </span>
              )) : <em>Sin áreas activas todavía</em>}
            </div>
            <footer>{cell.activeOrganelles} áreas activas · eficiencia {cell.efficiency ?? 0}% · abrir ↗</footer>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="lw-cell-summary">
      {cells.map((cell) => (
        <button className="lw-cell-summary-card" type="button" key={cell.entity_id} onClick={() => selectCell(cell.entity_id)}>
          <div className="lw-cell-orbit" style={{ background: `conic-gradient(#191816 ${cell.completion ?? 0}%, #e8e4dc 0)` }}>
            <div>
              <strong>{cell.completion ?? 0}%</strong>
              <small>negocio</small>
            </div>
          </div>
          <div className="lw-cell-copy">
            <small>NEGOCIO · {cell.entity?.global_id || "LINK"}</small>
            <h4>{cell.business?.name || "Negocio LINK"}</h4>
            <p>{cell.business?.summary || "Negocio registrado en LINK WORLD."}</p>
            <span>{cell.activeOrganelles} áreas activas · abrir ↗</span>
          </div>
          <div className="lw-cell-states">
            <Detail label="Estado" value={cell.healthCalculated || humanize(cell.lifecycle_stage)} />
            <Detail label="Eficiencia" value={String(cell.efficiency ?? 0) + "%"} />
            <Detail label="Autonomía" value={cell.autonomy_level === null || cell.autonomy_level === undefined ? "—" : String(cell.autonomy_level)} />
            <Detail label="Base" value={String(cell.requiredOrganelles) + " funciones"} />
          </div>
        </button>
      ))}
    </div>
  );
}

function CellDrawer({ cell, close, guide }: { cell: Cell; close: () => void; guide: GuideHandler }) {
  const living = cell.organelles || [];
  const missing = cell.missingRequired || [];
  const completion = cell.completion ?? 0;
  const efficiency = cell.efficiency ?? 0;

  return (
    <div className="lw-cell-inside-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section className="lw-cell-inside">
        <header className="lw-cell-inside-head">
          <div>
            <small>ESTADO DEL NEGOCIO</small>
            <h2>{cell.business?.name || "Negocio LINK"}</h2>
            <p>Solo aparecen áreas con actividad o evidencia verificable. Si no existe una acción real, no se muestra.</p>
          </div>
          <button type="button" onClick={close} aria-label="Cerrar negocio">×</button>
        </header>

        <div className="lw-cell-scorebar">
          <div><strong>{completion}%</strong><span>completitud</span></div>
          <div><strong>{efficiency}%</strong><span>eficiencia</span></div>
          <div><strong>{living.length}</strong><span>áreas activas</span></div>
          <div><strong>{missing.length}</strong><span>funciones base faltantes</span></div>
        </div>

        <div className="lw-cell-stage">
          <div className="lw-cell-core" style={{ background: `conic-gradient(#191816 ${completion}%, #ded8cd 0)` }}>
            <div>
              <small>NEGOCIO</small>
              <strong>{cell.business?.name || "LINK"}</strong>
              <span>{completion}%</span>
            </div>
          </div>

          {living.map((organelle, index) => {
            const angle = (index / Math.max(living.length, 1)) * Math.PI * 2 - Math.PI / 2;
            const x = 50 + Math.cos(angle) * 39;
            const y = 50 + Math.sin(angle) * 36;
            return (
              <button
                className="lw-organelle-node"
                type="button"
                key={organelle.id}
                style={{ left: x + "%", top: y + "%" }}
                onClick={(event) => guide(event, organelle.prompt || ("@link-world Revisa " + (cell.business?.name || "este negocio") + " y ayúdame con " + (organelle.nextGesture || "esta área") + "."))}
              >
                <span className="lw-organelle-dot"><i /></span>
                <b>{businessAreaLabel(organelle)}</b>
                <small>{organelle.completion ?? 0}%</small>
                <aside className="lw-organelle-hover">
                  <em>{businessAreaLabel(organelle)}</em>
                  <p>{organelle.type?.purpose || "Sin explicación registrada."}</p>
                  <div><span>Completitud <b>{organelle.completion ?? 0}%</b></span><span>Eficiencia <b>{organelle.efficiency ?? 0}%</b></span></div>
                  <small>{organelle.actionCount ?? 0} señal{(organelle.actionCount ?? 0) === 1 ? "" : "es"} real{(organelle.actionCount ?? 0) === 1 ? "" : "es"}</small>
                  <strong>{organelle.nextGesture || "Revisar área"} ↗</strong>
                </aside>
              </button>
            );
          })}

          {!living.length ? (
            <div className="lw-cell-empty-inside">
              <strong>Este negocio todavía no tiene áreas activas.</strong>
              <span>Un área aparece cuando genera una acción o evidencia real.</span>
            </div>
          ) : null}
        </div>

        <footer className="lw-cell-inside-foot">
          <div>
            <small>CÓMO LLEGA A 100%</small>
            <p>Las funciones base siempre pesan en el cálculo. Las áreas opcionales solo cuentan cuando tienen actividad real.</p>
          </div>
          {missing.length ? (
            <div className="lw-cell-missing">
              {missing.map((item) => (
                <button type="button" key={item.key} onClick={(event) => guide(event, item.prompt)}>
                  + {item.label}
                </button>
              ))}
            </div>
          ) : <span className="lw-cell-complete-note">Base estructural completa</span>}
        </footer>
      </section>
    </div>
  );
}

function businessAreaLabel(organelle: Organelle) {
  const labels: Record<string, string> = {
    nucleus: "Identidad y gobierno",
    membrane: "Límites y permisos",
    receptors: "Integraciones",
    cytoskeleton: "Relaciones y estructura",
    mitochondria: "Economía",
    ribosome: "Producción",
    reticulum: "Operación",
    golgi: "Comercialización",
    memory: "Evidencia y respaldo",
    intelligence: "Investigación",
    signaling: "Eventos",
    transport: "Automatización",
  };
  return labels[organelle.organelle_key] || organelle.type?.system_name || humanize(organelle.organelle_key);
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

function ClientDrawer({ client, close, guide }: { client: Client; close: () => void; guide: GuideHandler }) {
  const facts = asRecord(client.owned_facts);
  const profile = asRecord(facts.profile);
  const commercialModel = asRecord(facts.commercial_model);
  const architecture = asRecord(facts.commercial_architecture);
  const economy = asRecord(facts.economic_contract);
  const allocation = asRecord(facts.economic_allocation_principle);

  const commercialName = textValue(facts.commercial_name) || textValue(profile.commercial_name) || client.name;
  const displayName = textValue(profile.display_name) || client.name;
  const responsible = textValue(facts.responsible_name) || textValue(profile.responsible) || "Por definir";
  const activity = textValue(facts.business_activity) || textValue(profile.activity) || "Actividad por definir";
  const location = textValue(facts.operating_location) || [client.city, client.country].filter(Boolean).join(", ") || "—";
  const businessContext = textValue(facts.business_context) || client.business?.name || "—";

  const pending: string[] = [];
  if (["", "none", "pending", "draft", "unknown"].includes(String(client.agreement_status || "").toLowerCase())) pending.push("Definir acuerdo comercial");
  if (["", "detected"].includes(String(client.relationship_state || "").toLowerCase())) pending.push("Definir el estado de la relación");
  if (client.products.some((product) => product.acquisition_price == null)) pending.push("Completar costos de productos");
  if (client.products.some((product) => product.link_share_percent == null)) pending.push("Definir participación LINK");

  return (
    <div className="lw-drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <aside className="lw-drawer lw-human-card">
        <header className="lw-human-header">
          <div>
            <small>LINK · {businessContext}</small>
            <h2>{commercialName}</h2>
            {displayName !== commercialName ? <span className="lw-registered-name">{displayName}</span> : null}
            <p>{client.summary || activity}</p>
          </div>
          <button onClick={close} aria-label="Cerrar">×</button>
        </header>

        <section className="lw-human-status">
          <HumanStatus label="Relación" value={stateText(client.relationship_state)} />
          <HumanStatus label="Acuerdo" value={stateText(client.agreement_status)} />
          <HumanStatus label="Rol" value={stateText(client.role)} />
        </section>

        <section className="lw-human-section">
          <SectionTitle title="Quién es" />
          <div className="lw-human-grid">
            <HumanField label="Responsable" value={responsible} />
            <HumanField label="Ubicación" value={location} />
            <HumanField label="Actividad" value={activity} wide />
            <HumanField label="Negocio LINK" value={businessContext} />
            <HumanField label="Nombre registrado" value={client.name} />
          </div>
        </section>

        {Object.keys(commercialModel).length ? (
          <section className="lw-human-section">
            <SectionTitle title="Modelo comercial" />
            <p className="lw-human-copy">{textValue(commercialModel.description) || "Modelo comercial en construcción."}</p>
            <div className="lw-human-grid">
              <HumanField label="Estado" value={commercialModelStatus(textValue(commercialModel.status))} />
              <HumanField label="Referencia" value={textValue(commercialModel.reference) || "Sin referencia"} wide />
            </div>
          </section>
        ) : null}

        {Object.keys(architecture).length ? (
          <section className="lw-human-section">
            <SectionTitle title="Cómo funciona la relación" />
            <div className="lw-role-grid">
              <RoleCard title="Productor" value={textValue(architecture.producer_role)} />
              <RoleCard title="Espacio / partner" value={textValue(architecture.partner_role)} />
              <RoleCard title="LINK" value={textValue(architecture.link_role)} />
              <RoleCard title="Canal de venta" value={textValue(architecture.sales_channel_role)} />
              <RoleCard title="Valor para el cliente" value={textValue(architecture.customer_value)} wide />
            </div>
          </section>
        ) : null}

        <section className="lw-human-section">
          <SectionTitle title="Productos" count={client.products.length} />
          {client.products.length ? (
            <div className="lw-human-products">
              {client.products.map((product) => (
                <article key={product.id}>
                  <div>
                    <small>{product.category || "PRODUCTO"}</small>
                    <b>{product.name}</b>
                    <span>{stateText(product.stage)} · {stateText(product.economic_state)}</span>
                  </div>
                  <div>
                    <strong>{product.public_price != null ? money(product.public_price, product.currency) : "Precio pendiente"}</strong>
                    <small>{product.link_share_percent != null ? "LINK " + product.link_share_percent + "%" : "Participación pendiente"}</small>
                  </div>
                </article>
              ))}
            </div>
          ) : <Empty text="Este Link todavía no tiene productos." />}
        </section>

        {(Object.keys(economy).length || Object.keys(allocation).length) ? (
          <section className="lw-human-section">
            <SectionTitle title="Economía" />
            <div className="lw-human-grid">
              <HumanField
                label="Base de cálculo"
                value={economyLabel(textValue(economy.calculation_base))}
              />
              <HumanField
                label="Distribución"
                value={economyLabel(textValue(economy.distribution_mode))}
              />
              <HumanField
                label="Beneficio al cliente"
                value={benefitModesLabel(economy.customer_benefit_modes)}
                wide
              />
            </div>
            <p className="lw-human-note">
              {Boolean(economy.no_double_allocation) ? "No duplicar asignaciones. " : ""}
              {Boolean(allocation.preserve_agreed_costs_and_minimum_margins) ? "Se conservan costos acordados y márgenes mínimos." : ""}
            </p>
          </section>
        ) : null}

        <section className="lw-human-section">
          <SectionTitle title="Documentos" count={client.recentDocuments?.length || 0} />
          {client.documentSpace ? (
            <>
              <div className="lw-doc-root">
                <div>
                  <small>CARPETA DEL NEGOCIO</small>
                  <b>{client.documentSpace.business_name}</b>
                </div>
                <a href={client.documentSpace.folder_url} target="_blank" rel="noreferrer">Abrir Drive ↗</a>
              </div>
              <div className="lw-doc-routes">
                {client.documentSpace.routes.map((route) => (
                  <a key={route.id} href={route.folder_url} target="_blank" rel="noreferrer">
                    <span>{route.folder_name}</span><em>↗</em>
                  </a>
                ))}
              </div>
              {client.recentDocuments?.length ? (
                <div className="lw-recent-docs">
                  {client.recentDocuments.slice(0, 4).map((document) => (
                    <a key={document.id} href={document.drive_url} target="_blank" rel="noreferrer">
                      <div><b>{document.file_name}</b><small>{stateText(document.document_type)}</small></div>
                      <span>↗</span>
                    </a>
                  ))}
                </div>
              ) : <p className="lw-human-note">Aún no hay documentos indexados para este negocio.</p>}
            </>
          ) : (
            <p className="lw-human-note">Este negocio todavía no tiene una carpeta documental registrada en LINK WORLD.</p>
          )}
        </section>

        <section className="lw-human-section">
          <SectionTitle title="Finanzas" />
          <div className="lw-finance-summary">
            <FinanceMetric label="Transacciones abiertas" value={client.financial?.open_transactions} />
            <FinanceMetric label="Respaldos pendientes" value={client.financial?.missing_documents} />
            <FinanceMetric label="Cierres abiertos" value={client.financial?.open_closures} />
            <FinanceMetric label="Tareas financieras" value={client.financial?.open_financial_tasks} />
          </div>
          {(Number(client.financial?.pending_income || 0) > 0 || Number(client.financial?.pending_expense || 0) > 0) ? (
            <div className="lw-finance-money">
              <div><small>POR COBRAR</small><strong>{money(Number(client.financial?.pending_income || 0), "CLP")}</strong></div>
              <div><small>POR PAGAR</small><strong>{money(Number(client.financial?.pending_expense || 0), "CLP")}</strong></div>
            </div>
          ) : null}
          {client.recentTransactions?.length ? (
            <div className="lw-transaction-list">
              {client.recentTransactions.slice(0, 5).map((transaction) => (
                <article key={transaction.id}>
                  <div>
                    <b>{transaction.direction === "income" ? "Ingreso" : "Egreso"} · {stateText(transaction.transaction_type)}</b>
                    <small>{stateText(transaction.status)} · respaldo {stateText(transaction.documentary_status)}</small>
                  </div>
                  <strong>{transaction.amount != null ? money(Number(transaction.amount), transaction.currency) : "—"}</strong>
                </article>
              ))}
            </div>
          ) : <p className="lw-human-note">Todavía no hay transacciones registradas para este negocio.</p>}
          <Link className="lw-finance-open" href="/operacion">Abrir seguimiento financiero →</Link>
        </section>

        <section className="lw-human-section">
          <SectionTitle title="Qué falta para avanzar" count={pending.length} />
          {pending.length ? (
            <div className="lw-pending-list">
              {pending.map((item) => <button type="button" key={item} onClick={(event) => guide(event, "@link-world Revisa " + commercialName + " dentro de " + businessContext + ". Quiero resolver: " + item + ". Usa el estado real registrado y no modifiques nada hasta que lo apruebe.")}><i />{item}<span>↗</span></button>)}
            </div>
          ) : <div className="lw-all-clear">Sin bloqueos críticos registrados.</div>}
        </section>

        {client.website ? <a className="lw-client-link" href={client.website} target="_blank" rel="noreferrer">Abrir website ↗</a> : null}

        <details className="lw-tech-details">
          <summary>Trazabilidad técnica</summary>
          <div className="lw-tech-grid">
            <Detail label="Global ID" value={client.global_id || "—"} />
            <Detail label="UUID" value={client.id} />
            <Detail label="Actualizado" value={formatDateTime(client.updated_at)} />
            <Detail label="Fuente" value={sourceLabel(textValue(facts.source))} />
          </div>
        </details>
      </aside>
    </div>
  );
}

function ProductDrawer({ product, link, close, guide }: { product: Product; link: Client | null; close: () => void; guide: GuideHandler }) {
  const facts = asRecord(link?.owned_facts);
  const commercialModel = asRecord(facts.commercial_model);
  const architecture = asRecord(facts.commercial_architecture);
  const profile = asRecord(facts.profile);
  const commercialName = textValue(facts.commercial_name) || textValue(profile.commercial_name) || link?.name || "Sin Link";
  const responsible = textValue(facts.responsible_name) || textValue(profile.responsible) || "Por definir";
  const location = textValue(facts.operating_location) || [link?.city, link?.country].filter(Boolean).join(", ") || "—";

  const pending: string[] = [];
  if (product.acquisition_price == null) pending.push("Definir costo de adquisición");
  if (product.link_share_percent == null) pending.push("Definir participación LINK");
  if (product.client_benefit_share_percent == null) pending.push("Definir beneficio para el cliente");
  if (!product.agreement_notes || /pendiente/i.test(product.agreement_notes)) pending.push("Cerrar condiciones del convenio");

  return (
    <div className="lw-drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <aside className="lw-drawer lw-human-card">
        <header className="lw-human-header">
          <div>
            <small>PRODUCTO · {commercialName}</small>
            <h2>{product.name}</h2>
            <span className="lw-registered-name">{product.category || "Producto LINK WORLD"}</span>
          </div>
          <button onClick={close} aria-label="Cerrar">×</button>
        </header>

        <section className="lw-product-hero">
          <div>
            <small>PRECIO PÚBLICO</small>
            <strong>{product.public_price != null ? money(product.public_price, product.currency) : "Pendiente"}</strong>
          </div>
          <HumanStatus label="Etapa" value={stateText(product.stage)} />
          <HumanStatus label="Economía" value={stateText(product.economic_state)} />
        </section>

        <section className="lw-human-section">
          <SectionTitle title="Qué es" />
          <p className="lw-human-copy">
            {product.category || "Producto"} de {commercialName}
            {location !== "—" ? " en " + location : ""}.
          </p>
          <div className="lw-human-grid">
            <HumanField label="Link" value={commercialName} />
            <HumanField label="Responsable" value={responsible} />
            <HumanField label="Negocio LINK" value={link?.business?.name || textValue(facts.business_context) || "—"} />
            <HumanField label="Código" value={product.code || "—"} />
          </div>
        </section>

        {Object.keys(commercialModel).length ? (
          <section className="lw-human-section">
            <SectionTitle title="Modelo comercial" />
            <p className="lw-human-copy">{textValue(commercialModel.description) || "Modelo en construcción."}</p>
            <HumanField label="Estado del modelo" value={commercialModelStatus(textValue(commercialModel.status))} wide />
          </section>
        ) : null}

        <section className="lw-human-section">
          <SectionTitle title="Economía del producto" />
          <div className="lw-money-grid">
            <MoneyField label="Precio público" value={product.public_price} currency={product.currency} />
            <MoneyField label="Costo adquisición" value={product.acquisition_price} currency={product.currency} />
            <PercentField label="Participación LINK" value={product.link_share_percent} />
            <PercentField label="Beneficio cliente" value={product.client_benefit_share_percent} />
          </div>
          {product.responsibility_notes ? <p className="lw-human-note">{product.responsibility_notes}</p> : null}
        </section>

        {Object.keys(architecture).length ? (
          <section className="lw-human-section">
            <SectionTitle title="Quién hace qué" />
            <div className="lw-role-grid">
              <RoleCard title="Productor" value={textValue(architecture.producer_role)} />
              <RoleCard title="Espacio / partner" value={textValue(architecture.partner_role)} />
              <RoleCard title="LINK" value={textValue(architecture.link_role)} />
              <RoleCard title="Canal de venta" value={textValue(architecture.sales_channel_role)} />
            </div>
          </section>
        ) : null}

        <section className="lw-human-section">
          <SectionTitle title="Qué falta para activar" count={pending.length} />
          {pending.length ? (
            <div className="lw-pending-list">
              {pending.map((item) => <button type="button" key={item} onClick={(event) => guide(event, "@link-world Revisa el producto " + product.name + " de " + commercialName + ". Quiero resolver: " + item + ". Usa el estado real de LINK WORLD, propón alternativas y no escribas cambios hasta que los apruebe.")}><i />{item}<span>↗</span></button>)}
            </div>
          ) : <div className="lw-all-clear">Producto listo para avanzar.</div>}
          {product.agreement_notes ? <p className="lw-human-note">{product.agreement_notes}</p> : null}
        </section>

        <details className="lw-tech-details">
          <summary>Trazabilidad técnica</summary>
          <div className="lw-tech-grid">
            <Detail label="Global ID" value={product.global_id || "—"} />
            <Detail label="UUID" value={product.id} />
            <Detail label="Código" value={product.code || "—"} />
            <Detail label="Actualizado" value={formatDateTime(product.updated_at)} />
          </div>
        </details>
      </aside>
    </div>
  );
}

function ChatGuide({ guide, close }: { guide: ChatGuideState; close: () => void }) {
  if (!guide) return null;
  const prompt = guide.action.trim().startsWith("@link-world")
    ? guide.action.trim()
    : "@link-world Revisa el estado actual de LINK WORLD. Quiero " + guide.action.toLowerCase() + ". Propón el cambio y no escribas nada hasta que lo apruebe.";
  const copy = async () => {
    try { await navigator.clipboard.writeText(prompt); } catch { /* el usuario aún puede copiar manualmente */ }
  };
  return (
    <aside
      className={"lw-chat-guide " + (guide.below ? "below" : "above")}
      style={{ left: guide.x, top: guide.y }}
      role="status"
      aria-live="polite"
    >
      <button className="lw-chat-guide-close" type="button" onClick={close} aria-label="Cerrar ayuda">×</button>
      <small>GESTO → CHATGPT</small>
      <p>{prompt}</p>
      <button className="lw-chat-guide-copy" type="button" onClick={copy}>Copiar prompt</button>
    </aside>
  );
}

function SectionTitle({ title, count }: { title: string; count?: number }) {
  return (
    <div className="lw-human-section-title">
      <h3>{title}</h3>
      {count !== undefined ? <span>{count}</span> : null}
    </div>
  );
}

function HumanStatus({ label, value }: { label: string; value: string }) {
  return <div className="lw-human-status-item"><small>{label}</small><b>{value}</b></div>;
}

function HumanField({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return <div className={"lw-human-field" + (wide ? " wide" : "")}><small>{label}</small><b>{value || "—"}</b></div>;
}

function RoleCard({ title, value, wide }: { title: string; value: string; wide?: boolean }) {
  if (!value) return null;
  return <div className={"lw-role-card" + (wide ? " wide" : "")}><small>{title}</small><p>{value}</p></div>;
}

function FinanceMetric({ label, value }: { label: string; value?: number | string | null }) {
  return (
    <div className="lw-finance-metric">
      <strong>{Number(value || 0)}</strong>
      <small>{label}</small>
    </div>
  );
}

function MoneyField({ label, value, currency }: { label: string; value?: number | null; currency?: string | null }) {
  return <div className="lw-money-field"><small>{label}</small><strong>{value == null ? "Pendiente" : money(value, currency)}</strong></div>;
}

function PercentField({ label, value }: { label: string; value?: number | null }) {
  return <div className="lw-money-field"><small>{label}</small><strong>{value == null ? "Pendiente" : String(value) + "%"}</strong></div>;
}

function sourceLabel(value: string) {
  if (value === "user_confirmed") return "Confirmado por usuario";
  if (value === "historical_preliminary_proposal") return "Propuesta histórica";
  return value ? stateText(value) : "—";
}

function commercialModelStatus(value: string) {
  if (value === "proposed_model_not_signed_agreement") return "Modelo propuesto · acuerdo aún no firmado";
  return value ? stateText(value) : "Por definir";
}

function economyLabel(value: string) {
  const labels: Record<string, string> = {
    public_reference_price: "Precio público de referencia",
    manual_by_product: "Manual por producto",
    per_product_and_value_generating_gesture: "Por producto y gesto que genera valor",
  };
  return labels[value] || (value ? stateText(value) : "Por definir");
}

function benefitModesLabel(value: unknown) {
  if (!Array.isArray(value) || !value.length) return "Por definir";
  return value.map((item) => {
    const key = textValue(item);
    if (key === "immediate_discount") return "Descuento inmediato";
    if (key === "future_credit") return "Crédito futuro";
    return stateText(key);
  }).join(" · ");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function textValue(value: unknown): string {
  return typeof value === "string" ? value : value === null || value === undefined ? "" : String(value);
}

function stateText(value?: string | null) {
  if (!value) return "—";
  const key = value.toLowerCase();
  const labels: Record<string, string> = {
    detected: "Detectado",
    conversation: "En conversación",
    agreed: "Acordado",
    active: "Activo",
    recorded: "Registrado",
    learning: "Aprendiendo",
    expanding: "Expandiendo",
    paused: "Pausado",
    closed: "Cerrado",
    none: "Sin acuerdo",
    pending: "Pendiente",
    draft: "Borrador",
    negotiation: "En negociación",
    proposal: "Propuesta",
    ready: "Listo",
    blocked: "Bloqueado",
    comercio: "Comercio",
    proveedor: "Proveedor",
    establecimiento: "Establecimiento",
    partner: "Partner",
    otro: "Otro",
  };
  return labels[key] || humanize(value);
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
  const key = value.toLowerCase();
  if (key === "client" || key === "counterparty") return "Link";
  if (key === "counterparty.registered") return "Link registrado";
  return value.replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
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
