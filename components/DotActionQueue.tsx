"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/browser";

type Row = Record<string, any>;

const SLA_MINUTES: Record<string, number> = {
  critical: 30,
  high: 60,
  normal: 180,
  low: 480,
};

function label(status: string) {
  const map: Record<string,string> = {
    queued: "Por empezar",
    processing: "En ejecución",
    retry_wait: "Reintentando",
    blocked: "Bloqueado",
    awaiting_approval: "Esperando tu decisión",
  };
  return map[status] || status;
}

function stageLabel(value?: string | null) {
  const map: Record<string,string> = {
    marketing_rrss: "Marketing",
    marketing: "Marketing",
    ventas: "Ventas",
    cierre: "Cierre",
    onboarding: "Onboarding",
    entrega: "Entrega",
    postventa: "Postventa",
  };
  return map[String(value || "").toLowerCase()] || String(value || "LINK").replaceAll("_", " ");
}

function timeOnly(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function shortDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function addMinutes(value: string | null | undefined, minutes: number) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getTime() + minutes * 60_000);
}

function durationLabel(ms: number) {
  const totalMinutes = Math.max(0, Math.round(ms / 60_000));
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!minutes) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

function timing(work: Row, now: Date) {
  const priority = String(work.priority || "normal").toLowerCase();
  const targetMinutes = SLA_MINUTES[priority] ?? SLA_MINUTES.normal;
  const due = addMinutes(work.created_at, targetMinutes);
  if (!due) {
    return {
      due: null,
      label: "Sin hora objetivo",
      tone: "neutral",
      detail: "Este trabajo no tiene una hora de entrada válida.",
    };
  }

  const remaining = due.getTime() - now.getTime();
  if (remaining < 0) {
    return {
      due,
      label: "Atrasado",
      tone: "late",
      detail: `lleva ${durationLabel(Math.abs(remaining))} fuera del objetivo`,
    };
  }
  if (remaining <= 30 * 60_000) {
    return {
      due,
      label: "Por vencer",
      tone: "soon",
      detail: `quedan ${durationLabel(remaining)}`,
    };
  }
  return {
    due,
    label: "A tiempo",
    tone: "ok",
    detail: `quedan ${durationLabel(remaining)}`,
  };
}

function plainAction(command: Row | null, work: Row) {
  const key = String(command?.action_key || "");
  if (key === "evidence.request") {
    return {
      title: "Falta una prueba para poder avanzar",
      description: "El DOT ya revisó el caso, pero necesita una evidencia concreta antes de cambiar de etapa. Revisa qué respaldo falta y decide cómo obtenerlo.",
    };
  }
  if (key === "stage.diagnosis.record") {
    return {
      title: "Registrar qué está frenando el caso",
      description: "El DOT encontró una causa probable del bloqueo y quiere dejarla registrada para que el siguiente ciclo no empiece de cero.",
    };
  }
  if (key === "stage.escalate") {
    return {
      title: "Resolver un bloqueo que ya lleva demasiado tiempo",
      description: "El DOT agotó el trabajo interno seguro y necesita que una persona destrabe la dependencia o confirme cómo seguir.",
    };
  }
  if (key === "stage.verify") {
    return {
      title: "Confirmar que esta etapa realmente quedó resuelta",
      description: "El DOT cree que el criterio de salida está cumplido, pero antes de avanzar necesita una verificación basada en evidencia.",
    };
  }

  if (work.status === "processing") {
    return {
      title: "El DOT está trabajando ahora",
      description: "La tarea está siendo procesada. No necesita intervención mientras siga avanzando.",
    };
  }
  if (work.status === "retry_wait") {
    return {
      title: "El sistema está intentando recuperarse",
      description: "La tarea tuvo un problema temporal y está programada para reintentarse automáticamente.",
    };
  }
  if (work.status === "blocked") {
    return {
      title: "Hay un bloqueo que impide avanzar",
      description: "El DOT no puede cambiar el estado con la información o permisos disponibles. Revisa la causa antes de volver a intentar.",
    };
  }
  if (work.status === "queued") {
    return {
      title: "Trabajo listo para comenzar",
      description: "La señal ya fue recibida y está esperando su turno de ejecución.",
    };
  }
  return {
    title: "Trabajo pendiente de LINK",
    description: "Hay una tarea viva que todavía no llegó a un estado final.",
  };
}

