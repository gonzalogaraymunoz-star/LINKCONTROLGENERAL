"use client";

import { useEffect, useMemo, useState } from "react";
import { Sheet } from "@/components/ui/LinkPrimitives";

type Capability = {
  id: string;
  service: string;
  label: string;
  description: string;
  available: boolean;
  mode: "read";
  reason?: string;
};

type GatewayRegistry = {
  ok: boolean;
  gatewayReady: boolean;
  generatedAt: string;
  mode: string;
  capabilities: Capability[];
};

type GatewayResult = {
  ok: boolean;
  result?: Record<string, unknown>;
  error?: string;
  audited?: boolean;
};

const ROOT_CONTROL_ID = "00000000-0000-0000-0000-000000000001";

export default function ControlActionsButton() {
  const [open, setOpen] = useState(false);
  const [registry, setRegistry] = useState<GatewayRegistry | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [result, setResult] = useState<GatewayResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadRegistry() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/gateway", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error || `HTTP ${response.status}`);
      setRegistry(body as GatewayRegistry);
    } catch (err) {
      setRegistry(null);
      setError(err instanceof Error ? err.message : "No fue posible leer el Gateway");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) void loadRegistry();
  }, [open]);

  const active = useMemo(() => registry?.capabilities.filter(item => item.available) ?? [], [registry]);
  const inactive = useMemo(() => registry?.capabilities.filter(item => !item.available) ?? [], [registry]);

  async function run(capability: Capability) {
    setRunning(capability.id);
    setLastAction(capability.id);
    setResult(null);
    setError(null);
    try {
      const response = await fetch("/api/gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: {
            actorId: "link-control-admin-ui",
            actorType: "human",
            controlId: ROOT_CONTROL_ID,
            scope: "root",
            action: capability.id,
            resource: capability.service,
          },
        }),
      });
      const body = (await response.json()) as GatewayResult;
      setResult(body);
      if (!response.ok || !body.ok) throw new Error(body.error || `HTTP ${response.status}`);
      await loadRegistry();
    } catch (err) {
      setError(err instanceof Error ? err.message : "La acción no pudo completarse");
    } finally {
      setRunning(null);
    }
  }

  return (
    <>
      <button className="dockAction" onClick={() => setOpen(true)}>
        <span>⌁</span><div><strong>Entorno</strong><small>Acciones reales</small></div>
      </button>

      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Centro de acciones"
        description="Solo aparecen botones cuya ejecución real está disponible y deja auditoría en LINK CONTROL CENTRAL."
      >
        <div className="controlActionsPanel">
          <section className="actionsGatewayHead">
            <div className={`gatewayState ${registry?.gatewayReady ? "ok" : "off"}`}><span />
              <div><strong>{registry?.gatewayReady ? "Gateway operativo" : "Gateway bloqueado"}</strong><small>{registry?.gatewayReady ? "Ejecución + auditoría central" : "No se publican acciones sin auditoría"}</small></div>
            </div>
            <button className="btn" onClick={() => void loadRegistry()} disabled={loading}>{loading ? "Revisando…" : "Actualizar"}</button>
          </section>

          {error ? <div className="actionsError">{error}</div> : null}

          <section className="actionsSection">
            <div className="actionsTitle"><span>01</span><div><strong>Acciones disponibles</strong><small>Botones conectados al Gateway real</small></div></div>
            <div className="actionGrid">
              {active.map(item => (
                <button key={item.id} className="realActionCard" onClick={() => void run(item)} disabled={running !== null}>
                  <span className={`serviceBadge ${item.service}`}>{serviceMark(item.service)}</span>
                  <div><strong>{running === item.id ? "Ejecutando…" : item.label}</strong><small>{item.description}</small></div>
                  <em>→</em>
                </button>
              ))}
              {!loading && active.length === 0 ? <div className="actionsEmpty">No hay acciones publicables en este momento.</div> : null}
            </div>
          </section>

          {result && lastAction ? (
            <section className={`actionResult ${result.ok ? "ok" : "error"}`}>
              <div className="actionResultHead"><strong>{result.ok ? "Acción verificada" : "Acción fallida"}</strong><span>{lastAction}</span></div>
              <ResultBody result={result} />
              {result.audited ? <small className="auditSeal">✓ evento guardado en auditoría central</small> : null}
            </section>
          ) : null}

          <section className="actionsSection muted">
            <div className="actionsTitle"><span>02</span><div><strong>Conexiones todavía no publicables</strong><small>Se muestran como diagnóstico, nunca como botones falsos</small></div></div>
            <div className="inactiveConnections">
              {inactive.map(item => (
                <div key={item.id} className="inactiveConnection"><span className={`serviceBadge ${item.service}`}>{serviceMark(item.service)}</span><div><strong>{item.label}</strong><small>{item.reason || "La conexión todavía no está habilitada."}</small></div></div>
              ))}
              {!loading && inactive.length === 0 ? <div className="allConnected">Todas las conexiones registradas están disponibles.</div> : null}
            </div>
          </section>
        </div>
      </Sheet>
    </>
  );
}

function serviceMark(service: string) {
  if (service === "github") return "GH";
  if (service === "vercel") return "V";
  if (service === "supabase") return "S";
  return "LC";
}

function ResultBody({ result }: { result: GatewayResult }) {
  if (!result.ok) return <p>{result.error || "La acción no pudo completarse."}</p>;
  const data = result.result || {};
  if (typeof data.summary === "string") {
    return (
      <div className="attentionResult">
        <strong>{data.summary}</strong>
        <ResultRows label="Vencidos" value={data.overdue} />
        <ResultRows label="Próximos" value={data.upcoming} />
      </div>
    );
  }
  return <div className="resultFacts">{Object.entries(data).filter(([, value]) => value !== null && typeof value !== "object").map(([key, value]) => <div key={key}><span>{humanize(key)}</span><strong>{String(value)}</strong></div>)}</div>;
}

function ResultRows({ label, value }: { label: string; value: unknown }) {
  if (!Array.isArray(value) || value.length === 0) return null;
  return <div className="attentionRows"><span>{label}</span>{value.slice(0, 5).map((item, index) => {
    const row = item as { title?: string; due_at?: string };
    return <div key={`${row.title || "item"}-${index}`}><strong>{row.title || "Trabajo"}</strong><small>{row.due_at ? new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short" }).format(new Date(row.due_at)) : "Sin fecha"}</small></div>;
  })}</div>;
}

function humanize(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, letter => letter.toUpperCase());
}
