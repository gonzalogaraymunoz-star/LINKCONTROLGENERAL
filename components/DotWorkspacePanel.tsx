"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./DotWorkspacePanel.module.css";
import DotActionQueue from "@/components/DotActionQueue";

type Row = Record<string, any>;

type DotData = {
  agent: Row;
  workspaces: Row[];
  workspaceAccess: Row[];
  dotDirectory: Row[];
  subdots: Row[];
  artifacts: Row[];
  missions: Row[];
  evidence: Row[];
  grants: Row[];
  operatingStates: Row[];
  workQueue: Row[];
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
  ["trabajo", "Mi trabajo"],
  ["espacios", "Mis espacios"],
  ["equipo", "Mi equipo"],
  ["conversaciones", "Conversaciones"],
  ["detalles", "Detalles"],
] as const;

type TabId = (typeof TABS)[number][0];

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
    live: "En vivo",
    paused: "Pausado",
    draft: "Borrador",
    pending: "Pendiente",
    processing: "Procesando",
    completed: "Completado",
    success: "Correcto",
    succeeded: "Correcto",
    approved: "Aprobado",
    cancelled: "Cancelado",
    failed: "Falló",
    blocked: "Bloqueado",
    waiting_approval: "Esperando aprobación",
    proposed: "Propuesto",
    accepted: "Aceptado",
    consumed: "Recibido",
    requested: "Solicitado",
    received: "Recibido",
    validated: "Validado",
    connected: "Conectado",
    attention: "Necesita atención",
    building: "En construcción",
  };
  return map[String(value || "")] || value || "—";
}

function tone(value?: string | null) {
  const v = String(value || "").toLowerCase();
  if (/success|succeeded|active|validated|completed|accepted|approved|connected|live/.test(v)) return styles.ok;
  if (/failed|blocked|error/.test(v)) return styles.bad;
  if (/pending|waiting|proposed|requested|attention|building/.test(v)) return styles.warn;
  return "";
}

function Status({ value }: { value?: string | null }) {
  return <span className={`${styles.status} ${tone(value)}`}>{human(value)}</span>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className={styles.empty}>{children}</div>;
}

