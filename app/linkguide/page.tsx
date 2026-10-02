import LinkGuide from "@/components/LinkGuide";
import { getCentralSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LinkGuidePage() {
  const supabase = getCentralSupabase();

  if (!supabase) {
    return (
      <main className="guide-fallback">
        <h1>LINK Guide</h1>
        <p>Control Central no tiene conexión con Supabase en este momento.</p>
        <a href="/">Volver a Control Central</a>
      </main>
    );
  }

  const [
    resourcesResult,
    stagesResult,
    missionsResult,
    handoffsResult,
    routesResult,
    skillsResult,
    domainsResult,
    organellesResult,
    businessesResult,
    crmResult,
    cortexKindsResult,
    cortexRecentResult,
    projectionsResult,
    connectionsResult,
    projectsResult,
    entitiesResult,
    bindingsResult,
  ] = await Promise.all([
    supabase
      .from("link_guide_resources")
      .select("resource_key,group_key,category,name,provider,purpose,status,canonical_url,external_id,owner_domain,source_of_truth,business_global_id,verified_at,metadata")
      .order("group_key")
      .order("name"),
    supabase
      .from("link_stage_processes")
      .select("stage_number,stage_key,name,customer_state_in,customer_state_out,director_slug,description,status,metadata")
      .eq("status", "active")
      .order("stage_number"),
    supabase
      .from("agent_missions")
      .select("id,mission_code,business_global_id,stage_key,title,problem_statement,diagnosis,expected_outcome,created_by_agent,assigned_agent_slug,status,priority,metadata,updated_at")
      .order("updated_at", { ascending: false }),
    supabase
      .from("agent_stage_handoffs")
      .select("id,business_global_id,from_stage_key,to_stage_key,from_agent_slug,to_agent_slug,status,signal_type,summary,acceptance_criteria,blocker,proposed_at,accepted_at,consumed_at,metadata")
      .order("proposed_at", { ascending: false }),
    supabase
      .from("agent_event_routes")
      .select("agent_slug,stage_key,source_provider_pattern,event_type_pattern,priority,enabled,description,metadata")
      .eq("enabled", true)
      .order("priority", { ascending: false }),
    supabase
      .from("link_skills")
      .select("slug,name,description,status,current_version,activation_mode,metadata")
      .in("slug", [
        "link-director",
        "director-marketing",
        "director-ventas",
        "director-cierre",
        "director-onboarding",
        "director-entrega",
        "director-postventa",
      ])
      .order("name"),
    supabase
      .from("ecosystem_domains")
      .select("domain_key,label,system_role,truth_scope,description,active,metadata")
      .eq("active", true)
      .order("domain_key"),
    supabase
      .from("ecosystem_organelle_types")
      .select("organelle_key,biological_name,system_name,purpose,required_for_cell,sort_order,metadata")
      .order("sort_order"),
    supabase
      .from("link_world_businesses")
      .select("id,global_id,slug,name,sector,city,country,website,summary,verification_status,public_workspace,updated_at")
      .order("name"),
    supabase
      .from("link_crm_business_state_v")
      .select("business_id,global_id,name,slug,logic_parts_ready,logic_parts_required,logic_ready,lead_count,open_lead_count,quote_count,accepted_quote_count,verified_win_count,verified_sales_amount,sales_event_count,verified_cash_amount,last_sales_activity_at,crm_state,emergence_reason")
      .order("name"),
    supabase
      .from("link_cortex_documents")
      .select("entity_type"),
    supabase
      .from("link_cortex_documents")
      .select("entity_type,entity_key,title,metadata,updated_at")
      .order("updated_at", { ascending: false })
      .limit(30),
    supabase
      .from("operational_house_projection_state")
      .select("global_id,archetype_key,projection_version,coverage_mode,projection_started_at,baseline_verified_at,baseline_source,baseline_metrics,event_counts,processed_event_count,last_event_at,last_event_type,last_engine_run_at,last_engine_status,last_error,metadata,updated_at")
      .order("updated_at", { ascending: false }),
    supabase
      .from("integration_connections")
      .select("provider,connection_key,mode,status,last_seen_at,last_error,metadata,updated_at")
      .order("provider")
      .order("connection_key"),
    supabase
      .from("projects")
      .select("id,name,slug,description,status,kind,phase,metadata,updated_at")
      .order("updated_at", { ascending: false })
      .limit(50),
    supabase
      .from("ecosystem_entities")
      .select("id,global_id,entity_type,owner_domain,owner_table,owner_record_id,status,metadata")
      .eq("entity_type", "business"),
    supabase
      .from("ecosystem_cell_organelle_bindings")
      .select("cell_entity_id,organelle_key,provider_domain,resource_kind,resource_name,binding_key,truth_role,status,configuration,updated_at")
      .order("organelle_key"),
  ]);

  const cortexCounts = (cortexKindsResult.data ?? []).reduce<Record<string, number>>((acc, row: any) => {
    const key = row.entity_type || "otro";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const safeProjects = (projectsResult.data ?? []).map((project: any) => {
    const meta = project.metadata || {};
    return {
      id: project.id,
      name: project.name,
      slug: project.slug,
      description: project.description,
      status: project.status,
      kind: project.kind,
      phase: project.phase,
      updated_at: project.updated_at,
      addresses: {
        sales_surface: meta.sales_surface || null,
        repo: meta.repo || null,
        dashboard_route: meta.dashboard_route || null,
        booking_intake_endpoint: meta.booking_intake_endpoint || null,
      },
      projection: {
        next_gate: meta.next_gate || null,
        contract_status: meta.contract_status || null,
        current_state: meta.current_state || null,
        current_priority: meta.current_priority || null,
        activation_dependency: meta.activation_dependency || null,
      },
    };
  });

  const safeConnections = (connectionsResult.data ?? []).map((row: any) => ({
    provider: row.provider,
    connection_key: row.connection_key,
    mode: row.mode,
    status: row.status,
    last_seen_at: row.last_seen_at,
    last_error: row.last_error,
    updated_at: row.updated_at,
    context: {
      source_name: row.metadata?.source_name || null,
      source_provider: row.metadata?.source_provider || null,
      source_project_id: row.metadata?.source_project_id || null,
      environment: row.metadata?.environment || null,
      role: row.metadata?.role || null,
      sync_scope: row.metadata?.sync_scope || null,
      dashboard_id: row.metadata?.dashboard_id || null,
    },
  }));

  return (
    <LinkGuide
      data={{
        generatedAt: new Date().toISOString(),
        resources: resourcesResult.data ?? [],
        stages: stagesResult.data ?? [],
        missions: missionsResult.data ?? [],
        handoffs: handoffsResult.data ?? [],
        routes: routesResult.data ?? [],
        agents: skillsResult.data ?? [],
        domains: domainsResult.data ?? [],
        organelles: organellesResult.data ?? [],
        businesses: businessesResult.data ?? [],
        crm: crmResult.data ?? [],
        cortexCounts,
        cortexRecent: cortexRecentResult.data ?? [],
        projections: projectionsResult.data ?? [],
        connections: safeConnections,
        projects: safeProjects,
        businessEntities: entitiesResult.data ?? [],
        bindings: bindingsResult.data ?? [],
      }}
    />
  );
}
