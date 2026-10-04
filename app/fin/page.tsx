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

export default async function FinPage({ searchParams }: { searchParams?: Promise<Search> }) {
  const params = (await searchParams) || {};
  const memory = await readFinMemory(50);
  const payments = memory.payments as FinPayment[];
  const recentEvents = memory.recentEvents as FinEvent[];
  const paid = payments.filter((item) => item.payment_status === "paid");
  const open = payments.filter((item) => item.status === "open" && item.payment_status !== "paid");
  const clpPaid = paid
    .filter((item) => (item.currency || "").toLowerCase() === "clp")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
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
          <a href="#cobros"><i>02</i><span><b>Cobros</b><em>Memoria operativa</em></span></a>
          <a href="#mesa"><i>03</i><span><b>Mesa FIN</b><em>Trabajo operativo</em></span></a>
          <a href="#inteligencia"><i>04</i><span><b>Inteligencia</b><em>Cerebro financiero</em></span></a>
          <a href="#registro"><i>05</i><span><b>Registro</b><em>Gestos y respaldo</em></span></a>
          <a href="#pasarelas"><i>06</i><span><b>Pasarelas</b><em>Rutas de cobro</em></span></a>
        </nav>

        <div className={styles.sidebarBottom}>
          <span className={styles.liveDot} />
          <div><b>MEMORIA FIN</b><small>{memory.configured ? "Supabase activo · append-only" : "Sin memoria operativa"}</small></div>
        </div>
      </aside>

      <section className={styles.main}>
        <header className={styles.topbar}>
          <div><small>LINK CONTROL CENTRAL / FIN</small><b>Panel de Finanzas</b></div>
          <div className={styles.topActions}>
            <span className={isTest ? styles.testBadge : styles.liveBadge}>{isTest ? "ENTORNO TEST" : "LIVE"}</span>
            <a href="/fin">Actualizar</a>
          </div>
        </header>

        <div className={styles.canvas}>
          {created ? <div className={styles.notice}>Nuevo checkout creado. FIN guardó el gesto, actualizó su memoria y lo dejó en cola de respaldo.</div> : null}
          {paymentResult === "success" ? <div className={styles.notice}>El cliente volvió desde Stripe. La confirmación definitiva quedará en FIN mediante el evento firmado del proveedor.</div> : null}
          {memory.error ? <div className={styles.error}><b>Memoria FIN requiere atención.</b><span>{memory.error}</span></div> : null}

          <section id="resumen" className={styles.hero}>
            <div>
              <span className={styles.eyebrow}>FIN · MESA FINANCIERA</span>
              <h1>Todo el dinero de LINK, con memoria y evidencia.</h1>
              <p>FIN responde desde su propia memoria operativa. Cada gesto financiero queda registrado como evento inmutable y los documentos se preparan para respaldo en Drive.</p>
            </div>
            <div className={styles.heroState}>
              <span className={styles.liveDot} />
              <b>Cerebro financiero</b>
              <small>{memory.ledgerCount} gestos registrados</small>
            </div>
          </section>

          <section className={styles.metrics}>
            <article><small>Cobrado · CLP</small><strong>{money(clpPaid, "CLP")}</strong><span>{paid.length} cobro{paid.length === 1 ? "" : "s"} confirmado{paid.length === 1 ? "" : "s"}</span></article>
            <article><small>Cobros abiertos</small><strong>{open.length}</strong><span>memoria FIN, sin consultar Stripe</span></article>
            <article><small>Gestos registrados</small><strong>{memory.ledgerCount}</strong><span>bitácora append-only</span></article>
            <article><small>Respaldo Drive</small><strong>{memory.pendingBackups}</strong><span>{memory.failedBackups ? `${memory.failedBackups} con error` : "pendientes de sincronizar"}</span></article>
          </section>

          <div className={styles.grid}>
            <section id="cobros" className={styles.cardWide}>
              <header className={styles.sectionHead}>
                <div><small>MEMORIA DE COBROS</small><h2>Estado financiero rápido</h2></div>
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
                {!payments.length ? <div className={styles.empty}>FIN todavía no tiene movimientos en su memoria.</div> : null}
              </div>
            </section>

            <section className={styles.card}>
              <header className={styles.sectionHead}><div><small>GENERADOR</small><h2>Nuevo cobro</h2></div><span>{isTest ? "TEST" : "Bloqueado"}</span></header>
              <form className={styles.form} method="post" action="/fin/create-test">
                <label>Negocio<input name="businessId" defaultValue="link-control-central" required /></label>
                <label>Concepto<input name="productName" defaultValue="COBRO LINK" required /></label>
                <div className={styles.formSplit}>
                  <label>Monto CLP<input name="amount" type="number" min="100" step="1" defaultValue="1000" required /></label>
                  <label>Producto<input name="productId" defaultValue="cobro-general" required /></label>
                </div>
                <label>Email cliente · opcional<input name="customerEmail" type="email" placeholder="cliente@correo.cl" /></label>
                <button type="submit" disabled={!isTest}>Generar y registrar cobro</button>
                <p>{isTest ? "Stripe crea el checkout; FIN registra el gesto y actualiza su memoria en la misma operación." : "El generador TEST está desactivado en producción."}</p>
              </form>
            </section>

            <section id="mesa" className={styles.card}>
              <header className={styles.sectionHead}><div><small>MESA DE TRABAJO FIN</small><h2>Control financiero</h2></div><span>Operación</span></header>
              <div className={styles.workList}>
                <article><i className={styles.ok} /><div><b>Memoria financiera</b><small>Snapshot rápido + registro inmutable</small></div><strong>ACTIVO</strong></article>
                <article><i className={styles.ok} /><div><b>Respaldo Drive</b><small>Carpetas + registro maestro + cola de backup</small></div><strong>ARMADO</strong></article>
                <article><i className={styles.warn} /><div><b>Confirmación automática</b><small>Webhook firmado actualiza estado y deja nuevo evento</small></div><strong>SIGUIENTE</strong></article>
                <article><i className={styles.warn} /><div><b>Conciliación</b><small>Orden ↔ cobro ↔ documento ↔ liquidación</small></div><strong>SIGUIENTE</strong></article>
              </div>
            </section>

            <section id="inteligencia" className={styles.card}>
              <header className={styles.sectionHead}><div><small>CEREBRO FINANCIERO</small><h2>Lectura inteligente</h2></div><span>memoria local</span></header>
              <div className={styles.brain}>
                <div><small>SEÑAL</small><b>{open.length ? `${open.length} cobro${open.length === 1 ? "" : "s"} abierto${open.length === 1 ? "" : "s"}` : "Sin cobros abiertos"}</b><p>FIN ya puede responder esta pregunta desde su base sin depender de una consulta en vivo al proveedor.</p></div>
                <div><small>TRAZABILIDAD</small><b>Nada se corrige borrando</b><p>El ledger es append-only: una corrección genera otro evento y conserva la historia anterior.</p></div>
                <div><small>DOCUMENTOS</small><b>{memory.documentCount} archivos indexados</b><p>Comprobantes, conciliaciones y cierres tendrán referencia de Drive y estado de respaldo.</p></div>
              </div>
            </section>

            <section id="registro" className={styles.cardWide}>
              <header className={styles.sectionHead}><div><small>REGISTRO FINANCIERO</small><h2>Últimos gestos</h2></div><span>{memory.ledgerCount} eventos totales</span></header>
              <div className={styles.auditGrid}>
                <div className={styles.auditList}>
                  {recentEvents.map((event) => (
                    <article key={event.id}>
                      <i className={styles.ok} />
                      <div><b>{event.event_type}</b><small>{event.order_ref || event.business_ref || "FIN"} · {event.actor} · {event.source}</small></div>
                      <span>{dateTime(event.recorded_at)}</span>
                    </article>
                  ))}
                  {!recentEvents.length ? <div className={styles.empty}>Sin eventos registrados.</div> : null}
                </div>
                <div className={styles.driveBox}>
                  <span className={styles.driveMark}>D</span>
                  <small>RESPALDO EXTERNO</small>
                  <h3>Google Drive</h3>
                  <p>Archivos de pago, conciliaciones, cierres y evidencia quedan separados de la memoria operativa.</p>
                  <div><b>{memory.pendingBackups}</b><span>pendientes</span><b>{memory.failedBackups}</b><span>con error</span></div>
                  <nav>
                    {driveRootUrl ? <a href={driveRootUrl} target="_blank" rel="noreferrer">Abrir respaldo ↗</a> : null}
                    {driveSheetUrl ? <a href={driveSheetUrl} target="_blank" rel="noreferrer">Registro maestro ↗</a> : null}
                  </nav>
                </div>
              </div>
            </section>

            <section id="pasarelas" className={styles.cardWide}>
              <header className={styles.sectionHead}><div><small>PAYMENT ORCHESTRATOR</small><h2>Pasarelas y rutas</h2></div><span>LINKSUBDOT DE COBRO</span></header>
              <div className={styles.gateways}>
                <article className={styles.gatewayActive}><span>S</span><div><b>Stripe</b><small>Checkout Sessions · {stripeConfigured() ? "conectado" : "sin credencial"}</small></div><strong>ACTIVO</strong></article>
                <article><span>T</span><div><b>Transbank</b><small>Adaptador por conectar</small></div><strong>PRÓXIMO</strong></article>
                <article><span>MP</span><div><b>Mercado Pago</b><small>Adaptador por conectar</small></div><strong>PRÓXIMO</strong></article>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
