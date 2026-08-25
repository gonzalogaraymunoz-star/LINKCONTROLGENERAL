"use client";

import { FormEvent, useEffect, useState } from "react";
import { Sheet } from "@/components/ui/LinkPrimitives";

type ServicePlan = { id: string; name: string; description?: string | null };
type Complement = { name: string; scope: string; panelUrl: string; mcpEndpoint: string; mode: string; stage?: string | null; progress?: number };
type Registry = { ok: boolean; central: Complement; controls: Complement[]; tools: string[]; protocol: { transport: string; endpointRule: string; readMode: string; writeMode: string } };

export default function OperationalDock() {
  const [clientOpen, setClientOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [plans, setPlans] = useState<ServicePlan[]>([]);
  const [registry, setRegistry] = useState<Registry | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadPlans() {
    const response = await fetch("/api/central", { cache: "no-store" });
    const body = await response.json();
    if (response.ok && body.ok) setPlans(body.servicePlans || []);
  }

  async function loadRegistry() {
    const response = await fetch("/api/complements", { cache: "no-store" });
    const body = await response.json();
    if (response.ok && body.ok) setRegistry(body as Registry);
  }

  useEffect(() => { if (clientOpen) void loadPlans(); }, [clientOpen]);
  useEffect(() => { if (chatOpen) void loadRegistry(); }, [chatOpen]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  return (
    <>
      <div className="operationalDock">
        <button className="dockAction primary" onClick={() => setClientOpen(true)}><span>＋</span><div><strong>Cliente</strong><small>Plan + estrategia</small></div></button>
        <button className="dockAction" onClick={() => setChatOpen(true)}><span>✦</span><div><strong>ChatGPT</strong><small>Protocolo MCP</small></div></button>
      </div>
      {notice ? <div className="dockNotice">{notice}</div> : null}

      <RealClientSheet open={clientOpen} onOpenChange={setClientOpen} plans={plans} onDone={(message) => { setNotice(message); window.setTimeout(() => window.location.reload(), 450); }} />
      <ChatGPTProtocolSheet open={chatOpen} onOpenChange={setChatOpen} registry={registry} onCopy={() => setNotice("Ruta copiada")} />
    </>
  );
}

function RealClientSheet({ open, onOpenChange, plans, onDone }: { open: boolean; onOpenChange: (value: boolean) => void; plans: ServicePlan[]; onDone: (message: string) => void }) {
  const [name, setName] = useState("");
  const [plan, setPlan] = useState("");
  const [need, setNeed] = useState("");
  const [product, setProduct] = useState("");
  const [strategyTitle, setStrategyTitle] = useState("Estrategia inicial");
  const [strategyObjective, setStrategyObjective] = useState("");
  const [nextMilestone, setNextMilestone] = useState("Completar diagnóstico inicial");
  const [accent, setAccent] = useState("#6c5ce7");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (![name, plan, need, product, strategyTitle].every(value => value.trim())) {
      setError("Completa cliente, plan, necesidad, producto y estrategia.");
      return;
    }
    setSaving(true); setError(null);
    try {
      const response = await fetch("/api/central", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "onboard_client", name, plan, need, product, strategyTitle, strategyObjective, nextMilestone, accent }),
      });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error || `HTTP ${response.status}`);
      onOpenChange(false);
      setName(""); setPlan(""); setNeed(""); setProduct(""); setStrategyTitle("Estrategia inicial"); setStrategyObjective("");
      onDone("Cliente creado con plan y estrategia");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible crear el cliente");
    } finally { setSaving(false); }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Nuevo cliente" description="Alta real: crea cliente, plan, necesidad, producto, estrategia, ciclo y trabajo inicial en Supabase.">
      <form className="realOnboarding" onSubmit={submit}>
        <section className="formSection">
          <div className="formSectionHead"><span>01</span><div><strong>Cliente</strong><small>Quién entra al sistema</small></div></div>
          <label><span>Nombre</span><input autoFocus className="formControl big" value={name} onChange={e => setName(e.target.value)} placeholder="Empresa o cliente" /></label>
          <label className="colorLine"><span>Color</span><input type="color" value={accent} onChange={e => setAccent(e.target.value)} /></label>
        </section>

        <section className="formSection">
          <div className="formSectionHead"><span>02</span><div><strong>Plan</strong><small>Qué relación comercial contrató</small></div></div>
          <label><span>Plan contratado</span><input className="formControl" list="service-plan-list" value={plan} onChange={e => setPlan(e.target.value)} placeholder="Ej. Plan Desarrollo Digital" /></label>
          <datalist id="service-plan-list">{plans.map(item => <option key={item.id} value={item.name} />)}</datalist>
        </section>

        <section className="formSection">
          <div className="formSectionHead"><span>03</span><div><strong>Necesidad y producto</strong><small>Qué problema resolvemos y qué entregamos primero</small></div></div>
          <label><span>Necesidad</span><textarea className="formControl" rows={3} value={need} onChange={e => setNeed(e.target.value)} placeholder="¿Qué necesita resolver?" /></label>
          <label><span>Producto inicial</span><input className="formControl" value={product} onChange={e => setProduct(e.target.value)} placeholder="Ej. Website de entrada" /></label>
        </section>

        <section className="formSection">
          <div className="formSectionHead"><span>04</span><div><strong>Estrategia</strong><small>Cómo vamos a producir el resultado</small></div></div>
          <label><span>Nombre de la estrategia</span><input className="formControl" value={strategyTitle} onChange={e => setStrategyTitle(e.target.value)} /></label>
          <label><span>Objetivo estratégico</span><textarea className="formControl" rows={3} value={strategyObjective} onChange={e => setStrategyObjective(e.target.value)} placeholder="Resultado que queremos alcanzar" /></label>
          <label><span>Primer hito</span><input className="formControl" value={nextMilestone} onChange={e => setNextMilestone(e.target.value)} /></label>
        </section>

        {error ? <div className="formError">{error}</div> : null}
        <div className="formActions"><button type="button" className="btn" onClick={() => onOpenChange(false)}>Cancelar</button><button className="btn primary" disabled={saving}>{saving ? "Creando estructura…" : "Crear cliente"}</button></div>
      </form>
    </Sheet>
  );
}

