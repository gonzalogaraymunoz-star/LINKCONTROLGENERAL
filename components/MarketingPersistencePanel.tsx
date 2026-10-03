"use client";

import { useEffect, useState } from "react";

type MarketingState = {
  ok: boolean;
  empty?: boolean;
  error?: string;
  business?: any;
  plan?: any;
  brief?: any;
  tasks?: any[];
  accounts?: any[];
  recentPosts?: any[];
  learnings?: any[];
  metrics?: {
    plannedTasks: number;
    verifiedTasks: number;
    inProgressTasks: number;
    actualPosts: number;
    leadsCaptured: number;
    validLeads: number;
    handoffBlocked: boolean;
  };
};

function money(value?: number | null) {
  if (value == null) return "Pendiente";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

function valueOrPending(value?: string | null) {
  const text = String(value || "").trim();
  return text || "Pendiente de definir";
}

export default function MarketingPersistencePanel() {
  const [state, setState] = useState<MarketingState | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/linkdots/marketing", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || "No se pudo leer MAR");
        if (active) setState(payload);
      })
      .catch((error) => {
        if (active) setState({ ok: false, error: error?.message || "No se pudo leer MAR" });
      });
    return () => { active = false; };
  }, []);

  if (!state) {
    return <section className="surface span-2 mar-persistence"><p>Cargando persistencia de MAR…</p></section>;
  }

  if (!state.ok) {
    return <section className="surface span-2 mar-persistence"><b>MAR necesita atención.</b><p>{state.error}</p></section>;
  }

  if (state.empty) {
    return <section className="surface span-2 mar-persistence"><b>MAR todavía no tiene un plan mensual activo.</b></section>;
  }

  const plan = state.plan || {};
  const brief = state.brief || {};
  const metrics = state.metrics!;
  const tasks = state.tasks || [];
  const learnings = state.learnings || [];

  return (
    <section className="surface span-2 mar-persistence">
      <div className="mar-head">
        <div>
          <div className="eyebrow">MAR · PERSISTENCIA COMERCIAL</div>
          <h2>{state.business?.name || "Negocio"} · Plan mensual</h2>
          <p>Plan, ejecución, aprendizaje y puerta de entrega a BEL en una sola ficha persistente.</p>
        </div>
        <span className={"state-pill " + (metrics.handoffBlocked ? "is-warning" : "")}>
          {metrics.handoffBlocked ? "Handoff a BEL bloqueado" : "Listo para BEL"}
        </span>
      </div>

      <div className="mar-metrics">
        <div><strong>{metrics.plannedTasks}</strong><span>planificadas</span></div>
        <div><strong>{metrics.verifiedTasks}</strong><span>verificadas</span></div>
        <div><strong>{metrics.actualPosts}</strong><span>publicaciones reales</span></div>
        <div><strong>{metrics.validLeads}/{metrics.leadsCaptured}</strong><span>leads válidos</span></div>
      </div>

      <div className="mar-grid">
        <article className="mar-card">
          <small>PLANIFICACIÓN MENSUAL</small>
          <h3>{plan.period_start} → {plan.period_end}</h3>
          <p>{plan.objective || "Sin objetivo registrado."}</p>
          <dl>
            <div><dt>Responsable</dt><dd>{plan.operator_name || "Sin asignar"}</dd></div>
            <div><dt>Fee cliente</dt><dd>{money(plan.client_fee_clp)}</dd></div>
            <div><dt>Fee operador</dt><dd>{money(plan.operator_fee_clp)}</dd></div>
          </dl>
        </article>

        <article className="mar-card">
          <small>BRIEF DEL PRODUCTO / CAMPAÑA</small>
          <h3>{brief.name || "Brief pendiente"}</h3>
          <dl>
            <div><dt>Producto</dt><dd>{brief.product_id ? "Vinculado" : "Pendiente de vincular"}</dd></div>
            <div><dt>Audiencia</dt><dd>{valueOrPending(brief.audience)}</dd></div>
            <div><dt>Beneficio</dt><dd>{valueOrPending(brief.benefit)}</dd></div>
            <div><dt>Anzuelo</dt><dd>{valueOrPending(brief.hook)}</dd></div>
            <div><dt>Oferta</dt><dd>{valueOrPending(brief.offer)}</dd></div>
            <div><dt>Presupuesto</dt><dd>{money(brief.budget_clp)}</dd></div>
          </dl>
        </article>

        <article className="mar-card span-two">
          <small>PLAN VS TRABAJO REAL</small>
          <div className="mar-task-list">
            {tasks.slice(0, 8).map((task: any) => (
              <div key={task.id}>
                <span className={"status-pip " + (task.status === "verified" ? "on" : "")} />
                <b>{task.title}</b>
                <small>{task.content_type} · {task.status}</small>
              </div>
            ))}
            {!tasks.length ? <p>El plan mensual existe, pero todavía no tiene tareas de producción cargadas.</p> : null}
          </div>
        </article>

        <article className="mar-card">
          <small>REGLA DE CAPTURA</small>
          <h3>Quién puede pasar a BEL</h3>
          <p>{brief.capture_rule || "Identidad natural + al menos un punto de contacto válido."}</p>
          <b className={metrics.handoffBlocked ? "mar-blocked" : "mar-ready"}>
            {metrics.handoffBlocked
              ? "Hoy no hay leads elegibles para handoff."
              : `${metrics.validLeads} lead(s) cumplen la regla.`}
          </b>
        </article>

        <article className="mar-card">
          <small>APRENDIZAJE PERSISTENTE</small>
          <h3>Lo que MAR ya sabe</h3>
          <div className="mar-learning-list">
            {learnings.slice(0, 4).map((item: any) => (
              <div key={item.id}>
                <b>{item.signal_type}</b>
                <p>{item.finding}</p>
                {item.decision ? <small>Decisión: {item.decision}</small> : null}
              </div>
            ))}
            {!learnings.length ? <p>Todavía no existen aprendizajes registrados.</p> : null}
          </div>
        </article>
      </div>
    </section>
  );
}
