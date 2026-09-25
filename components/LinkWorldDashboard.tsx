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
  preferences: {
    visibleWidgets: string[];
    layouts: GridLayouts;
    clientColumns: string[];
    updatedAt?: string | null;
  };
};

const WIDGETS = [
  { id: "clients", label: "Clientes", description: "Clientes y contrapartes de LINK WORLD" },
  { id: "activity", label: "Actividad LINK WORLD", description: "Movimientos reales del ecosistema" },
  { id: "products", label: "Productos", description: "Productos creados y su estado económico" },
  { id: "businesses", label: "Negocios", description: "Células registradas en LINK WORLD" },
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

export default function LinkWorldDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [visibleWidgets, setVisibleWidgets] = useState<string[]>([]);
  const [layouts, setLayouts] = useState<GridLayouts>({});
  const [clientColumns, setClientColumns] = useState<string[]>([]);
  const [savedSnapshot, setSavedSnapshot] = useState<{
    visibleWidgets: string[];
    layouts: GridLayouts;
    clientColumns: string[];
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
    setSavedSnapshot({
      visibleWidgets: json.preferences.visibleWidgets,
      layouts: json.preferences.layouts,
      clientColumns: json.preferences.clientColumns,
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

  function startEditing() {
    setSavedSnapshot({ visibleWidgets, layouts, clientColumns });
    setEditing(true);
  }

  function cancelEditing() {
    if (savedSnapshot) {
      setVisibleWidgets(savedSnapshot.visibleWidgets);
      setLayouts(savedSnapshot.layouts);
      setClientColumns(savedSnapshot.clientColumns);
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
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "No se pudo guardar el panel");
      setSavedSnapshot({ visibleWidgets, layouts, clientColumns });
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
          <button className="lw-refresh" onClick={() => load().catch((reason: Error) => setError(reason.message))}>
            Actualizar
          </button>
          <Link className="lw-operation" href="/operacion">
            Operación
          </Link>
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

      <section className="lw-intro">
        <div>
          <small>FUENTE DE VERDAD · LINK WORLD</small>
          <h2>Lo que está sucediendo ahora.</h2>
          <p>Este panel no replica LINK WORLD: lo observa y organiza para tomar decisiones.</p>
        </div>
        <div className="lw-summary">
          <Metric value={data.clients.length} label="clientes" />
          <Metric value={data.businesses.length} label="negocios" />
          <Metric value={data.products.length} label="productos" />
          <Metric value={data.activity.length} label="movimientos" />
        </div>
      </section>

      {error ? <div className="lw-error">{error}</div> : null}

      {editing ? (
        <section className="lw-editor">
          <div>
            <small>EDITANDO PANEL</small>
            <strong>Arrastra desde la barra superior de cada módulo y usa la esquina para cambiar su tamaño.</strong>
          </div>
          <div className="lw-widget-picker">
            {WIDGETS.map((widget) => (
              <label key={widget.id}>
                <input
                  type="checkbox"
                  checked={visibleWidgets.includes(widget.id)}
                  onChange={() => toggleWidget(widget.id)}
                />
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
        {visibleWidgets.includes("clients") ? (
          <div key="clients">
            <Widget
              title="Clientes"
              eyebrow={String(data.clients.length) + " REGISTRADOS"}
              editing={editing}
              action={
                <details className="lw-columns">
                  <summary>Campos</summary>
                  <div>
                    {CLIENT_COLUMNS.map((column) => (
                      <label key={column.id}>
                        <input
                          type="checkbox"
                          checked={clientColumns.includes(column.id)}
                          onChange={() => toggleClientColumn(column.id)}
                          disabled={!editing && column.id === "name"}
                        />
                        {column.label}
                      </label>
                    ))}
                  </div>
                </details>
              }
            >
              <ClientsTable
                clients={data.clients}
                columns={clientColumns}
                selectClient={setSelectedClientId}
              />
            </Widget>
          </div>
        ) : null}

        {visibleWidgets.includes("activity") ? (
          <div key="activity">
            <Widget title="Actividad LINK WORLD" eyebrow="TIEMPO REAL" editing={editing}>
              <ActivityTimeline items={data.activity} />
            </Widget>
          </div>
        ) : null}

        {visibleWidgets.includes("products") ? (
          <div key="products">
            <Widget title="Productos" eyebrow={String(data.products.length) + " ACTIVOS EN LA BASE"} editing={editing}>
              <ProductsList products={data.products} clients={data.clients} />
            </Widget>
          </div>
        ) : null}

        {visibleWidgets.includes("businesses") ? (
          <div key="businesses">
            <Widget title="Negocios" eyebrow={String(data.businesses.length) + " CÉLULAS"} editing={editing}>
              <BusinessesList businesses={data.businesses} />
            </Widget>
          </div>
        ) : null}
      </ResponsiveGrid>

      <footer className="lw-footer">
        <span>CONTROL CENTRAL · lectura directa de LINK WORLD</span>
        <span>Actualizado {formatDateTime(data.generatedAt)}</span>
      </footer>

      {selectedClient ? (
        <ClientDrawer client={selectedClient} close={() => setSelectedClientId(null)} />
      ) : null}
    </main>
  );
}

function Widget({
  title,
  eyebrow,
  editing,
  action,
  children,
}: {
  title: string;
  eyebrow: string;
  editing: boolean;
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
          {action}
          {editing ? <span className="lw-grip" aria-label="Mover panel">⠿</span> : null}
        </div>
      </header>
      <div className="lw-widget-body">{children}</div>
    </section>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="lw-metric">
      <strong>{String(value).padStart(2, "0")}</strong>
      <small>{label}</small>
    </div>
  );
}

function ClientsTable({
  clients,
  columns,
  selectClient,
}: {
  clients: Client[];
  columns: string[];
  selectClient: (id: string) => void;
}) {
  if (!clients.length) return <Empty text="LINK WORLD todavía no tiene clientes." />;

  const visible = CLIENT_COLUMNS.filter((column) => columns.includes(column.id));
  return (
    <div className="lw-table-wrap">
      <table className="lw-table">
        <thead>
          <tr>
            {visible.map((column) => <th key={column.id}>{column.label}</th>)}
            <th aria-label="Abrir ficha" />
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id} onClick={() => selectClient(client.id)}>
              {visible.map((column) => (
                <td key={column.id}>{renderClientCell(client, column.id)}</td>
              ))}
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
    case "name":
      return <b>{client.name}</b>;
    case "business":
      return client.business?.name || "—";
    case "role":
      return humanize(client.role);
    case "relationship_state":
      return <Status value={client.relationship_state} />;
    case "agreement_status":
      return <Status value={client.agreement_status} />;
    case "city":
      return client.city || "—";
    case "country":
      return client.country || "—";
    case "website":
      return client.website ? "Disponible" : "—";
    case "products":
      return client.products.length ? String(client.products.length) : "—";
    case "updated_at":
      return relativeTime(client.updated_at);
    default:
      return "—";
  }
}

function ActivityTimeline({ items }: { items: Activity[] }) {
  if (!items.length) return <Empty text="No hay actividad registrada." />;
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

function ProductsList({ products, clients }: { products: Product[]; clients: Client[] }) {
  if (!products.length) return <Empty text="Todavía no hay productos en LINK WORLD." />;
  const clientById = new Map(clients.map((client) => [client.id, client.name]));

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
            {product.public_price !== null && product.public_price !== undefined ? (
              <strong>{money(product.public_price, product.currency)}</strong>
            ) : null}
            {product.link_share_percent !== null && product.link_share_percent !== undefined ? (
              <small>LINK {product.link_share_percent}%</small>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function BusinessesList({ businesses }: { businesses: Business[] }) {
  if (!businesses.length) return <Empty text="Todavía no hay negocios registrados." />;
  return (
    <div className="lw-business-list">
      {businesses.map((business) => (
        <article key={business.id}>
          <div className="lw-business-index">{business.name.slice(0, 1).toUpperCase()}</div>
          <div>
            <b>{business.name}</b>
            <p>{business.summary || [business.sector, business.city, business.country].filter(Boolean).join(" · ") || "Sin descripción"}</p>
            <small>{humanize(business.verification_status)} · {relativeTime(business.updated_at)}</small>
          </div>
        </article>
      ))}
    </div>
  );
}

function ClientDrawer({ client, close }: { client: Client; close: () => void }) {
  const facts = client.owned_facts && typeof client.owned_facts === "object"
    ? Object.entries(client.owned_facts)
    : [];

  return (
    <div className="lw-drawer-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) close();
    }}>
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

        {client.website ? (
          <a className="lw-client-link" href={client.website} target="_blank" rel="noreferrer">
            Abrir website ↗
          </a>
        ) : null}

        <section className="lw-drawer-section">
          <div className="lw-section-head">
            <small>PRODUCTOS</small>
            <span>{client.products.length}</span>
          </div>
          {client.products.length ? client.products.map((product) => (
            <article className="lw-drawer-product" key={product.id}>
              <div>
                <b>{product.name}</b>
                <small>{product.category || "Sin categoría"} · {humanize(product.economic_state || product.stage)}</small>
              </div>
              <div>
                {product.public_price !== null && product.public_price !== undefined ? (
                  <strong>{money(product.public_price, product.currency)}</strong>
                ) : <span>Sin precio</span>}
                {product.link_share_percent !== null && product.link_share_percent !== undefined ? (
                  <small>LINK {product.link_share_percent}%</small>
                ) : null}
              </div>
            </article>
          )) : <Empty text="Este cliente todavía no tiene productos." />}
        </section>

        {facts.length ? (
          <section className="lw-drawer-section">
            <div className="lw-section-head"><small>DATOS PROPIOS</small><span>{facts.length}</span></div>
            <div className="lw-facts">
              {facts.map(([key, value]) => (
                <Detail key={key} label={humanize(key)} value={formatFact(value)} />
              ))}
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
  return (
    <div className="lw-detail">
      <small>{label}</small>
      <b>{value || "—"}</b>
    </div>
  );
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
  return new Date(value).toLocaleString("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
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

function formatFact(value: unknown) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((item) => formatFact(item)).join(", ");
  return JSON.stringify(value);
}
