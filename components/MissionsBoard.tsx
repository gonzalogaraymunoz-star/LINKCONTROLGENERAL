"use client";

import { useEffect, useMemo, useState } from "react";
import StageMissions from "./StageMissions";

type Client = { id: string; name: string; accent?: string | null };
type Stage = { id: string; client_id: string; stage_key: string; stage_order: number; title: string; status: string; checklist: Array<{done?: boolean}> };

async function json(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  const body = await response.json();
  if (!response.ok || !body.ok) throw new Error(body.error || `HTTP ${response.status}`);
  return body;
}

export default function MissionsBoard() {
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [stageId, setStageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    json("/api/central").then(body => {
      setClients(body.clients || []);
      setClientId(current => current || body.clients?.[0]?.id || null);
    }).catch(err => setError(err instanceof Error ? err.message : "No fue posible cargar clientes"));
  }, [open]);

  useEffect(() => {
    if (!clientId) return;
    json(`/api/onboarding?clientId=${encodeURIComponent(clientId)}`).then(body => {
      const rows = body.stages || [];
      setStages(rows);
      const active = rows.find((item: Stage) => item.status === "in_progress") || rows.find((item: Stage) => item.status !== "done") || rows[0];
      setStageId(active?.id || null);
    }).catch(err => setError(err instanceof Error ? err.message : "No fue posible cargar etapas"));
  }, [clientId]);

  const selectedClient = useMemo(() => clients.find(item => item.id === clientId) || null, [clients, clientId]);
  const selectedStage = useMemo(() => stages.find(item => item.id === stageId) || null, [stages, stageId]);

  return (
    <>
      <button className="missionsLauncher" onClick={() => setOpen(true)}><span>✓</span><b>Misiones</b></button>
      {open ? <div className="factoryBackdrop" onMouseDown={event => { if (event.currentTarget === event.target) setOpen(false); }}>
        <section className="missionsBoard" role="dialog" aria-modal="true">
          <header className="factoryHeader">
            <div><span className="factoryEyebrow">CONTROL CENTRAL / OPERACIÓN</span><h2>Misiones</h2><p>El trabajo operativo de cada cliente, conectado directamente a sus etapas de incorporación.</p></div>
            <button className="factoryClose" onClick={() => setOpen(false)}>×</button>
          </header>
          <div className="missionsGrid">
            <aside className="missionsClients">
              <div className="factorySideTitle">Clientes</div>
              {clients.map(client => <button key={client.id} className={`factoryClient ${client.id === clientId ? "active" : ""}`} onClick={() => setClientId(client.id)}><i style={{background:client.accent || "#777"}}/><span><strong>{client.name}</strong><small>Abrir misiones</small></span></button>)}
            </aside>
            <main className="missionsMain">
              {error ? <div className="factoryError factoryErrorTop">{error}</div> : null}
              {!selectedClient ? <div className="factoryEmpty">Selecciona un cliente.</div> : <>
                <div className="factoryClientHead"><div><span>Cliente</span><h3>{selectedClient.name}</h3></div><div className="factoryProgress"><strong>{stages.filter(x=>x.status==="done").length}/{stages.length || 9}</strong><span>etapas cerradas</span></div></div>
                <div className="missionStageTabs">{stages.map(stage => <button key={stage.id} className={`${stage.id === stageId ? "active" : ""} ${stage.status === "done" ? "done" : ""}`} onClick={() => setStageId(stage.id)}><span>{String(stage.stage_order).padStart(2,"0")}</span><b>{stage.title}</b><small>{stage.status === "done" ? "Completada" : stage.status === "in_progress" ? "En curso" : "Pendiente"}</small></button>)}</div>
                {selectedStage ? <StageMissions clientId={selectedClient.id} stageId={selectedStage.id} stageTitle={selectedStage.title}/> : null}
                <div className="missionsNote"><b>Una sola operación</b><p>Estas misiones se guardan en <code>work_items</code>. Por eso también alimentan Trabajo, Calendario y Actividad; no existe una lista paralela.</p></div>
              </>}
            </main>
          </div>
        </section>
      </div> : null}
    </>
  );
}
