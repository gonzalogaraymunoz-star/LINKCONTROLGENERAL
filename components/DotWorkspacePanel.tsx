"use client";

import { useMemo, useState } from "react";
import styles from "./DotWorkspacePanel.module.css";

type Row = Record<string, any>;

type DotData = {
  agent: Row;
  workspaces: Row[];
  subdots: Row[];
  artifacts: Row[];
  missions: Row[];
  evidence: Row[];
  grants: Row[];
  operatingStates: Row[];
  capabilities: Row[];
  handoffs: Row[];
  memories: Row[];
  commands: Row[];
  events: Row[];
  sessions: Row[];
  messages: Row[];
  crons: Row[];
};

const TABS = [
  ["inicio", "Inicio"],
  ["trabajo", "Trabajo"],
  ["espacios", "Espacios"],
  ["conversaciones", "Conversaciones"],
  ["memoria", "Memoria"],
  ["gobierno", "Capacidades"],
  ["actividad", "Actividad"],
] as const;

function fmt(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function human(value?: string | null) {
  const map: Record<string, string> = {
    active: "Activo",
    shadow: "Shadow",
    paused: "Pausado",
    draft: "Borrador",
    archived: "Archivado",
    pending: "Pendiente",
    processing: "Procesando",
    completed: "Completado",
    success: "Correcto",
    failed: "Falló",
    blocked: "Bloqueado",
    waiting_approval: "Espera aprobación",
    proposed: "Propuesto",
    accepted: "Aceptado",
    consumed: "Consumido",
    requested: "Solicitada",
    received: "Recibida",
    validated: "Validada",
    connected: "Conectado",
  };
  return map[String(value || "")] || value || "—";
}

function stateTone(value?: string | null) {
  const v = String(value || "").toLowerCase();
  if (/success|active|validated|completed|accepted|connected/.test(v)) return styles.ok;
  if (/failed|blocked|error/.test(v)) return styles.bad;
  if (/pending|waiting|proposed|requested|attention/.test(v)) return styles.warn;
  return "";
}

function SectionTitle({
  eyebrow,
  title,
  note,
}: {
  eyebrow: string;
  title: string;
  note?: string;
}) {
  return (
    <header className={styles.sectionTitle}>
      <div>
        <small>{eyebrow}</small>
        <h2>{title}</h2>
      </div>
      {note ? <p>{note}</p> : null}
    </header>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className={styles.empty}>{children}</div>;
}

function Status({ value }: { value?: string | null }) {
  return <span className={`${styles.status} ${stateTone(value)}`}>{human(value)}</span>;
}

export default function DotWorkspacePanel({ data }: { data: DotData }) {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("inicio");
  const agent = data.agent;
  const metadata = agent.metadata || {};
  const initials = String(agent.name || agent.slug || "DT")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const activeMission =
    data.missions.find((mission) => !["completed", "cancelled"].includes(String(mission.status))) ||
    data.missions[0] ||
    null;

  const pendingApprovals = data.commands.filter(
    (command) =>
      command.requires_approval &&
      !["approved", "rejected"].includes(String(command.approval_status)),
  ).length;

  const workspaceMap = useMemo(
    () => new Map(data.workspaces.map((workspace) => [workspace.id, workspace])),
    [data.workspaces],
  );

  const sessionMessages = useMemo(() => {
    const grouped = new Map<string, Row[]>();
    for (const message of data.messages) {
      const list = grouped.get(message.session_id) || [];
      list.push(message);
      grouped.set(message.session_id, list);
    }
    return grouped;
  }, [data.messages]);

  const validatedEvidence = data.evidence.filter(
    (item) => String(item.status) === "validated",
  ).length;

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <a className={styles.back} href="/">
          ← Control Central
        </a>

        <div className={styles.identity}>
          <div className={styles.avatar}>{initials}</div>
          <small>{agent.kind}</small>
          <h1>{agent.name}</h1>
          <p>{metadata.dot_area || metadata.area || metadata.stage_label || "LINK"}</p>
          <Status value={agent.status} />
        </div>

        <nav className={styles.nav}>
          {TABS.map(([id, label]) => (
            <button
              key={id}
              className={tab === id ? styles.active : ""}
              onClick={() => setTab(id)}
            >
              <span>{label}</span>
              {id === "trabajo" && data.missions.length ? <b>{data.missions.length}</b> : null}
              {id === "espacios" && data.workspaces.length ? <b>{data.workspaces.length}</b> : null}
              {id === "conversaciones" && data.sessions.length ? <b>{data.sessions.length}</b> : null}
            </button>
          ))}
        </nav>

        <div className={styles.sidebarFoot}>
          <small>IDENTIDAD OPERACIONAL</small>
          <code>{agent.operationalSlug}</code>
          <span>Fuente de verdad · {metadata.source_of_truth || "supabase"}</span>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <small>LINKDOT OS / {agent.operationalSlug}</small>
            <b>{TABS.find(([id]) => id === tab)?.[1]}</b>
          </div>
          <div className={styles.topActions}>
            <Status value={metadata.autonomy_mode || "active"} />
            {metadata.runtime ? <span className={styles.chip}>{metadata.runtime}</span> : null}
          </div>
        </header>

        <div className={styles.canvas}>
          {tab === "inicio" ? (
            <>
              <section className={styles.hero}>
                <div>
                  <span className={styles.kicker}>{agent.kind} · {agent.operationalSlug}</span>
                  <h1>{agent.name}</h1>
                  <p>{agent.description}</p>
                  <div className={styles.heroTags}>
                    <span>Responsabilidad: {metadata.responsibility || "definida por su misión"}</span>
                    {metadata.handoff_boundary ? <span>Entrega: {metadata.handoff_boundary}</span> : null}
                  </div>
                </div>
                <div className={styles.heroState}>
                  <small>ESTADO</small>
                  <strong>{human(metadata.runtime_state || agent.status)}</strong>
                  <span>{metadata.runtime_model || agent.current_version || "runtime LINK"}</span>
                </div>
              </section>

              <section className={styles.metrics}>
                <article><small>Misiones</small><strong>{data.missions.length}</strong><span>{activeMission ? "trabajo registrado" : "sin misión activa"}</span></article>
                <article><small>Espacios</small><strong>{data.workspaces.length}</strong><span>{data.artifacts.length} artefactos</span></article>
                <article><small>Subdots</small><strong>{data.subdots.length}</strong><span>especialidades delegadas</span></article>
                <article><small>Por aprobar</small><strong>{pendingApprovals}</strong><span>{validatedEvidence} evidencias validadas</span></article>
              </section>

              <div className={styles.twoCol}>
                <section className={styles.card}>
                  <SectionTitle eyebrow="AHORA" title={activeMission?.title || "Sin misión activa"} note={activeMission?.mission_code || "El DOT está disponible para recibir trabajo."} />
                  {activeMission ? (
                    <>
                      <p className={styles.body}>{activeMission.problem_statement || activeMission.diagnosis || "Misión registrada sin descripción adicional."}</p>
                      <div className={styles.factGrid}>
                        <div><small>Estado</small><b>{human(activeMission.status)}</b></div>
                        <div><small>Prioridad</small><b>{activeMission.priority || "—"}</b></div>
                        <div><small>Etapa</small><b>{activeMission.stage_key || metadata.stage_key || "transversal"}</b></div>
                        <div><small>Actualizada</small><b>{fmt(activeMission.updated_at)}</b></div>
                      </div>
                    </>
                  ) : <Empty>No hay una misión abierta para este DOT.</Empty>}
                </section>

                <section className={styles.card}>
                  <SectionTitle eyebrow="CUERPO DEL DOT" title="Arquitectura viva" note="La ficha se arma desde Supabase, no desde datos simulados." />
                  <div className={styles.architecture}>
                    <div><b>Identidad</b><span>{agent.name}</span></div>
                    <div><b>Espacios</b><span>{data.workspaces.length} autorizados</span></div>
                    <div><b>Artefactos</b><span>{data.artifacts.length} piezas de trabajo</span></div>
                    <div><b>Memoria</b><span>{data.memories.length} registros vivos</span></div>
                    <div><b>Permisos</b><span>{data.grants.length} acciones gobernadas</span></div>
                    <div><b>Actividad</b><span>{data.events.length + data.commands.length} señales recientes</span></div>
                  </div>
                </section>
              </div>
            </>
          ) : null}

          {tab === "trabajo" ? (
            <div className={styles.stack}>
              <section className={styles.card}>
                <SectionTitle eyebrow="MISIONES" title="Trabajo asignado" note="Cada misión tiene problema, resultado esperado y evidencia." />
                <div className={styles.list}>
                  {data.missions.map((mission) => {
                    const evidence = data.evidence.filter((item) => item.mission_id === mission.id);
                    return (
                      <article className={styles.rowCard} key={mission.id}>
                        <div className={styles.rowMain}>
                          <div className={styles.rowTitle}>
                            <b>{mission.title}</b>
                            <Status value={mission.status} />
                          </div>
                          <p>{mission.problem_statement || mission.diagnosis || "Sin descripción."}</p>
                          <small>{mission.mission_code} · {mission.stage_key || "transversal"} · {fmt(mission.updated_at)}</small>
                        </div>
                        <div className={styles.rowSide}>
                          <strong>{evidence.filter((item) => item.status === "validated").length}/{evidence.length}</strong>
                          <span>evidencias</span>
                        </div>
                      </article>
                    );
                  })}
                  {!data.missions.length ? <Empty>No existen misiones asignadas.</Empty> : null}
                </div>
              </section>

              <section className={styles.card}>
                <SectionTitle eyebrow="ARTEFACTOS" title="Lo que este DOT opera" note="Cada artefacto pertenece a un espacio y puede abrir su superficie real." />
                <div className={styles.artifactGrid}>
                  {data.artifacts.map((artifact) => (
                    <article className={styles.artifact} key={artifact.id}>
                      <small>{artifact.artifact_type}</small>
                      <h3>{artifact.name}</h3>
                      <p>{artifact.description || artifact.work_definition}</p>
                      <div>
                        <span>{workspaceMap.get(artifact.workspace_id)?.name || "Workspace"}</span>
                        <Status value={artifact.status} />
                      </div>
                      {artifact.route ? <a href={artifact.route} target="_blank" rel="noreferrer">Abrir artefacto ↗</a> : null}
                    </article>
                  ))}
                  {!data.artifacts.length ? <Empty>No hay artefactos registrados todavía.</Empty> : null}
                </div>
              </section>

              <section className={styles.card}>
                <SectionTitle eyebrow="EVIDENCIA" title="Pruebas de misión" note="No se considera trabajo terminado sin evidencia." />
                <div className={styles.table}>
                  <div className={styles.tableHead}><span>Requisito</span><span>Tipo</span><span>Estado</span><span>Fecha</span></div>
                  {data.evidence.map((item) => (
                    <div className={styles.tableRow} key={item.id}>
                      <span><b>{item.description || item.requirement_key}</b><small>{item.requirement_key}</small></span>
                      <span>{item.evidence_type || "—"}</span>
                      <span><Status value={item.status} /></span>
                      <span>{fmt(item.validated_at || item.received_at || item.requested_at)}</span>
                    </div>
                  ))}
                  {!data.evidence.length ? <Empty>Aún no hay evidencia registrada.</Empty> : null}
                </div>
              </section>
            </div>
          ) : null}

          {tab === "espacios" ? (
            <div className={styles.stack}>
              {data.workspaces.map((workspace) => {
                const subdots = data.subdots.filter((row) => row.workspace_id === workspace.id);
                const artifacts = data.artifacts.filter((row) => row.workspace_id === workspace.id);
                return (
                  <section className={styles.card} key={workspace.id}>
                    <SectionTitle eyebrow="WORKSPACE" title={workspace.name} note={workspace.description} />
                    <div className={styles.workspaceMeta}>
                      <code>{workspace.workspace_key}</code>
                      <Status value={workspace.status} />
                      {workspace.route ? <a href={workspace.route} target="_blank" rel="noreferrer">Abrir espacio ↗</a> : null}
                    </div>
                    <h3 className={styles.subheading}>LINKSUBDOTS</h3>
                    <div className={styles.subdotGrid}>
                      {subdots.map((subdot) => (
                        <article key={subdot.id}>
                          <div><b>{subdot.name}</b><Status value={subdot.status} /></div>
                          <code>{subdot.subdot_slug}</code>
                          <p>{subdot.responsibility}</p>
                        </article>
                      ))}
                      {!subdots.length ? <Empty>Este espacio no tiene LINKSUBDOT todavía.</Empty> : null}
                    </div>
                    <h3 className={styles.subheading}>ARTEFACTOS</h3>
                    <div className={styles.compactList}>
                      {artifacts.map((artifact) => (
                        <div key={artifact.id}>
                          <span><b>{artifact.name}</b><small>{artifact.artifact_type}</small></span>
                          {artifact.route ? <a href={artifact.route} target="_blank" rel="noreferrer">Abrir ↗</a> : <Status value={artifact.status} />}
                        </div>
                      ))}
                      {!artifacts.length ? <Empty>Sin artefactos en este espacio.</Empty> : null}
                    </div>
                  </section>
                );
              })}
              {!data.workspaces.length ? <section className={styles.card}><Empty>Este DOT todavía no tiene Workspace registrado.</Empty></section> : null}
            </div>
          ) : null}

          {tab === "conversaciones" ? (
            <section className={styles.card}>
              <SectionTitle eyebrow="THREADS LINK" title="Sesiones persistentes" note="Usamos agent_sessions + agent_messages; no necesitamos Copilot Threads." />
              <div className={styles.sessions}>
                {data.sessions.map((session) => {
                  const messages = (sessionMessages.get(session.id) || []).slice(0, 6);
                  return (
                    <article key={session.id}>
                      <header>
                        <div><b>{session.title || "Sesión sin título"}</b><small>{session.channel || "LINK"} · {fmt(session.updated_at)}</small></div>
                        <span>{messages.length} mensajes</span>
                      </header>
                      <div className={styles.messages}>
                        {messages.map((message) => (
                          <div key={message.id} data-role={message.role}>
                            <small>{message.role}</small>
                            <p>{message.summary || message.content}</p>
                          </div>
                        ))}
                      </div>
                    </article>
                  );
                })}
                {!data.sessions.length ? <Empty>No hay conversaciones persistentes asociadas a este DOT todavía.</Empty> : null}
              </div>
            </section>
          ) : null}

          {tab === "memoria" ? (
            <section className={styles.card}>
              <SectionTitle eyebrow="MEMORIA" title="Lo que el DOT conserva" note="Memoria profunda separada del historial de conversaciones." />
              <div className={styles.memoryGrid}>
                {data.memories.map((memory) => (
                  <article key={memory.id}>
                    <div><b>{memory.memory_key}</b><span>importancia {memory.importance ?? "—"}</span></div>
                    <small>{memory.kind} · {memory.source || "LINK"} · {fmt(memory.updated_at)}</small>
                    <p>{memory.content || "Memoria estructurada."}</p>
                  </article>
                ))}
                {!data.memories.length ? <Empty>No hay memorias visibles para este DOT.</Empty> : null}
              </div>
            </section>
          ) : null}

          {tab === "gobierno" ? (
            <div className={styles.twoCol}>
              <section className={styles.card}>
                <SectionTitle eyebrow="CAPACIDADES" title="Qué sabe hacer" note="Capacidades declaradas por LINK." />
                <div className={styles.compactList}>
                  {data.capabilities.map((capability) => (
                    <div key={capability.id || capability.capability_key}>
                      <span><b>{capability.label || capability.capability_key}</b><small>{capability.description || capability.capability_key}</small></span>
                      <code>{capability.capability_key}</code>
                    </div>
                  ))}
                  {!data.capabilities.length ? <Empty>Sin capacidades registradas en link_skill_capabilities.</Empty> : null}
                </div>
              </section>

              <section className={styles.card}>
                <SectionTitle eyebrow="PERMISOS" title="Qué puede ejecutar" note="Autonomía y aprobación se gobiernan por acción." />
                <div className={styles.compactList}>
                  {data.grants.map((grant) => (
                    <div key={grant.id}>
                      <span><b>{grant.action_key}</b><small>{grant.autonomy_level}</small></span>
                      <Status value={grant.approval_required ? "waiting_approval" : "active"} />
                    </div>
                  ))}
                  {!data.grants.length ? <Empty>No tiene permisos de acción registrados.</Empty> : null}
                </div>
              </section>

              <section className={styles.card}>
                <SectionTitle eyebrow="DELEGACIÓN" title="Handoffs" note="Entrega de responsabilidad entre agentes." />
                <div className={styles.compactList}>
                  {data.handoffs.map((handoff) => (
                    <div key={handoff.id}>
                      <span><b>{handoff.from_agent_slug} → {handoff.to_agent_slug}</b><small>{handoff.summary || handoff.signal_type}</small></span>
                      <Status value={handoff.status} />
                    </div>
                  ))}
                  {!data.handoffs.length ? <Empty>No hay handoffs recientes.</Empty> : null}
                </div>
              </section>

              <section className={styles.card}>
                <SectionTitle eyebrow="CONSTITUCIÓN" title="Reglas del DOT" note="Datos operacionales que hoy viven en metadata." />
                <dl className={styles.definitionList}>
                  <div><dt>Responsabilidad</dt><dd>{metadata.responsibility || agent.description}</dd></div>
                  <div><dt>Entrada</dt><dd>{metadata.entry_boundary || "—"}</dd></div>
                  <div><dt>Salida</dt><dd>{metadata.exit_boundary || metadata.handoff_boundary || "—"}</dd></div>
                  <div><dt>Autonomía</dt><dd>{metadata.autonomy_mode || "—"}</dd></div>
                  <div><dt>Runtime</dt><dd>{metadata.runtime || "LINK"}</dd></div>
                  <div><dt>Modelo</dt><dd>{metadata.runtime_model || "—"}</dd></div>
                </dl>
              </section>
            </div>
          ) : null}

          {tab === "actividad" ? (
            <div className={styles.stack}>
              <section className={styles.card}>
                <SectionTitle eyebrow="COMMAND BUS" title="Acciones emitidas" note="Qué intentó hacer, si requería aprobación y qué ocurrió." />
                <div className={styles.table}>
                  <div className={styles.tableHead}><span>Fecha</span><span>Acción</span><span>Aprobación</span><span>Estado</span></div>
                  {data.commands.map((command) => (
                    <div className={styles.tableRow} key={command.id}>
                      <span>{fmt(command.requested_at)}</span>
                      <span><b>{command.action_key || command.command_type}</b><small>{command.global_id || "transversal"}</small></span>
                      <span><Status value={command.requires_approval ? command.approval_status || "pending" : "active"} /></span>
                      <span><Status value={command.status} /></span>
                    </div>
                  ))}
                  {!data.commands.length ? <Empty>No hay comandos emitidos.</Empty> : null}
                </div>
              </section>

              <div className={styles.twoCol}>
                <section className={styles.card}>
                  <SectionTitle eyebrow="EVENT BUS" title="Señales del runtime" note="Despertares y decisiones verificables." />
                  <div className={styles.timeline}>
                    {data.events.map((event) => (
                      <div key={event.id}>
                        <span className={styles.timelineDot} />
                        <div><b>{event.event_type}</b><small>{fmt(event.received_at || event.occurred_at)}</small></div>
                      </div>
                    ))}
                    {!data.events.length ? <Empty>Sin señales recientes.</Empty> : null}
                  </div>
                </section>

                <section className={styles.card}>
                  <SectionTitle eyebrow="CRON" title="Trabajo recurrente" note="Crons vinculados explícitamente al DOT." />
                  <div className={styles.compactList}>
                    {data.crons.map((cron) => (
                      <div key={cron.id}>
                        <span><b>{cron.name}</b><small>{cron.cycle_label || cron.description}</small></span>
                        <Status value={cron.status} />
                      </div>
                    ))}
                    {!data.crons.length ? <Empty>No hay cron asociado explícitamente todavía.</Empty> : null}
                  </div>
                </section>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
