"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser";

type ApprovalItem = {
  id: string;
  actor: string;
  actorName: string;
  actionKey: string;
  actionLabel: string;
  summary: string;
  requestedAt: string;
  globalId?: string | null;
};

type ApprovalState = {
  count: number;
  items: ApprovalItem[];
};

function relativeTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (!Number.isFinite(diff)) return "";
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short" }).format(date);
}

export default function CompactApprovals() {
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const [token, setToken] = useState("");
  const [publicCount, setPublicCount] = useState(0);
  const [state, setState] = useState<ApprovalState>({ count: 0, items: [] });
  const [busy, setBusy] = useState<"approve" | "reject" | "">("");
  const [message, setMessage] = useState("");

  const loadPublicCount = useCallback(async () => {
    try {
      const response = await fetch("/api/live-feed", { cache: "no-store" });
      const payload = await response.json();
      if (response.ok) setPublicCount(Number(payload?.engine?.pendingApprovals || 0));
    } catch {}
  }, []);

  const loadApprovals = useCallback(async (access: string) => {
    if (!access) return;
    const response = await fetch("/api/approvals", {
      cache: "no-store",
      headers: { Authorization: `Bearer ${access}` },
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error || "No se pudo leer la cola de aprobación.");
    setState({ count: Number(payload.count || 0), items: payload.items || [] });
    setPublicCount(Number(payload.count || 0));
  }, []);

  useEffect(() => {
    let active = true;
    void loadPublicCount();

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const access = data.session?.access_token || "";
      setToken(access);
      if (access) void loadApprovals(access).catch(() => {});
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const access = session?.access_token || "";
      setToken(access);
      if (access) void loadApprovals(access).catch(() => {});
    });

    const timer = setInterval(() => {
      void loadPublicCount();
      if (token) void loadApprovals(token).catch(() => {});
    }, 12000);

    return () => {
      active = false;
      clearInterval(timer);
      subscription.subscription.unsubscribe();
    };
  }, [loadApprovals, loadPublicCount, supabase, token]);

  async function decide(decision: "approve" | "reject") {
    const item = state.items[0];
    if (!item || !token || busy) return;

    setBusy(decision);
    setMessage("");
    try {
      const response = await fetch("/api/agent-actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ op: "decide", commandId: item.id, decision }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "No se pudo decidir.");
      setMessage(decision === "approve" ? "Aprobado." : "Rechazado.");
      await loadApprovals(token);
    } catch (error: any) {
      setMessage(error?.message || "No se pudo decidir.");
    } finally {
      setBusy("");
    }
  }

  if (!publicCount) return null;

  const item = state.items[0];

  if (!token || !item) {
    return (
      <section className="cc-approval-strip">
        <div className="cc-approval-dot" />
        <div className="cc-approval-copy">
          <span className="cc-eyebrow">NECESITAN DE TI</span>
          <b>{publicCount} decisión{publicCount === 1 ? "" : "es"} esperando revisión</b>
          <small>No bloqueamos la pantalla: entra cuando quieras decidir.</small>
        </div>
        <a href="/dots/link-director">Revisar →</a>
      </section>
    );
  }

  return (
    <section className="cc-approval-strip is-ready">
      <div className="cc-approval-dot" />
      <div className="cc-approval-copy">
        <span className="cc-eyebrow">NECESITA DE TI · 1 DE {state.count}</span>
        <b>{item.actorName} · {item.actionLabel}</b>
        <small>{item.summary} · {relativeTime(item.requestedAt)}</small>
      </div>

      <div className="cc-approval-actions">
        <button onClick={() => void decide("reject")} disabled={Boolean(busy)}>
          {busy === "reject" ? "Rechazando…" : "Rechazar"}
        </button>
        <button className="is-primary" onClick={() => void decide("approve")} disabled={Boolean(busy)}>
          {busy === "approve" ? "Aprobando…" : "Aprobar"}
        </button>
        <a href="/dots/link-director">Ver demás</a>
      </div>

      {message ? <span className="cc-approval-message">{message}</span> : null}
    </section>
  );
}
