"use client";

import { useEffect, useState } from "react";

type FlowRow = {
  globalId: string;
  slug: string;
  name: string;
  state: string;
  stateLabel: string;
  bottleneck: string;
  nextAction: string;
  metrics: {
    activeSources: number;
    events48h: number;
    activeMissions: number;
    executableWork: number;
    pendingApprovals: number;
    blockedHandoffs: number;
  };
  currentMission?: {
    code: string;
    title: string;
    stage: string;
    status: string;
  } | null;
};

function tone(state: string) {
  if (state === "blocked" || state === "disconnected") return " is-danger";
  if (state === "waiting_evidence" || state === "needs_decision" || state === "setup") return " is-warn";
  if (state === "working") return " is-live";
  return "";
}

export default function BusinessFlowHealth() {
  const [rows, setRows] = useState<FlowRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/business-flow-health", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok || !payload?.ok) throw new Error(payload?.error || "No se pudo leer el flujo.");
        if (!active) return;
        setRows(payload.businesses || []);
        setError("");
      } catch (err: any) {
        if (!active) return;
        setError(err?.message || "No se pudo leer el flujo.");
      }
    }

    void load();
    const timer = setInterval(() => void load(), 12000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  if (error && !rows.length) {
    return <div className="cc-empty">No pudimos leer la salud de los negocios ahora.</div>;
  }

  return (
    <section className="cc-business-flow">
      {rows.map((row) => (
        <article className={"cc-business-flow-row" + tone(row.state)} key={row.globalId}>
          <div className="cc-business-flow-state">
            <span className={"cc-live-dot" + tone(row.state)} />
            <div>
              <b>{row.name}</b>
              <small>{row.stateLabel}</small>
            </div>
          </div>

          <div className="cc-business-flow-copy">
            <p>{row.bottleneck}</p>
            <small>{row.nextAction}</small>
          </div>

          <div className="cc-business-flow-metrics">
            <span><b>{row.metrics.events48h}</b><small>señales 48h</small></span>
            <span><b>{row.metrics.activeMissions}</b><small>misiones</small></span>
            <span><b>{row.metrics.executableWork}</b><small>trabajos</small></span>
          </div>

          {row.currentMission ? (
            <a href={"/dots/" + stageDot(row.currentMission.stage)}>
              Abrir actor →
            </a>
          ) : (
            <span className="cc-business-flow-ready">Sin acción manual</span>
          )}
        </article>
      ))}
    </section>
  );
}

function stageDot(stage: string) {
  const map: Record<string, string> = {
    marketing: "linkdot-marketing-rrss",
    ventas: "linkdot-ventas",
    cierre: "linkdot-cierre",
    onboarding: "linkdot-onboarding",
    entrega: "linkdot-entrega",
    postventa: "linkdot-postventa",
    transversal: "link-director",
  };
  return map[stage] || "link-director";
}
