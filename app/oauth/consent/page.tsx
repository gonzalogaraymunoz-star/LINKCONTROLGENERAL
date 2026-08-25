"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createClient, type User } from "@supabase/supabase-js";

const SUPABASE_URL = "https://zgbnjlrxzvzpigmwidsp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_RE_eqhBaLeaUMHuBjLUY2Q_OZNBm9_A";

type AuthorizationDetails = {
  authorization_id?: string;
  redirect_url?: string;
  redirect_uri?: string;
  scope?: string;
  client?: { name?: string };
};

export default function OAuthConsentPage() {
  const supabase = useMemo(() => createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  }), []);

  const [authorizationId, setAuthorizationId] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    const { data: userData } = await supabase.auth.getUser();
    setUser(userData.user ?? null);
    if (!userData.user) {
      setLoading(false);
      return;
    }

    const oauth = supabase.auth.oauth;
    const { data, error: detailsError } = await oauth.getAuthorizationDetails(id);
    if (detailsError) {
      setError(detailsError.message);
      setLoading(false);
      return;
    }

    const authDetails = data as AuthorizationDetails;
    if (!authDetails.authorization_id && authDetails.redirect_url) {
      window.location.assign(authDetails.redirect_url);
      return;
    }
    setDetails(authDetails);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const id = new URL(window.location.href).searchParams.get("authorization_id") || "";
    setAuthorizationId(id);
    if (!id) {
      setError("Falta authorization_id. Inicia la conexión desde ChatGPT.");
      setLoading(false);
      return;
    }
    void load(id);
  }, [load]);

  async function sendMagicLink(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || !authorizationId) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    const redirectTo = `${window.location.origin}/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`;
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });
    if (otpError) setError(otpError.message);
    else setMessage("Te enviamos un enlace de acceso. Ábrelo y volverás a esta autorización.");
    setBusy(false);
  }

  async function decide(decision: "approve" | "deny") {
    if (!authorizationId) return;
    setBusy(true);
    setError(null);
    const oauth = supabase.auth.oauth;
    const response = decision === "approve"
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (response.error) {
      setError(response.error.message);
      setBusy(false);
      return;
    }
    if (response.data?.redirect_url) window.location.assign(response.data.redirect_url);
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f4f4f1", padding: 24, color: "#1d1d1f" }}>
      <section style={{ width: "min(520px, 100%)", background: "white", border: "1px solid #e1e1dc", borderRadius: 22, padding: 28, boxShadow: "0 24px 70px rgba(20,20,20,.08)" }}>
        <div style={{ width: 42, height: 42, borderRadius: 13, background: "#1d1d1f", color: "white", display: "grid", placeItems: "center", fontWeight: 800, marginBottom: 20 }}>LC</div>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".12em", color: "#777", marginBottom: 7 }}>Autorización segura</div>
        <h1 style={{ margin: 0, fontSize: 28, letterSpacing: "-.04em" }}>LINK CONTROL CENTRAL</h1>
        <p style={{ color: "#676763", lineHeight: 1.55, margin: "10px 0 22px" }}>ChatGPT está solicitando acceso mediante OAuth. La identidad se valida en Supabase y los permisos se resuelven dentro de CONTROL CENTRAL.</p>

        {loading ? <p>Verificando sesión…</p> : null}
        {error ? <div style={{ padding: 12, borderRadius: 12, background: "#fff0ef", color: "#9b3d37", marginBottom: 14 }}>{error}</div> : null}
        {message ? <div style={{ padding: 12, borderRadius: 12, background: "#eef7ef", color: "#3d7048", marginBottom: 14 }}>{message}</div> : null}

        {!loading && !user && authorizationId ? (
          <form onSubmit={sendMagicLink} style={{ display: "grid", gap: 10 }}>
            <label style={{ fontSize: 12, color: "#666" }}>Correo autorizado</label>
            <input type="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="tu@correo.com" style={{ border: "1px solid #d9d9d3", borderRadius: 12, padding: "12px 13px", fontSize: 15 }} />
            <button disabled={busy} style={{ border: 0, borderRadius: 12, padding: "12px 14px", background: "#1d1d1f", color: "white", fontWeight: 700, cursor: "pointer" }}>{busy ? "Enviando…" : "Entrar con enlace seguro"}</button>
          </form>
        ) : null}

        {!loading && user && details ? (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ border: "1px solid #e4e4df", borderRadius: 15, padding: 15, background: "#fafaf8" }}>
              <strong style={{ display: "block", marginBottom: 6 }}>{details.client?.name || "ChatGPT"}</strong>
              <span style={{ display: "block", fontSize: 12, color: "#666" }}>Sesión: {user.email || user.id}</span>
              <span style={{ display: "block", fontSize: 12, color: "#666", marginTop: 5 }}>Permisos solicitados: {details.scope || "email"}</span>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.5, color: "#555", margin: 0 }}>Autorizar permite que ChatGPT use las herramientas MCP publicadas por CONTROL CENTRAL. Los permisos de negocio siguen dependiendo del rol y scope asignados en LINK.</p>
            <div style={{ display: "flex", gap: 9, justifyContent: "flex-end" }}>
              <button disabled={busy} onClick={() => void decide("deny")} style={{ border: "1px solid #d7d7d2", borderRadius: 11, padding: "10px 13px", background: "white", cursor: "pointer" }}>Denegar</button>
              <button disabled={busy} onClick={() => void decide("approve")} style={{ border: 0, borderRadius: 11, padding: "10px 14px", background: "#1d1d1f", color: "white", fontWeight: 700, cursor: "pointer" }}>{busy ? "Procesando…" : "Autorizar ChatGPT"}</button>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
