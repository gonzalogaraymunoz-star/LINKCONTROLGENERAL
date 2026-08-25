"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/LinkPrimitives";

type Complement = {
  id?: string;
  name: string;
  slug?: string;
  scope: string;
  panelUrl: string;
  mcpEndpoint: string;
  dataSource: string;
  mode: string;
  stage?: string | null;
  progress?: number;
  accent?: string | null;
};

type Registry = {
  ok: boolean;
  central: Complement & { writeStatus?: string };
  controls: Complement[];
  tools: string[];
  protocol: {
    transport: string;
    endpointRule: string;
    readMode: string;
    writeMode: string;
  };
  generatedAt: string;
};

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export default function ComplementsDock() {
  const [open, setOpen] = useState(false);
  const [registry, setRegistry] = useState<Registry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/complements", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error || `HTTP ${response.status}`);
      setRegistry(body as Registry);
    } catch (err) {
      setRegistry(null);
      setError(err instanceof Error ? err.message : "No fue posible leer los complementos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) void load();
  }, [open]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 1800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function copy(value: string, message: string) {
    await copyText(value);
    setNotice(message);
  }

  function protocolText(endpoint: string, scope: string) {
    return [
      "LINK CONTROL — PROTOCOLO CHATGPT / MCP",
      `Scope: ${scope}`,
      `Endpoint: ${endpoint}`,
      "Transporte: Remote MCP over HTTPS",
      "Datos: Supabase real",
      "Modo actual: solo lectura",
      "Herramientas: get_scope, health, search_clients, get_client_360, list_work_items, list_activity",
      "Regla: confirmar scope antes de consultar información.",
      "Escritura: deshabilitada hasta implementar autorización autenticada/OAuth.",
    ].join("\n");
  }

  return (
    <>
      <button className="complementsFab" onClick={() => setOpen(true)}>
        <span>⌁</span>
        <span><strong>Complementos</strong><small>ChatGPT · MCP</small></span>
      </button>

      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Complementos"
        description="Endpoints MCP reales construidos desde los Controles existentes en Supabase."
        footer={<div className="complementFoot"><span>{registry ? `Actualizado ${new Date(registry.generatedAt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}` : ""}</span><button className="btn" onClick={() => void load()} disabled={loading}>{loading ? "Comprobando…" : "↻ Comprobar"}</button></div>}
      >
        {notice ? <div className="complementNotice">{notice}</div> : null}
        {error ? <div className="errorInline">{error}</div> : null}
        {loading && !registry ? <div className="complementEmpty">Consultando Supabase…</div> : null}

        {registry ? (
          <div className="complementStack">
            <section className="complementProtocol">
              <div className="complementEyebrow">PROTOCOLO</div>
              <h3>ChatGPT ↔ LINK CONTROL</h3>
              <div className="protocolFlow">
                <span>ChatGPT</span><b>→</b><span>MCP</span><b>→</b><span>Scope</span><b>→</b><span>Supabase</span>
              </div>
              <p><strong>Lectura:</strong> activa y real. <strong>Escritura:</strong> bloqueada hasta autorización autenticada.</p>
              <div className="toolChips">{registry.tools.map(tool => <span key={tool}>{tool}</span>)}</div>
            </section>

            <ComplementCard
              item={registry.central}
              primary
              onCopyEndpoint={() => void copy(registry.central.mcpEndpoint, "Endpoint Central copiado")}
              onCopyProtocol={() => void copy(protocolText(registry.central.mcpEndpoint, registry.central.scope), "Protocolo Central copiado")}
            />

            <div className="complementSectionTitle">Controles con endpoint propio</div>
            {registry.controls.map(item => (
              <ComplementCard
                key={item.id || item.scope}
                item={item}
                onCopyEndpoint={() => void copy(item.mcpEndpoint, `${item.name}: endpoint copiado`)}
                onCopyProtocol={() => void copy(protocolText(item.mcpEndpoint, item.scope), `${item.name}: protocolo copiado`)}
              />
            ))}

            <section className="connectSteps">
              <div className="complementEyebrow">CONEXIÓN EN CHATGPT</div>
              <ol>
                <li>Abre la configuración de Apps de ChatGPT y habilita el modo desarrollador si tu plan/workspace lo permite.</li>
                <li>Crea una app personalizada MCP.</li>
                <li>Pega el endpoint copiado del Central o del Control específico.</li>
                <li>Ejecuta el análisis de herramientas.</li>
                <li>Comprueba primero <code>get_scope</code> y luego <code>health</code>.</li>
                <li>Usa consultas reales; las escrituras permanecen deshabilitadas hasta OAuth.</li>
              </ol>
            </section>
          </div>
        ) : null}
      </Sheet>
    </>
  );
}

function ComplementCard({ item, primary = false, onCopyEndpoint, onCopyProtocol }: {
  item: Complement;
  primary?: boolean;
  onCopyEndpoint: () => void;
  onCopyProtocol: () => void;
}) {
  return (
    <section className={`complementCard ${primary ? "primaryComplement" : ""}`}>
      <div className="complementCardHead">
        <div className="complementIdentity">
          <i style={{ background: item.accent || (primary ? "#1d1d1f" : "#777") }} />
          <div><strong>{item.name}</strong><small>scope: {item.scope}</small></div>
        </div>
        <span className="liveBadge">LIVE · READ</span>
      </div>
      <div className="endpointBox"><code>{item.mcpEndpoint}</code></div>
      {item.stage ? <div className="complementMeta"><span>Etapa: {item.stage}</span><span>{item.progress ?? 0}%</span></div> : null}
      <div className="complementActions">
        <button className="btn primary" onClick={onCopyEndpoint}>Copiar endpoint</button>
        <button className="btn" onClick={onCopyProtocol}>Copiar protocolo</button>
        <a className="btn" href={item.panelUrl}>Abrir Control</a>
      </div>
    </section>
  );
}
