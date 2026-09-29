"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser";

type Props = {
  agentSlug: string;
  agentName: string;
  stageKey?: string | null;
  businesses: Array<{ global_id: string; label?: string | null; slug?: string | null }>;
};

type State = {
  role?: string;
  grants: any[];
  commands: any[];
  missions: any[];
  evidence: any[];
};

const EMPTY: State = { grants: [], commands: [], missions: [], evidence: [] };

function actionLabel(key: string) {
  const labels: Record<string,string> = {
    "stage.diagnosis.record": "Registrar diagnóstico",
    "mission.create": "Crear misión",
    "agent.assign": "Asignar agente",
    "evidence.request": "Pedir evidencia",
    "stage.escalate": "Escalar a LINK Director",
    "stage.block_scale": "Bloquear escala",
    "stage.verify": "Verificar y cerrar",
  };
  return labels[key] || key;
}

export default function AgentActionConsole({ agentSlug, agentName, stageKey, businesses }: Props) {
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [actionKey, setActionKey] = useState("stage.diagnosis.record");
  const [businessId, setBusinessId] = useState("");
  const [missionCode, setMissionCode] = useState("");
  const [title, setTitle] = useState("");
  const [problem, setProblem] = useState("");
  const [detail, setDetail] = useState("");
  const [requirementKey, setRequirementKey] = useState("resultado");
  const [evidenceDescription, setEvidenceDescription] = useState("");

  const loadSession = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const access = data.session?.access_token || "";
    setToken(access);
    return access;
  }, [supabase]);

  const load = useCallback(async (access?: string) => {
    const bearer = access || token || await loadSession();
    if (!bearer) {
      setState(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    const response = await fetch(`/api/agent-actions?agent=${encodeURIComponent(agentSlug)}`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${bearer}` },
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload?.error || "No se pudo leer el entorno de acción.");
      setState(EMPTY);
    } else {
      setState(payload);
      const firstMission = payload.missions?.[0]?.mission_code || "";
      if (!missionCode && firstMission) setMissionCode(firstMission);
      const firstGrant = payload.grants?.[0]?.action_key;
      if (firstGrant && !payload.grants.some((g:any)=>g.action_key===actionKey)) setActionKey(firstGrant);
      setMessage("");
    }
    setLoading(false);
  }, [actionKey, agentSlug, loadSession, missionCode, token]);

  useEffect(() => {
    void loadSession().then((access) => load(access));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const access = session?.access_token || "";
      setToken(access);
      if (access) void load(access);
    });
    return () => subscription.subscription.unsubscribe();
  }, [agentSlug]);

  async function sendMagicLink() {
    if (!email.trim()) return;
    setMessage("Enviando acceso…");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.href },
    });
    setMessage(error ? error.message : "Revisa tu correo y vuelve desde el enlace de acceso.");
  }

  async function post(body: any) {
    const bearer = token || await loadSession();
    if (!bearer) throw new Error("Debes iniciar sesión.");
    const response = await fetch("/api/agent-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${bearer}` },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error || "La operación no pudo completarse.");
    return payload;
  }

  function buildPayload() {
    if (actionKey === "stage.diagnosis.record" || actionKey === "mission.create") {
      return {
        stage_key: stageKey || "transversal",
        title: title.trim(),
        problem_statement: problem.trim(),
        diagnosis: detail.trim(),
        expected_outcome: "",
        priority: "normal",
      };
    }
    if (actionKey === "agent.assign") {
      return { mission_code: missionCode, assigned_agent_slug: detail.trim() };
    }
    if (actionKey === "evidence.request") {
      return {
        mission_code: missionCode,
        requirement_key: requirementKey.trim(),
        description: evidenceDescription.trim(),
        evidence_type: "proof",
      };
    }
    if (actionKey === "stage.escalate" || actionKey === "stage.block_scale") {
      return { mission_code: missionCode, reason: detail.trim() };
    }
    if (actionKey === "stage.verify") {
      return { mission_code: missionCode, note: detail.trim() };
    }
    return {};
  }

  async function propose() {
    try {
      setMessage("Creando propuesta…");
      const payload = buildPayload();
      if ((actionKey === "stage.diagnosis.record" || actionKey === "mission.create") && (!title.trim() || !problem.trim())) {
        throw new Error("Faltan título y problema.");
      }
      if (["agent.assign","evidence.request","stage.escalate","stage.block_scale","stage.verify"].includes(actionKey) && !missionCode) {
        throw new Error("Selecciona una misión.");
      }
      await post({
        op: "propose",
        agentSlug,
        actionKey,
        entityType: businessId ? "business" : null,
        globalId: businessId || null,
        payload,
        idempotencyKey: `${agentSlug}:${actionKey}:${Date.now()}`,
      });
      setMessage("Propuesta enviada a aprobación.");
      await load();
    } catch (error:any) {
      setMessage(error?.message || "No se pudo proponer.");
    }
  }

  async function decide(commandId: string, decision: "approve" | "reject") {
    try {
      setMessage(decision === "approve" ? "Aprobando y ejecutando…" : "Rechazando…");
      await post({ op: "decide", commandId, decision });
      setMessage(decision === "approve" ? "Acción ejecutada y auditada." : "Propuesta rechazada.");
      await load();
    } catch (error:any) {
      setMessage(error?.message || "No se pudo decidir.");
      await load();
    }
  }

  if (!token) {
    return (
      <section className="surface agent-action-console">
        <div className="section-head"><div><small>ACCIÓN</small><h2>Entrar para autorizar</h2></div></div>
        <p className="body-copy">La observación es pública para este panel, pero las mutaciones de agentes exigen una sesión LINK activa.</p>
        <div className="action-login">
          <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Correo LINK" type="email" />
          <button className="sync-button" onClick={sendMagicLink}>Enviar acceso</button>
        </div>
        {message ? <small className="last-line">{message}</small> : null}
      </section>
    );
  }

  const pending = state.commands.filter((c:any)=>c.approval_status==="pending" && c.status==="pending");
  const canApprove = ["owner","admin"].includes(String(state.role || ""));

  return (
    <section className="surface span-2 agent-action-console">
      <div className="section-head">
        <div><small>ACCIÓN</small><h2>Sistema nervioso de {agentName}</h2></div>
        <p>{state.grants.length} acciones gobernadas · {pending.length} pendientes</p>
      </div>

      <div className="action-grants">
        {state.grants.map((grant:any)=>(
          <button
            key={grant.action_key}
            className={actionKey===grant.action_key ? "is-active" : ""}
            onClick={()=>setActionKey(grant.action_key)}
          >
            <b>{actionLabel(grant.action_key)}</b>
            <small>{grant.autonomy_level} · {grant.approval_required ? "requiere aprobación" : "acotada"}</small>
          </button>
        ))}
      </div>

      <div className="action-builder">
        <label>
          <span>Acción</span>
          <select value={actionKey} onChange={(e)=>setActionKey(e.target.value)}>
            {state.grants.map((g:any)=><option value={g.action_key} key={g.action_key}>{actionLabel(g.action_key)}</option>)}
          </select>
        </label>

        {(actionKey==="stage.diagnosis.record" || actionKey==="mission.create") ? (
          <>
            <label>
              <span>Negocio / célula</span>
              <select value={businessId} onChange={(e)=>setBusinessId(e.target.value)}>
                <option value="">Transversal / sin negocio</option>
                {businesses.map((b)=><option key={b.global_id} value={b.global_id}>{b.label || b.slug || b.global_id}</option>)}
              </select>
            </label>
            <label><span>Título</span><input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Qué hay que resolver" /></label>
            <label className="span-2"><span>Problema observado</span><textarea value={problem} onChange={(e)=>setProblem(e.target.value)} placeholder="Describe el cuello de botella usando evidencia real." /></label>
            <label className="span-2"><span>Diagnóstico</span><textarea value={detail} onChange={(e)=>setDetail(e.target.value)} placeholder="Qué indica la evidencia y qué función parece necesaria." /></label>
          </>
        ) : (
          <>
            <label>
              <span>Misión</span>
              <select value={missionCode} onChange={(e)=>setMissionCode(e.target.value)}>
                <option value="">Seleccionar…</option>
                {state.missions.map((m:any)=><option key={m.id} value={m.mission_code}>{m.mission_code} · {m.title}</option>)}
              </select>
            </label>
            {actionKey==="evidence.request" ? (
              <>
                <label><span>Clave de evidencia</span><input value={requirementKey} onChange={(e)=>setRequirementKey(e.target.value)} /></label>
                <label className="span-2"><span>Qué prueba necesitamos</span><textarea value={evidenceDescription} onChange={(e)=>setEvidenceDescription(e.target.value)} placeholder="Pantallazo, evento, métrica, registro, etc." /></label>
              </>
            ) : (
              <label className="span-2"><span>{actionKey==="agent.assign" ? "Slug del agente a asignar" : "Razón / nota"}</span><textarea value={detail} onChange={(e)=>setDetail(e.target.value)} /></label>
            )}
          </>
        )}

        <div className="action-submit span-2">
          <button className="sync-button" onClick={propose}>Proponer acción</button>
          <small>No ejecuta todavía: crea un comando pendiente de aprobación.</small>
        </div>
      </div>

      {message ? <div className="agentic-alert"><span>{message}</span></div> : null}

      <div className="action-columns">
        <div>
          <h3>Decisiones pendientes</h3>
          <div className="memory-list">
            {pending.map((command:any)=>(
              <div className="memory-row action-command" key={command.id}>
                <div><b>{actionLabel(command.action_key)}</b><small>{command.global_id || "transversal"} · {new Date(command.requested_at).toLocaleString("es-CL")}</small></div>
                {canApprove ? <span className="decision-buttons"><button onClick={()=>decide(command.id,"approve")}>Aprobar</button><button onClick={()=>decide(command.id,"reject")}>Rechazar</button></span> : <span>Pendiente</span>}
              </div>
            ))}
            {!pending.length && <div className="empty-state">No hay decisiones pendientes.</div>}
          </div>
        </div>

        <div>
          <h3>Misiones</h3>
          <div className="memory-list">
            {state.missions.slice(0,8).map((mission:any)=>(
              <div className="memory-row" key={mission.id}>
                <div><b>{mission.title}</b><small>{mission.mission_code} · {mission.stage_key}</small></div>
                <span>{mission.status}</span>
              </div>
            ))}
            {!state.missions.length && <div className="empty-state">Este agente todavía no creó misiones.</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
