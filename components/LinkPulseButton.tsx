"use client";

import { useState, type CSSProperties } from "react";

type PulseNode = {
  key: string;
  label: string;
  status: "ok" | "warning" | "error";
  detail: string;
  latencyMs?: number | null;
};

type PulseResult = {
  ok: boolean;
  scanId: string;
  completedAt: string;
  summary: string;
  healthScore: number;
  nodes: PulseNode[];
  issues: Array<{ severity: "warning" | "error"; source: string; detail: string }>;
  recommendations: string[];
  director?: { queued?: boolean; status?: string; workItemId?: string | null };
};

export default function LinkPulseButton() {
  const [running, setRunning] = useState(false);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<PulseResult | null>(null);
  const [error, setError] = useState("");

  async function runPulse() {
    if (running) return;
    setRunning(true);
    setOpen(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/link-pulse", { method: "POST" });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) throw new Error(payload?.detail || payload?.error || "No se pudo completar el Pulso LINK");
      setResult(payload);
    } catch (err: any) {
      setError(err?.message || "No se pudo completar el Pulso LINK");
    } finally {
      setRunning(false);
    }
  }

  const previewNodes: PulseNode[] = result?.nodes || [
    { key: "supabase", label: "Supabase", status: "ok", detail: "Leyendo fuente viva" },
    { key: "connections", label: "Conexiones LINK", status: "ok", detail: "Rastreando bindings y relaciones" },
    { key: "github", label: "GitHub", status: "ok", detail: "Leyendo código y última señal" },
    { key: "vercel", label: "Vercel", status: "ok", detail: "Verificando deployment" },
    { key: "director", label: "LINKDOT DIRECTOR", status: "ok", detail: "Preparando material de análisis" },
  ];

  return (
    <>
      <button
        className={"link-pulse-button" + (running ? " is-running" : "")}
        onClick={() => void runPulse()}
        disabled={running}
        title="Recorrer LINK y entregar evidencia a LINKDOT DIRECTOR"
      >
        <span className="link-pulse-icon" aria-hidden="true"><i /><i /><i /></span>
        <span>{running ? "Pulso en curso…" : "Pulso LINK"}</span>
      </button>

      {open ? (
        <div className="link-pulse-overlay" role="dialog" aria-modal="true" aria-label="Pulso LINK">
          <div className="link-pulse-panel">
            <header>
              <div>
                <small>CONTROL CENTRAL · ONDA TRANSVERSAL</small>
                <h2>Pulso LINK</h2>
                <p>Supabase → conexiones → GitHub → Vercel → LINKDOT DIRECTOR</p>
              </div>
              <button className="icon-button" onClick={() => setOpen(false)} aria-label="Cerrar">×</button>
            </header>

            <div className={"link-pulse-track" + (running ? " is-running" : " is-complete")}>
              <span className="link-pulse-line" />
              <span className="link-pulse-wave" />
              {previewNodes.map((node, index) => (
                <div className={"link-pulse-node is-" + node.status} key={node.key} style={{ "--pulse-index": index } as CSSProperties}>
                  <span className="link-pulse-dot" />
                  <b>{node.label}</b>
                  <small>{running ? "Rastreando…" : node.detail}</small>
                </div>
              ))}
            </div>

            {running ? (
              <div className="link-pulse-reading">
                <span className="live-dot" />
                <b>La onda está recorriendo el organismo.</b>
                <small>Solo lee, contrasta y deja evidencia. No ejecuta cambios externos.</small>
              </div>
            ) : error ? (
              <div className="agentic-alert">
                <b>El pulso no terminó correctamente.</b>
                <span>{error}</span>
              </div>
            ) : result ? (
              <div className="link-pulse-result">
                <div className="link-pulse-score">
                  <strong>{result.healthScore}%</strong>
                  <span>salud observada</span>
                </div>
                <div>
                  <h3>{result.summary}</h3>
                  <p>
                    {result.director?.queued
                      ? "La evidencia quedó persistida y fue encolada para LINKDOT DIRECTOR."
                      : "La evidencia quedó persistida para LINKDOT DIRECTOR y será tomada por su siguiente ciclo."}
                  </p>
                </div>
                {result.issues?.length ? (
                  <div className="link-pulse-findings">
                    {result.issues.slice(0, 6).map((issue, index) => (
                      <div key={index}>
                        <span className={"status-pip" + (issue.severity === "warning" ? "" : " is-error")} />
                        <b>{issue.source}</b>
                        <small>{issue.detail}</small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="link-pulse-reading">
                    <span className="live-dot" />
                    <b>Sin fallos críticos detectados.</b>
                    <small>El próximo pulso servirá para comparar cambios.</small>
                  </div>
                )}
              </div>
            ) : null}

            <footer>
              {!running && <button onClick={() => setOpen(false)}>Cerrar</button>}
              {!running && <button className="link-pulse-rerun" onClick={() => void runPulse()}>Repetir pulso</button>}
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}
