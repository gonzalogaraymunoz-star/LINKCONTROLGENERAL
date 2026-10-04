"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./LinkMycelium.module.css";

export type GraphNode = {
  id: string;
  label: string;
  kind:
    | "director"
    | "linkdot"
    | "linksubdot"
    | "agent"
    | "workspace"
    | "artifact"
    | "business"
    | "system"
    | "person"
    | "product"
    | "counterparty"
    | "entity";
  status: string;
  description?: string | null;
  source?: string | null;
  href?: string;
  updatedAt?: string | null;
  meta?: Record<string, any>;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  relation: string;
  label: string;
  state: string;
  evidence: any[];
  sourceName?: string | null;
  updatedAt?: string | null;
  meta?: Record<string, any>;
};

type FeedActor = {
  slug: string;
  dotSlug: string;
  name: string;
  state: string;
  stateLabel: string;
  focus?: string | null;
  pendingApprovals: number;
  href: string;
};

type FeedStory = {
  id: string;
  at?: string | null;
  actor: string;
  actorSlug: string;
  tone: string;
  headline: string;
  detail: string;
  href: string;
};

type Feed = {
  ok: boolean;
  generatedAt: string;
  engine: {
    workingNow: number;
    pendingApprovals: number;
    activeQueue: number;
    blocked: number;
  };
  actors: FeedActor[];
  stories: FeedStory[];
};

type Mode = "ecosystem" | "now" | "business" | "flow" | "problems" | "evidence";

const MODES: Array<{ id: Mode; label: string; hint: string }> = [
  { id: "ecosystem", label: "Ecosistema", hint: "Cómo está compuesto LINK" },
  { id: "now", label: "Ahora", hint: "Quién está trabajando" },
  { id: "business", label: "Negocio", hint: "Ver una célula por negocio" },
  { id: "flow", label: "Flujo", hint: "Seguir una relación" },
  { id: "problems", label: "Problemas", hint: "Bloqueos y atención" },
  { id: "evidence", label: "Evidencia", hint: "Qué podemos comprobar" },
];

const KIND_LABEL: Record<GraphNode["kind"], string> = {
  director: "LINK DIRECTOR",
  linkdot: "LINKDOT",
  linksubdot: "LINKSUBDOT",
  agent: "Actor LINK",
  workspace: "Mesa de trabajo",
  artifact: "Artefacto",
  business: "Negocio",
  system: "Sistema",
  person: "Persona / lead",
  product: "Producto",
  counterparty: "Prestador / contraparte",
  entity: "Entidad",
};

const KIND_ICON: Record<GraphNode["kind"], string> = {
  director: "L",
  linkdot: "●",
  linksubdot: "○",
  agent: "◌",
  workspace: "□",
  artifact: "◇",
  business: "B",
  system: "↗",
  person: "P",
  product: "P",
  counterparty: "C",
  entity: "·",
};

