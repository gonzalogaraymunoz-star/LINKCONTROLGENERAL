"use client";

import { FormEvent, useEffect, useState } from "react";

type Mission = {
  id: string;
  client_id: string;
  onboarding_stage_id?: string | null;
  title: string;
  description?: string | null;
  due_at?: string | null;
  priority?: number | null;
  kind: string;
  status: string;
};

async function request(body: Record<string, unknown>) {
  const response = await fetch("/api/missions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!response.ok || !json.ok) throw new Error(json.error || `HTTP ${response.status}`);
  return json;
}

export default function StageMissions({ clientId, stageId, stageTitle }: { clientId: string; stageId: string; stageTitle: string }) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [kind, setKind] = useState("task");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    const response = await fetch(`/api/missions?clientId=${encodeURIComponent(clientId)}&onboardingStageId=${encodeURIComponent(stageId)}`, { cache: "no-store" });
    const body = await response.json();
    if (!response.ok || !body.ok) throw new Error(body.error || `HTTP ${response.status}`);
    setMissions(body.missions || []);
  }

  useEffect(() => { void load().catch(err => setError(err instanceof Error ? err.message : "No fue posible leer misiones")); }, [clientId, stageId]);

  async function create(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true); setError(null);
    try {
      await request({ action: "create", clientId, onboardingStageId: stageId, title, dueAt: dueAt || null, kind, priority: 2 });
      setTitle(""); setDueAt(""); setKind("task");
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "No fue posible crear la misión"); }
    finally { setSaving(false); }
  }

  async function toggle(mission: Mission) {
    try {
      await request({ action: "status", missionId: mission.id, status: mission.status === "done" ? "pending" : "done" });
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "No fue posible actualizar la misión"); }
  }

  async function archive(mission: Mission) {
    try {
      await request({ action: "archive", missionId: mission.id });
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "No fue posible archivar la misión"); }
  }

  const pending = missions.filter(item => item.status !== "done").length;

  return (
    <section className="factoryPanel missionPanel">
      <div className="factoryPanelTitle"><strong>Misiones de esta etapa</strong><span>{pending} pendientes · conectadas a Trabajo</span></div>
      <p className="missionIntro">Todo lo creado aquí también vive en <b>Trabajo</b> y queda vinculado a {stageTitle}.</p>

      <div className="missionList">
        {missions.map(mission => (
          <div key={mission.id} className={`missionRow ${mission.status === "done" ? "done" : ""}`}>
            <button className={`missionCheck ${mission.status === "done" ? "done" : ""}`} onClick={() => void toggle(mission)}>{mission.status === "done" ? "✓" : ""}</button>
            <div><strong>{mission.title}</strong><small>{mission.kind}{mission.due_at ? ` · ${new Intl.DateTimeFormat("es-CL", { dateStyle: "short" }).format(new Date(mission.due_at))}` : " · sin fecha"}</small></div>
            <button className="missionArchive" onClick={() => void archive(mission)} aria-label="Archivar misión">×</button>
          </div>
        ))}
        {missions.length === 0 ? <div className="missionEmpty">Todavía no hay misiones para esta etapa.</div> : null}
      </div>

      <form className="missionComposer" onSubmit={create}>
        <input value={title} onChange={event => setTitle(event.target.value)} placeholder="Nueva misión…" />
        <select value={kind} onChange={event => setKind(event.target.value)}><option value="task">Tarea</option><option value="action">Acción obligatoria</option><option value="gesture">Gesto</option></select>
        <input type="date" value={dueAt} onChange={event => setDueAt(event.target.value)} />
        <button disabled={saving || !title.trim()}>{saving ? "Creando…" : "＋ Agregar"}</button>
      </form>
      {error ? <div className="factoryError">{error}</div> : null}
    </section>
  );
}