function ChatGPTProtocolSheet({ open, onOpenChange, registry, onCopy }: { open: boolean; onOpenChange: (value: boolean) => void; registry: Registry | null; onCopy: () => void }) {
  const centralRoute = registry?.central?.mcpEndpoint || "/mcp";
  async function copy(value: string) { await navigator.clipboard.writeText(value); onCopy(); }
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="ChatGPT" description="Protocolo oficial de LINK CONTROL para conectar ChatGPT mediante MCP.">
      <div className="chatProtocol">
        <section className="protocolStatus">
          <div><span className="statusDot ok" /><div><strong>Supabase</strong><small>Datos reales conectados</small></div></div>
          <div><span className="statusDot ok" /><div><strong>MCP</strong><small>Servidor remoto construido</small></div></div>
          <div><span className="statusDot warn" /><div><strong>Autorización</strong><small>Pendiente antes de entregar acceso privado</small></div></div>
          <div><span className="statusDot off" /><div><strong>Escritura desde ChatGPT</strong><small>Bloqueada hasta autenticar usuario y scope</small></div></div>
        </section>

        <section className="protocolCard"><span className="protocolNumber">01</span><div><strong>ChatGPT identifica al usuario</strong><p>El usuario debe estar autenticado en LINK CONTROL. Su membresía determina qué Control puede utilizar.</p></div></section>
        <section className="protocolCard"><span className="protocolNumber">02</span><div><strong>LINK resuelve el scope</strong><p>Central usa <code>/mcp</code>. Cada cliente usa <code>/c/&lt;slug&gt;/mcp</code>. Nunca se entrega la service role de Supabase.</p></div></section>
        <section className="protocolCard"><span className="protocolNumber">03</span><div><strong>Se registra la app MCP en ChatGPT</strong><p>En un workspace/plan compatible se habilita Developer Mode, se crea la app personalizada y se registra la URL HTTPS autorizada.</p></div></section>
        <section className="protocolCard"><span className="protocolNumber">04</span><div><strong>Prueba de conexión</strong><p>Primero <code>get_scope</code>, después <code>health</code>. Luego ChatGPT puede consultar clientes, ficha 360, trabajo y actividad.</p></div></section>
        <section className="protocolCard"><span className="protocolNumber">05</span><div><strong>Escritura</strong><p>Solo se habilita después de OAuth/autorización por usuario y Control. Cada cambio debe persistir en Supabase y crear un evento.</p></div></section>

        <div className="protocolTools"><strong>Herramientas MCP actuales</strong><div>{(registry?.tools || ["get_scope","health","search_clients","get_client_360","list_work_items","list_activity"]).map(tool => <span key={tool}>{tool}</span>)}</div></div>

        <div className="protocolEndpoints">
          <div className="endpointRow"><div><strong>Central</strong><small>scope root</small></div><code>{centralRoute}</code><button className="btn" onClick={() => void copy(centralRoute)}>Copiar ruta</button></div>
          {(registry?.controls || []).map(item => <div className="endpointRow" key={item.scope}><div><strong>{item.name}</strong><small>{item.scope}</small></div><code>{item.mcpEndpoint}</code><button className="btn" onClick={() => void copy(item.mcpEndpoint)}>Copiar ruta</button></div>)}
        </div>

        <div className="protocolWarning"><strong>Estado actual</strong><p>La ruta existe y está protegida. Antes de conectarla a un cliente real falta implementar login/autorización para emitir su acceso MCP privado. No habilitaremos escrituras antes de eso.</p></div>
      </div>
    </Sheet>
  );
}
