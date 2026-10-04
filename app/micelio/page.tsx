import LinkMycelium, { type GraphEdge, type GraphNode } from "@/components/LinkMycelium";
import { getCentralSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Row = Record<string, any>;

function labelForEntity(row: Row) {
  const meta = row.metadata || {};
  return String(
    meta.label ||
      meta.display_label ||
      meta.name ||
      meta.title ||
      meta.slug ||
      row.global_id ||
      "Elemento LINK",
  );
}

function kindForEntity(row: Row): GraphNode["kind"] {
  const meta = row.metadata || {};
  if (row.entity_type === "agent") {
    const role = String(meta.agent_kind || meta.role || "").toLowerCase();
    if (meta.slug === "link-director" || row.global_id === "LNK-AGT-DIRECTOR") return "director";
    if (role === "linkdot") return "linkdot";
    if (role === "linksubdot") return "linksubdot";
    return "agent";
  }
  if (row.entity_type === "business") return "business";
  if (row.entity_type === "product") return "product";
  if (row.entity_type === "counterparty") return "counterparty";
  if (row.entity_type === "person" || row.entity_type === "lead") return "person";
  if (row.entity_type === "system" || row.entity_type === "integration") return "system";
  return "entity";
}

function descriptionForEntity(row: Row) {
  const meta = row.metadata || {};
  return String(
    meta.description ||
      meta.summary ||
      meta.responsibility ||
      meta.services_offered ||
      meta.category ||
      meta.area ||
      "Elemento registrado en el ecosistema LINK.",
  );
}

function normalizeEvidence(value: unknown) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return [value];
  if (value) return [{ label: String(value) }];
  return [];
}

function cleanSystemKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, "-").replace(/(^-|-$)/g, "");
}

