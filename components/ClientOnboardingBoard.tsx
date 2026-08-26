"use client";

import { useEffect, useMemo, useState } from "react";

type Client = { id: string; name: string; status: string; accent?: string | null };
type Cycle = { id: string; client_id: string; stage: string; progress: number; status: string; next_milestone?: string | null };
type CentralData = { ok: boolean; clients: Client[]; cycles: Cycle[] };

const STEPS = [
  ["01", "Entrevista", "Diagnóstico y filtro inicial"],
  ["02", "Identidad", "Correo y proyecto ChatGPT"],
  ["03", "Conexiones", "GitHub · Supabase · Vercel · Drive"],
  ["04", "Centro", "Instalar Control subordinado"],
  ["05", "Memoria", "Supabase + archivo maestro .md"],
  ["06", "Producto", "Website / primera solución"],
  ["07", "MCP", "Conexión operable desde ChatGPT"],
  ["08", "Pruebas", "Validación punta a punta"],
  ["09", "Entrega", "Operación y evolución"],
] as const;

function inferredStep(stage?: string) {
  const map: Record<string, number> = {
    understand: 1,
    diagnose: 2,
    design: 3,
    build: 5,
    deliver: 7,
    scale: 8,
  };
  return map[stage || ""] ?? 0;
}

export default function ClientOnboardingBoard() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<CentralData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/central", { cache: "no-store" })
      .then(async response => {
        const body = await response.json();
        if (!response.ok || !body.ok) throw new Error(body.error || `HTTP ${response.status}`);
        if (!cancelled) {
          setData(body);
          setSelectedId(current => current || body.clients?.[0]?.id || null);
        }
      })
      .catch(err => !cancelled && setError(err instanceof Error ? err.message : "No fue posible leer el backend"));
    return () => { cancelled = true; };
  }, [open]);

  const selected = useMemo(() => data?.clients.find(client => client.id === selectedId) ?? null, [data, selectedId]);
  const cycle = useMemo(() => data?.cycles.find(item => item.client_id === selectedId && item.status === "active") ?? null, [data, selectedId]);
  const current = inferredStep(cycle?.stage);

  return (
    <>
      <button className="factoryLauncher" onClick={() => setOpen(true)} aria-label="Abrir incorporación de clientes">
        <span>＋</span><b>Incorporación</b>
      </button>
      {open ? (
        <div className="factoryBackdrop" onMouseDown={event => { if (event.currentTarget === event.target) setOpen(false); }}>
          <section className="factoryBoard" role="dialog" aria-modal="true" aria-label="Fábrica de Centros de Control">
            <header className="factoryHeader">
              <div><span className="factoryEyebrow">CONTROL CENTRAL / FÁBRICA</span><h2>Incorporación de clientes</h2><p>Un flujo único para convertir cada negocio en un Centro de Control gobernado.</p></div>
              <button className="factoryClose" onClick={() => setOpen(false)}>×</button>
            </header>

            <div className="factoryGrid">
              <aside className="factoryClients">
                <div className="factorySideTitle">Clientes reales</div>
                {error ? <div className="factoryError">{error}</div> : null}
                {!data ? <div className="factoryMuted">Leyendo Supabase…</div> : null}
                {data?.clients.map(client => (
                  <button key={client.id} onClick={() => setSelectedId(client.id)} className={`factoryClient ${selectedId === client.id ? "active" : ""}`}>
                    <i style={{ background: client.accent || "#747474" }} />
                    <span><strong>{client.name}</strong><small>{data.cycles.some(item => item.client_id === client.id && item.status === "active") ? "Proceso activo" : "Sin ciclo activo"}</small></span>
                  </button>
                ))}
                <div className="factoryRule"><b>Regla</b><p>El tablero no supone conexiones. Todo lo externo permanece “por verificar” hasta tener comprobación real.</p></div>
              </aside>

              <main className="factoryMain">
                {!selected ? <div className="factoryEmpty">Selecciona un cliente para revisar su montaje.</div> : (
                  <>
                    <div className="factoryClientHead">
                      <div><span>Cliente</span><h3>{selected.name}</h3></div>
                      <div className="factoryProgress"><strong>{cycle ? `${cycle.progress}%` : "0%"}</strong><span>progreso operacional</span></div>
                    </div>

                    <div className="factoryFlow">
                      {STEPS.map(([number, title, description], index) => {
                        const completed = index < current;
                        const active = index === current;
                        return (
                          <article key={number} className={`factoryStep ${completed ? "done" : ""} ${active ? "active" : ""}`}>
                            <div className="factoryStepNo">{completed ? "✓" : number}</div>
                            <div className="factoryStepBody"><strong>{title}</strong><p>{description}</p></div>
                            <span className="factoryState">{completed ? "Registrado" : active ? "En curso" : "Pendiente"}</span>
                          </article>
                        );
                      })}
                    </div>

                    <div className="factorySystems">
                      <div><span>GitHub</span><b>Por verificar</b></div>
                      <div><span>Supabase</span><b className="isReal">Conectado al Central</b></div>
                      <div><span>Vercel</span><b>Por verificar</b></div>
                      <div><span>Google Drive</span><b>Por verificar</b></div>
                      <div><span>ChatGPT / MCP</span><b>Por verificar</b></div>
                    </div>

                    <div className="factoryNext">
                      <span>Próximo hito</span>
                      <strong>{cycle?.next_milestone || "Completar diagnóstico y registrar las conexiones del cliente."}</strong>
                      <p>La siguiente versión hará persistentes identidad, conexiones, carpetas Drive, archivo maestro y estado MCP antes de permitir marcarlos como completados.</p>
                    </div>
                  </>
                )}
              </main>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
