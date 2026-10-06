"use client";

import { useEffect, useState } from "react";

type CellStage = {
  key: string;
  label: string;
  proven: boolean;
  evidenceCount: number;
};

type Cell = {
  key: string;
  label: string;
  role: string;
  modelName: string;
  pain?: string | null;
  treatment?: string | null;
  mission: string;
  maturity: string;
  growth: string;
  growthLabel: string;
  growthIndex: number;
  economicProofCount: number;
  contractSignalCount: number;
  provenStageCount: number;
  totalStageCount: number;
  facilitator?: string | null;
  nextStage?: {
    key: string;
    label: string;
    objective?: string | null;
    recommendation?: string | null;
    evidenceRequired?: string | null;
    executors?: string[];
    prompt?: string | null;
  } | null;
  stages: CellStage[];
};

type FlowRow = {
  globalId: string;
  slug: string;
  name: string;
  state: string;
  stateLabel: string;
  bottleneck: string;
  nextAction: string;
  growthMission?: string | null;
  growthState?: string | null;
  cells: Cell[];
  metrics: {
    activeSources: number;
    events48h: number;
    activeMissions: number;
    executableWork: number;
    pendingApprovals: number;
    blockedHandoffs: number;
  };
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
    <section className="cc-business-flow cc-cell-control">
      {rows.map((row) => (
        <article className={"cc-cell-business" + tone(row.state)} key={row.globalId}>
          <header className="cc-cell-business-head">
            <div>
              <span className={"cc-live-dot" + tone(row.state)} />
              <div>
                <small>NEGOCIO</small>
                <h3>{row.name}</h3>
                <p>{row.cells.length ? `${row.cells.length} célula${row.cells.length === 1 ? "" : "s"} económica${row.cells.length === 1 ? "" : "s"}` : "Sin célula económica modelada todavía."}</p>
              </div>
            </div>
            <a href={"https://link-world-game.vercel.app/?business=" + encodeURIComponent(row.slug)}>Abrir en LINK WORLD →</a>
          </header>

          {row.cells.length ? (
            <div className="cc-cell-list">
              {row.cells.map((cell) => (
                <section className="cc-cell-growth" key={cell.key}>
                  <div className="cc-cell-growth-head">
                    <div>
                      <span className="cc-eyebrow">{cell.label}</span>
                      <h4>{cell.modelName}</h4>
                    </div>
                    <span className="cc-growth-state">{cell.growthLabel}</span>
                  </div>

                  <div className="cc-cell-mission">
                    <small>MISIÓN DE CRECIMIENTO</small>
                    <b>{cell.mission}</b>
                  </div>

                  <div className="cc-growth-track">
                    {["Oportunidad","Activado","Recurrente","Sistematizado","Delegado","Autónomo","Expansión"].map((label,index) => (
                      <span key={label} className={index <= cell.growthIndex ? "done" : ""}><i />{label}</span>
                    ))}
                  </div>

                  <div className="cc-cell-proof">
                    <span><b>{cell.economicProofCount}</b><small>pruebas económicas</small></span>
                    <span><b>{cell.provenStageCount}/{cell.totalStageCount || 6}</b><small>etapas comprobadas</small></span>
                    <span><b>{cell.facilitator || "—"}</b><small>LINKDOT facilitador</small></span>
                  </div>

                  {cell.nextStage ? (
                    <div className="cc-cell-next">
                      <div>
                        <small>SIGUIENTE MOVIMIENTO · {cell.nextStage.label}</small>
                        <b>{cell.nextStage.recommendation || cell.nextStage.objective || "Conseguir evidencia para avanzar."}</b>
                        <p>{cell.nextStage.evidenceRequired ? "Se comprueba con: " + cell.nextStage.evidenceRequired : ""}</p>
                      </div>
                      <div className="cc-cell-executors">
                        {(cell.nextStage.executors || []).map((item) => <span key={item}>{item === "chatgpt" ? "ChatGPT" : item === "human" ? "Humano" : "ChatGPT + humano"}</span>)}
                      </div>
                    </div>
                  ) : (
                    <div className="cc-cell-next is-complete"><b>La Concha base está comprobada. La siguiente misión es autonomía o expansión.</b></div>
                  )}

                  <div className="cc-cell-stage-row">
                    {cell.stages.map((stage) => (
                      <span key={stage.key} className={stage.proven ? "done" : ""} title={stage.evidenceCount ? `${stage.evidenceCount} evidencia(s)` : "Sin evidencia"}>
                        {stage.label}
                      </span>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="cc-empty">Esta empresa existe en el ecosistema, pero todavía no tiene una célula/modelo que podamos dirigir económicamente.</div>
          )}

          <details className="cc-technical-summary">
            <summary>Ver señales técnicas</summary>
            <div>
              <span>{row.metrics.events48h} señales 48h</span>
              <span>{row.metrics.activeMissions} misiones internas</span>
              <span>{row.metrics.executableWork} trabajos runtime</span>
              <span>{row.metrics.pendingApprovals} aprobaciones</span>
              <span>{row.metrics.blockedHandoffs} handoffs bloqueados</span>
            </div>
          </details>
        </article>
      ))}
    </section>
  );
}
