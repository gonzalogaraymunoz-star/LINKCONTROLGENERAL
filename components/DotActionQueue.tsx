"use client";

import { useEffect, useMemo, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser";

type Row = Record<string, any>;

function label(status: string) {
  const map: Record<string,string> = {
    queued: "En cola",
    processing: "Trabajando",
    retry_wait: "Reintentando",
    blocked: "Bloqueado",
    awaiting_approval: "Necesita tu decisión",
  };
  return map[status] || status;
}

export default function DotActionQueue({
  workQueue,
  commands,
}: {
  workQueue: Row[];
  commands: Row[];
}) {
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState<string>("");
  const [message, setMessage] = useState("");

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

  async function decide(commandId: string, decision: "approve" | "reject") {
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
      setMessage(decision === "approve" ? "Aprobado. LINK continúa." : "Rechazado. LINK no ejecutará esa acción.");
      window.setTimeout(() => window.location.reload(), 650);
    } catch (error: any) {
      setMessage(error?.message || "No se pudo decidir.");
    } finally {
      setBusy("");
    }
  }

  const rows = workQueue.slice(0, 8);
  if (!rows.length) {
    return (
      <div style={{padding:"18px",border:"1px solid #ebe9e4",borderRadius:14,background:"#fff"}}>
        <b style={{fontSize:13}}>Sin trabajo que requiera intervención</b>
        <p style={{fontSize:10,color:"#92939a",margin:"6px 0 0"}}>El DOT sigue observando señales reales. No fabricamos tareas para mantenerlo ocupado.</p>
      </div>
    );
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {rows.map((work) => {
        const command = work.command_id
          ? commands.find((item) => String(item.id) === String(work.command_id))
          : null;
        const needsDecision = work.status === "awaiting_approval" && command;
        const isBlocked = work.status === "blocked";
        return (
          <article key={work.id} style={{
            border:"1px solid " + (isBlocked ? "#ead3ce" : needsDecision ? "#e9dcc1" : "#e7e6e1"),
            background:isBlocked ? "#fff8f6" : needsDecision ? "#fffaf1" : "#fff",
            borderRadius:13,
            padding:"13px 14px",
            display:"grid",
            gridTemplateColumns:"minmax(0,1fr) auto",
            gap:14,
            alignItems:"center",
          }}>
            <div>
              <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:5}}>
                <span style={{fontSize:8,fontWeight:750,letterSpacing:".11em",color:"#909199"}}>{String(work.stage_key || "LINK").toUpperCase()}</span>
                <span style={{fontSize:8,padding:"3px 7px",borderRadius:999,border:"1px solid #e1e0da",background:"#fafaf8"}}>{label(String(work.status))}</span>
              </div>
              <b style={{display:"block",fontSize:11}}>{work.reason || "Trabajo de LINK"}</b>
              {isBlocked && work.last_error ? (
                <small style={{display:"block",fontSize:8,lineHeight:1.45,color:"#9a665f",marginTop:5}}>{work.last_error}</small>
              ) : (
                <small style={{display:"block",fontSize:8,color:"#999aa2",marginTop:5}}>
                  Intento {Number(work.attempt_count || 0)} de {Number(work.max_attempts || 0)}
                  {work.status === "retry_wait" ? " · recuperación automática activa" : ""}
                </small>
              )}
            </div>

            <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
              {needsDecision ? (
                token ? (
                  <>
                    <button
                      disabled={Boolean(busy)}
                      onClick={() => void decide(command.id, "reject")}
                      style={{height:34,border:"1px solid #dddcd7",background:"#fff",borderRadius:9,padding:"0 10px",fontSize:9,cursor:"pointer"}}
                    >
                      {busy === command.id + ":reject" ? "…" : "Rechazar"}
                    </button>
                    <button
                      disabled={Boolean(busy)}
                      onClick={() => void decide(command.id, "approve")}
                      style={{height:34,border:"1px solid #292a2f",background:"#292a2f",color:"#fff",borderRadius:9,padding:"0 11px",fontSize:9,fontWeight:700,cursor:"pointer"}}
                    >
                      {busy === command.id + ":approve" ? "Aprobando…" : "Aprobar"}
                    </button>
                  </>
                ) : (
                  <a href="/dots/link-director" style={{fontSize:9,color:"#6775a9",textDecoration:"none"}}>Entrar para decidir →</a>
                )
              ) : (
                <a href="?tab=trabajo" style={{fontSize:9,color:"#6775a9",textDecoration:"none"}}>Abrir trabajo →</a>
              )}
            </div>
          </article>
        );
      })}
      {message ? <div style={{fontSize:9,color:"#5c725f",padding:"5px 2px"}}>{message}</div> : null}
    </div>
  );
}
