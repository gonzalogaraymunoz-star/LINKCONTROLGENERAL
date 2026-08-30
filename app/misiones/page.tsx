"use client";

import { useEffect, useMemo, useState } from "react";

type Mission = { week: number; start: string; end: string; phase: string; title: string; objective: string; actions: string[]; deliverable: string };
type Item = { id: string; title: string; status: string; due_at: string; description: string };

export default function MissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(1);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/missions", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "No se pudo cargar Misiones");
      setMissions(j.missions || []); setItems(j.items || []); setError("");
      const firstPending = (j.items || []).find((x: Item) => x.status !== "done");
      if (firstPending) setSelected(Number(firstPending.title.match(/^S(\d+)/)?.[1] || 1));
    } catch (e) { setError(e instanceof Error ? e.message : "Error cargando Misiones"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function seed() {
    setBusy(true);
    try { const r = await fetch("/api/missions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "seed" }) }); const j = await r.json(); if (!r.ok) throw new Error(j.error || "No se pudo preparar las misiones"); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Error"); } finally { setBusy(false); }
  }
  async function toggle(id: string, done: boolean) {
    setBusy(true);
    try { const r = await fetch("/api/missions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "toggle", id, status: done ? "done" : "pending" }) }); const j = await r.json(); if (!r.ok) throw new Error(j.error || "No se pudo actualizar"); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Error"); } finally { setBusy(false); }
  }

  const mission = missions.find((m) => m.week === selected) || missions[0];
  const item = items.find((x) => x.title.startsWith(`S${String(selected).padStart(2, "0")} ·`));
  const doneCount = items.filter((x) => x.status === "done").length;
  const progress = items.length ? Math.round((doneCount / items.length) * 100) : 0;
  const phaseGroups = useMemo(() => missions.reduce<Record<string, Mission[]>>((acc, m) => { (acc[m.phase] ||= []).push(m); return acc; }, {}), [missions]);

  if (loading) return <main className="missions"><style jsx global>{css}</style><div className="loading">Cargando MISIÓN CARACOL…</div></main>;

  return <main className="missions">
    <style jsx global>{css}</style>
    <header className="head">
      <div><a href="/">← CONTROL CENTRAL</a><p>CLIENTE · CARACOL</p><h1>Misiones 90 días</h1><span>Acción → evidencia → resultado → decisión.</span></div>
      <div className="headRight"><div className="progressLabel"><b>{progress}%</b><small>ciclo completado</small></div><button onClick={seed} disabled={busy}>{items.length ? "Sincronizar misiones" : "Preparar 90 días"}</button></div>
    </header>
    {error && <div className="error">{error}</div>}
    <section className="weekRail">
      {Object.entries(phaseGroups).map(([phase, list]) => <div className="phase" key={phase}><small>{phase}</small><div>{list.map((m) => { const done = items.find((x) => x.title.startsWith(`S${String(m.week).padStart(2, "0")} ·`))?.status === "done"; return <button key={m.week} className={`${selected === m.week ? "selected" : ""} ${done ? "done" : ""}`} onClick={() => setSelected(m.week)}><b>S{String(m.week).padStart(2, "0")}</b><span>{m.title}</span></button>; })}</div></div>)}
    </section>
    {mission && <section className="missionGrid">
      <article className="missionMain">
        <div className="eyebrow">SEMANA {mission.week} · {mission.start} → {mission.end}</div>
        <h2>{mission.title}</h2><p className="objective">{mission.objective}</p><div className="rule" />
        <h3>Acciones</h3><div className="actions">{mission.actions.map((a, i) => <div className="action" key={a}><span>{String(i + 1).padStart(2, "0")}</span><p>{a}</p></div>)}</div>
        <div className="deliverable"><small>ENTREGABLE DE LA SEMANA</small><b>{mission.deliverable}</b></div>
      </article>
      <aside className="side">
        <div className="statusCard"><small>ESTADO</small><strong>{item?.status === "done" ? "CUMPLIDA" : "EN CURSO"}</strong><button disabled={!item || busy} onClick={() => item && toggle(item.id, item.status !== "done")}>{item?.status === "done" ? "Marcar pendiente" : "Marcar cumplida"}</button></div>
        <div className="controlCard"><small>CONTROL DE RESULTADO</small><p>Al cierre semanal registrar:</p><ul><li>3 piezas publicadas</li><li>Performance de la pieza pautada</li><li>Stories, comentarios y mensajes</li><li>Señal de asistencia</li><li>Decisión: mantener, ajustar, repetir o reemplazar</li></ul></div>
        <div className="tomorrow"><small>PRIMER DÍA</small><b>Lunes 31 de agosto</b><p>Accesos + línea base + producción. No esperar a tener todo perfecto para empezar.</p></div>
      </aside>
    </section>}
  </main>;
}

const css = `*{box-sizing:border-box}.missions{min-height:100vh;background:#f4f3ef;color:#1e1e1c;font-family:Arial,Helvetica,sans-serif;padding:32px clamp(18px,4vw,64px) 70px}.head{max-width:1200px;margin:0 auto 34px;display:flex;justify-content:space-between;gap:28px;align-items:flex-end}.head a{color:#666;text-decoration:none;font-size:11px;letter-spacing:.14em}.head p,.eyebrow,.phase>small,.deliverable small,.statusCard small,.controlCard small,.tomorrow small{font-size:10px;letter-spacing:.16em;color:#777;margin:18px 0 8px}.head h1{font-size:clamp(34px,5vw,58px);font-weight:500;letter-spacing:-.04em;margin:0 0 7px}.head span{color:#777;font-size:14px}.headRight{display:flex;align-items:center;gap:18px}.headRight button,.statusCard button{border:1px solid #1e1e1c;background:#1e1e1c;color:white;padding:11px 15px;border-radius:4px;cursor:pointer}.headRight button:disabled,.statusCard button:disabled{opacity:.5}.progressLabel{text-align:right}.progressLabel b{display:block;font-size:28px;font-weight:500}.progressLabel small{color:#777;font-size:10px}.weekRail{max-width:1200px;margin:0 auto 30px;border-top:1px solid #d5d3cc;border-bottom:1px solid #d5d3cc;padding:15px 0;display:flex;gap:26px;overflow-x:auto}.phase{min-width:max-content}.phase>small{display:block;margin:0 0 8px}.phase>div{display:flex;gap:7px}.phase button{display:flex;align-items:center;gap:8px;border:1px solid #d6d4cd;background:transparent;padding:8px 10px;cursor:pointer;text-align:left;border-radius:3px;min-width:130px}.phase button b{font-size:10px;color:#888}.phase button span{font-size:11px}.phase button.selected{background:#fff;border-color:#222}.phase button.done{opacity:.6}.phase button.done b:after{content:' ✓';color:#4c6b54}.missionGrid{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1.6fr) minmax(280px,.7fr);gap:22px}.missionMain,.side>div{background:#fff;border:1px solid #dedcd5}.missionMain{padding:clamp(24px,4vw,48px)}.eyebrow{margin:0 0 12px}.missionMain h2{font-size:clamp(30px,4vw,46px);font-weight:500;letter-spacing:-.035em;margin:0 0 12px}.objective{font-size:17px;line-height:1.55;color:#555;max-width:720px}.rule{height:1px;background:#dedcd5;margin:28px 0}.missionMain h3{font-size:13px;text-transform:uppercase;letter-spacing:.12em;margin:0 0 12px}.action{display:grid;grid-template-columns:34px 1fr;gap:14px;border-top:1px solid #e6e4dd;padding:15px 0}.action span{font-size:10px;color:#888}.action p{margin:0;font-size:14px;line-height:1.5}.deliverable{margin-top:28px;padding:18px;background:#f4f3ef;display:flex;flex-direction:column;gap:7px}.deliverable b{font-size:14px;font-weight:500}.side{display:flex;flex-direction:column;gap:12px}.side>div{padding:20px}.statusCard strong{display:block;font-size:24px;font-weight:500;margin:7px 0 17px}.controlCard p{font-size:13px;color:#555}.controlCard ul{padding-left:18px;margin:10px 0 0}.controlCard li{font-size:12px;line-height:1.7}.tomorrow{border-left:3px solid #222!important}.tomorrow b{display:block;font-size:16px;margin:6px 0}.tomorrow p{font-size:12px;line-height:1.5;color:#666;margin:0}.error{max-width:1200px;margin:0 auto 18px;background:#fff1ef;border:1px solid #e0b5af;padding:12px;font-size:12px}.loading{min-height:80vh;display:grid;place-items:center;color:#777;font-size:12px;letter-spacing:.12em}@media(max-width:760px){.missions{padding:20px 14px 50px}.head{align-items:flex-start;flex-direction:column}.headRight{width:100%;justify-content:space-between}.missionGrid{grid-template-columns:1fr}.missionMain{padding:22px}.weekRail{margin-left:-14px;margin-right:-14px;padding-left:14px;padding-right:14px}.head h1{font-size:38px}}`;