export default async function MicelioPage() {
  const supabase = getCentralSupabase();

  if (!supabase) {
    return (
      <main style={{ padding: 32 }}>
        <h1>Micelio LINK</h1>
        <p>No pudimos abrir la fuente viva de Control Central.</p>
      </main>
    );
  }

  const [
    entitiesResult,
    relationsResult,
    skillsResult,
    workspacesResult,
    subdotsResult,
    artifactsResult,
    businessesResult,
  ] = await Promise.all([
    supabase
      .from("ecosystem_entities")
      .select("id,global_id,owner_record_id,entity_type,status,metadata,created_at,updated_at")
      .neq("status", "archived")
      .order("updated_at", { ascending: false })
      .limit(450),
    supabase
      .from("entity_relations")
      .select("id,source_global_id,target_global_id,relation,state,label,evidence,metadata,created_at,updated_at")
      .neq("state", "archived")
      .order("updated_at", { ascending: false })
      .limit(700),
    supabase
      .from("link_skills")
      .select("id,slug,name,status,metadata")
      .eq("status", "active"),
    supabase
      .from("link_dot_workspaces")
      .select("id,workspace_key,app_key,name,description,owner_linkdot_slug,owner_director_slug,route,status,metadata,updated_at")
      .neq("status", "archived")
      .order("updated_at", { ascending: false }),
    supabase
      .from("link_dot_workspace_subdots")
      .select("id,workspace_id,subdot_slug,name,responsibility,status,metadata,updated_at")
      .neq("status", "archived")
      .order("updated_at", { ascending: false }),
    supabase
      .from("link_dot_artifacts")
      .select("id,workspace_id,subdot_id,business_id,artifact_key,name,description,artifact_type,work_definition,route,source_system,source_table,source_ref,status,metadata,updated_at")
      .neq("status", "archived")
      .order("updated_at", { ascending: false }),
    supabase
      .from("link_world_businesses")
      .select("id,global_id,slug,name,sector,city,country,summary,evidence,verification_status,created_from,updated_at")
      .order("updated_at", { ascending: false }),
  ]);

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const nodeIds = new Set<string>();
  const edgeKeys = new Set<string>();
  const edgePairs = new Set<string>();
  const aliasToId = new Map<string, string>();
  const skillById = new Map(
    (skillsResult.data || []).map((skill: Row) => [String(skill.id), skill]),
  );
  const businessIdToNodeId = new Map<string, string>();
  const subdotIdToNodeId = new Map<string, string>();

  function addAlias(alias: unknown, id: string) {
    const value = String(alias || "").trim();
    if (value) aliasToId.set(value, id);
  }

  function addNode(node: GraphNode) {
    if (nodeIds.has(node.id)) return;
    nodeIds.add(node.id);
    nodes.push(node);
  }

  function addEdge(edge: GraphEdge) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) return;
    const key = edge.source + "|" + edge.target + "|" + edge.relation;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edgePairs.add(edge.source + "|" + edge.target);
    edges.push(edge);
  }

  for (const row of entitiesResult.data || []) {
    const id = String(row.global_id);
    const skill = skillById.get(String(row.owner_record_id || ""));
    const meta = { ...(skill?.metadata || {}), ...(row.metadata || {}) };
    const normalizedRow = { ...row, metadata: meta };
    const kind = kindForEntity(normalizedRow);
    const href =
      kind === "director" || kind === "linkdot" || kind === "linksubdot" || kind === "agent"
        ? "/dots/" + (meta.dot_slug || meta.slug || "link-director")
        : undefined;

    addNode({
      id,
      label: String(meta.label || meta.display_label || skill?.name || labelForEntity(normalizedRow)),
      kind,
      status: String(row.status || "active"),
      description: descriptionForEntity(normalizedRow),
      source: "ecosystem_entities",
      href,
      updatedAt: row.updated_at || row.created_at || null,
      meta: { ...meta, entityType: row.entity_type },
    });

    addAlias(id, id);
    addAlias(meta.slug, id);
    addAlias(meta.dot_slug, id);
    addAlias(meta.label, id);
    addAlias(meta.display_label, id);
    addAlias(skill?.slug, id);
  }

  for (const row of businessesResult.data || []) {
    const existing =
      (row.global_id && aliasToId.get(String(row.global_id))) ||
      (row.slug && aliasToId.get(String(row.slug)));
    const id = existing || String(row.global_id || "business:" + row.id);

    if (!existing) {
      addNode({
        id,
        label: String(row.name || row.slug || "Negocio LINK"),
        kind: "business",
        status: String(row.verification_status || "active"),
        description: String(row.summary || row.sector || "Negocio registrado en LINK World."),
        source: "link_world_businesses",
        updatedAt: row.updated_at || null,
        meta: {
          businessId: row.id,
          slug: row.slug,
          sector: row.sector,
          city: row.city,
          country: row.country,
          createdFrom: row.created_from,
          evidence: row.evidence,
        },
      });
    }

    businessIdToNodeId.set(String(row.id), id);
    addAlias(row.global_id, id);
    addAlias(row.slug, id);
  }

  for (const row of relationsResult.data || []) {
    const source = aliasToId.get(String(row.source_global_id)) || String(row.source_global_id);
    const target = aliasToId.get(String(row.target_global_id)) || String(row.target_global_id);
    addEdge({
      id: String(row.id || "relation:" + source + ":" + target + ":" + row.relation),
      source,
      target,
      relation: String(row.relation || "related_to"),
      label: String(row.label || row.relation || "Relación LINK"),
      state: String(row.state || "active"),
      evidence: normalizeEvidence(row.evidence),
      sourceName: "entity_relations",
      updatedAt: row.updated_at || row.created_at || null,
      meta: row.metadata || {},
    });
  }

  for (const row of entitiesResult.data || []) {
    const child = aliasToId.get(String(row.global_id));
    if (!child) continue;
    const skill = skillById.get(String(row.owner_record_id || ""));
    const meta = { ...(skill?.metadata || {}), ...(row.metadata || {}) };
    const parentAlias = meta.parent_agent || meta.parent_dot;
    const parent = parentAlias ? aliasToId.get(String(parentAlias)) : null;
    if (!parent || parent === child) continue;
    if (edgePairs.has(parent + "|" + child)) continue;

    addEdge({
      id: "architecture:" + parent + ":" + child,
      source: parent,
      target: child,
      relation: "directs",
      label: "Dirección dentro de LINK",
      state: "active",
      evidence: [{ type: "architecture", source: "ecosystem_entities", signal: "parent_agent / parent_dot" }],
      sourceName: "ecosystem_entities",
      updatedAt: row.updated_at || null,
    });
  }

  const workspaceIdToNodeId = new Map<string, string>();

  for (const row of workspacesResult.data || []) {
    const id = "workspace:" + row.id;
    workspaceIdToNodeId.set(String(row.id), id);
    addNode({
      id,
      label: String(row.name || row.workspace_key || "Espacio DOT"),
      kind: "workspace",
      status: String(row.status || "active"),
      description: String(row.description || "Mesa de trabajo persistente de un LINKDOT."),
      source: "link_dot_workspaces",
      href: row.route || undefined,
      updatedAt: row.updated_at || null,
      meta: {
        workspaceKey: row.workspace_key,
        appKey: row.app_key,
        ownerLinkdotSlug: row.owner_linkdot_slug,
        ownerDirectorSlug: row.owner_director_slug,
      },
    });

    addAlias(row.workspace_key, id);

    const owner =
      aliasToId.get(String(row.owner_linkdot_slug || "")) ||
      aliasToId.get(String(row.owner_director_slug || ""));
    if (owner) {
      addEdge({
        id: "workspace-owner:" + row.id,
        source: owner,
        target: id,
        relation: "owns_workspace",
        label: "Trabaja en este espacio",
        state: String(row.status || "active"),
        evidence: [{ type: "workspace_record", source: "link_dot_workspaces", ref: row.workspace_key }],
        sourceName: "link_dot_workspaces",
        updatedAt: row.updated_at || null,
      });
    }
  }

  for (const row of subdotsResult.data || []) {
    const existing = aliasToId.get(String(row.subdot_slug || ""));
    const id = existing || "subdot:" + row.id;
    subdotIdToNodeId.set(String(row.id), id);

    if (!existing) {
      addNode({
        id,
        label: String(row.name || row.subdot_slug || "LINKSUBDOT"),
        kind: "linksubdot",
        status: String(row.status || "active"),
        description: String(row.responsibility || "Especialista operativo dentro de un LINKDOT."),
        source: "link_dot_workspace_subdots",
        updatedAt: row.updated_at || null,
        meta: { slug: row.subdot_slug, workspaceId: row.workspace_id, ...(row.metadata || {}) },
      });
      addAlias(row.subdot_slug, id);
    }

    const workspace = workspaceIdToNodeId.get(String(row.workspace_id));
    if (workspace) {
      addEdge({
        id: "workspace-subdot:" + row.id,
        source: workspace,
        target: id,
        relation: "contains_specialist",
        label: "Especialista de este espacio",
        state: String(row.status || "active"),
        evidence: [{ type: "workspace_membership", source: "link_dot_workspace_subdots" }],
        sourceName: "link_dot_workspace_subdots",
        updatedAt: row.updated_at || null,
      });
    }
  }

  const systemNodes = new Map<string, string>();

  function ensureSystem(name: string) {
    const clean = String(name || "").trim();
    if (!clean) return null;
    const key = cleanSystemKey(clean);
    if (!key) return null;
    const existing = systemNodes.get(key);
    if (existing) return existing;
    const id = "system:" + key;
    systemNodes.set(key, id);
    addNode({
      id,
      label: clean,
      kind: "system",
      status: "active",
      description: "Sistema comprobado como fuente o destino de trabajo dentro de LINK.",
      source: "link_dot_artifacts",
      meta: { systemKey: key },
    });
    return id;
  }

  for (const row of artifactsResult.data || []) {
    const id = "artifact:" + row.id;
    addNode({
      id,
      label: String(row.name || row.artifact_key || "Artefacto LINK"),
      kind: "artifact",
      status: String(row.status || "active"),
      description: String(row.description || row.work_definition || "Herramienta operativa de LINK."),
      source: "link_dot_artifacts",
      href: row.route || undefined,
      updatedAt: row.updated_at || null,
      meta: {
        artifactKey: row.artifact_key,
        artifactType: row.artifact_type,
        sourceSystem: row.source_system,
        sourceTable: row.source_table,
        sourceRef: row.source_ref,
        businessId: row.business_id,
      },
    });

    const subdot = subdotIdToNodeId.get(String(row.subdot_id || ""));
    const workspace = workspaceIdToNodeId.get(String(row.workspace_id || ""));
    const parent = subdot || workspace;

    if (parent) {
      addEdge({
        id: "artifact-parent:" + row.id,
        source: parent,
        target: id,
        relation: "operates_artifact",
        label: "Opera este artefacto",
        state: String(row.status || "active"),
        evidence: [{
          type: "artifact_record",
          source: "link_dot_artifacts",
          table: row.source_table || null,
          ref: row.source_ref || row.artifact_key,
        }],
        sourceName: "link_dot_artifacts",
        updatedAt: row.updated_at || null,
      });
    }

    const business = businessIdToNodeId.get(String(row.business_id || ""));
    if (business) {
      addEdge({
        id: "artifact-business:" + row.id,
        source: id,
        target: business,
        relation: "serves_business",
        label: "Trabaja para este negocio",
        state: String(row.status || "active"),
        evidence: [{ type: "artifact_business_link", source: "link_dot_artifacts" }],
        sourceName: "link_dot_artifacts",
        updatedAt: row.updated_at || null,
      });
    }

    const system = ensureSystem(String(row.source_system || ""));
    if (system) {
      addEdge({
        id: "artifact-system:" + row.id,
        source: id,
        target: system,
        relation: "uses_source",
        label: "Usa esta fuente",
        state: "active",
        evidence: [{
          type: "source_reference",
          source: row.source_system,
          table: row.source_table || null,
          ref: row.source_ref || null,
        }],
        sourceName: "link_dot_artifacts",
        updatedAt: row.updated_at || null,
      });
    }
  }

  return (
    <LinkMycelium
      initialNodes={nodes}
      initialEdges={edges}
      generatedAt={new Date().toISOString()}
    />
  );
}
