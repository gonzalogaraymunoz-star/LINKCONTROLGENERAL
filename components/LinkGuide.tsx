"use client";

import { useMemo, useState } from "react";

type GuideTab =
  | "Mapa"
  | "Agentes"
  | "Aparatos"
  | "Direcciones"
  | "CRM"
  | "Antecedentes"
  | "Proyecciones";

const TABS: GuideTab[] = [
  "Mapa",
  "Agentes",
  "Aparatos",
  "Direcciones",
  "CRM",
  "Antecedentes",
  "Proyecciones",
];

const STAGE_LABELS: Record<string, string> = {
  marketing: "Marketing",
  ventas: "Ventas",
  cierre: "Cierre",
  onboarding: "Onboarding",
  entrega: "Entrega",
  postventa: "Postventa",
  transversal: "Transversal",
};

function fmtDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("es-CL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function statusLabel(value?: string | null) {
  const labels: Record<string, string> = {
    ready: "READY",
    active: "Activo",
    available: "Disponible",
    configured: "Configurado",
    code_ready: "Código listo",
    error: "Error",
    disabled: "Desactivado",
    approved: "Aprobada",
    blocked: "Bloqueado",
    accepted: "Aceptado",
    consumed: "Consumido",
    draft: "Borrador",
    watching: "Vigilando",
  };
  return labels[value || ""] || value || "—";
}

function statusTone(value?: string | null) {
  if (["ready", "active", "available", "approved", "accepted", "consumed", "healthy"].includes(value || "")) return "good";
  if (["error", "blocked", "failed"].includes(value || "")) return "bad";
  return "neutral";
}

function externalHref(url?: string | null) {
  return url || undefined;
}

