import { stripeConfigured } from "@/lib/payments/stripe";
import { readFinMemory } from "@/lib/fin/ledger";
import styles from "./fin.module.css";

export const dynamic = "force-dynamic";

type Search = Record<string, string | string[] | undefined>;

type FinPayment = {
  id: string;
  order_ref: string;
  business_ref: string | null;
  product_ref: string | null;
  provider: string;
  provider_session_id: string | null;
  checkout_url: string | null;
  amount: number | string | null;
  currency: string | null;
  status: string;
  payment_status: string;
  created_at: string;
  updated_at: string;
};

type FinEvent = {
  id: string;
  event_type: string;
  business_ref: string | null;
  order_ref: string | null;
  provider: string | null;
  amount: number | string | null;
  currency: string | null;
  status: string | null;
  actor: string;
  source: string;
  recorded_at: string;
};

type FinBusiness = {
  business_key: string;
  display_name: string;
  description: string | null;
  aliases: string[] | null;
  default_currency: string;
  active: boolean;
  sort_order: number;
  metadata: Record<string, unknown> | null;
};

type PaymentRoute = {
  id: string;
  business_key: string;
  method_type: string;
  provider: string;
  label: string;
  account_ref: string | null;
  currency: string;
  enabled: boolean;
  priority: number;
  settlement_mode: string | null;
  reconciliation_mode: string;
  metadata: Record<string, unknown> | null;
};

function money(amount: number | string | null | undefined, currency = "CLP") {
  if (amount == null) return "—";
  const numeric = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(Number.isFinite(numeric) ? numeric : 0);
}