function normalize(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function relativeTime(value?: string | null) {
  if (!value) return "sin fecha";
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (!Number.isFinite(diff)) return "sin fecha";
  const sec = Math.max(0, Math.floor(diff / 1000));
  if (sec < 15) return "ahora";
  if (sec < 60) return "hace " + sec + " s";
  const min = Math.floor(sec / 60);
  if (min < 60) return "hace " + min + " min";
  const hours = Math.floor(min / 60);
  if (hours < 24) return "hace " + hours + " h";
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short" }).format(date);
}

function stateLabel(value: string) {
  const state = normalize(value);
  if (state.includes("block")) return "Bloqueado";
  if (state.includes("attention") || state.includes("warn")) return "Necesita atención";
  if (state.includes("proposed") || state.includes("draft")) return "Por comprobar";
  if (state.includes("building")) return "En construcción";
  if (state.includes("paused")) return "En pausa";
  if (state.includes("processing") || state.includes("working")) return "Trabajando";
  if (state.includes("waiting") || state.includes("queued")) return "Esperando";
  return "Activo";
}

function isProblemState(value: string) {
  const state = normalize(value);
  return /block|attention|warn|retry|proposed|draft|failed|error/.test(state);
}

function evidenceText(item: any) {
  if (!item) return "Evidencia registrada";
  if (typeof item === "string") return item;
  const bits = [
    item.label,
    item.signal,
    item.source,
    item.type,
    item.table,
    item.ref,
    item.version ? "v" + item.version : null,
  ].filter(Boolean);
  return bits.length ? bits.join(" · ") : "Evidencia registrada";
}

function sourceSummary(node: GraphNode) {
  if (node.source) return node.source;
  if (node.meta?.sourceSystem) return String(node.meta.sourceSystem);
  return "LINK";
}

function nodeSearchText(node: GraphNode) {
  return normalize(
    [
      node.label,
      node.kind,
      node.status,
      node.description,
      node.source,
      JSON.stringify(node.meta || {}),
    ].join(" "),
  );
}

function positionNodes(nodes: GraphNode[], centralId?: string | null) {
  const positions = new Map<string, { x: number; y: number }>();
  if (!nodes.length) return positions;

  const centerIndex = Math.max(
    0,
    centralId ? nodes.findIndex((node) => node.id === centralId) : 0,
  );
  const central = nodes[centerIndex] || nodes[0];
  positions.set(central.id, { x: 50, y: 48 });

  const orbit = nodes.filter((node) => node.id !== central.id);
  orbit.forEach((node, index) => {
    const ring = index < 8 ? 0 : index < 16 ? 1 : 2;
    const start = ring === 0 ? 0 : ring === 1 ? 8 : 16;
    const ringItems = ring === 0 ? Math.min(8, orbit.length) : ring === 1 ? Math.min(8, Math.max(0, orbit.length - 8)) : Math.max(1, orbit.length - 16);
    const localIndex = index - start;
    const angle = -Math.PI / 2 + (Math.PI * 2 * localIndex) / Math.max(1, ringItems);
    const rx = ring === 0 ? 31 : ring === 1 ? 41 : 46;
    const ry = ring === 0 ? 27 : ring === 1 ? 37 : 41;
    positions.set(node.id, {
      x: Math.max(7, Math.min(93, 50 + Math.cos(angle) * rx)),
      y: Math.max(8, Math.min(92, 48 + Math.sin(angle) * ry)),
    });
  });

  return positions;
}

function relationNeighbors(id: string, edges: GraphEdge[]) {
  const result = new Set<string>();
  for (const edge of edges) {
    if (edge.source === id) result.add(edge.target);
    if (edge.target === id) result.add(edge.source);
  }
  return result;
}

export default function LinkMycelium({
  initialNodes,
  initialEdges,
  generatedAt,
}: {
  initialNodes: GraphNode[];
  initialEdges: GraphEdge[];
  generatedAt: string;
}) {
  const [mode, setMode] = useState<Mode>("ecosystem");
  const [query, setQuery] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [feedError, setFeedError] = useState("");

  const nodeMap = useMemo(
    () => new Map(initialNodes.map((node) => [node.id, node])),
    [initialNodes],
  );

  const root = useMemo(
    () =>
      initialNodes.find((node) => node.kind === "director") ||
      initialNodes.find((node) => node.meta?.slug === "link-director") ||
      initialNodes.find((node) => node.kind === "linkdot") ||
      initialNodes[0],
    [initialNodes],
  );

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function load() {
      try {
        const response = await fetch("/api/live-feed", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok || !payload?.ok) throw new Error(payload?.error || "feed_unavailable");
        if (!active) return;
        setFeed(payload);
        setFeedError("");
      } catch (error: any) {
        if (!active) return;
        setFeedError(error?.message || "No pudimos leer LINK en vivo");
      }
    }

    void load();
    timer = setInterval(() => void load(), 5000);
    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  const selectedNode = selectedNodeId ? nodeMap.get(selectedNodeId) || null : null;
  const selectedEdge = selectedEdgeId
    ? initialEdges.find((edge) => edge.id === selectedEdgeId) || null
    : null;

  const actorNodeIds = useMemo(() => {
    const ids = new Map<string, string>();
    for (const node of initialNodes) {
      const keys = [
        node.meta?.slug,
        node.meta?.dot_slug,
        node.meta?.dotSlug,
        node.id,
      ].filter(Boolean);
      for (const key of keys) ids.set(String(key), node.id);
    }
    return ids;
  }, [initialNodes]);

  const liveProblemIds = useMemo(() => {
    const ids = new Set<string>();
    for (const actor of feed?.actors || []) {
      if (!isProblemState(actor.state) && !actor.pendingApprovals) continue;
      const id = actorNodeIds.get(actor.slug) || actorNodeIds.get(actor.dotSlug);
      if (id) ids.add(id);
    }
    return ids;
  }, [feed, actorNodeIds]);

  const searchMatches = useMemo(() => {
    const term = normalize(query.trim());
    if (!term) return [] as GraphNode[];

    const asksProblems = /bloque|problema|atencion|fallo|error/.test(term);
    const asksWorking = /quien.*trabaj|trabajando|ahora/.test(term);
    const workingIds = new Set<string>();

    if (asksWorking) {
      for (const actor of feed?.actors || []) {
        if (!/processing|working|queued|retry/.test(actor.state)) continue;
        const id = actorNodeIds.get(actor.slug) || actorNodeIds.get(actor.dotSlug);
        if (id) workingIds.add(id);
      }
    }

    return initialNodes
      .filter((node) => {
        if (asksProblems && (isProblemState(node.status) || liveProblemIds.has(node.id))) return true;
        if (asksWorking && workingIds.has(node.id)) return true;
        return nodeSearchText(node).includes(term);
      })
      .slice(0, 18);
  }, [query, initialNodes, feed, actorNodeIds, liveProblemIds]);

  const visibleIds = useMemo(() => {
    const ids = new Set<string>();
    const selected = selectedNodeId ? nodeMap.get(selectedNodeId) : null;

    if (query.trim()) {
      for (const match of searchMatches.slice(0, 12)) {
        ids.add(match.id);
        const neighbors = relationNeighbors(match.id, initialEdges);
        for (const neighbor of Array.from(neighbors).slice(0, 4)) ids.add(neighbor);
      }
      return ids;
    }

    if (selected) {
      ids.add(selected.id);
      const firstHop = Array.from(relationNeighbors(selected.id, initialEdges));
      for (const id of firstHop.slice(0, mode === "flow" ? 12 : 17)) ids.add(id);

      if (mode === "flow") {
        for (const first of firstHop.slice(0, 7)) {
          for (const second of Array.from(relationNeighbors(first, initialEdges)).slice(0, 3)) {
            ids.add(second);
            if (ids.size >= 20) break;
          }
          if (ids.size >= 20) break;
        }
      }
      return ids;
    }

    if (mode === "ecosystem" || mode === "flow") {
      if (root) ids.add(root.id);
      for (const node of initialNodes.filter((item) => item.kind === "linkdot").slice(0, 10)) {
        ids.add(node.id);
      }
      return ids;
    }

    if (mode === "now") {
      for (const actor of feed?.actors || []) {
        const id = actorNodeIds.get(actor.slug) || actorNodeIds.get(actor.dotSlug);
        if (id) ids.add(id);
      }
      if (!ids.size && root) ids.add(root.id);
      return ids;
    }

    if (mode === "business") {
      for (const node of initialNodes.filter((item) => item.kind === "business").slice(0, 15)) {
        ids.add(node.id);
      }
      return ids;
    }

    if (mode === "problems") {
      for (const node of initialNodes) {
        if (isProblemState(node.status) || liveProblemIds.has(node.id)) ids.add(node.id);
        if (ids.size >= 16) break;
      }
      for (const edge of initialEdges) {
        if (!isProblemState(edge.state)) continue;
        ids.add(edge.source);
        ids.add(edge.target);
        if (ids.size >= 18) break;
      }
      return ids;
    }

    if (mode === "evidence") {
      for (const edge of initialEdges.filter((item) => item.evidence?.length).slice(0, 14)) {
        ids.add(edge.source);
        ids.add(edge.target);
        if (ids.size >= 20) break;
      }
      return ids;
    }

    return ids;
  }, [
    query,
    searchMatches,
    selectedNodeId,
    nodeMap,
    mode,
    root,
    initialNodes,
    initialEdges,
    feed,
    actorNodeIds,
    liveProblemIds,
  ]);

  const visibleNodes = useMemo(() => {
    const values = initialNodes.filter((node) => visibleIds.has(node.id));
    const priority = (node: GraphNode) => {
      if (node.id === selectedNodeId) return -10;
      if (node.id === root?.id) return -9;
      if (node.kind === "linkdot") return -8;
      if (node.kind === "business") return -6;
      return 0;
    };
    return values.sort((a, b) => priority(a) - priority(b) || a.label.localeCompare(b.label));
  }, [initialNodes, visibleIds, selectedNodeId, root]);

  const visibleEdges = useMemo(() => {
    const ids = new Set(visibleNodes.map((node) => node.id));
    return initialEdges
      .filter((edge) => ids.has(edge.source) && ids.has(edge.target))
      .slice(0, 45);
  }, [initialEdges, visibleNodes]);

  const centralId =
    selectedNodeId ||
    (root && visibleIds.has(root.id) ? root.id : visibleNodes[0]?.id) ||
    null;

  const positions = useMemo(
    () => positionNodes(visibleNodes, centralId),
    [visibleNodes, centralId],
  );

  const activeStory = feed?.stories?.[0] || null;

  function focusNode(id: string) {
    setSelectedNodeId(id);
    setSelectedEdgeId(null);
    setQuery("");
  }

  function reset() {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setQuery("");
    setMode("ecosystem");
  }

  function openActor(actor: FeedActor) {
    const id = actorNodeIds.get(actor.slug) || actorNodeIds.get(actor.dotSlug);
    if (id) {
      setMode("now");
      focusNode(id);
    }
  }

  const inspectorNode = selectedNode;
  const inspectorEdge = selectedEdge;
  const problemCount =
    initialNodes.filter((node) => isProblemState(node.status)).length +
    initialEdges.filter((edge) => isProblemState(edge.state)).length +
    (feed?.engine.blocked || 0);

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <a href="/" className={styles.mark} aria-label="Volver a Control Central">L</a>
          <div>
            <span>LINK · CONTROL CENTRAL</span>
            <b>Micelio</b>
          </div>
        </div>
        <div className={styles.topActions}>
          <span className={styles.truthBadge}><i /> Fuente viva · Supabase</span>
          <a href="/linkguide">LINK Guide</a>
          <a href="/">Control Central</a>
        </div>
      </header>

      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>EL ORGANISMO DE LINK</span>
          <h1>Entender antes de profundizar.</h1>
          <p>
            Cada punto es algo real. Cada línea explica una relación que LINK puede comprobar.
            Selecciona un nodo para abrir solo su entorno inmediato.
          </p>
        </div>
        <div className={styles.heroStats}>
          <div><strong>{initialNodes.length}</strong><span>elementos registrados</span></div>
          <div><strong>{initialEdges.length}</strong><span>relaciones</span></div>
          <div><strong>{problemCount}</strong><span>señales de atención</span></div>
        </div>
      </section>

      <section className={styles.liveRail}>
        <div className={styles.liveLabel}>
          <i />
          <span>LINK ESTÁ VIVO</span>
        </div>
        {activeStory ? (
          <button
            onClick={() => {
              const actor = feed?.actors.find((item) => item.slug === activeStory.actorSlug);
              if (actor) openActor(actor);
            }}
          >
            <b>{activeStory.headline}</b>
            <span>{activeStory.detail}</span>
            <small>{relativeTime(activeStory.at)}</small>
          </button>
        ) : (
          <div className={styles.liveEmpty}>
            <b>{feedError ? "No pudimos leer la actividad en vivo." : "Esperando la próxima señal de LINK."}</b>
            <span>{feedError || "El Micelio sigue conectado a su fuente de verdad."}</span>
          </div>
        )}
        {feed ? (
          <div className={styles.liveNumbers}>
            <span><b>{feed.engine.workingNow}</b> trabajando</span>
            <span><b>{feed.engine.pendingApprovals}</b> aprobaciones</span>
            <span className={feed.engine.blocked ? styles.danger : ""}><b>{feed.engine.blocked}</b> bloqueados</span>
          </div>
        ) : null}
      </section>

      <section className={styles.controls}>
        <div className={styles.modes}>
          {MODES.map((item) => (
            <button
              key={item.id}
              className={mode === item.id ? styles.modeActive : ""}
              onClick={() => {
                setMode(item.id);
                setSelectedEdgeId(null);
                if (item.id !== "flow") setSelectedNodeId(null);
              }}
              title={item.hint}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className={styles.searchWrap}>
          <span>⌕</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedEdgeId(null);
              setSelectedNodeId(null);
            }}
            placeholder="Busca un negocio, sistema, actor o pregunta por un bloqueo…"
            aria-label="Buscar en el Micelio"
          />
          {query ? <button onClick={() => setQuery("")}>×</button> : null}
        </div>
      </section>

      {query.trim() ? (
        <div className={styles.searchSummary}>
          <b>{searchMatches.length ? searchMatches.length + " coincidencias" : "Sin coincidencias"}</b>
          <span>
            El Micelio oculta el resto para que puedas concentrarte en lo que preguntaste.
          </span>
          <div>
            {searchMatches.slice(0, 6).map((node) => (
              <button key={node.id} onClick={() => focusNode(node.id)}>
                {KIND_LABEL[node.kind]} · {node.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <section className={styles.workspace}>
        <div className={styles.canvasCard}>
          <header className={styles.canvasHead}>
            <div>
              <span className={styles.eyebrow}>{MODES.find((item) => item.id === mode)?.label}</span>
              <h2>
                {selectedNode
                  ? selectedNode.label
                  : mode === "ecosystem"
                    ? "LINK desde el centro"
                    : MODES.find((item) => item.id === mode)?.hint}
              </h2>
            </div>
            <div className={styles.canvasHeadActions}>
              {selectedNode || selectedEdge || query ? <button onClick={reset}>← Volver al Micelio</button> : null}
              <span>{visibleNodes.length} visibles · {visibleEdges.length} conexiones</span>
            </div>
          </header>

          <div className={styles.canvas}>
            {!visibleNodes.length ? (
              <div className={styles.emptyState}>
                <span>○</span>
                <h3>No hay elementos para esta lente.</h3>
                <p>No vamos a inventar información para llenar la pantalla.</p>
                <button onClick={reset}>Ver ecosistema</button>
              </div>
            ) : (
              <>
                <svg className={styles.edges} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  {visibleEdges.map((edge) => {
                    const from = positions.get(edge.source);
                    const to = positions.get(edge.target);
                    if (!from || !to) return null;
                    const proven = edge.evidence?.length > 0 && normalize(edge.state) !== "proposed";
                    const active = selectedEdgeId === edge.id;
                    return (
                      <g key={edge.id}>
                        <line
                          x1={from.x}
                          y1={from.y}
                          x2={to.x}
                          y2={to.y}
                          className={
                            styles.edgeLine +
                            " " +
                            (proven ? styles.edgeProven : styles.edgeProposed) +
                            " " +
                            (active ? styles.edgeSelected : "")
                          }
                        />
                        <line
                          x1={from.x}
                          y1={from.y}
                          x2={to.x}
                          y2={to.y}
                          className={styles.edgeHit}
                          onClick={() => {
                            setSelectedEdgeId(edge.id);
                            setSelectedNodeId(null);
                          }}
                        />
                      </g>
                    );
                  })}
                </svg>

                {visibleNodes.map((node) => {
                  const pos = positions.get(node.id);
                  if (!pos) return null;
                  const isCenter = node.id === centralId;
                  const hasProblem = isProblemState(node.status) || liveProblemIds.has(node.id);
                  const actor = (feed?.actors || []).find(
                    (item) =>
                      actorNodeIds.get(item.slug) === node.id ||
                      actorNodeIds.get(item.dotSlug) === node.id,
                  );
                  return (
                    <button
                      key={node.id}
                      className={
                        styles.node +
                        " " +
                        styles["kind_" + node.kind] +
                        " " +
                        (isCenter ? styles.nodeCenter : "") +
                        " " +
                        (hasProblem ? styles.nodeProblem : "") +
                        " " +
                        (selectedNodeId === node.id ? styles.nodeSelected : "")
                      }
                      style={{ left: pos.x + "%", top: pos.y + "%" }}
                      onClick={() => focusNode(node.id)}
                      title={node.description || node.label}
                    >
                      <span className={styles.nodeIcon}>{KIND_ICON[node.kind]}</span>
                      <span className={styles.nodeCopy}>
                        <small>{KIND_LABEL[node.kind]}</small>
                        <b>{node.label.replace(/^LINK(DOT|SUBDOT)?\s*[·-]?\s*/i, "")}</b>
                        <em>
                          {actor?.stateLabel || stateLabel(node.status)}
                        </em>
                      </span>
                      {hasProblem ? <i className={styles.problemPip}>!</i> : null}
                    </button>
                  );
                })}
              </>
            )}
          </div>

          <footer className={styles.legend}>
            <span><i className={styles.legendSolid} /> Relación comprobada</span>
            <span><i className={styles.legendDashed} /> Por comprobar</span>
            <span><i className={styles.legendProblem} /> Necesita atención</span>
            <small>Actualizado {relativeTime(generatedAt)}</small>
          </footer>
        </div>

        <aside className={styles.inspector}>
          {inspectorEdge ? (
            <EdgeInspector
              edge={inspectorEdge}
              source={nodeMap.get(inspectorEdge.source)}
              target={nodeMap.get(inspectorEdge.target)}
              onNode={focusNode}
              onClose={() => setSelectedEdgeId(null)}
            />
          ) : inspectorNode ? (
            <NodeInspector
              node={inspectorNode}
              edges={initialEdges.filter(
                (edge) => edge.source === inspectorNode.id || edge.target === inspectorNode.id,
              )}
              nodeMap={nodeMap}
              actor={(feed?.actors || []).find(
                (item) =>
                  actorNodeIds.get(item.slug) === inspectorNode.id ||
                  actorNodeIds.get(item.dotSlug) === inspectorNode.id,
              )}
              onNode={focusNode}
              onEdge={(id) => {
                setSelectedNodeId(null);
                setSelectedEdgeId(id);
              }}
              onClose={() => setSelectedNodeId(null)}
            />
          ) : (
            <WelcomeInspector
              mode={mode}
              nodes={visibleNodes}
              edges={visibleEdges}
              feed={feed}
              onNode={focusNode}
            />
          )}
        </aside>
      </section>
    </main>
  );
}

function NodeInspector({
  node,
  edges,
  nodeMap,
  actor,
  onNode,
  onEdge,
  onClose,
}: {
  node: GraphNode;
  edges: GraphEdge[];
  nodeMap: Map<string, GraphNode>;
  actor?: FeedActor;
  onNode: (id: string) => void;
  onEdge: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className={styles.inspectorInner}>
      <header className={styles.inspectorHead}>
        <span className={styles.eyebrow}>{KIND_LABEL[node.kind]}</span>
        <button onClick={onClose}>×</button>
      </header>
      <div className={styles.inspectorTitle}>
        <span className={styles.bigIcon}>{KIND_ICON[node.kind]}</span>
        <div>
          <h2>{node.label}</h2>
          <span className={isProblemState(node.status) ? styles.badState : styles.goodState}>
            {actor?.stateLabel || stateLabel(node.status)}
          </span>
        </div>
      </div>

      <section className={styles.inspectorSection}>
        <small>QUÉ ES</small>
        <p>{node.description || "Elemento registrado dentro de LINK."}</p>
      </section>

      {actor ? (
        <section className={styles.inspectorSection}>
          <small>QUÉ ESTÁ HACIENDO AHORA</small>
          <p>{actor.focus || actor.stateLabel}</p>
          {actor.pendingApprovals ? (
            <span className={styles.attentionBox}>
              {actor.pendingApprovals} acción{actor.pendingApprovals === 1 ? "" : "es"} espera{actor.pendingApprovals === 1 ? "" : "n"} aprobación.
            </span>
          ) : null}
        </section>
      ) : null}

      <section className={styles.inspectorSection}>
        <small>CON QUIÉN CONVERSA</small>
        <div className={styles.relationsList}>
          {edges.slice(0, 12).map((edge) => {
            const otherId = edge.source === node.id ? edge.target : edge.source;
            const other = nodeMap.get(otherId);
            if (!other) return null;
            return (
              <div key={edge.id} className={styles.relationRow}>
                <button className={styles.relationMain} onClick={() => onNode(other.id)}>
                  <b>{other.label}</b>
                  <span>{edge.label}</span>
                </button>
                <button
                  className={edge.evidence?.length ? styles.evidenceOk : styles.evidenceMissing}
                  onClick={() => onEdge(edge.id)}
                  title="Ver por qué existe esta relación"
                >
                  {edge.evidence?.length ? "✓" : "?"}
                </button>
              </div>
            );
          })}
          {!edges.length ? <p className={styles.muted}>Todavía no hay relaciones registradas.</p> : null}
        </div>
      </section>

      <section className={styles.inspectorSection}>
        <small>COMPROBACIÓN</small>
        <div className={styles.factGrid}>
          <div><span>Fuente</span><b>{sourceSummary(node)}</b></div>
          <div><span>Última señal</span><b>{relativeTime(node.updatedAt)}</b></div>
        </div>
      </section>

      {node.href ? (
        <a className={styles.primaryLink} href={node.href}>
          Abrir espacio de trabajo →
        </a>
      ) : null}
    </div>
  );
}

function EdgeInspector({
  edge,
  source,
  target,
  onNode,
  onClose,
}: {
  edge: GraphEdge;
  source?: GraphNode;
  target?: GraphNode;
  onNode: (id: string) => void;
  onClose: () => void;
}) {
  const proven = edge.evidence?.length > 0 && normalize(edge.state) !== "proposed";

  return (
    <div className={styles.inspectorInner}>
      <header className={styles.inspectorHead}>
        <span className={styles.eyebrow}>ESTA CONEXIÓN</span>
        <button onClick={onClose}>×</button>
      </header>

      <div className={styles.connectionTitle}>
        <span className={proven ? styles.connectionVerified : styles.connectionProposed}>
          {proven ? "✓ Comprobada" : "⋯ Por comprobar"}
        </span>
        <h2>{edge.label}</h2>
      </div>

      <section className={styles.connectionPair}>
        <button onClick={() => source && onNode(source.id)}>
          <small>ORIGEN</small>
          <b>{source?.label || edge.source}</b>
        </button>
        <span>→</span>
        <button onClick={() => target && onNode(target.id)}>
          <small>DESTINO</small>
          <b>{target?.label || edge.target}</b>
        </button>
      </section>

      <section className={styles.inspectorSection}>
        <small>QUÉ SIGNIFICA</small>
        <p>{edge.label || "Estos dos elementos tienen una relación registrada dentro de LINK."}</p>
        <span className={styles.relationCode}>{edge.relation}</span>
      </section>

      <section className={styles.inspectorSection}>
        <small>POR QUÉ SABEMOS QUE EXISTE</small>
        {edge.evidence?.length ? (
          <div className={styles.evidenceList}>
            {edge.evidence.map((item, index) => (
              <div key={index}>
                <i>✓</i>
                <span>{evidenceText(item)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.noEvidence}>
            <b>Esta relación todavía no tiene evidencia suficiente.</b>
            <span>La mostramos punteada para no confundir una hipótesis con un hecho.</span>
          </div>
        )}
      </section>

      <section className={styles.inspectorSection}>
        <small>FUENTE Y ESTADO</small>
        <div className={styles.factGrid}>
          <div><span>Registro</span><b>{edge.sourceName || "LINK"}</b></div>
          <div><span>Estado</span><b>{stateLabel(edge.state)}</b></div>
          <div><span>Última señal</span><b>{relativeTime(edge.updatedAt)}</b></div>
        </div>
      </section>
    </div>
  );
}

function WelcomeInspector({
  mode,
  nodes,
  edges,
  feed,
  onNode,
}: {
  mode: Mode;
  nodes: GraphNode[];
  edges: GraphEdge[];
  feed: Feed | null;
  onNode: (id: string) => void;
}) {
  const modeCopy: Record<Mode, { title: string; body: string }> = {
    ecosystem: {
      title: "Empieza por una parte del organismo.",
      body: "Aquí no mostramos toda la complejidad de golpe. Toca un LINKDOT para ver solo lo que depende de él.",
    },
    now: {
      title: "Quién está moviendo LINK.",
      body: "Esta lente usa el feed real de Control Central para mostrar los actores que tienen trabajo, espera o bloqueos.",
    },
    business: {
      title: "Entra por un negocio.",
      body: "Selecciona un negocio para descubrir sus artefactos, prestadores, productos y relaciones comprobadas.",
    },
    flow: {
      title: "Sigue el recorrido.",
      body: "Selecciona cualquier nodo y el Micelio abre hasta dos saltos para que puedas seguir el flujo sin perder el contexto.",
    },
    problems: {
      title: "Solo lo que necesita atención.",
      body: "Aquí desaparece el ruido. Quedan bloqueos, relaciones propuestas y actores que esperan una decisión.",
    },
    evidence: {
      title: "La capa de confianza.",
      body: "Cada conexión visible aquí tiene una evidencia registrada. Toca una línea para leer exactamente de dónde sale.",
    },
  };

  const info = modeCopy[mode];

  return (
    <div className={styles.inspectorInner}>
      <span className={styles.eyebrow}>CÓMO LEER ESTE MICELIO</span>
      <h2 className={styles.welcomeTitle}>{info.title}</h2>
      <p className={styles.welcomeBody}>{info.body}</p>

      {mode === "now" && feed ? (
        <section className={styles.inspectorSection}>
          <small>AHORA</small>
          <div className={styles.actorMiniList}>
            {feed.actors.slice(0, 8).map((actor) => (
              <button
                key={actor.slug}
                onClick={() => {
                  const node = nodes.find(
                    (item) => item.meta?.slug === actor.slug || item.meta?.dot_slug === actor.dotSlug,
                  );
                  if (node) onNode(node.id);
                }}
              >
                <i className={isProblemState(actor.state) ? styles.miniProblem : styles.miniLive} />
                <span><b>{actor.name}</b><small>{actor.stateLabel}</small></span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.inspectorSection}>
        <small>LO QUE ESTÁS VIENDO</small>
        <div className={styles.factGrid}>
          <div><span>Elementos</span><b>{nodes.length}</b></div>
          <div><span>Conexiones</span><b>{edges.length}</b></div>
          <div><span>Con evidencia</span><b>{edges.filter((edge) => edge.evidence?.length).length}</b></div>
        </div>
      </section>

      <section className={styles.ruleCard}>
        <span>REGLA LINK</span>
        <b>Una línea no existe solo porque se vea bien.</b>
        <p>Si LINK no puede demostrar la relación, se muestra como “por comprobar”.</p>
      </section>
    </div>
  );
}