function promptForWork({
  work,
  command,
  simple,
  timingInfo,
}: {
  work: Row;
  command: Row | null;
  simple: { title: string; description: string };
  timingInfo: ReturnType<typeof timing>;
}) {
  const technicalDetail =
    typeof command?.payload?.description === "string" ? command.payload.description :
    typeof command?.payload?.reason === "string" ? command.payload.reason :
    typeof command?.payload?.problem_statement === "string" ? command.payload.problem_statement :
    work.last_error || work.reason || "Sin detalle adicional.";

  return [
    "Trabajemos este pendiente real de LINK ahora.",
    "",
    `DOT: ${stageLabel(work.stage_key)}`,
    `Actividad: ${simple.title}`,
    `Estado real: ${label(String(work.status))}`,
    `Prioridad: ${String(work.priority || "normal")}`,
    `Entró a la cola: ${shortDateTime(work.created_at)}`,
    `Último cambio: ${shortDateTime(work.updated_at)}`,
    `Objetivo de atención: ${timingInfo.due ? shortDateTime(timingInfo.due.toISOString()) : "sin hora"}`,
    `Situación temporal: ${timingInfo.label} · ${timingInfo.detail}`,
    `Work ID: ${work.id}`,
    command?.id ? `Command ID: ${command.id}` : "",
    command?.action_key ? `Acción propuesta: ${command.action_key}` : "",
    work.mission_id ? `Mission ID: ${work.mission_id}` : "",
    "",
    `Contexto simple: ${simple.description}`,
    `Detalle persistido: ${technicalDetail}`,
    "",
    "Usa Supabase como fuente viva. Verifica primero si este pendiente sigue abierto o ya se resolvió. Si ya se resolvió, confírmalo con evidencia y sácalo de la cola. Si sigue abierto, explícame en palabras simples qué falta y ejecuta solo las acciones internas, reversibles y ya autorizadas. No inventes pago, evidencia ni estado. Si requiere una decisión humana, dime exactamente qué debo decidir y qué cambia después.",
  ].filter(Boolean).join("\n");
}

