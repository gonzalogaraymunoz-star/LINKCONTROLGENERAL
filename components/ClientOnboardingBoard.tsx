"use client";

import { useEffect, useMemo, useState } from "react";

type Client = { id: string; name: string; status: string; accent?: string | null };
type CentralData = { ok: boolean; clients: Client[] };
type ChecklistItem = { id: string; label: string; done: boolean };
type LinkItem = { id: string; label: string; url: string; type?: string };
type FolderItem = { id: string; label: string; url?: string; drive_id?: string; status?: string };
type Stage = {
  id: string; client_id: string; stage_key: string; stage_order: number; title: string;
  status: "pending" | "in_progress" | "blocked" | "done";
  checklist: ChecklistItem[]; fields: Record<string, string>; links: LinkItem[]; folders: FolderItem[];
  observations?: string | null; exit_criteria?: string | null; completed_at?: string | null;
};

const DESCRIPTIONS: Record<string, string> = {
  interview: "Diagnóstico, filtro y brief inicial del negocio.",
  identity: "Correo propio, proyecto ChatGPT y acceso administrativo.",
  connections: "GitHub, Supabase, Vercel y Google Drive.",
  control: "Scope, permisos e instancia subordinada del Centro de Control.",
  memory: "Memoria estructurada, decisiones y archivo maestro .md.",
  product: "Construcción y validación del primer producto.",
  mcp: "Conexión operable desde ChatGPT mediante MCP.",
  tests: "Validación de lectura, escritura, persistencia y auditoría.",
  delivery: "Entrega, roadmap y evolución continua del cliente.",
};

const FIELD_PRESETS: Record<string, Array<[string, string, string]>> = {
  interview: [["business","¿Qué hace el negocio?","textarea"],["need","Necesidad principal","textarea"],["goal","Objetivo inicial","textarea"],["ideal_client","Cliente ideal","textarea"]],
  identity: [["business_email","Correo del negocio","text"],["chatgpt_project","Proyecto ChatGPT","text"],["owner","Responsable / cuenta principal","text"]],
  connections: [["github_repo","Repositorio GitHub","text"],["supabase_project","Proyecto Supabase","text"],["vercel_project","Proyecto Vercel","text"],["drive_root","Carpeta raíz Drive","text"]],
  control: [["control_scope","Scope del Centro","text"],["control_url","URL del Centro de Control","text"],["roles","Roles y permisos","textarea"]],
  memory: [["master_md","Ruta / URL del archivo maestro .md","text"],["memory_summary","Resumen de memoria inicial","textarea"],["memory_rules","Reglas específicas de memoria","textarea"]],
  product: [["first_product","Primer producto","text"],["scope_product","Alcance","textarea"],["delivery_url","URL de entrega / preview","text"]],
  mcp: [["mcp_url","Endpoint MCP","text"],["app_name","Nombre del complemento","text"],["tools","Tools expuestas","textarea"]],
  tests: [["test_notes","Resultado de pruebas","textarea"],["last_test_url","URL / evidencia técnica","text"]],
  delivery: [["handoff","Resumen de entrega","textarea"],["roadmap","Roadmap siguiente","textarea"],["next_opportunity","Próxima oportunidad","textarea"]],
};

async function getJson(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  const body = await response.json();
  if (!response.ok || !body.ok) throw new Error(body.error || `HTTP ${response.status}`);
  return body;
}

async function saveStage(clientId: string, stage: Stage) {
  const response = await fetch("/api/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId,
      stageKey: stage.stage_key,
      status: stage.status,
      checklist: stage.checklist,
      fields: stage.fields,
      links: stage.links,
      folders: stage.folders,
      observations: stage.observations || null,
    }),
  });
  const body = await response.json();
  if (!response.ok || !body.ok) throw new Error(body.error || `HTTP ${response.status}`);
  return body.stage as Stage;
}

