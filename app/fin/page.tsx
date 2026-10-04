import { listStripeCheckoutSessions, stripeConfigured, type StripeCheckoutSession } from "@/lib/payments/stripe";
import styles from "./fin.module.css";

export const dynamic = "force-dynamic";

type Search = Record<string, string | string[] | undefined>;

function money(amount: number | null | undefined, currency = "CLP") {
  if (amount == null) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount);
}

function dateTime(epoch?: number | null) {
  if (!epoch) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(epoch * 1000));
}

function state(session: StripeCheckoutSession) {
  if (session.payment_status === "paid") return { label: "Pagado", tone: "ok" };
  if (session.status === "expired") return { label: "Expirado", tone: "off" };
  if (session.status === "complete") return { label: "Procesando", tone: "warn" };
  return { label: "Abierto", tone: "live" };
}

function business(session: StripeCheckoutSession) {
  return session.metadata?.business_id || "LINK";
}

function order(session: StripeCheckoutSession) {
  return session.metadata?.order_id || session.client_reference_id || "Sin orden";
}

export default async function FinPage({ searchParams }: { searchParams?: Promise<Search> }) {
  const params = (await searchParams) || {};
  let sessions: StripeCheckoutSession[] = [];
  let error = "";

  try {
    sessions = stripeConfigured() ? await listStripeCheckoutSessions(50) : [];
  } catch (err) {
    error = err instanceof Error ? err.message : "No se pudo leer Stripe";
  }

  const paid = sessions.filter((item) => item.payment_status === "paid");
  const open = sessions.filter((item) => item.status === "open" && item.payment_status !== "paid");
  const expired = sessions.filter((item) => item.status === "expired");
  const clpPaid = paid
    .filter((item) => (item.currency || "").toLowerCase() === "clp")
    .reduce((sum, item) => sum + (item.amount_total || 0), 0);
  const isTest = process.env.VERCEL_ENV !== "production";
  const created = typeof params.created === "string" ? params.created : "";
  const paymentResult = typeof params.payment === "string" ? params.payment : "";

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
          <a href="#cobros"><i>02</i><span><b>Cobros</b><em>Links y transacciones</em></span></a>
          <a href="#mesa"><i>03</i><span><b>Mesa FIN</b><em>Trabajo operativo</em></span></a>
          <a href="#inteligencia"><i>04</i><span><b>Inteligencia</b><em>Cerebro financiero</em></span></a>
          <a href="#pasarelas"><i>05</i><span><b>Pasarelas</b><em>Rutas de cobro</em></span></a>
        </nav>

        <div className={styles.sidebarBottom}>
          <span className={styles.liveDot} />
          <div><b>LINKSUBDOT DE COBRO</b><small>{stripeConfigured() ? "Stripe conectado" : "Stripe sin configurar"}</small></div>
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
          {created ? <div className={styles.notice}>Nuevo checkout creado por LINKSUBDOT. Ya aparece en la bandeja de cobros.</div> : null}
          {paymentResult === "success" ? <div className={styles.notice}>Stripe devolvió el checkout como completado. El estado de pago se lee directamente desde Stripe.</div> : null}
          {error ? <div className={styles.error}><b>No pudimos leer Stripe.</b><span>{error}</span></div> : null}

          <section id="resumen" className={styles.hero}>
            <div>
              <span className={styles.eyebrow}>FIN · MESA FINANCIERA</span>
              <h1>Todo el dinero de LINK, en una sola mesa.</h1>
              <p>LINKSUBDOT DE COBRO crea, observa y organiza los cobros. FIN concentra la visión de negocio, la operación y la inteligencia financiera.</p>
            </div>
            <div className={styles.heroState}>
              <span className={styles.liveDot} />
              <b>Cerebro financiero</b>
              <small>Observando cobros y estados</small>
            </div>
          </section>

          <section className={styles.metrics}>
            <article><small>Cobrado · CLP</small><strong>{money(clpPaid, "CLP")}</strong><span>{paid.length} checkout{paid.length === 1 ? "" : "s"} pagado{paid.length === 1 ? "" : "s"}</span></article>
            <article><small>Links abiertos</small><strong>{open.length}</strong><span>esperando al cliente</span></article>
            <article><small>Sesiones visibles</small><strong>{sessions.length}</strong><span>últimas 50 en Stripe</span></article>
            <article><small>Expirados</small><strong>{expired.length}</strong><span>requieren nuevo cobro</span></article>
          </section>

          <div className={styles.grid}>
            <section id="cobros" className={styles.cardWide}>
              <header className={styles.sectionHead}>
                <div><small>CASILLA DE COBROS</small><h2>Links generados</h2></div>
                <span>Vista rápida · Stripe</span>
              </header>
              <div className={styles.tableWrap}>
                <div className={styles.tableHead}><span>Estado</span><span>Orden / negocio</span><span>Monto</span><span>Creado</span><span>Acción</span></div>
                {sessions.map((session) => {
                  const current = state(session);
                  return (
                    <div className={styles.tableRow} key={session.id}>
                      <span><i className={styles[current.tone as keyof typeof styles]} />{current.label}</span>
                      <span><b>{order(session)}</b><small>{business(session)} · {session.metadata?.product_id || "checkout"}</small></span>
                      <span><b>{money(session.amount_total, session.currency || "CLP")}</b><small>{session.id.slice(0, 18)}…</small></span>
                      <span>{dateTime(session.created)}</span>
                      <span>{session.url ? <a href={session.url} target="_blank" rel="noreferrer">{session.payment_status === "paid" ? "Ver checkout ↗" : "Cobrar ↗"}</a> : <em>Sin URL</em>}</span>
                    </div>
                  );
                })}
                {!sessions.length ? <div className={styles.empty}>Todavía no hay Checkout Sessions para mostrar.</div> : null}
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
                <button type="submit" disabled={!isTest}>Generar link de cobro</button>
                <p>{isTest ? "Crea una Checkout Session real dentro del entorno TEST de Stripe." : "El generador TEST está desactivado en producción."}</p>
              </form>
            </section>

            <section id="mesa" className={styles.card}>
              <header className={styles.sectionHead}><div><small>MESA DE TRABAJO FIN</small><h2>Prioridades</h2></div><span>Operación</span></header>
              <div className={styles.workList}>
                <article><i className={styles.ok} /><div><b>Generación de cobros</b><small>LINKSUBDOT → Stripe Checkout</small></div><strong>ACTIVO</strong></article>
                <article><i className={styles.warn} /><div><b>Confirmación automática</b><small>Webhook + persistencia normalizada</small></div><strong>SIGUIENTE</strong></article>
                <article><i className={styles.warn} /><div><b>Conciliación</b><small>Orden ↔ intento ↔ evento ↔ liquidación</small></div><strong>PENDIENTE</strong></article>
                <article><i className={styles.off} /><div><b>Pagos / salidas</b><small>Separado de COBROS; aún no implementado</small></div><strong>FUERA</strong></article>
              </div>
            </section>

            <section id="inteligencia" className={styles.card}>
              <header className={styles.sectionHead}><div><small>CEREBRO FINANCIERO</small><h2>Lectura inteligente</h2></div><span>v0 · observador</span></header>
              <div className={styles.brain}>
                <div><small>SEÑAL</small><b>{open.length ? `${open.length} cobro${open.length === 1 ? "" : "s"} abierto${open.length === 1 ? "" : "s"}` : "Sin cobros abiertos"}</b><p>FIN puede priorizar seguimiento cuando un checkout permanece sin pago.</p></div>
                <div><small>REGLA</small><b>Una orden, una identidad</b><p>business_id + product_id + order_id viajan dentro de cada checkout para mantener trazabilidad.</p></div>
                <div><small>LÍMITE ACTUAL</small><b>Observa; todavía no decide dinero</b><p>Reembolsos, payouts y cambios sensibles requieren una capa de autorización antes de automatizarse.</p></div>
              </div>
            </section>

            <section id="pasarelas" className={styles.cardWide}>
              <header className={styles.sectionHead}><div><small>PAYMENT ORCHESTRATOR</small><h2>Pasarelas y rutas</h2></div><span>LINKSUBDOT DE COBRO</span></header>
              <div className={styles.gateways}>
                <article className={styles.gatewayActive}><span>S</span><div><b>Stripe</b><small>Checkout Sessions · conectado</small></div><strong>ACTIVO</strong></article>
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