export default function DotActionQueue({
  workQueue,
  commands,
}: {
  workQueue: Row[];
  commands: Row[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState<string>("");
  const [message, setMessage] = useState("");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string>("");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setToken(data.session?.access_token || "");
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setToken(session?.access_token || "");
    });
    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    const minute = window.setInterval(() => setNow(new Date()), 30_000);
    const refresh = window.setInterval(() => router.refresh(), 15_000);
    const onFocus = () => router.refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(minute);
      window.clearInterval(refresh);
      window.removeEventListener("focus", onFocus);
    };
  }, [router]);

  async function decide(commandId: string, workId: string, decision: "approve" | "reject") {
    if (!token || busy) return;
    setBusy(commandId + ":" + decision);
    setMessage("");
    try {
      const response = await fetch("/api/agent-actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ op: "decide", commandId, decision }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "No se pudo decidir.");
      setHidden((current) => new Set([...current, workId]));
      setMessage(decision === "approve" ? "Aprobado. El pendiente salió de esta vista y LINK continúa." : "Rechazado. El pendiente salió de esta vista y LINK no ejecutará esa acción.");
      window.setTimeout(() => router.refresh(), 250);
    } catch (error: any) {
      setMessage(error?.message || "No se pudo decidir.");
    } finally {
      setBusy("");
    }
  }

  async function copyPrompt(work: Row, command: Row | null, simple: ReturnType<typeof plainAction>, timingInfo: ReturnType<typeof timing>) {
    const prompt = promptForWork({ work, command, simple, timingInfo });
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(work.id);
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      setMessage("No pude copiar el prompt. Abre el trabajo y copia el contexto manualmente.");
    }
  }

  const rows = workQueue
    .filter((work) => !hidden.has(String(work.id)))
    .filter((work) => {
      if (work.status !== "awaiting_approval") return true;
      const command = work.command_id
        ? commands.find((item) => String(item.id) === String(work.command_id))
        : null;
      if (!command) return true;
      return !["approved", "rejected", "cancelled", "completed"].includes(String(command.approval_status || command.status));
    })
    .slice(0, 8);

  if (!rows.length) {
    return (
      <div style={{padding:"18px",border:"1px solid #ebe9e4",borderRadius:14,background:"#fff"}}>
        <b style={{fontSize:13}}>Sin trabajo que requiera intervención</b>
        <p style={{fontSize:10,color:"#92939a",margin:"6px 0 0"}}>Lo que se resolvió ya salió de aquí. El DOT sigue observando nuevas señales sin fabricar tareas.</p>
      </div>
    );
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {rows.map((work) => {
        const command = work.command_id
          ? commands.find((item) => String(item.id) === String(work.command_id))
          : null;
        const needsDecision = work.status === "awaiting_approval" && command;
        const isBlocked = work.status === "blocked";
        const simple = plainAction(command || null, work);
        const timingInfo = timing(work, now);
        const technicalDetail =
          typeof command?.payload?.description === "string" ? command.payload.description :
          typeof command?.payload?.reason === "string" ? command.payload.reason :
          typeof command?.payload?.problem_statement === "string" ? command.payload.problem_statement :
          work.last_error || work.reason || "";

        return (
          <article key={work.id} style={{
            border:"1px solid " + (isBlocked ? "#ead3ce" : needsDecision ? "#e9dcc1" : "#e7e6e1"),
            background:isBlocked ? "#fff8f6" : needsDecision ? "#fffaf1" : "#fff",
            borderRadius:14,
            padding:"14px 15px",
          }}>
            <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:14,alignItems:"start"}}>
              <div>
                <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap",marginBottom:7}}>
                  <span style={{fontSize:8,fontWeight:750,letterSpacing:".11em",color:"#909199"}}>
                    {stageLabel(work.stage_key).toUpperCase()}
                  </span>
                  <span style={{fontSize:8,padding:"3px 7px",borderRadius:999,border:"1px solid #e1e0da",background:"#fafaf8"}}>
                    {label(String(work.status))}
                  </span>
                  <span style={{
                    fontSize:8,padding:"3px 7px",borderRadius:999,
                    background:timingInfo.tone === "late" ? "#f8ece9" : timingInfo.tone === "soon" ? "#fff3dc" : timingInfo.tone === "ok" ? "#edf4ed" : "#f3f3f3",
                    color:timingInfo.tone === "late" ? "#9b5f55" : timingInfo.tone === "soon" ? "#96743d" : timingInfo.tone === "ok" ? "#718a75" : "#8d8e94",
                  }}>
                    {timingInfo.label}
                  </span>
                </div>

                <b style={{display:"block",fontSize:12,lineHeight:1.35}}>{simple.title}</b>
                <p style={{fontSize:9,lineHeight:1.55,color:"#777981",margin:"5px 0 0",maxWidth:760}}>
                  {simple.description}
                </p>

                <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:10,fontSize:8,color:"#93949b"}}>
                  <span><b style={{color:"#666870"}}>Entró</b> {timeOnly(work.created_at)}</span>
                  <span><b style={{color:"#666870"}}>Último cambio</b> {timeOnly(work.updated_at)}</span>
                  <span><b style={{color:"#666870"}}>Resolver antes de</b> {timingInfo.due ? timeOnly(timingInfo.due.toISOString()) : "—"}</span>
                  <span><b style={{color:"#666870"}}>Tiempo</b> {timingInfo.detail}</span>
                </div>

                <div style={{marginTop:10,padding:"9px 10px",borderRadius:10,background:"#f8f8f6",border:"1px solid #ecebe7"}}>
                  <small style={{display:"block",fontSize:7,fontWeight:750,letterSpacing:".08em",color:"#999aa1"}}>AVANCE REAL</small>
                  <b style={{display:"block",fontSize:9,marginTop:4}}>
                    {work.status === "awaiting_approval" ? "El análisis terminó. Falta tu decisión para poder continuar." :
                     work.status === "processing" ? "El DOT está ejecutando el trabajo ahora." :
                     work.status === "queued" ? "La señal está lista y todavía no comienza su ejecución." :
                     work.status === "retry_wait" ? "Falló un intento temporal y el sistema lo volverá a intentar." :
                     work.status === "blocked" ? "No puede avanzar hasta resolver la causa del bloqueo." :
                     label(String(work.status))}
                  </b>
                </div>

                {technicalDetail ? (
                  <details style={{marginTop:8}}>
                    <summary style={{fontSize:8,color:"#8c8d94",cursor:"pointer"}}>Ver detalle técnico</summary>
                    <small style={{display:"block",fontSize:8,lineHeight:1.5,color:"#8a8175",marginTop:6,maxWidth:820}}>
                      {technicalDetail}
                    </small>
                  </details>
                ) : null}
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"stretch",minWidth:136}}>
                {needsDecision ? (
                  token ? (
                    <>
                      <button
                        disabled={Boolean(busy)}
                        onClick={() => void decide(command.id, work.id, "approve")}
                        style={{height:34,border:"1px solid #292a2f",background:"#292a2f",color:"#fff",borderRadius:9,padding:"0 11px",fontSize:9,fontWeight:700,cursor:"pointer"}}
                      >
                        {busy === command.id + ":approve" ? "Aprobando…" : "Aprobar y seguir"}
                      </button>
                      <button
                        disabled={Boolean(busy)}
                        onClick={() => void decide(command.id, work.id, "reject")}
                        style={{height:34,border:"1px solid #dddcd7",background:"#fff",borderRadius:9,padding:"0 10px",fontSize:9,cursor:"pointer"}}
                      >
                        {busy === command.id + ":reject" ? "…" : "Rechazar"}
                      </button>
                    </>
                  ) : (
                    <a href="/dots/link-director" style={{fontSize:9,color:"#6775a9",textDecoration:"none",padding:"8px 0"}}>Entrar para decidir →</a>
                  )
                ) : (
                  <a href="?tab=trabajo" style={{fontSize:9,color:"#6775a9",textDecoration:"none",padding:"8px 0"}}>Abrir trabajo →</a>
                )}

                <button
                  onClick={() => void copyPrompt(work, command || null, simple, timingInfo)}
                  style={{height:34,border:"1px solid #d9dae0",background:"#f7f7fb",color:"#6574a7",borderRadius:9,padding:"0 10px",fontSize:8,fontWeight:650,cursor:"pointer"}}
                >
                  {copied === work.id ? "Prompt copiado ✓" : "Copiar prompt para ChatGPT"}
                </button>
              </div>
            </div>
          </article>
        );
      })}
      {message ? <div style={{fontSize:9,color:"#5c725f",padding:"5px 2px"}}>{message}</div> : null}
    </div>
  );
}
