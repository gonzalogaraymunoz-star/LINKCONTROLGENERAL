import { notFound } from "next/navigation";
import DotWorkspacePanel from "@/components/DotWorkspacePanel";
import { getCentralSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AnyRow = Record<string, any>;

function metaOf(value: unknown): AnyRow {
  return value && typeof value === "object" ? (value as AnyRow) : {};
}

function belongsToDot(row: AnyRow, slugs: string[]) {
  const metadata = metaOf(row.metadata);
  const values = [
    row.agent_slug,
    row.owner_agent_slug,
    row.dot_slug,
    metadata.agent_slug,
    metadata.owner_agent_slug,
    metadata.dot_slug,
    metadata.linkdot_slug,
    metadata.director_slug,
  ].filter(Boolean);
  return values.some((value) => slugs.includes(String(value)));
}

async function loadDot(slug: string) {
  const supabase = getCentralSupabase();
  if (!supabase) return null;

  const skillSelect =
    "id,slug,name,description,status,current_version,activation_mode,metadata,created_at,updated_at";

  let { data: skill } = await supabase
    .from("link_skills")
    .select(skillSelect)
    .eq("slug", slug)
    .maybeSingle();

  if (!skill) {
    const { data: candidates } = await supabase
      .from("link_skills")
      .select(skillSelect)
      .contains("metadata", { dot_slug: slug })
      .limit(1);
    skill = candidates?.[0] ?? null;
  }

  // Some LINKDOT workspaces already exist before their legacy stage director
  // has been upgraded with agent_kind/dot_slug metadata. Resolve that bridge
  // from the canonical workspace so the panel works during the migration.
  if (!skill && slug.startsWith("linkdot-")) {
    const { data: workspaceBridge } = await supabase
      .from("link_dot_workspaces")
      .select("owner_director_slug")
      .eq("owner_linkdot_slug", slug)
      .limit(1)
      .maybeSingle();
    if (workspaceBridge?.owner_director_slug) {
      const { data: bridgedSkill } = await supabase
        .from("link_skills")
        .select(skillSelect)
        .eq("slug", workspaceBridge.owner_director_slug)
        .maybeSingle();
      skill = bridgedSkill ?? null;
    }
  }
  if (!skill) return null;

  const metadata = metaOf(skill.metadata);
  const operationalSlug = String(metadata.dot_slug || (slug.startsWith("linkdot-") ? slug : skill.slug));
  const dotSlugs = Array.from(new Set([skill.slug, operationalSlug]));

  const { data: workspaceAccessRows } = await supabase
    .from("link_dot_workspace_access")
    .select("*")
    .in("dot_slug", dotSlugs)
    .eq("status", "active")
    .order("is_default", { ascending: false });

  const grantedWorkspaceIds = (workspaceAccessRows ?? []).map((row: AnyRow) => row.workspace_id);

  const [
    workspaceResult,
    grantedWorkspaceResult,
    missionsResult,
    grantsResult,
    stateResult,
    namespaceResult,
    capabilitiesResult,
    handoffsResult,
    commandsResult,
    eventsResult,
    sessionsResult,
    cronResult,
    dotDirectoryResult,
  ] = await Promise.all([
    supabase
      .from("link_dot_workspaces")
      .select("*")
      .or(`owner_director_slug.eq.${skill.slug},owner_linkdot_slug.eq.${operationalSlug}`)
      .order("created_at", { ascending: true }),
    grantedWorkspaceIds.length
      ? supabase
          .from("link_dot_workspaces")
          .select("*")
          .in("id", grantedWorkspaceIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as AnyRow[] }),
    supabase
      .from("agent_missions")
      .select("*")
      .eq("assigned_agent_slug", skill.slug)
      .order("updated_at", { ascending: false })
      .limit(40),
    supabase
      .from("agent_action_grants")
      .select("*")
      .eq("agent_slug", skill.slug)
      .order("action_key"),
    supabase
      .from("agent_operating_state_v")
      .select("*")
      .eq("agent_slug", skill.slug)
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase
      .from("memory_namespaces")
      .select("*")
      .eq("scope_type", "agent")
      .in("scope_key", dotSlugs),
    supabase
      .from("link_skill_capabilities")
      .select("*")
      .eq("skill_id", skill.id)
      .order("weight", { ascending: false }),
    supabase
      .from("agent_stage_handoffs")
      .select("*")
      .or(`from_agent_slug.eq.${skill.slug},to_agent_slug.eq.${skill.slug}`)
      .order("proposed_at", { ascending: false })
      .limit(40),
    supabase
      .from("command_bus")
      .select("*")
      .eq("actor", skill.slug)
      .order("requested_at", { ascending: false })
      .limit(50),
    supabase
      .from("event_bus")
      .select("*")
      .eq("source_provider", "agent-runtime")
      .order("received_at", { ascending: false })
      .limit(120),
    supabase
      .from("agent_sessions")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(80),
    supabase
      .from("link_cron_registry")
      .select("*")
      .neq("status", "archived")
      .order("updated_at", { ascending: false })
      .limit(80),
    supabase
      .from("link_skills")
      .select("slug,name,status,metadata")
      .eq("status", "active")
      .order("name"),
  ]);

  const workspaceById = new Map<string, AnyRow>();
  for (const row of [...(workspaceResult.data ?? []), ...(grantedWorkspaceResult.data ?? [])]) {
    workspaceById.set(String((row as AnyRow).id), row as AnyRow);
  }
  const workspaces = Array.from(workspaceById.values());
  const workspaceIds = workspaces.map((row: AnyRow) => row.id);
  const missions = missionsResult.data ?? [];
  const missionIds = missions.map((row: AnyRow) => row.id);
  const namespaceIds = (namespaceResult.data ?? []).map((row: AnyRow) => row.id);

  const [subdotsResult, artifactsResult, evidenceResult, memoriesResult] =
    await Promise.all([
      workspaceIds.length
        ? supabase
            .from("link_dot_workspace_subdots")
            .select("*")
            .in("workspace_id", workspaceIds)
            .order("sort_order")
        : Promise.resolve({ data: [] as AnyRow[] }),
      workspaceIds.length
        ? supabase
            .from("link_dot_artifacts")
            .select("*")
            .in("workspace_id", workspaceIds)
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: [] as AnyRow[] }),
      missionIds.length
        ? supabase
            .from("agent_mission_evidence")
            .select("*")
            .in("mission_id", missionIds)
            .order("requested_at", { ascending: false })
        : Promise.resolve({ data: [] as AnyRow[] }),
      namespaceIds.length
        ? supabase
            .from("deep_memories")
            .select("*")
            .in("namespace_id", namespaceIds)
            .is("archived_at", null)
            .order("importance", { ascending: false })
            .order("updated_at", { ascending: false })
            .limit(80)
        : Promise.resolve({ data: [] as AnyRow[] }),
    ]);

  const sessions = (sessionsResult.data ?? []).filter((row: AnyRow) => {
    const sessionMeta = metaOf(row.metadata);
    return dotSlugs.includes(String(sessionMeta.agent_slug || sessionMeta.dot_slug || ""));
  });
  const sessionIds = sessions.map((row: AnyRow) => row.id);

  const { data: messages } = sessionIds.length
    ? await supabase
        .from("agent_messages")
        .select("*")
        .in("session_id", sessionIds)
        .order("created_at", { ascending: false })
        .limit(120)
    : { data: [] as AnyRow[] };

  const events = (eventsResult.data ?? []).filter((row: AnyRow) => {
    const payload = metaOf(row.payload);
    return dotSlugs.includes(String(payload.agent_slug || payload.dot_slug || ""));
  });

  const crons = (cronResult.data ?? []).filter((row: AnyRow) => belongsToDot(row, dotSlugs));

  const dotDirectory = (dotDirectoryResult.data ?? [])
    .filter((row: AnyRow) => {
      const rowMeta = metaOf(row.metadata);
      return row.slug === "link-director" || rowMeta.agent_kind === "linkdot";
    })
    .map((row: AnyRow) => {
      const rowMeta = metaOf(row.metadata);
      return {
        slug: rowMeta.dot_slug || row.slug,
        technicalSlug: row.slug,
        name: rowMeta.display_label || row.name,
        area: rowMeta.dot_area || rowMeta.stage_label || "Dirección",
        status: row.status,
        responsibility: rowMeta.responsibility || row.description || "",
        entryBoundary: rowMeta.entry_boundary || "",
        exitBoundary: rowMeta.exit_boundary || rowMeta.handoff_boundary || "",
      };
    })
    .sort((a: AnyRow, b: AnyRow) => {
      if (a.technicalSlug === "link-director") return -1;
      if (b.technicalSlug === "link-director") return 1;
      return String(a.name).localeCompare(String(b.name), "es");
    });

  return {
    agent: {
      ...skill,
      metadata,
      operationalSlug,
      kind: skill.slug === "link-director"
        ? "LINK DIRECTOR"
        : metadata.agent_kind === "linksubdot"
          ? "LINKSUBDOT"
          : metadata.agent_kind === "linkdot" || metadata.dot_slug
            ? "LINKDOT"
            : "AGENTE",
    },
    workspaces,
    workspaceAccess: workspaceAccessRows ?? [],
    dotDirectory,
    subdots: subdotsResult.data ?? [],
    artifacts: artifactsResult.data ?? [],
    missions,
    evidence: evidenceResult.data ?? [],
    grants: grantsResult.data ?? [],
    operatingStates: stateResult.data ?? [],
    capabilities: capabilitiesResult.data ?? [],
    handoffs: handoffsResult.data ?? [],
    memories: memoriesResult.data ?? [],
    commands: commandsResult.data ?? [],
    events,
    sessions,
    messages: messages ?? [],
    crons,
  };
}

export default async function DotPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await loadDot(slug);
  if (!data) notFound();
  return <DotWorkspacePanel data={data} />;
}