export default function DotWorkspacePanel({ data }: { data: DotData }) {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab") as TabId | null;
  const initialTab: TabId = TABS.some(([id]) => id === requestedTab) ? (requestedTab as TabId) : "inicio";
  const [tab, setTab] = useState<TabId>(initialTab);
  const agent = data.agent;
  const metadata = agent.metadata || {};
  const displayName = String(metadata.display_label || agent.name || agent.slug || "DOT");
  const shortName = displayName.replace(/^LINKDOT\s*·?\s*/i, "").replace(/^LINK\s*/i, "");
  const area = String(metadata.dot_area || metadata.area || metadata.stage_label || "LINK");

  const workspaceMap = useMemo(
    () => new Map(data.workspaces.map((workspace) => [workspace.id, workspace])),
    [data.workspaces],
  );

  const workspaceAccessMap = useMemo(
    () => new Map(data.workspaceAccess.map((access) => [access.workspace_id, access])),
    [data.workspaceAccess],
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

  const actionWork = data.workQueue || [];
  const activeMissions = data.missions.filter(
    (mission) => !["completed", "cancelled", "archived"].includes(String(mission.status)),
  );
  const activeMission = activeMissions[0] || null;

  const pendingApprovals = data.commands.filter(
    (command) =>
      command.requires_approval &&
      !["approved", "rejected"].includes(String(command.approval_status)),
  );
  const blockedMissions = activeMissions.filter((mission) => String(mission.status) === "blocked");
  const blockedHandoffs = data.handoffs.filter((handoff) => String(handoff.status) === "blocked");
  const attentionArtifacts = data.artifacts.filter((artifact) =>
    ["attention", "building"].includes(String(artifact.status)),
  );
  const failedCommands = data.commands.filter((command) => String(command.status) === "failed");

  const needsYou = [
    ...blockedMissions.map((mission) => ({
      title: "Hay una tarea bloqueada",
      detail: mission.title,
      tab: "trabajo" as TabId,
    })),
    ...pendingApprovals.map((command) => ({
      title: "Necesito una aprobación",
      detail: command.action_key || command.command_type || "Hay una acción esperando tu decisión.",
      tab: "detalles" as TabId,
    })),
    ...blockedHandoffs.map((handoff) => ({
      title: "Una entrega entre actores está bloqueada",
      detail: handoff.summary || "Revisa la entrega de trabajo entre LINKDOT.",
      tab: "trabajo" as TabId,
    })),
    ...failedCommands.map((command) => ({
      title: "Una acción no resultó",
      detail: command.action_key || command.command_type || "Revisa la acción fallida.",
      tab: "detalles" as TabId,
    })),
    ...attentionArtifacts.map((artifact) => ({
      title: "Un artefacto necesita atención",
      detail: artifact.name,
      tab: "espacios" as TabId,
    })),
  ].slice(0, 4);

  const technicalToLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const dot of data.dotDirectory) {
      map.set(String(dot.slug), String(dot.name));
      map.set(String(dot.technicalSlug), String(dot.name));
    }
    map.set(String(agent.slug), displayName);
    map.set(String(agent.operationalSlug), displayName);
    return map;
  }, [data.dotDirectory, agent.slug, agent.operationalSlug, displayName]);

  const inbound = data.handoffs.find((handoff) => handoff.to_agent_slug === agent.slug);
  const outbound = data.handoffs.find((handoff) => handoff.from_agent_slug === agent.slug);

  const receives =
    metadata.entry_boundary ||
    (inbound
      ? inbound.summary ||
        `Trabajo que llega desde ${technicalToLabel.get(String(inbound.from_agent_slug)) || inbound.from_agent_slug}`
      : "Todavía no hay una entrada de trabajo definida.");

  const does =
    metadata.responsibility ||
    agent.description ||
    "Todavía no hay una responsabilidad descrita en lenguaje común.";

  const delivers =
    metadata.exit_boundary ||
    metadata.handoff_boundary ||
    (outbound
      ? outbound.summary ||
        `Trabajo que continúa en ${technicalToLabel.get(String(outbound.to_agent_slug)) || outbound.to_agent_slug}`
      : "Todavía no hay una entrega definida.");

  const journeyOrder = [
    "linkdot-marketing-rrss",
    "linkdot-ventas",
    "linkdot-cierre",
    "linkdot-onboarding",
    "linkdot-entrega",
    "linkdot-postventa",
  ];

  const journeyDots = [...data.dotDirectory]
    .filter((dot) => dot.technicalSlug !== "link-director" && dot.slug !== "link-director")
    .sort((a, b) => {
      const ai = journeyOrder.indexOf(String(a.slug));
      const bi = journeyOrder.indexOf(String(b.slug));
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });

  const accentClass =
    area.includes("marketing")
      ? styles.accentMarketing
      : area.includes("ventas")
        ? styles.accentSales
        : area.includes("cierre")
          ? styles.accentClose
          : area.includes("onboarding")
            ? styles.accentOnboarding
            : area.includes("entrega")
              ? styles.accentDelivery
              : area.includes("postventa")
                ? styles.accentAfter
                : styles.accentDirector;

  return (
    <div className={`${styles.shell} ${accentClass}`}>
      <aside className={styles.sidebar}>
        <a className={styles.back} href="/">← Control Central</a>

        <div className={styles.sideBrand}>
          <div className={styles.dotMark}><i /><i /><i /><i /></div>
          <strong>LINKDOT</strong>
        </div>

        <div className={styles.sideSection}>
          <div className={styles.sideLabel}>ACTORES</div>
          <div className={styles.actorList}>
            {data.dotDirectory.map((dot) => {
              const current =
                dot.slug === agent.operationalSlug || dot.technicalSlug === agent.slug;
              return (
                <a
                  key={dot.slug}
                  href={`/dots/${dot.slug}`}
                  className={current ? styles.actorActive : ""}
                >
                  <span className={styles.actorDot} />
                  <span>
                    <b>{dot.name}</b>
                    <small>{dot.area}</small>
                  </span>
                </a>
              );
            })}
          </div>
        </div>

        <div className={styles.sideSection}>
          <div className={styles.sideLabel}>ESPACIOS</div>
          <div className={styles.sideItems}>
            {data.workspaces.slice(0, 5).map((workspace) => (
              <button key={workspace.id} onClick={() => setTab("espacios")}>
                <span>▢</span>
                <b>{workspace.name}</b>
              </button>
            ))}
            {!data.workspaces.length ? <small className={styles.sideEmpty}>Sin espacios todavía</small> : null}
          </div>
        </div>

        <div className={styles.sideSection}>
          <div className={styles.sideLabel}>CONVERSACIONES RECIENTES</div>
          <div className={styles.sideItems}>
            {data.sessions.slice(0, 4).map((session) => (
              <button key={session.id} onClick={() => setTab("conversaciones")}>
                <span>◌</span>
                <b>{session.title || "Conversación sin título"}</b>
              </button>
            ))}
            {!data.sessions.length ? <small className={styles.sideEmpty}>Sin conversaciones todavía</small> : null}
          </div>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <nav>
            {TABS.map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={tab === id ? styles.tabActive : ""}
              >
                {label}
              </button>
            ))}
          </nav>
          <Status value={metadata.runtime_state || agent.status} />
        </header>

        <div className={styles.canvas}>
          {tab === "inicio" ? (
            <>
              <section className={styles.hero}>
                <div className={styles.heroCopy}>
                  <span className={styles.eyebrow}>LINKDOT EN ACCIÓN</span>
                  <h1>
                    {actionWork.length
                      ? `${shortName}: ${actionWork.length} asunto${actionWork.length === 1 ? "" : "s"} activo${actionWork.length === 1 ? "" : "s"}.`
                      : `${shortName}: observando.`}
                  </h1>
                  <p>
                    {actionWork.length
                      ? "Primero resolvemos lo que está ocurriendo ahora. La explicación del DOT queda debajo."
                      : "No hay trabajo material que requiera intervención. Sigo observando señales reales dentro de mi responsabilidad."}
                  </p>
                  <div className={styles.ready}>
                    <span />
                    {metadata.runtime_state === "paused" || agent.status === "paused"
                      ? "Estoy pausado"
                      : "Estoy operativo"}
                  </div>
                </div>
                <div className={styles.mascotWrap} aria-hidden="true">
                  <span className={styles.spark}>✦</span>
                  <div className={styles.mascot}>
                    <div className={styles.mascotFace}>
                      <i /><i />
                    </div>
                    <b>{shortName.slice(0, 2).toUpperCase()}</b>
                  </div>
                  <small>{area.replaceAll("_", " ")}</small>
                </div>
              </section>

              <section className={styles.section}>
                <header className={styles.sectionHead}>
                  <div>
                    <span className={styles.eyebrow}>ACCIÓN AHORA</span>
                    <h2>{actionWork.length ? "Trabajo que requiere movimiento" : "Sin intervención pendiente"}</h2>
                  </div>
                  <p>Aprobar, desbloquear o seguir la ejecución. Esto viene de la cola viva de Supabase.</p>
                </header>
                <DotActionQueue workQueue={actionWork} commands={data.commands} />
              </section>

              <section className={styles.section}>
                <header className={styles.sectionHead}>
                  <div>
                    <span className={styles.eyebrow}>ASÍ TRABAJO</span>
                    <h2>Tres cosas para entender mi lugar</h2>
                  </div>
                  <p>No necesitas conocer la arquitectura para saber qué hago.</p>
                </header>

                <div className={styles.flow}>
                  <article>
                    <span className={styles.stepNumber}>1</span>
                    <small>RECIBO</small>
                    <h3>Lo que llega a mí</h3>
                    <p>{receives}</p>
                  </article>
                  <div className={styles.flowArrow}>→</div>
                  <article>
                    <span className={styles.stepNumber}>2</span>
                    <small>HAGO</small>
                    <h3>Mi responsabilidad</h3>
                    <p>{does}</p>
                  </article>
                  <div className={styles.flowArrow}>→</div>
                  <article>
                    <span className={styles.stepNumber}>3</span>
                    <small>ENTREGO</small>
                    <h3>Qué pasa después</h3>
                    <p>{delivers}</p>
                  </article>
                </div>
              </section>

              <div className={styles.homeGrid}>
                <section className={styles.section}>
                  <header className={styles.sectionHead}>
                    <div>
                      <span className={styles.eyebrow}>AHORA</span>
                      <h2>Qué tengo entre manos</h2>
                    </div>
                  </header>
                  {activeMission ? (
                    <article className={styles.currentTask}>
                      <div>
                        <Status value={activeMission.status} />
                        <h3>{activeMission.title}</h3>
                        <p>{activeMission.problem_statement || activeMission.diagnosis || "Esta misión no tiene una explicación adicional."}</p>
                      </div>
                      <button onClick={() => setTab("trabajo")}>Ver mi trabajo →</button>
                    </article>
                  ) : (
                    <Empty>No tengo una misión activa registrada ahora.</Empty>
                  )}
                </section>

                <section className={styles.section}>
                  <header className={styles.sectionHead}>
                    <div>
                      <span className={styles.eyebrow}>NECESITO DE TI</span>
                      <h2>{needsYou.length ? "Hay algo que revisar" : "Todo claro por ahora"}</h2>
                    </div>
                  </header>
                  <div className={styles.needList}>
                    {needsYou.map((item, index) => (
                      <button key={index} onClick={() => setTab(item.tab)}>
                        <span>{index + 1}</span>
                        <div><b>{item.title}</b><small>{item.detail}</small></div>
                        <em>→</em>
                      </button>
                    ))}
                    {!needsYou.length ? (
                      <p className={styles.calmMessage}>No hay bloqueos, aprobaciones ni fallos que requieran tu intervención en este momento.</p>
                    ) : null}
                  </div>
                </section>
              </div>

              <section className={styles.section}>
                <header className={styles.sectionHead}>
                  <div>
                    <span className={styles.eyebrow}>EL RECORRIDO LINK</span>
                    <h2>Cómo encajo con los otros actores</h2>
                  </div>
                  <p>Cada actor cuida una parte distinta del mismo recorrido.</p>
                </header>
                <div className={styles.journey}>
                  {journeyDots.map((dot, index) => {
                    const current =
                      dot.slug === agent.operationalSlug || dot.technicalSlug === agent.slug;
                    return (
                      <div className={styles.journeyWrap} key={dot.slug}>
                        <a href={`/dots/${dot.slug}`} className={current ? styles.journeyCurrent : ""}>
                          <span>{index + 1}</span>
                          <b>{String(dot.name).replace(/^LINKDOT\s*·?\s*/i, "")}</b>
                          <small>{dot.responsibility || "Responsabilidad todavía no descrita."}</small>
                        </a>
                        {index < journeyDots.length - 1 ? <i>→</i> : null}
                      </div>
                    );
                  })}
                </div>
              </section>

              {data.subdots.length ? (
                <section className={styles.section}>
                  <header className={styles.sectionHead}>
                    <div>
                      <span className={styles.eyebrow}>MI EQUIPO</span>
                      <h2>Especialistas que trabajan conmigo</h2>
                    </div>
                    <button className={styles.textButton} onClick={() => setTab("equipo")}>Ver todos →</button>
                  </header>
                  <div className={styles.peopleGrid}>
                    {data.subdots.slice(0, 4).map((subdot) => (
                      <article key={subdot.id}>
                        <div className={styles.personAvatar}>
                          {String(subdot.name || "SD").replace(/^LINKSUBDOT\s*·?\s*/i, "").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <small>LINKSUBDOT</small>
                          <h3>{subdot.name}</h3>
                          <p>{subdot.responsibility}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          ) : null}

          {tab === "trabajo" ? (
            <section className={styles.section}>
              <header className={styles.sectionHead}>
                <div><span className={styles.eyebrow}>MI TRABAJO</span><h2>Misiones que tengo asignadas</h2></div>
                <p>Qué debo resolver y qué prueba demuestra que quedó hecho.</p>
              </header>
              <div className={styles.taskList}>
                {data.missions.map((mission) => {
                  const evidence = data.evidence.filter((item) => item.mission_id === mission.id);
                  const validated = evidence.filter((item) => item.status === "validated").length;
                  return (
                    <article key={mission.id}>
                      <div className={styles.taskIcon}>✓</div>
                      <div>
                        <div className={styles.taskTitle}><h3>{mission.title}</h3><Status value={mission.status} /></div>
                        <p>{mission.problem_statement || mission.diagnosis || "Sin explicación adicional."}</p>
                        <small>Evidencia comprobada: {validated} de {evidence.length} · Actualizado {fmt(mission.updated_at)}</small>
                      </div>
                    </article>
                  );
                })}
                {!data.missions.length ? <Empty>No tengo misiones registradas todavía.</Empty> : null}
              </div>

              <div className={styles.handoffBox}>
                <span className={styles.eyebrow}>ENTREGAS ENTRE ACTORES</span>
                <h3>Cómo pasa el trabajo de una mano a otra</h3>
                <div className={styles.simpleList}>
                  {data.handoffs.map((handoff) => (
                    <div key={handoff.id}>
                      <span>
                        <b>{technicalToLabel.get(String(handoff.from_agent_slug)) || handoff.from_agent_slug}</b>
                        <em>→</em>
                        <b>{technicalToLabel.get(String(handoff.to_agent_slug)) || handoff.to_agent_slug}</b>
                      </span>
                      <small>{handoff.summary || "Entrega registrada sin explicación."}</small>
                      <Status value={handoff.status} />
                    </div>
                  ))}
                  {!data.handoffs.length ? <Empty>No hay entregas entre actores registradas para este DOT.</Empty> : null}
                </div>
              </div>
            </section>
          ) : null}

          {tab === "espacios" ? (
            <section className={styles.section}>
              <header className={styles.sectionHead}>
                <div><span className={styles.eyebrow}>MIS ESPACIOS</span><h2>Los lugares donde trabajo</h2></div>
                <p>Cada espacio reúne herramientas, artefactos y especialistas de un contexto.</p>
              </header>
              <div className={styles.spaceGrid}>
                {data.workspaces.map((workspace) => {
                  const artifacts = data.artifacts.filter((item) => item.workspace_id === workspace.id);
                  const subdots = data.subdots.filter((item) => item.workspace_id === workspace.id);
                  return (
                    <article className={styles.spaceCard} key={workspace.id}>
                      <div className={styles.spaceIcon}>▢</div>
                      <div className={styles.spaceTop}>
                        <div>
                          <small>ESPACIO</small>
                          <h3>{workspace.name}</h3>
                        </div>
                        <Status value={workspace.status} />
                      </div>
                      <p>{workspace.description || "Este espacio todavía no tiene una explicación."}</p>
                      <div className={styles.spaceFacts}>
                        <span>{artifacts.length} artefactos</span>
                        <span>{subdots.length} especialistas</span>
                        {workspaceAccessMap.get(workspace.id) ? <span>acceso {workspaceAccessMap.get(workspace.id)?.access_level}</span> : null}
                      </div>
                      {artifacts.length ? (
                        <div className={styles.artifactList}>
                          {artifacts.slice(0, 5).map((artifact) => (
                            <div key={artifact.id}>
                              <b>{artifact.name}</b>
                              <small>{artifact.description || artifact.work_definition}</small>
                              {artifact.route ? <a href={artifact.route}>Abrir ↗</a> : <Status value={artifact.status} />}
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {workspace.route ? <a className={styles.openLink} href={workspace.route}>Entrar al espacio →</a> : null}
                    </article>
                  );
                })}
                {!data.workspaces.length ? <Empty>No tengo espacios registrados todavía.</Empty> : null}
              </div>
            </section>
          ) : null}

          {tab === "equipo" ? (
            <section className={styles.section}>
              <header className={styles.sectionHead}>
                <div><span className={styles.eyebrow}>MI EQUIPO</span><h2>Quién me ayuda y qué hace</h2></div>
                <p>Los LINKSUBDOT son especialistas. No compiten conmigo: resuelven una parte concreta de mi responsabilidad.</p>
              </header>
              <div className={styles.peopleGrid}>
                {data.subdots.map((subdot) => {
                  const artifacts = data.artifacts.filter((item) => item.subdot_id === subdot.id);
                  return (
                    <article key={subdot.id}>
                      <div className={styles.personAvatar}>
                        {String(subdot.name || "SD").replace(/^LINKSUBDOT\s*·?\s*/i, "").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className={styles.personHead}><small>{workspaceMap.get(subdot.workspace_id)?.name || "Workspace"}</small><Status value={subdot.status} /></div>
                        <h3>{subdot.name}</h3>
                        <p>{subdot.responsibility}</p>
                        <span>{artifacts.length} artefacto(s) a su cargo</span>
                      </div>
                    </article>
                  );
                })}
                {!data.subdots.length ? <Empty>No tengo especialistas registrados todavía.</Empty> : null}
              </div>
            </section>
          ) : null}

          {tab === "conversaciones" ? (
            <section className={styles.section}>
              <header className={styles.sectionHead}>
                <div><span className={styles.eyebrow}>CONVERSACIONES</span><h2>Los asuntos que recuerdo</h2></div>
                <p>Cada conversación conserva su contexto para que no tengamos que empezar de cero.</p>
              </header>
              <div className={styles.chatList}>
                {data.sessions.map((session) => {
                  const messages = sessionMessages.get(session.id) || [];
                  const last = messages[0];
                  return (
                    <article key={session.id}>
                      <div className={styles.chatIcon}>◌</div>
                      <div>
                        <h3>{session.title || "Conversación sin título"}</h3>
                        <p>{last?.summary || last?.content || "Todavía no hay mensajes visibles en esta conversación."}</p>
                        <small>{session.channel || "LINK"} · última actividad {fmt(session.updated_at)}</small>
                      </div>
                      <span>{messages.length} mensajes</span>
                    </article>
                  );
                })}
                {!data.sessions.length ? <Empty>No tengo conversaciones registradas todavía.</Empty> : null}
              </div>
            </section>
          ) : null}

          {tab === "detalles" ? (
            <section className={styles.section}>
              <header className={styles.sectionHead}>
                <div><span className={styles.eyebrow}>DETALLES</span><h2>La parte técnica, cuando la necesites</h2></div>
                <p>Esto sostiene al DOT por debajo, pero no necesitas mirarlo para trabajar con él.</p>
              </header>
              <div className={styles.detailGrid}>
                <article>
                  <h3>Capacidades</h3>
                  <div className={styles.simpleList}>
                    {data.capabilities.map((capability) => (
                      <div key={capability.id || capability.capability_key}>
                        <b>{capability.label || capability.capability_key}</b>
                        <small>{capability.description || "Sin descripción."}</small>
                      </div>
                    ))}
                    {!data.capabilities.length ? <Empty>Sin capacidades registradas.</Empty> : null}
                  </div>
                </article>

                <article>
                  <h3>Permisos</h3>
                  <div className={styles.simpleList}>
                    {data.grants.map((grant) => (
                      <div key={grant.id}>
                        <b>{grant.action_key}</b>
                        <small>{grant.approval_required ? "Necesita aprobación antes de ejecutar." : "Puede ejecutarse según su autonomía."}</small>
                        <Status value={grant.approval_required ? "waiting_approval" : "active"} />
                      </div>
                    ))}
                    {!data.grants.length ? <Empty>Sin permisos registrados.</Empty> : null}
                  </div>
                </article>

                <article>
                  <h3>Memoria</h3>
                  <div className={styles.simpleList}>
                    {data.memories.slice(0, 10).map((memory) => (
                      <div key={memory.id}>
                        <b>{memory.memory_key}</b>
                        <small>{memory.kind} · {fmt(memory.updated_at)}</small>
                      </div>
                    ))}
                    {!data.memories.length ? <Empty>Sin memoria visible registrada.</Empty> : null}
                  </div>
                </article>

                <article>
                  <h3>Rutinas</h3>
                  <div className={styles.simpleList}>
                    {data.crons.map((cron) => (
                      <div key={cron.id}>
                        <b>{cron.name}</b>
                        <small>{cron.cycle_label || cron.description || "Rutina registrada."}</small>
                        <Status value={cron.status} />
                      </div>
                    ))}
                    {!data.crons.length ? <Empty>Sin rutinas asociadas.</Empty> : null}
                  </div>
                </article>

                <article className={styles.fullDetail}>
                  <h3>Identidad técnica</h3>
                  <dl className={styles.definitionList}>
                    <div><dt>Identidad</dt><dd>{agent.operationalSlug}</dd></div>
                    <div><dt>Responsabilidad</dt><dd>{does}</dd></div>
                    <div><dt>Entrada</dt><dd>{receives}</dd></div>
                    <div><dt>Entrega</dt><dd>{delivers}</dd></div>
                    <div><dt>Fuente de verdad</dt><dd>{metadata.source_of_truth || "supabase"}</dd></div>
                    <div><dt>Runtime</dt><dd>{metadata.runtime || "LINK"}</dd></div>
                    <div><dt>Modelo</dt><dd>{metadata.runtime_model || "—"}</dd></div>
                  </dl>
                </article>
              </div>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