export default function LinkGuide({ data }: { data: any }) {
  const [tab, setTab] = useState<GuideTab>("Mapa");
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState("todos");

  const resources = data.resources || [];
  const businesses = data.businesses || [];
  const agents = data.agents || [];
  const stages = data.stages || [];
  const missions = data.missions || [];
  const handoffs = data.handoffs || [];
  const routes = data.routes || [];
  const domains = data.domains || [];
  const organelles = data.organelles || [];
  const crm = data.crm || [];
  const cortexRecent = data.cortexRecent || [];
  const cortexCounts = data.cortexCounts || {};
  const projections = data.projections || [];
  const connections = data.connections || [];
  const projects = data.projects || [];
  const businessEntities = data.businessEntities || [];
  const bindings = data.bindings || [];

  const filteredResources = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return resources.filter((resource: any) => {
      const providerOk = provider === "todos" || resource.provider === provider;
      if (!providerOk) return false;
      if (!needle) return true;
      return [
        resource.name,
        resource.purpose,
        resource.provider,
        resource.category,
        resource.group_key,
        resource.canonical_url,
        resource.external_id,
        resource.owner_domain,
        resource.source_of_truth,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [resources, query, provider]);

  const apparatusResources = resources.filter((r: any) => r.group_key === "aparatos" || r.category === "apparatus");
  const crmResources = resources.filter((r: any) => r.group_key === "crm" || r.category === "crm");
  const websites = resources.filter((r: any) => r.category === "website");
  const repositories = resources.filter((r: any) => r.category === "repository");
  const databases = resources.filter((r: any) => r.category === "database");

  function businessName(globalId?: string | null) {
    return businesses.find((item: any) => item.global_id === globalId)?.name || globalId || "Ecosistema";
  }

  function agentName(slug?: string | null) {
    return agents.find((item: any) => item.slug === slug)?.name || slug || "—";
  }

  function apparatusForBusiness(globalId: string) {
    const entity = businessEntities.find((item: any) => item.global_id === globalId);
    if (!entity) return [];
    return bindings.filter((item: any) => item.cell_entity_id === entity.id);
  }

  return (
    <div className="guide-shell">
      <aside className="guide-sidebar">
        <a className="guide-brand" href="/">
          <span className="agentic-mark">L</span>
          <span>
            <b>LINK</b>
            <small>GUIDE</small>
          </span>
        </a>

        <nav className="guide-nav" aria-label="LINK Guide">
          {TABS.map((item) => (
            <button
              key={item}
              className={tab === item ? "is-active" : ""}
              onClick={() => setTab(item)}
            >
              <span>{item}</span>
            </button>
          ))}
        </nav>

        <div className="guide-sidebar-meta">
          <b>{resources.length} direcciones</b>
          <small>{websites.length} superficies · {repositories.length} repos · {databases.length} bases</small>
          <a href="/">← Control Central</a>
        </div>
      </aside>

      <main className="guide-main">
        <header className="guide-topbar">
          <div>
            <small>CONTROL CENTRAL / LINK GUIDE</small>
            <b>{tab}</b>
          </div>
          <div className="guide-source-row">
            <span>Vercel</span>
            <span>Supabase</span>
            <span>GitHub</span>
          </div>
        </header>

        <div className="guide-canvas">
          <section className="guide-hero">
            <div>
              <div className="eyebrow">ÍNDICE MAESTRO DEL ECOSISTEMA</div>
              <h1>LINK Guide</h1>
              <p>
                Una dirección para saber <b>dónde está</b> cada cosa, <b>para qué sirve</b>,
                quién la custodia, con qué se conecta y qué sigue.
              </p>
            </div>
            <div className="guide-hero-stats">
              <span><b>{resources.length}</b><small>recursos auditados</small></span>
              <span><b>{businesses.length}</b><small>negocios LINK</small></span>
              <span><b>{agents.length}</b><small>agentes</small></span>
              <span><b>{organelles.length}</b><small>aparatos base</small></span>
            </div>
          </section>

          {tab === "Mapa" && (
            <div className="guide-stack">
              <section className="surface">
                <div className="section-head">
                  <div><small>LECTURA SIMPLE</small><h2>Cómo está conectado LINK</h2></div>
                  <p>La guía separa realidad, gobierno, producción, operación, CRM e inteligencia.</p>
                </div>
                <div className="guide-domain-grid">
                  {domains.map((domain: any) => (
                    <article key={domain.domain_key} className="guide-domain-card">
                      <span>{domain.domain_key}</span>
                      <h3>{domain.label}</h3>
                      <p>{domain.description}</p>
                      <small>Verdad: {domain.truth_scope}</small>
                    </article>
                  ))}
                </div>
              </section>

              <section className="surface">
                <div className="section-head">
                  <div><small>CAMINO DE UNA SEÑAL</small><h2>De la superficie a la evidencia</h2></div>
                  <p>Este es el recorrido que permite saber quién debe ocuparse y dónde queda registro.</p>
                </div>
                <div className="guide-flow">
                  {[
                    ["1", "Superficie", "Web, RRSS, CRM, formulario o sistema operacional"],
                    ["2", "Receptor", "La entrada autorizada persiste la señal en su fuente de verdad"],
                    ["3", "Event Bus", "Control Central recibe una consecuencia verificable"],
                    ["4", "Agente dueño", "Las rutas explícitas asignan Marketing, Ventas, Cierre, Onboarding, Entrega o Postventa"],
                    ["5", "Misión / handoff", "El agente trabaja su misión o entrega el caso al siguiente director con criterios"],
                    ["6", "Command Bus", "Las acciones gobernadas quedan pendientes de aprobación cuando corresponde"],
                    ["7", "Evidencia / proyección", "El resultado vuelve a Supabase y alimenta la proyección sin reemplazar la verdad operacional"],
                  ].map(([n, title, copy]) => (
                    <article key={n}>
                      <b>{n}</b>
                      <div><h3>{title}</h3><p>{copy}</p></div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="surface">
                <div className="section-head">
                  <div><small>NEGOCIOS</small><h2>Dónde vive cada célula</h2></div>
                  <p>Identidad LINK World + superficie visible + estado CRM.</p>
                </div>
                <div className="guide-business-grid">
                  {businesses.map((business: any) => {
                    const state = crm.find((row: any) => row.global_id === business.global_id);
                    const apparatus = apparatusForBusiness(business.global_id);
                    return (
                      <article className="guide-business-card" key={business.global_id}>
                        <div className="guide-card-top">
                          <span className={"guide-status " + statusTone(business.verification_status)}>{statusLabel(business.verification_status)}</span>
                          <code>{business.global_id}</code>
                        </div>
                        <h3>{business.name}</h3>
                        <p>{business.summary}</p>
                        <dl>
                          <div><dt>Website</dt><dd>{business.website ? <a href={business.website} target="_blank" rel="noreferrer">Abrir ↗</a> : "Sin website canónico"}</dd></div>
                          <div><dt>CRM</dt><dd>{state?.crm_state || "—"} · {state?.open_lead_count ?? 0} leads abiertos</dd></div>
                          <div><dt>Aparatos</dt><dd>{apparatus.length} bindings</dd></div>
                        </dl>
                      </article>
                    );
                  })}
                </div>
              </section>
            </div>
          )}

          {tab === "Agentes" && (
            <div className="guide-stack">
              <section className="surface">
                <div className="section-head">
                  <div><small>PROCESO</small><h2>Cadena de dirección</h2></div>
                  <p>Cada agente tiene una etapa, señales autorizadas, misión y contrato de entrega.</p>
                </div>
                <div className="guide-stage-flow">
                  {stages.map((stage: any) => {
                    const route = routes.find((item: any) => item.agent_slug === stage.director_slug);
                    const mission = missions.find((item: any) => item.assigned_agent_slug === stage.director_slug);
                    const outgoing = handoffs.find((item: any) => item.from_agent_slug === stage.director_slug);
                    return (
                      <article key={stage.stage_key} className="guide-stage-card">
                        <div className="guide-stage-number">{stage.stage_number}</div>
                        <div className="guide-stage-body">
                          <div className="guide-card-top">
                            <span>{stage.name}</span>
                            <span className={"guide-status " + statusTone(mission?.status)}>{statusLabel(mission?.status || "watching")}</span>
                          </div>
                          <h3>{agentName(stage.director_slug)}</h3>
                          <p>{stage.description}</p>
                          <dl>
                            <div><dt>Transforma</dt><dd>{stage.customer_state_in} → {stage.customer_state_out}</dd></div>
                            <div><dt>Despierta por</dt><dd>{route?.description || "Sin ruta explícita"}</dd></div>
                            <div><dt>Misión actual</dt><dd>{mission?.title || "Vigilar señales de su etapa"}</dd></div>
                            <div><dt>Siguiente</dt><dd>{outgoing ? `${agentName(outgoing.to_agent_slug)} · ${statusLabel(outgoing.status)}` : "Cierre del journey"}</dd></div>
                          </dl>
                          {mission?.metadata?.next_move && (
                            <div className="guide-next"><b>Siguiente movimiento</b><span>{mission.metadata.next_move}</span></div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="surface">
                <div className="section-head">
                  <div><small>CONTRATOS ENTRE AGENTES</small><h2>Handoffs y criterios de aceptación</h2></div>
                  <p>Un director no “pasa trabajo” por intuición: entrega evidencia bajo un acuerdo persistente.</p>
                </div>
                <div className="guide-handoff-list">
                  {handoffs.map((handoff: any) => (
                    <article key={handoff.id}>
                      <div className="guide-handoff-path">
                        <b>{agentName(handoff.from_agent_slug)}</b>
                        <span>→</span>
                        <b>{agentName(handoff.to_agent_slug)}</b>
                      </div>
                      <span className={"guide-status " + statusTone(handoff.status)}>{statusLabel(handoff.status)}</span>
                      <p>{handoff.summary}</p>
                      <div className="guide-contract">
                        <b>Contrato de aceptación</b>
                        <ul>
                          {(handoff.acceptance_criteria || []).map((criterion: string) => <li key={criterion}>{criterion}</li>)}
                        </ul>
                        {handoff.blocker && <small>Bloqueo actual: {handoff.blocker}</small>}
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="surface">
                <div className="section-head">
                  <div><small>DIRECCIÓN TRANSVERSAL</small><h2>LINK Director</h2></div>
                  <p>No absorbe etapas: coordina bloqueos, integraciones y misiones que cruzan el organismo.</p>
                </div>
                {(() => {
                  const rootAgent = agents.find((item: any) => item.slug === "link-director");
                  const rootMission = missions.find((item: any) => item.created_by_agent === "link-director" && item.stage_key === "transversal");
                  const rootRoute = routes.find((item: any) => item.agent_slug === "link-director");
                  return (
                    <div className="guide-director-card">
                      <div><span className="eyebrow">LINK DIRECTOR</span><h3>{rootAgent?.name || "LINK Director"}</h3><p>{rootAgent?.description}</p></div>
                      <dl>
                        <div><dt>Misión raíz</dt><dd>{rootMission?.title || "—"}</dd></div>
                        <div><dt>Despierta por</dt><dd>{rootRoute?.description || "—"}</dd></div>
                        <div><dt>Prioridad</dt><dd>{rootMission?.priority || "—"}</dd></div>
                        <div><dt>Estado</dt><dd>{statusLabel(rootMission?.status)}</dd></div>
                      </dl>
                    </div>
                  );
                })()}
              </section>
            </div>
          )}

          {tab === "Aparatos" && (
            <div className="guide-stack">
              <section className="surface">
                <div className="section-head">
                  <div><small>ANATOMÍA LINK</small><h2>12 aparatos base</h2></div>
                  <p>El nombre biológico sirve como metáfora; la columna sistema indica dónde buscar la función real.</p>
                </div>
                <div className="guide-organelle-grid">
                  {organelles.map((item: any) => (
                    <article key={item.organelle_key}>
                      <div className="guide-card-top">
                        <code>{item.organelle_key}</code>
                        {item.required_for_cell && <span className="guide-status good">base</span>}
                      </div>
                      <h3>{item.system_name}</h3>
                      <small>{item.biological_name}</small>
                      <p>{item.purpose}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="surface">
                <div className="section-head">
                  <div><small>APARATOS INSTALADOS</small><h2>Direcciones de operación</h2></div>
                  <p>Estas son las superficies y fuentes que materializan los aparatos.</p>
                </div>
                <div className="guide-resource-grid">
                  {apparatusResources.map((resource: any) => (
                    <ResourceCard key={resource.resource_key} resource={resource} />
                  ))}
                </div>
              </section>
            </div>
          )}

          {tab === "Direcciones" && (
            <div className="guide-stack">
              <section className="surface guide-directory">
                <div className="section-head">
                  <div><small>BUSCADOR</small><h2>Dirección exacta de las cosas</h2></div>
                  <p>Inventario auditado de Vercel, GitHub y Supabase.</p>
                </div>
                <div className="guide-searchbar">
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar: RRSS, Hotel Experience, QR, CRM, repo, Supabase…"
                  />
                  <select value={provider} onChange={(event) => setProvider(event.target.value)}>
                    <option value="todos">Todos</option>
                    <option value="vercel">Vercel</option>
                    <option value="supabase">Supabase</option>
                    <option value="github">GitHub</option>
                  </select>
                </div>
                <div className="guide-directory-table">
                  <div className="guide-directory-head">
                    <span>Recurso</span><span>Proveedor</span><span>Dirección</span><span>Dueño / verdad</span><span>Estado</span>
                  </div>
                  {filteredResources.map((resource: any) => (
                    <article key={resource.resource_key}>
                      <div><b>{resource.name}</b><small>{resource.purpose}</small></div>
                      <span>{resource.provider}</span>
                      <div className="guide-address">
                        {resource.canonical_url ? <a href={resource.canonical_url} target="_blank" rel="noreferrer">Abrir ↗</a> : <span>Sin URL UI</span>}
                        <code>{resource.external_id || resource.resource_key}</code>
                      </div>
                      <div><b>{resource.owner_domain || "—"}</b><small>{resource.source_of_truth || "—"}</small></div>
                      <span className={"guide-status " + statusTone(resource.status)}>{statusLabel(resource.status)}</span>
                    </article>
                  ))}
                  {!filteredResources.length && <div className="empty-state">No encontré recursos con ese filtro.</div>}
                </div>
              </section>
            </div>
          )}

          {tab === "CRM" && (
            <div className="guide-stack">
              <section className="surface">
                <div className="section-head">
                  <div><small>CRM</small><h2>Superficies y proyecciones comerciales</h2></div>
                  <p>LINK conserva la identidad central; el CRM es una proyección especializada.</p>
                </div>
                <div className="guide-resource-grid">
                  {crmResources.map((resource: any) => <ResourceCard key={resource.resource_key} resource={resource} />)}
                </div>
              </section>

              <section className="surface">
                <div className="section-head">
                  <div><small>ESTADO POR NEGOCIO</small><h2>CRM emergente</h2></div>
                  <p>La lógica puede estar lista antes de que exista actividad comercial.</p>
                </div>
                <div className="guide-crm-table">
                  <div className="guide-crm-head"><span>Negocio</span><span>Lógica</span><span>Leads</span><span>Abiertos</span><span>Ventas verificadas</span><span>Estado</span></div>
                  {crm.map((row: any) => (
                    <article key={row.global_id}>
                      <b>{row.name}</b>
                      <span>{row.logic_parts_ready}/{row.logic_parts_required}</span>
                      <span>{row.lead_count}</span>
                      <span>{row.open_lead_count}</span>
                      <span>{row.verified_win_count}</span>
                      <span className={"guide-status " + statusTone(row.crm_state === "active" ? "active" : "configured")}>{row.crm_state}</span>
                    </article>
                  ))}
                </div>
              </section>

              <section className="surface">
                <div className="section-head">
                  <div><small>CONEXIONES</small><h2>CRM y puentes activos</h2></div>
                  <p>Se muestra la conexión persistida, no una suposición de disponibilidad.</p>
                </div>
                <div className="guide-connection-grid">
                  {connections.map((row: any) => (
                    <article key={row.provider + row.connection_key}>
                      <div className="guide-card-top"><b>{row.provider}</b><span className={"guide-status " + statusTone(row.status)}>{statusLabel(row.status)}</span></div>
                      <h3>{row.connection_key}</h3>
                      <p>{row.mode}</p>
                      <small>Última señal: {fmtDate(row.last_seen_at)}</small>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}

          {tab === "Antecedentes" && (
            <div className="guide-stack">
              <section className="surface">
                <div className="section-head">
                  <div><small>LINK CORTEX</small><h2>Qué antecedentes existen</h2></div>
                  <p>El antecedente ayuda a decidir; no reemplaza la fuente propietaria.</p>
                </div>
                <div className="guide-count-grid">
                  {Object.entries(cortexCounts).sort((a: any,b: any)=>b[1]-a[1]).map(([key,value]: any) => (
                    <article key={key}><b>{value}</b><span>{key.replaceAll("_"," ")}</span></article>
                  ))}
                </div>
              </section>

              <section className="surface">
                <div className="section-head">
                  <div><small>ÚLTIMOS ANTECEDENTES</small><h2>Documentos recientes</h2></div>
                  <p>Títulos y procedencia, sin duplicar el contenido completo en la guía.</p>
                </div>
                <div className="guide-history-list">
                  {cortexRecent.map((row: any) => (
                    <article key={row.entity_type + row.entity_key}>
                      <span>{row.entity_type}</span>
                      <div><b>{row.title}</b><small>{row.entity_key}</small></div>
                      <time>{fmtDate(row.updated_at)}</time>
                    </article>
                  ))}
                </div>
              </section>

              <section className="surface">
                <div className="section-head">
                  <div><small>PROYECTOS</small><h2>Antecedentes de construcción</h2></div>
                  <p>Proyectos internos que explican de dónde vienen superficies, servicios y oportunidades.</p>
                </div>
                <div className="guide-project-grid">
                  {projects.map((project: any) => (
                    <article key={project.id}>
                      <div className="guide-card-top"><span>{project.kind}</span><span className="guide-status neutral">{project.phase || project.status}</span></div>
                      <h3>{project.name}</h3>
                      <p>{project.description}</p>
                      {(project.addresses.sales_surface || project.addresses.repo || project.addresses.booking_intake_endpoint) && (
                        <div className="guide-link-stack">
                          {project.addresses.sales_surface && <a href={project.addresses.sales_surface} target="_blank" rel="noreferrer">Superficie ↗</a>}
                          {project.addresses.repo && <a href={project.addresses.repo} target="_blank" rel="noreferrer">Repositorio ↗</a>}
                          {project.addresses.booking_intake_endpoint && <a href={project.addresses.booking_intake_endpoint} target="_blank" rel="noreferrer">Intake ↗</a>}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}

          {tab === "Proyecciones" && (
            <div className="guide-stack">
              <section className="surface">
                <div className="section-head">
                  <div><small>PROYECCIONES VIVAS</small><h2>Casas operativas</h2></div>
                  <p>Una proyección deriva del evento; no se convierte en la fuente de verdad operacional.</p>
                </div>
                <div className="guide-projection-grid">
                  {projections.map((projection: any) => (
                    <article key={projection.global_id}>
                      <div className="guide-card-top">
                        <b>{businessName(projection.global_id)}</b>
                        <span className={"guide-status " + statusTone(projection.last_engine_status)}>{projection.last_engine_status}</span>
                      </div>
                      <h3>{projection.archetype_key}</h3>
                      <dl>
                        <div><dt>Cobertura</dt><dd>{projection.coverage_mode}</dd></div>
                        <div><dt>Eventos procesados</dt><dd>{projection.processed_event_count}</dd></div>
                        <div><dt>Último evento</dt><dd>{projection.last_event_type || "Aún sin eventos"}</dd></div>
                        <div><dt>Motor</dt><dd>{fmtDate(projection.last_engine_run_at)}</dd></div>
                      </dl>
                    </article>
                  ))}
                </div>
              </section>

              <section className="surface">
                <div className="section-head">
                  <div><small>LO QUE SIGUE</small><h2>Proyectos con próximo gate</h2></div>
                  <p>Solo se muestran estados persistidos; no convertimos ideas en hechos.</p>
                </div>
                <div className="guide-projection-list">
                  {projects
                    .filter((project: any) => project.projection.next_gate || project.projection.current_state || project.projection.activation_dependency || project.projection.contract_status)
                    .map((project: any) => (
                      <article key={project.id}>
                        <div><b>{project.name}</b><small>{project.phase || project.status}</small></div>
                        <span>{project.projection.next_gate || project.projection.current_priority || project.projection.activation_dependency || project.projection.contract_status}</span>
                      </article>
                    ))}
                </div>
              </section>

              <section className="surface">
                <div className="section-head">
                  <div><small>FUENTES TÉCNICAS</small><h2>Inventario auditado</h2></div>
                  <p>El estado de las superficies se actualizó desde Vercel, GitHub y Supabase al crear esta guía.</p>
                </div>
                <div className="guide-source-summary">
                  <article><b>{websites.length}</b><span>superficies Vercel</span></article>
                  <article><b>{repositories.length}</b><span>repositorios GitHub</span></article>
                  <article><b>{databases.length}</b><span>proyectos Supabase</span></article>
                  <article><b>{resources.filter((r:any)=>r.category==="edge_function").length}</b><span>funciones indexadas</span></article>
                </div>
              </section>
            </div>
          )}

          <footer className="guide-footer">
            <span>Fuente viva: Control Central + inventario auditado</span>
            <span>Actualizado {fmtDate(data.generatedAt)}</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

function ResourceCard({ resource }: { resource: any }) {
  return (
    <article className="guide-resource-card">
      <div className="guide-card-top">
        <span>{resource.provider}</span>
        <span className={"guide-status " + statusTone(resource.status)}>{statusLabel(resource.status)}</span>
      </div>
      <h3>{resource.name}</h3>
      <p>{resource.purpose}</p>
      <dl>
        <div><dt>Dueño</dt><dd>{resource.owner_domain || "—"}</dd></div>
        <div><dt>Verdad</dt><dd>{resource.source_of_truth || "—"}</dd></div>
      </dl>
      {externalHref(resource.canonical_url) ? (
        <a className="guide-open" href={resource.canonical_url} target="_blank" rel="noreferrer">Abrir dirección ↗</a>
      ) : (
        <span className="guide-open is-muted">Sin superficie UI registrada</span>
      )}
    </article>
  );
}