function dateTime(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function state(payment: FinPayment) {
  if (payment.payment_status === "paid") return { label: "Pagado", tone: "ok" };
  if (payment.status === "expired") return { label: "Expirado", tone: "off" };
  if (payment.status === "complete") return { label: "Procesando", tone: "warn" };
  return { label: "Abierto", tone: "live" };
}

function refsFor(business: FinBusiness) {
  return new Set([business.business_key, business.display_name, ...(Array.isArray(business.aliases) ? business.aliases : [])]);
}

function belongsToBusiness(ref: string | null, business: FinBusiness) {
  return Boolean(ref && refsFor(business).has(ref));
}

function routeInitial(provider: string) {
  if (provider.toLowerCase() === "mercado_pago") return "MP";
  return provider.slice(0, 2).toUpperCase();
}

export default async function FinPage({ searchParams }: { searchParams?: Promise<Search> }) {
  const params = (await searchParams) || {};
  const memory = await readFinMemory(100);
  const allPayments = memory.payments as FinPayment[];
  const allEvents = memory.recentEvents as FinEvent[];
  const businesses = memory.businesses as FinBusiness[];
  const paymentRoutes = memory.paymentRoutes as PaymentRoute[];

  const requestedBusiness = typeof params.business === "string" ? params.business : "all";
  const selectedBusiness = businesses.find((item) => item.business_key === requestedBusiness) || null;
  const scopeLabel = selectedBusiness?.display_name || "Todos los negocios";

  const payments = selectedBusiness
    ? allPayments.filter((item) => belongsToBusiness(item.business_ref, selectedBusiness))
    : allPayments;
  const recentEvents = selectedBusiness
    ? allEvents.filter((item) => belongsToBusiness(item.business_ref, selectedBusiness))
    : allEvents;

  const paid = payments.filter((item) => item.payment_status === "paid");
  const open = payments.filter((item) => item.status === "open" && item.payment_status !== "paid");
  const clpPaid = paid
    .filter((item) => (item.currency || "").toLowerCase() === "clp")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const activeRoutes = selectedBusiness
    ? paymentRoutes.filter((route) => route.business_key === selectedBusiness.business_key)
    : paymentRoutes;

  const isTest = process.env.VERCEL_ENV !== "production";
  const created = typeof params.created === "string" ? params.created : "";
  const paymentResult = typeof params.payment === "string" ? params.payment : "";
  const driveRootUrl = memory.driveRootId ? `https://drive.google.com/drive/folders/${memory.driveRootId}` : "";
  const driveSheetUrl = memory.driveMasterSheetId ? `https://docs.google.com/spreadsheets/d/${memory.driveMasterSheetId}/edit` : "";

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <a className={styles.brand} href="/">
          <span>L</span>
          <div><b>LINK</b><small>CONTROL CENTRAL</small></div>
        </a>

        <nav className={styles.nav}>
          <small>FIN · FINANZAS</small>
          <a className={styles.active} href="#resumen"><i>01</i><span><b>Resumen</b><em>Vista ejecutiva</em></span></a>
          <a href="#negocios"><i>02</i><span><b>Negocios</b><em>Mesas independientes</em></span></a>
          <a href="#cobros"><i>03</i><span><b>Cobros</b><em>Memoria operativa</em></span></a>
          <a href="#mesa"><i>04</i><span><b>Mesa FIN</b><em>Trabajo operativo</em></span></a>
          <a href="#registro"><i>05</i><span><b>Registro</b><em>Gestos y respaldo</em></span></a>
          <a href="#pasarelas"><i>06</i><span><b>Pasarelas</b><em>Rutas por negocio</em></span></a>
        </nav>

        <nav className={styles.businessNav}>
          <small>NEGOCIOS</small>
          <a className={!selectedBusiness ? styles.businessNavActive : ""} href="/fin"><span>∞</span><b>Todos</b></a>
          {businesses.map((business) => (
            <a
              className={selectedBusiness?.business_key === business.business_key ? styles.businessNavActive : ""}
              href={`/fin?business=${encodeURIComponent(business.business_key)}`}
              key={business.business_key}
            >
              <span>{business.display_name.slice(0, 1).toUpperCase()}</span><b>{business.display_name}</b>
            </a>
          ))}
        </nav>

        <div className={styles.sidebarBottom}>
          <span className={styles.liveDot} />
          <div><b>MEMORIA FIN</b><small>{memory.configured ? "Supabase activo · append-only" : "Sin memoria operativa"}</small></div>
        </div>
      </aside>

      <section className={styles.main}>
        <header className={styles.topbar}>
          <div><small>LINK CONTROL CENTRAL / FIN / {scopeLabel.toUpperCase()}</small><b>{scopeLabel}</b></div>
          <div className={styles.topActions}>
            <span className={isTest ? styles.testBadge : styles.liveBadge}>{isTest ? "ENTORNO TEST" : "LIVE"}</span>
            <a href={selectedBusiness ? `/fin?business=${encodeURIComponent(selectedBusiness.business_key)}` : "/fin"}>Actualizar</a>
          </div>
        </header>

        <div className={styles.canvas}>
          {created ? <div className={styles.notice}>Nuevo checkout creado. FIN guardó el gesto dentro de la mesa del negocio y actualizó su memoria.</div> : null}
          {paymentResult === "success" ? <div className={styles.notice}>El cliente volvió desde la pasarela. FIN conservará la confirmación definitiva como un nuevo evento financiero.</div> : null}
          {memory.error ? <div className={styles.error}><b>Memoria FIN requiere atención.</b><span>{memory.error}</span></div> : null}

          <section id="resumen" className={styles.hero}>
            <div>
              <span className={styles.eyebrow}>FIN · {selectedBusiness ? "MESA DE NEGOCIO" : "CONTROL CONSOLIDADO"}</span>
              <h1>{selectedBusiness ? selectedBusiness.display_name : "Cada negocio, su propia forma de cobrar."}</h1>
              <p>
                {selectedBusiness
                  ? `Esta mesa separa los cobros, pasarelas, conciliación y memoria financiera de ${selectedBusiness.display_name}.`
                  : "FIN consolida todo LINK, pero cada negocio opera en una mesa independiente con sus propias pasarelas, métodos de cobro y reglas."}
              </p>
            </div>
            <div className={styles.heroState}>
              <span className={styles.liveDot} />
              <b>{selectedBusiness ? "Mesa financiera activa" : "Cerebro financiero"}</b>
              <small>{payments.length} movimientos · {activeRoutes.filter((route) => route.enabled).length} rutas activas</small>
            </div>
          </section>

          <section id="negocios" className={styles.businessGrid}>
            <a className={!selectedBusiness ? styles.businessCardActive : styles.businessCard} href="/fin">
              <div className={styles.businessIcon}>∞</div>
              <small>CONSOLIDADO</small>
              <b>Todos los negocios</b>
              <span>{businesses.length} mesas financieras</span>
              <em>Ver todo FIN →</em>
            </a>
            {businesses.map((business) => {
              const businessPayments = allPayments.filter((item) => belongsToBusiness(item.business_ref, business));
              const businessPaid = businessPayments.filter((item) => item.payment_status === "paid");
              const total = businessPaid
                .filter((item) => (item.currency || "").toUpperCase() === business.default_currency.toUpperCase())
                .reduce((sum, item) => sum + Number(item.amount || 0), 0);
              const routes = paymentRoutes.filter((route) => route.business_key === business.business_key && route.enabled);
              const active = selectedBusiness?.business_key === business.business_key;
              return (
                <a
                  className={active ? styles.businessCardActive : styles.businessCard}
                  href={`/fin?business=${encodeURIComponent(business.business_key)}`}
                  key={business.business_key}
                >
                  <div className={styles.businessIcon}>{business.display_name.slice(0, 2).toUpperCase()}</div>
                  <small>NEGOCIO</small>
                  <b>{business.display_name}</b>
                  <span>{money(total, business.default_currency)} · {routes.length} ruta{routes.length === 1 ? "" : "s"}</span>
                  <em>Abrir mesa →</em>
                </a>
              );
            })}
          </section>

          <section className={styles.metrics}>
            <article><small>Cobrado · {scopeLabel}</small><strong>{money(clpPaid, "CLP")}</strong><span>{paid.length} cobro{paid.length === 1 ? "" : "s"} confirmado{paid.length === 1 ? "" : "s"}</span></article>
            <article><small>Cobros abiertos</small><strong>{open.length}</strong><span>solo en esta mesa</span></article>
            <article><small>Rutas de cobro</small><strong>{activeRoutes.filter((route) => route.enabled).length}</strong><span>pasarelas y métodos activos</span></article>
            <article><small>Respaldo Drive</small><strong>{memory.pendingBackups}</strong><span>{memory.failedBackups ? `${memory.failedBackups} con error` : "pendientes de sincronizar"}</span></article>
          </section>

          <div className={styles.grid}>
            <section id="cobros" className={styles.cardWide}>
              <header className={styles.sectionHead}>
                <div><small>CASILLA DE COBROS · {scopeLabel.toUpperCase()}</small><h2>Movimientos de esta mesa</h2></div>
                <span>Fuente primaria · FIN / Supabase</span>
              </header>
              <div className={styles.tableWrap}>
                <div className={styles.tableHead}><span>Estado</span><span>Orden / negocio</span><span>Monto</span><span>Actualizado</span><span>Acción</span></div>
                {payments.map((payment) => {
                  const current = state(payment);
                  return (
                    <div className={styles.tableRow} key={payment.id}>
                      <span><i className={styles[current.tone as keyof typeof styles]} />{current.label}</span>
                      <span><b>{payment.order_ref}</b><small>{payment.business_ref || "LINK"} · {payment.product_ref || "sin producto"}</small></span>
                      <span><b>{money(payment.amount, payment.currency || "CLP")}</b><small>{payment.provider} · {payment.provider_session_id?.slice(0, 18) || "sin ref"}…</small></span>
                      <span>{dateTime(payment.updated_at)}</span>
                      <span>{payment.checkout_url ? <a href={payment.checkout_url} target="_blank" rel="noreferrer">{payment.payment_status === "paid" ? "Ver ↗" : "Cobrar ↗"}</a> : <em>Registrado</em>}</span>
                    </div>
                  );
                })}
                {!payments.length ? <div className={styles.empty}>Esta mesa todavía no tiene movimientos financieros.</div> : null}
              </div>
            </section>

            <section className={styles.card}>
              <header className={styles.sectionHead}><div><small>GENERADOR · {scopeLabel.toUpperCase()}</small><h2>Nuevo cobro</h2></div><span>{isTest ? "TEST" : "Bloqueado"}</span></header>
              <form className={styles.form} method="post" action="/fin/create-test">
                {selectedBusiness ? (
                  <>
                    <input name="businessId" type="hidden" value={selectedBusiness.business_key} />
                    <label>Negocio<input value={selectedBusiness.display_name} disabled /></label>
                  </>
                ) : (
                  <label>Negocio
                    <select name="businessId" defaultValue="link-control-central" required>
                      {businesses.map((business) => <option value={business.business_key} key={business.business_key}>{business.display_name}</option>)}
                    </select>
                  </label>
                )}
                <label>Concepto<input name="productName" defaultValue="COBRO LINK" required /></label>
                <div className={styles.formSplit}>
                  <label>Monto CLP<input name="amount" type="number" min="100" step="1" defaultValue="1000" required /></label>
                  <label>Producto<input name="productId" defaultValue="cobro-general" required /></label>
                </div>
                <label>Email cliente · opcional<input name="customerEmail" type="email" placeholder="cliente@correo.cl" /></label>
                <button type="submit" disabled={!isTest}>Generar cobro para {selectedBusiness?.display_name || "negocio"}</button>
                <p>El negocio queda grabado en metadata, ledger y memoria FIN. La ruta de cobro se resolverá por la configuración propia de cada mesa.</p>
              </form>
            </section>

            <section id="mesa" className={styles.card}>
              <header className={styles.sectionHead}><div><small>MESA DE TRABAJO</small><h2>{scopeLabel}</h2></div><span>Operación</span></header>
              <div className={styles.workList}>
                <article><i className={styles.ok} /><div><b>Memoria separada</b><small>Cobros y estados filtrados por negocio</small></div><strong>ACTIVO</strong></article>
                <article><i className={styles.ok} /><div><b>Rutas propias</b><small>Cada negocio puede tener pasarelas y cuentas distintas</small></div><strong>ACTIVO</strong></article>
                <article><i className={styles.ok} /><div><b>Registro inmutable</b><small>Cada gesto conserva business_ref y trazabilidad</small></div><strong>ACTIVO</strong></article>
                <article><i className={styles.warn} /><div><b>Conciliación por cuenta</b><small>Orden ↔ cobro ↔ liquidación ↔ documento</small></div><strong>SIGUIENTE</strong></article>
              </div>
            </section>

            <section className={styles.card}>
              <header className={styles.sectionHead}><div><small>CEREBRO FINANCIERO</small><h2>Lectura de {scopeLabel}</h2></div><span>memoria local</span></header>
              <div className={styles.brain}>
                <div><small>SEÑAL</small><b>{open.length ? `${open.length} cobro${open.length === 1 ? "" : "s"} abierto${open.length === 1 ? "" : "s"}` : "Sin cobros abiertos"}</b><p>La respuesta corresponde únicamente al alcance seleccionado.</p></div>
                <div><small>PASARELAS</small><b>{activeRoutes.filter((route) => route.enabled).length} rutas activas</b><p>FIN no mezcla la configuración de un negocio con otro.</p></div>
                <div><small>TRAZABILIDAD</small><b>{recentEvents.length} gestos recientes</b><p>Los eventos conservan negocio, orden, proveedor y estado.</p></div>
              </div>
            </section>

            <section id="pasarelas" className={styles.cardWide}>
              <header className={styles.sectionHead}><div><small>RUTAS DE COBRO · {scopeLabel.toUpperCase()}</small><h2>Pasarelas y formas de cobro</h2></div><span>LINKSUBDOT DE COBRO</span></header>
              {selectedBusiness ? (
                <div className={styles.gateways}>
                  {activeRoutes.map((route) => (
                    <article className={route.enabled ? styles.gatewayActive : ""} key={route.id}>
                      <span>{routeInitial(route.provider)}</span>
                      <div><b>{route.label}</b><small>{route.method_type} · {route.currency} · conciliación {route.reconciliation_mode}</small></div>
                      <strong>{route.enabled ? (route.provider === "stripe" && !stripeConfigured() ? "SIN CLAVE" : "ACTIVO") : "INACTIVO"}</strong>
                    </article>
                  ))}
                  {!activeRoutes.length ? <div className={styles.routeEmpty}><b>Sin rutas configuradas</b><span>Esta mesa está aislada y todavía no tiene pasarela o método de cobro asignado.</span></div> : null}
                </div>
              ) : (
                <div className={styles.routeMatrix}>
                  {businesses.map((business) => {
                    const routes = paymentRoutes.filter((route) => route.business_key === business.business_key);
                    return (
                      <a href={`/fin?business=${encodeURIComponent(business.business_key)}#pasarelas`} key={business.business_key}>
                        <div><b>{business.display_name}</b><small>{routes.length ? `${routes.length} ruta${routes.length === 1 ? "" : "s"} configurada${routes.length === 1 ? "" : "s"}` : "Sin rutas configuradas"}</small></div>
                        <span>{routes.filter((route) => route.enabled).map((route) => route.provider).join(" · ") || "Configurar →"}</span>
                      </a>
                    );
                  })}
                </div>
              )}
            </section>

            <section id="registro" className={styles.cardWide}>
              <header className={styles.sectionHead}><div><small>REGISTRO FINANCIERO · {scopeLabel.toUpperCase()}</small><h2>Últimos gestos</h2></div><span>{selectedBusiness ? recentEvents.length : memory.ledgerCount} eventos</span></header>
              <div className={styles.auditGrid}>
                <div className={styles.auditList}>
                  {recentEvents.map((event) => (
                    <article key={event.id}>
                      <i className={styles.ok} />
                      <div><b>{event.event_type}</b><small>{event.order_ref || event.business_ref || "FIN"} · {event.actor} · {event.source}</small></div>
                      <span>{dateTime(event.recorded_at)}</span>
                    </article>
                  ))}
                  {!recentEvents.length ? <div className={styles.empty}>Sin gestos registrados en esta mesa.</div> : null}
                </div>
                <div className={styles.driveBox}>
                  <span className={styles.driveMark}>D</span>
                  <small>RESPALDO EXTERNO</small>
                  <h3>Google Drive</h3>
                  <p>La evidencia permanece respaldada, pero FIN conserva el negocio de origen para no mezclar operaciones.</p>
                  <div><b>{memory.pendingBackups}</b><span>pendientes</span><b>{memory.failedBackups}</b><span>con error</span></div>
                  <nav>
                    {driveRootUrl ? <a href={driveRootUrl} target="_blank" rel="noreferrer">Abrir respaldo ↗</a> : null}
                    {driveSheetUrl ? <a href={driveSheetUrl} target="_blank" rel="noreferrer">Registro maestro ↗</a> : null}
                  </nav>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
