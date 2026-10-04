"use client";

import { useMemo, useState } from "react";
import styles from "./DotWorkspacePanel.module.css";

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
  ["hoy", "Hoy"],
  ["espacios", "Espacios"],
  ["conversaciones", "Conversaciones"],
  ["subdots", "Subdots"],
  ["mision", "Misión"],
  ["mas", "Más"],
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
    shadow: "Shadow",
    live: "En vivo",
    paused: "Pausado",
    draft: "Borrador",
    archived: "Archivado",
    pending: "Pendiente",
    processing: "Procesando",
    completed: "Completado",
    success: "Correcto",
    succeeded: "Correcto",
    approved: "Aprobado",
    cancelled: "Cancelado",
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
    attention: "Atención",
    building: "Construyendo",
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

function isToday(value?: string | null) {
  if (!value) return false;
  const d = new Date(value);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export default function DotWorkspacePanel({ data }: { data: DotData }) {
  const [tab, setTab] = useState<TabId>("hoy");
  const agent = data.agent;
  const metadata = agent.metadata || {};
  const displayName = String(metadata.display_label || agent.name || agent.slug || "DOT");
  const area = String(metadata.dot_area || metadata.area || metadata.stage_label || "LINK");
  const initials = displayName
    .replace(/^LINKDOT\s*·?\s*/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

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

  const activeMissions = data.missions.filter(
    (mission) => !["completed", "cancelled", "archived"].includes(String(mission.status)),
  );
  const activeMission = activeMissions[0] || data.missions[0] || null;
  const blockedMissions = activeMissions.filter((m) => String(m.status) === "blocked");
  const pendingApprovals = data.commands.filter(
    (command) =>
      command.requires_approval &&
      !["approved", "rejected"].includes(String(command.approval_status)),
  );
  const pendingHandoffs = data.handoffs.filter((handoff) =>
    ["proposed", "requested", "pending"].includes(String(handoff.status)),
  );
  const blockedHandoffs = data.handoffs.filter((handoff) => String(handoff.status) === "blocked");
  const queuedCommands = data.commands.filter((command) => String(command.status) === "pending");
  const attentionArtifacts = data.artifacts.filter((artifact) =>
    ["attention", "building"].includes(String(artifact.status)),
  );
  const pendingEvidence = data.evidence.filter(
    (item) => !["validated", "rejected"].includes(String(item.status)),
  );
  const failedCommands = data.commands.filter((command) => String(command.status) === "failed");
  const validatedToday = data.evidence.filter(
    (item) => item.status === "validated" && isToday(item.validated_at || item.received_at),
  ).length;
  const completedToday = data.missions.filter(
    (mission) => mission.status === "completed" && isToday(mission.updated_at),
  ).length;
  const successfulToday = data.commands.filter(
    (command) =>
      ["completed", "success", "succeeded"].includes(String(command.status)) &&
      isToday(command.processed_at || command.requested_at),
  ).length;
  const resolvedToday = validatedToday + completedToday + successfulToday;

  const pulseScore = Math.max(
    20,
    Math.min(
      100,
      100 -
        blockedMissions.length * 15 -
        pendingApprovals.length * 8 -
        failedCommands.length * 10 -
        attentionArtifacts.length * 6 -
        blockedHandoffs.length * 12 -
        pendingHandoffs.length * 5 -
        Math.min(pendingEvidence.length, 5) * 2,
    ),
  );

  const pulseText =
    pulseScore >= 85
      ? "operación estable"
      : pulseScore >= 65
        ? "requiere atención"
        : "carga crítica";

  const focusItems = useMemo(() => {
    const items: Array<{ title: string; detail: string; tab: TabId; level: "high" | "mid" | "low" }> = [];
    if (blockedMissions.length) {
      items.push({
        title: `${blockedMissions.length} misión${blockedMissions.length === 1 ? "" : "es"} bloqueada${blockedMissions.length === 1 ? "" : "s"}`,
        detail: blockedMissions[0]?.title || "Requiere intervención",
        tab: "mision",
        level: "high",
      });
    }
    if (pendingApprovals.length) {
      items.push({
        title: `${pendingApprovals.length} aprobación${pendingApprovals.length === 1 ? "" : "es"} pendiente${pendingApprovals.length === 1 ? "" : "s"}`,
        detail: pendingApprovals[0]?.action_key || pendingApprovals[0]?.command_type || "Acción esperando decisión",
        tab: "mas",
        level: "high",
      });
    }
    if (blockedHandoffs.length) {
      items.push({
        title: `${blockedHandoffs.length} handoff${blockedHandoffs.length === 1 ? "" : "s"} bloqueado${blockedHandoffs.length === 1 ? "" : "s"}`,
        detail: blockedHandoffs[0]?.summary || `${blockedHandoffs[0]?.from_agent_slug || "DOT"} → ${blockedHandoffs[0]?.to_agent_slug || "siguiente DOT"}`,
        tab: "mision",
        level: "high",
      });
    }
    if (pendingHandoffs.length) {
      items.push({
        title: `${pendingHandoffs.length} handoff${pendingHandoffs.length === 1 ? "" : "s"} por resolver`,
        detail: pendingHandoffs[0]?.summary || `${pendingHandoffs[0]?.from_agent_slug || "DOT"} → ${pendingHandoffs[0]?.to_agent_slug || "siguiente DOT"}`,
        tab: "mision",
        level: "mid",
      });
    }
    if (queuedCommands.length) {
      items.push({
        title: `${queuedCommands.length} acción${queuedCommands.length === 1 ? "" : "es"} en cola`,
        detail: queuedCommands[0]?.action_key || queuedCommands[0]?.command_type || "Acción pendiente de procesamiento",
        tab: "mas",
        level: "mid",
      });
    }
    if (attentionArtifacts.length) {
      items.push({
        title: `${attentionArtifacts.length} artefacto${attentionArtifacts.length === 1 ? "" : "s"} en atención`,
        detail: attentionArtifacts[0]?.name || "Revisar artefactos activos",
        tab: "espacios",
        level: "mid",
      });
    }
    if (data.sessions.length) {
      items.push({
        title: `${data.sessions.length} conversación${data.sessions.length === 1 ? "" : "es"} persistente${data.sessions.length === 1 ? "" : "s"}`,
        detail: data.sessions[0]?.title || "Contexto conversacional disponible",
        tab: "conversaciones",
        level: "low",
      });
    }
    if (!items.length && activeMission) {
      items.push({
        title: "Misión activa",
        detail: activeMission.title,
        tab: "mision",
        level: "low",
      });
    }
    return items.slice(0, 4);
  }, [
    blockedMissions,
    pendingApprovals,
    blockedHandoffs,
    pendingHandoffs,
    queuedCommands,
    attentionArtifacts,
    data.sessions,
    activeMission,
  ]);

  const nextMove = focusItems[0] || null;
  const currentPending =
    blockedMissions.length +
    pendingApprovals.length +
    blockedHandoffs.length +
    pendingHandoffs.length +
    queuedCommands.length +
    attentionArtifacts.length +
    pendingEvidence.length;

  const characterLine =
    metadata.workspace_phrase ||
    metadata.personality_phrase ||
    metadata.responsibility ||
    agent.description ||
    "DOT operativo del ecosistema LINK.";

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

        <div className={styles.identity}>
          <div className={styles.avatar}>{initials || "L·"}</div>
          <small>{agent.kind}</small>
          <h1>{displayName}</h1>
          <p>{area.replaceAll("_", " ")}</p>
          <Status value={metadata.runtime_state || agent.status} />
        </div>

        <nav className={styles.nav} aria-label="Secciones del DOT">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              className={tab === id ? styles.active : ""}
              onClick={() => setTab(id)}
            >
              <span>{label}</span>
              {id === "espacios" && data.workspaces.length ? <b>{data.workspaces.length}</b> : null}
              {id === "conversaciones" && data.sessions.length ? <b>{data.sessions.length}</b> : null}
              {id === "subdots" && data.subdots.length ? <b>{data.subdots.length}</b> : null}
              {id === "mision" && activeMissions.length ? <b>{activeMissions.length}</b> : null}
            </button>
          ))}
        </nav>

        <div className={styles.organism}>
          <small>ORGANISMO</small>
          <div>
            {data.dotDirectory.map((dot) => (
              <a
                key={dot.slug}
                href={`/dots/${dot.slug}`}
                className={
                  dot.slug === agent.operationalSlug || dot.technicalSlug === agent.slug
                    ? styles.currentDot
                    : ""
                }
              >
                <i className={tone(dot.status)} />
                <span>
                  <b>{dot.name}</b>
                  <em>{dot.area}</em>
                </span>
              </a>
            ))}
          </div>
        </div>

        <div className={styles.sidebarFoot}>
          <small>FUENTE DE VERDAD</small>
          <span>{metadata.source_of_truth || "supabase"}</span>
          <code>{agent.operationalSlug}</code>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <small>LINKDOT WORKSPACE / {agent.operationalSlug}</small>
            <b>{TABS.find(([id]) => id === tab)?.[1]}</b>
          </div>
          <div className={styles.topActions}>
            <Status value={metadata.autonomy_mode || agent.status} />
            {metadata.runtime ? <span className={styles.chip}>{metadata.runtime}</span> : null}
          </div>
        </header>

        <div className={styles.canvas}>
          {tab === "hoy" ? (
            <>
              <section className={styles.hero}>
                <div className={styles.heroMain}>
                  <span className={styles.kicker}>{agent.kind} · HOY</span>
                  <h1>{displayName}</h1>
                  <p>{characterLine}</p>
                  <div className={styles.heroTags}>
                    {activeMissions.length ? <span>{activeMissions.length} misión(es) activa(s)</span> : null}
                    {pendingApprovals.length ? <span>{pendingApprovals.length} por aprobar</span> : null}
                    {data.subdots.length ? <span>{data.subdots.length} subdots</span> : null}
                    {data.workspaces.length ? <span>{data.workspaces.length} espacio(s)</span> : null}
                  </div>
                </div>
                <div className={styles.pulse}>
                  <small>PULSO OPERATIVO</small>
                  <strong>{pulseScore}%</strong>
                  <span>{pulseText}</span>
                  <div className={styles.pulseTrack}>
                    <i style={{ width: `${pulseScore}%` }} />
                  </div>
                  <em>
                    Derivado de bloqueos, aprobaciones, fallos, handoffs, artefactos y evidencia pendientes.
                  </em>
                </div>
              </section>

              <div className={styles.todayGrid}>
                <section className={styles.card}>
                  <header className={styles.cardHead}>
                    <div>
                      <small>NECESITA ATENCIÓN</small>
                      <h2>Qué importa ahora</h2>
                    </div>
                    <span>{focusItems.length ? "señales reales" : "sin alertas"}</span>
                  </header>
                  <div className={styles.focusList}>
                    {focusItems.map((item, index) => (
                      <button key={`${item.title}-${index}`} onClick={() => setTab(item.tab)}>
                        <span className={`${styles.focusNumber} ${styles[item.level]}`}>
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span>
                          <b>{item.title}</b>
                          <small>{item.detail}</small>
                        </span>
                        <em>→</em>
                      </button>
                    ))}
                    {!focusItems.length ? (
                      <Empty>No hay señales críticas registradas para este DOT.</Empty>
                    ) : null}
                  </div>
                </section>

                <section className={styles.card}>
                  <header className={styles.cardHead}>
                    <div>
                      <small>SIGUIENTE MOVIMIENTO</small>
                      <h2>{nextMove ? "Recomendado por estado real" : "Sin bloqueo inmediato"}</h2>
                    </div>
                  </header>
                  <div className={styles.nextMove}>
                    <p>{nextMove?.detail || "El DOT no tiene una urgencia registrada ahora."}</p>
                    {nextMove ? (
                      <button onClick={() => setTab(nextMove.tab)}>Abrir trabajo →</button>
                    ) : null}
                  </div>
                  <div className={styles.miniStats}>
                    <div><small>Resuelto hoy</small><strong>{resolvedToday}</strong></div>
                    <div><small>Pendiente</small><strong>{currentPending}</strong></div>
                  </div>
                </section>
              </div>

              <section className={styles.card}>
                <header className={styles.cardHead}>
                  <div>
                    <small>ESPACIOS</small>
                    <h2>Dónde está trabajando</h2>
                  </div>
                  <button className={styles.textButton} onClick={() => setTab("espacios")}>Ver todos →</button>
                </header>
                <div className={styles.spaceGrid}>
                  {data.workspaces.slice(0, 4).map((workspace) => {
                    const artifacts = data.artifacts.filter((a) => a.workspace_id === workspace.id);
                    const subdots = data.subdots.filter((s) => s.workspace_id === workspace.id);
                    return (
                      <article className={styles.spaceCard} key={workspace.id}>
                        <div className={styles.spaceTop}>
                          <div>
                            <small>{workspace.app_key || "LINK"}</small>
                            <h3>{workspace.name}</h3>
                          </div>
                          <Status value={workspace.status} />
                        </div>
                        <p>{workspace.description || "Sin descripción registrada."}</p>
                        <div className={styles.spaceFacts}>
                          <span>{artifacts.length} artefactos</span>
                          <span>{subdots.length} subdots</span>
                          {workspaceAccessMap.get(workspace.id) ? (
                            <span>{workspaceAccessMap.get(workspace.id)?.access_level}</span>
                          ) : null}
                        </div>
                        <div className={styles.spaceActions}>
                          <button onClick={() => setTab("espacios")}>Ver contexto</button>
                          {workspace.route ? <a href={workspace.route}>Abrir ↗</a> : null}
                        </div>
                      </article>
                    );
                  })}
                  {!data.workspaces.length ? <Empty>No hay espacios registrados para este DOT.</Empty> : null}
                </div>
              </section>

              <section className={styles.card}>
                <header className={styles.cardHead}>
                  <div>
                    <small>EQUIPO VIVO</small>
                    <h2>Subdots del DOT</h2>
                  </div>
                  <button className={styles.textButton} onClick={() => setTab("subdots")}>Ver equipo →</button>
                </header>
                <div className={styles.subdotRail}>
                  {data.subdots.slice(0, 6).map((subdot) => {
                    const artifactCount = data.artifacts.filter((a) => a.subdot_id === subdot.id).length;
                    return (
                      <article className={styles.subdotCard} key={subdot.id}>
                        <div className={styles.subAvatar}>
                          {String(subdot.name || subdot.subdot_slug)
                            .replace(/^LINKSUBDOT\s*·?\s*/i, "")
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((x: string) => x[0])
                            .join("")
                            .toUpperCase()}
                        </div>
                        <div>
                          <small>LINKSUBDOT</small>
                          <h3>{subdot.name}</h3>
                          <p>{subdot.responsibility}</p>
                          <span>{artifactCount} artefacto(s) · {human(subdot.status)}</span>
                        </div>
                      </article>
                    );
                  })}
                  {!data.subdots.length ? <Empty>Este DOT todavía no tiene subdots registrados.</Empty> : null}
                </div>
              </section>
            </>
          ) : null}

          {tab === "espacios" ? (
            <div className={styles.stack}>
              {data.workspaces.map((workspace) => {
                const subdots = data.subdots.filter((row) => row.workspace_id === workspace.id);
                const artifacts = data.artifacts.filter((row) => row.workspace_id === workspace.id);
                return (
                  <section className={styles.card} key={workspace.id}>
                    <header className={styles.cardHead}>
                      <div>
                        <small>WORKSPACE · {workspace.workspace_key}</small>
                        <h2>{workspace.name}</h2>
                      </div>
                      <Status value={workspace.status} />
                    </header>
                    <p className={styles.body}>{workspace.description || "Sin descripción registrada."}</p>
                    <div className={styles.spaceFacts}>
                      <span>{artifacts.length} artefactos</span>
                      <span>{subdots.length} subdots</span>
                      {workspaceAccessMap.get(workspace.id) ? (
                        <span>
                          acceso {workspaceAccessMap.get(workspace.id)?.access_level}
                          {workspaceAccessMap.get(workspace.id)?.is_default ? " · principal" : ""}
                        </span>
                      ) : null}
                    </div>
                    {workspace.route ? (
                      <a className={styles.primaryLink} href={workspace.route}>Abrir espacio ↗</a>
                    ) : null}

                    <h3 className={styles.subheading}>ARTEFACTOS REALES</h3>
                    <div className={styles.artifactGrid}>
                      {artifacts.map((artifact) => (
                        <article className={styles.artifact} key={artifact.id}>
                          <small>{artifact.artifact_type}</small>
                          <h3>{artifact.name}</h3>
                          <p>{artifact.description || artifact.work_definition}</p>
                          <div>
                            <Status value={artifact.status} />
                            {artifact.route ? <a href={artifact.route}>Abrir ↗</a> : null}
                          </div>
                        </article>
                      ))}
                      {!artifacts.length ? <Empty>No hay artefactos registrados en este espacio.</Empty> : null}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : null}

          {tab === "conversaciones" ? (
            <section className={styles.card}>
              <header className={styles.cardHead}>
                <div>
                  <small>CONVERSACIONES</small>
                  <h2>Contexto persistente</h2>
                </div>
                <span>{data.sessions.length} sesiones</span>
              </header>
              <div className={styles.sessions}>
                {data.sessions.map((session) => {
                  const messages = (sessionMessages.get(session.id) || []).slice(0, 6);
                  return (
                    <article key={session.id}>
                      <header>
                        <div>
                          <b>{session.title || "Sesión sin título"}</b>
                          <small>{session.channel || "LINK"} · {fmt(session.updated_at)}</small>
                        </div>
                        <span>{messages.length} mensajes cargados</span>
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
                {!data.sessions.length ? <Empty>No hay conversaciones asociadas a este DOT.</Empty> : null}
              </div>
            </section>
          ) : null}

          {tab === "subdots" ? (
            <section className={styles.card}>
              <header className={styles.cardHead}>
                <div>
                  <small>SUBDOTS</small>
                  <h2>Especialistas que este DOT ya tiene</h2>
                </div>
                <span>{data.subdots.length} registrados</span>
              </header>
              <div className={styles.subdotGrid}>
                {data.subdots.map((subdot) => {
                  const artifacts = data.artifacts.filter((a) => a.subdot_id === subdot.id);
                  const workspace = workspaceMap.get(subdot.workspace_id);
                  return (
                    <article key={subdot.id}>
                      <div className={styles.subAvatar}>{String(subdot.name || "SD").slice(0, 2).toUpperCase()}</div>
                      <div className={styles.subdotMain}>
                        <div><small>{workspace?.name || "Workspace"}</small><Status value={subdot.status} /></div>
                        <h3>{subdot.name}</h3>
                        <p>{subdot.responsibility}</p>
                        <span>{artifacts.length} artefacto(s) asignado(s)</span>
                      </div>
                    </article>
                  );
                })}
                {!data.subdots.length ? <Empty>No hay subdots registrados todavía.</Empty> : null}
              </div>
            </section>
          ) : null}

          {tab === "mision" ? (
            <div className={styles.stack}>
              <section className={styles.card}>
                <header className={styles.cardHead}>
                  <div>
                    <small>MISIÓN ACTUAL</small>
                    <h2>{activeMission?.title || "Sin misión activa"}</h2>
                  </div>
                  {activeMission ? <Status value={activeMission.status} /> : null}
                </header>
                {activeMission ? (
                  <>
                    <p className={styles.missionNarrative}>
                      {activeMission.problem_statement || activeMission.diagnosis || agent.description}
                    </p>
                    <div className={styles.factGrid}>
                      <div><small>Prioridad</small><b>{activeMission.priority || "—"}</b></div>
                      <div><small>Etapa</small><b>{activeMission.stage_key || metadata.stage_key || "transversal"}</b></div>
                      <div><small>Evidencias</small><b>{data.evidence.filter((e) => e.mission_id === activeMission.id && e.status === "validated").length}/{data.evidence.filter((e) => e.mission_id === activeMission.id).length}</b></div>
                      <div><small>Actualizada</small><b>{fmt(activeMission.updated_at)}</b></div>
                    </div>
                  </>
                ) : <Empty>No hay una misión activa registrada.</Empty>}
              </section>

              <section className={styles.card}>
                <header className={styles.cardHead}>
                  <div><small>HANDOFFS</small><h2>Cómo entrega y recibe trabajo</h2></div>
                </header>
                <div className={styles.compactList}>
                  {data.handoffs.map((handoff) => (
                    <div key={handoff.id}>
                      <span>
                        <b>{handoff.from_agent_slug} → {handoff.to_agent_slug}</b>
                        <small>{handoff.summary || handoff.signal_type || "Sin resumen"}</small>
                      </span>
                      <Status value={handoff.status} />
                    </div>
                  ))}
                  {!data.handoffs.length ? <Empty>No hay handoffs registrados.</Empty> : null}
                </div>
              </section>
            </div>
          ) : null}

          {tab === "mas" ? (
            <div className={styles.moreGrid}>
              <section className={styles.card}>
                <header className={styles.cardHead}><div><small>MEMORIA</small><h2>Lo que conserva</h2></div><span>{data.memories.length}</span></header>
                <div className={styles.compactList}>
                  {data.memories.slice(0, 8).map((memory) => (
                    <div key={memory.id}>
                      <span><b>{memory.memory_key}</b><small>{memory.kind} · {fmt(memory.updated_at)}</small></span>
                      <em>imp. {memory.importance ?? "—"}</em>
                    </div>
                  ))}
                  {!data.memories.length ? <Empty>Sin memoria visible registrada.</Empty> : null}
                </div>
              </section>

              <section className={styles.card}>
                <header className={styles.cardHead}><div><small>CAPACIDADES</small><h2>Qué sabe hacer</h2></div><span>{data.capabilities.length}</span></header>
                <div className={styles.compactList}>
                  {data.capabilities.map((capability) => (
                    <div key={capability.id || capability.capability_key}>
                      <span><b>{capability.label || capability.capability_key}</b><small>{capability.description || capability.capability_key}</small></span>
                      <code>{capability.capability_key}</code>
                    </div>
                  ))}
                  {!data.capabilities.length ? <Empty>Sin capacidades registradas.</Empty> : null}
                </div>
              </section>

              <section className={styles.card}>
                <header className={styles.cardHead}><div><small>PERMISOS</small><h2>Qué puede ejecutar</h2></div><span>{data.grants.length}</span></header>
                <div className={styles.compactList}>
                  {data.grants.map((grant) => (
                    <div key={grant.id}>
                      <span><b>{grant.action_key}</b><small>{grant.autonomy_level}</small></span>
                      <Status value={grant.approval_required ? "waiting_approval" : "active"} />
                    </div>
                  ))}
                  {!data.grants.length ? <Empty>Sin permisos registrados.</Empty> : null}
                </div>
              </section>

              <section className={styles.card}>
                <header className={styles.cardHead}><div><small>ACTIVIDAD</small><h2>Señales y comandos</h2></div><span>{data.events.length + data.commands.length}</span></header>
                <div className={styles.timeline}>
                  {data.commands.slice(0, 6).map((command) => (
                    <div key={command.id}>
                      <i className={tone(command.status)} />
                      <span><b>{command.action_key || command.command_type}</b><small>{fmt(command.requested_at)} · {human(command.status)}</small></span>
                    </div>
                  ))}
                  {!data.commands.length ? <Empty>Sin comandos recientes.</Empty> : null}
                </div>
              </section>

              <section className={styles.card}>
                <header className={styles.cardHead}><div><small>CRON</small><h2>Trabajo recurrente</h2></div><span>{data.crons.length}</span></header>
                <div className={styles.compactList}>
                  {data.crons.map((cron) => (
                    <div key={cron.id}>
                      <span><b>{cron.name}</b><small>{cron.cycle_label || cron.description}</small></span>
                      <Status value={cron.status} />
                    </div>
                  ))}
                  {!data.crons.length ? <Empty>No hay cron asociado a este DOT.</Empty> : null}
                </div>
              </section>

              <section className={styles.card}>
                <header className={styles.cardHead}><div><small>IDENTIDAD TÉCNICA</small><h2>Constitución</h2></div></header>
                <dl className={styles.definitionList}>
                  <div><dt>Responsabilidad</dt><dd>{metadata.responsibility || agent.description || "—"}</dd></div>
                  <div><dt>Entrada</dt><dd>{metadata.entry_boundary || "—"}</dd></div>
                  <div><dt>Salida</dt><dd>{metadata.exit_boundary || metadata.handoff_boundary || "—"}</dd></div>
                  <div><dt>Runtime</dt><dd>{metadata.runtime || "LINK"}</dd></div>
                  <div><dt>Modelo</dt><dd>{metadata.runtime_model || "—"}</dd></div>
                </dl>
              </section>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