export default function ClientOnboardingBoard() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<CentralData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    getJson("/api/central")
      .then(body => { setData(body); setSelectedId(current => current || body.clients?.[0]?.id || null); })
      .catch(err => setError(err instanceof Error ? err.message : "No fue posible leer clientes"));
  }, [open]);

  useEffect(() => {
    if (!selectedId) return;
    setError(null);
    getJson(`/api/onboarding?clientId=${encodeURIComponent(selectedId)}`)
      .then(body => {
        setStages(body.stages || []);
        const active = (body.stages || []).find((stage: Stage) => stage.status === "in_progress") || (body.stages || []).find((stage: Stage) => stage.status !== "done") || body.stages?.[0];
        setExpandedKey(active?.stage_key || null);
      })
      .catch(err => setError(err instanceof Error ? err.message : "No fue posible leer el onboarding"));
  }, [selectedId]);

  const selected = useMemo(() => data?.clients.find(client => client.id === selectedId) ?? null, [data, selectedId]);
  const completed = stages.filter(stage => stage.status === "done").length;
  const progress = stages.length ? Math.round((completed / stages.length) * 100) : 0;

  function patchStage(stageKey: string, patch: Partial<Stage>) {
    setStages(current => current.map(stage => stage.stage_key === stageKey ? { ...stage, ...patch } : stage));
  }

  async function persist(stage: Stage, forceDone = false) {
    if (!selectedId) return;
    const nextStage = { ...stage, status: forceDone ? "done" as const : stage.status === "pending" ? "in_progress" as const : stage.status };
    setSaving(stage.stage_key);
    setError(null);
    try {
      const saved = await saveStage(selectedId, nextStage);
      setStages(current => current.map(item => item.stage_key === saved.stage_key ? saved : item));
      if (forceDone) {
        const refreshed = await getJson(`/api/onboarding?clientId=${encodeURIComponent(selectedId)}`);
        setStages(refreshed.stages || []);
        const next = (refreshed.stages || []).find((item: Stage) => item.status === "in_progress");
        if (next) setExpandedKey(next.stage_key);
      }
    } catch (err) {
      setError(err instanceof Error && err.message === "checklist_incomplete" ? "Completa el checklist obligatorio antes de cerrar esta etapa." : err instanceof Error ? err.message : "No fue posible guardar");
    } finally { setSaving(null); }
  }

  return (
    <>
      <button className="factoryLauncher" onClick={() => setOpen(true)}><span>＋</span><b>Incorporación</b></button>
      {open ? (
        <div className="factoryBackdrop" onMouseDown={event => { if (event.currentTarget === event.target) setOpen(false); }}>
          <section className="factoryBoard" role="dialog" aria-modal="true">
            <header className="factoryHeader">
              <div><span className="factoryEyebrow">CONTROL CENTRAL / FÁBRICA</span><h2>Incorporación de clientes</h2><p>Cliente → etapa → requisitos → evidencia → criterio de salida.</p></div>
              <button className="factoryClose" onClick={() => setOpen(false)}>×</button>
            </header>
            <div className="factoryGrid">
              <aside className="factoryClients">
                <div className="factorySideTitle">Clientes reales</div>
                {data?.clients.map(client => (
                  <button key={client.id} onClick={() => setSelectedId(client.id)} className={`factoryClient ${selectedId === client.id ? "active" : ""}`}>
                    <i style={{ background: client.accent || "#747474" }} />
                    <span><strong>{client.name}</strong><small>{selectedId === client.id ? `${progress}% onboarding` : "Abrir proceso"}</small></span>
                  </button>
                ))}
                <div className="factoryRule"><b>Regla</b><p>Cada dato se guarda dentro de cliente + etapa. Ninguna etapa se cierra sin sus requisitos obligatorios.</p></div>
              </aside>

              <main className="factoryMain">
                {error ? <div className="factoryError factoryErrorTop">{error}</div> : null}
                {!selected ? <div className="factoryEmpty">Selecciona un cliente.</div> : (
                  <>
                    <div className="factoryClientHead">
                      <div><span>Cliente</span><h3>{selected.name}</h3></div>
                      <div className="factoryProgress"><strong>{progress}%</strong><span>{completed} de {stages.length || 9} etapas cerradas</span></div>
                    </div>

                    <div className="factoryFlow">
                      {stages.map(stage => {
                        const expanded = expandedKey === stage.stage_key;
                        const doneCount = stage.checklist.filter(item => item.done).length;
                        return (
                          <article key={stage.stage_key} className={`factoryStageCard ${stage.status === "done" ? "done" : ""} ${stage.status === "in_progress" ? "active" : ""}`}>
                            <button className="factoryStageSummary" onClick={() => setExpandedKey(expanded ? null : stage.stage_key)}>
                              <div className="factoryStepNo">{stage.status === "done" ? "✓" : String(stage.stage_order).padStart(2,"0")}</div>
                              <div className="factoryStepBody"><strong>{stage.title}</strong><p>{DESCRIPTIONS[stage.stage_key] || "Etapa del proceso"}</p></div>
                              <div className="factoryStageMeta"><span>{doneCount}/{stage.checklist.length} requisitos</span><b>{expanded ? "−" : "+"}</b></div>
                            </button>

                            {expanded ? (
                              <div className="factoryStageWorkspace">
                                <section className="factoryPanel">
                                  <div className="factoryPanelTitle"><strong>Checklist obligatorio</strong><span>{doneCount}/{stage.checklist.length}</span></div>
                                  <div className="factoryChecklist">
                                    {stage.checklist.map(item => (
                                      <label key={item.id}><input type="checkbox" checked={item.done} onChange={event => patchStage(stage.stage_key, { checklist: stage.checklist.map(row => row.id === item.id ? { ...row, done: event.target.checked } : row) })}/><span>{item.label}</span></label>
                                    ))}
                                  </div>
                                </section>

                                <section className="factoryPanel">
                                  <div className="factoryPanelTitle"><strong>Información de la etapa</strong><span>Se guarda en Supabase</span></div>
                                  <div className="factoryFields">
                                    {(FIELD_PRESETS[stage.stage_key] || []).map(([key,label,type]) => type === "textarea" ? (
                                      <label key={key}><span>{label}</span><textarea value={stage.fields?.[key] || ""} onChange={event => patchStage(stage.stage_key,{ fields:{...stage.fields,[key]:event.target.value} })}/></label>
                                    ) : (
                                      <label key={key}><span>{label}</span><input value={stage.fields?.[key] || ""} onChange={event => patchStage(stage.stage_key,{ fields:{...stage.fields,[key]:event.target.value} })}/></label>
                                    ))}
                                  </div>
                                </section>

                                <section className="factoryPanel factorySplit">
                                  <div>
                                    <div className="factoryPanelTitle"><strong>Links</strong><button onClick={() => patchStage(stage.stage_key,{ links:[...stage.links,{id:crypto.randomUUID(),label:"Nuevo link",url:""}] })}>＋</button></div>
                                    {stage.links.map(link => <div className="factoryMiniRow" key={link.id}><input placeholder="Nombre" value={link.label} onChange={e=>patchStage(stage.stage_key,{links:stage.links.map(x=>x.id===link.id?{...x,label:e.target.value}:x)})}/><input placeholder="https://" value={link.url} onChange={e=>patchStage(stage.stage_key,{links:stage.links.map(x=>x.id===link.id?{...x,url:e.target.value}:x)})}/><button onClick={()=>patchStage(stage.stage_key,{links:stage.links.filter(x=>x.id!==link.id)})}>×</button></div>)}
                                  </div>
                                  <div>
                                    <div className="factoryPanelTitle"><strong>Carpetas / recursos</strong><button onClick={() => patchStage(stage.stage_key,{ folders:[...stage.folders,{id:crypto.randomUUID(),label:"Nueva carpeta",url:"",status:"registered"}] })}>＋</button></div>
                                    {stage.folders.map(folder => <div className="factoryMiniRow" key={folder.id}><input placeholder="Carpeta" value={folder.label} onChange={e=>patchStage(stage.stage_key,{folders:stage.folders.map(x=>x.id===folder.id?{...x,label:e.target.value}:x)})}/><input placeholder="URL / ID Drive" value={folder.url || folder.drive_id || ""} onChange={e=>patchStage(stage.stage_key,{folders:stage.folders.map(x=>x.id===folder.id?{...x,url:e.target.value}:x)})}/><button onClick={()=>patchStage(stage.stage_key,{folders:stage.folders.filter(x=>x.id!==folder.id)})}>×</button></div>)}
                                  </div>
                                </section>

                                <section className="factoryPanel">
                                  <div className="factoryPanelTitle"><strong>Observaciones</strong><span>Contexto libre</span></div>
                                  <textarea className="factoryNotes" value={stage.observations || ""} onChange={event=>patchStage(stage.stage_key,{observations:event.target.value})} placeholder="Decisiones, pendientes, acuerdos, bloqueos, detalles del cliente…"/>
                                  <div className="factoryExit"><span>Criterio de salida</span><strong>{stage.exit_criteria || "Completar requisitos de la etapa."}</strong></div>
                                </section>

                                <div className="factoryActions">
                                  <select value={stage.status} onChange={event=>patchStage(stage.stage_key,{status:event.target.value as Stage["status"]})}><option value="pending">Pendiente</option><option value="in_progress">En curso</option><option value="blocked">Bloqueada</option><option value="done">Completada</option></select>
                                  <button className="factorySave" disabled={saving===stage.stage_key} onClick={()=>void persist(stages.find(x=>x.stage_key===stage.stage_key) || stage)}>{saving===stage.stage_key?"Guardando…":"Guardar etapa"}</button>
                                  {stage.status !== "done" ? <button className="factoryComplete" disabled={saving===stage.stage_key} onClick={()=>void persist(stages.find(x=>x.stage_key===stage.stage_key) || stage,true)}>Completar y avanzar →</button> : null}
                                </div>
                              </div>
                            ) : null}
                          </article>
                        );
                      })}
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
