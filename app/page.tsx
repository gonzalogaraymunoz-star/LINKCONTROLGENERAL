import AgenticControlCentral, { type AgentRecord } from "@/components/AgenticControlCentral";
import { getCentralSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function loadAgents(): Promise<AgentRecord[]> {
  const supabase = getCentralSupabase();
  if (!supabase) return [];

  const { data: entities } = await supabase
    .from("ecosystem_entities")
    .select("id,global_id,owner_record_id,status,metadata,created_at,updated_at")
    .eq("entity_type", "agent")
    .neq("status", "archived")
    .order("created_at", { ascending: true });

  const agentEntities = entities ?? [];
  if (!agentEntities.length) return [];

  const skillIds = agentEntities.map((item: any) => item.owner_record_id).filter(Boolean);
  const globalIds = agentEntities.map((item: any) => item.global_id).filter(Boolean);

  const [skillsResult, relationsResult, interventionsResult] = await Promise.all([
    skillIds.length
      ? supabase
          .from("link_skills")
          .select("id,slug,name,description,status,current_version,activation_mode,metadata")
          .in("id", skillIds)
      : Promise.resolve({ data: [] as any[] }),
    globalIds.length
      ? supabase
          .from("entity_relations")
          .select("source_global_id,target_global_id,relation,state,label,evidence,metadata")
          .in("target_global_id", globalIds)
      : Promise.resolve({ data: [] as any[] }),
    supabase
      .from("link_world_ai_interventions")
      .select("id,event_type,provider,provider_label,model,status,input_tokens,output_tokens,latency_ms,metadata,created_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const skills = skillsResult.data ?? [];
  const slugs = skills.map((item: any) => item.slug).filter(Boolean);

  const { data: namespaces } = slugs.length
    ? await supabase
        .from("memory_namespaces")
        .select("id,scope_key,label,metadata")
        .eq("scope_type", "agent")
        .in("scope_key", slugs)
    : { data: [] as any[] };

  const namespaceRows = namespaces ?? [];
  const namespaceIds = namespaceRows.map((item: any) => item.id);

  const { data: memories } = namespaceIds.length
    ? await supabase
        .from("deep_memories")
        .select("namespace_id,memory_key,kind,importance,confidence,source,source_ref,updated_at")
        .in("namespace_id", namespaceIds)
        .is("archived_at", null)
        .order("importance", { ascending: false })
        .order("updated_at", { ascending: false })
    : { data: [] as any[] };

  const capabilityResult = skillIds.length
    ? await supabase
        .from("link_skill_capabilities")
        .select("skill_id,capability_key,label,description,weight,metadata")
        .in("skill_id", skillIds)
        .order("weight", { ascending: false })
    : { data: [] as any[] };

  return Promise.all(
    agentEntities.map(async (entity: any) => {
      const skill = skills.find((item: any) => item.id === entity.owner_record_id);
      const slug = skill?.slug || String((entity.metadata as any)?.slug || entity.global_id);
      const namespace = namespaceRows.find((item: any) => item.scope_key === slug);
      const activity = (interventionsResult.data ?? []).filter(
        (item: any) => item?.metadata?.agent === slug,
      );
      const meta = (entity.metadata ?? {}) as Record<string, any>;
      let runtimeState: AgentRecord["runtimeState"] = null;

      if (slug === "link-director") {
        try {
          const response = await fetch(
            "https://link-world-delta.vercel.app/api/link-director-agent",
            { cache: "no-store" },
          );
          if (response.ok) runtimeState = await response.json();
        } catch {
          runtimeState = null;
        }
      }

      return {
        id: entity.id,
        globalId: entity.global_id,
        slug,
        name: skill?.name || meta.label || slug,
        description: skill?.description || "Agente registrado en LINK.",
        status: entity.status,
        version: skill?.current_version || null,
        activationMode: skill?.activation_mode || null,
        metadata: { ...(skill?.metadata || {}), ...meta },
        capabilities: (capabilityResult.data ?? []).filter(
          (item: any) => item.skill_id === entity.owner_record_id,
        ),
        memories: (memories ?? [])
          .filter((item: any) => item.namespace_id === namespace?.id)
          .slice(0, 12),
        activity: activity.slice(0, 12),
        governance:
          (relationsResult.data ?? []).find(
            (item: any) => item.target_global_id === entity.global_id,
          ) || null,
        runtimeState,
      } satisfies AgentRecord;
    }),
  );
}

export default async function Home() {
  const agents = await loadAgents();
  return <AgenticControlCentral initialAgents={agents} />;
}
