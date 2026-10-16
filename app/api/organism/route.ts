import { NextResponse } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Public, READ-ONLY projection of the LINK ecosystem.
 * A server service client must NEVER imply that all Supabase rows may be
 * returned to browsers: only explicitly public LINK WORLD businesses are
 * projected here. Barrio, private contracts and event payloads stay private.
 */
export async function GET() {
  const db = getCentralSupabase();
  const headers = { "Cache-Control": "no-store" };
  if (!db) {
    return NextResponse.json(
      { ok: false, error: "central_supabase_not_configured" },
      { status: 503, headers },
    );
  }

  const businessesResult = await db.from("link_world_businesses")
    .select("id,name,slug,summary,public_workspace")
    .eq("public_workspace", true)
    .order("name", { ascending: true })
    .limit(25);

  if (businessesResult.error) {
    console.error("organism/public-businesses", businessesResult.error.message);
    return NextResponse.json(
      { ok: false, error: "organism_source_unavailable" },
      { status: 503, headers },
    );
  }

  const businesses = businessesResult.data ?? [];
  const ownerIds = businesses.map((business) => business.id);

  const catalogResult = await db.from("ecosystem_organelle_types")
    .select("organelle_key,biological_name,system_name,required_for_cell,sort_order")
    .order("sort_order", { ascending: true });
  if (catalogResult.error) {
    console.error("organism/organelle-catalog", catalogResult.error.message);
    return NextResponse.json(
      { ok: false, error: "organism_catalog_unavailable" },
      { status: 503, headers },
    );
  }
  const catalog = catalogResult.data ?? [];

  if (ownerIds.length === 0) {
    return NextResponse.json({
      ok: true, mode: "public_projection", observedAt: new Date().toISOString(),
      businesses: [], catalog, barrio: { state: "private_not_exposed" },
    }, { headers });
  }

  const entitiesResult = await db.from("ecosystem_entities")
    .select("id,global_id,owner_record_id,status")
    .eq("owner_domain", "world")
    .eq("owner_table", "link_world_businesses")
    .in("owner_record_id", ownerIds)
    .limit(25);
  if (entitiesResult.error) {
    console.error("organism/entities", entitiesResult.error.message);
    return NextResponse.json(
      { ok: false, error: "organism_entities_unavailable" },
      { status: 503, headers },
    );
  }

  const entities = entitiesResult.data ?? [];
  const entityIds = entities.map((entity) => entity.id);
  const [cellsResult, bindingsResult] = await Promise.all([
    entityIds.length
      ? db.from("ecosystem_cells")
        .select("entity_id,lifecycle_stage,health_status,autonomy_level,constitution_version")
        .in("entity_id", entityIds)
      : Promise.resolve({ data: [], error: null }),
    entityIds.length
      ? db.from("ecosystem_cell_organelle_bindings")
        .select("cell_entity_id,organelle_key,provider_domain,status,truth_role")
        .in("cell_entity_id", entityIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (cellsResult.error || bindingsResult.error) {
    console.error("organism/cell-read", cellsResult.error?.message || bindingsResult.error?.message);
    return NextResponse.json(
      { ok: false, error: "organism_cells_unavailable" },
      { status: 503, headers },
    );
  }

  const byOwnerId = new Map(entities.map((e) => [e.owner_record_id, e]));
  const byEntityId = new Map((cellsResult.data ?? []).map((c) => [c.entity_id, c]));
  const bindings = bindingsResult.data ?? [];

  const projected = businesses.map((business) => {
    const entity = byOwnerId.get(business.id);
    const cell = entity ? byEntityId.get(entity.id) : undefined;
    const cellBindings = entity ? bindings.filter((b) => b.cell_entity_id === entity.id) : [];
    const organelles = catalog.map((o) => {
      const matches = cellBindings.filter((b) => b.organelle_key === o.organelle_key);
      return {
        key: o.organelle_key,
        name: o.system_name,
        biologicalName: o.biological_name,
        required: o.required_for_cell,
        status: matches.some((b) => b.status === "active")
          ? "active"
          : matches.some((b) => b.status === "ready")
            ? "ready"
            : matches.some((b) => b.status === "degraded")
              ? "degraded" : matches.some((b) => b.status === "planned")
                ? "planned" : matches.some((b) => b.status === "disabled")
                  ? "disabled" : "unbound",
      };
    });
    return {
      name: business.name,
      slug: business.slug,
      summary: business.summary,
      globalId: entity?.global_id ?? null,
      entityStatus: entity?.status ?? "unregistered",
      lifecycleStage: cell?.lifecycle_stage ?? null,
      declaredHealth: cell?.health_status ?? "unknown",
      autonomyLevel: cell?.autonomy_level ?? null,
      constitutionVersion: cell?.constitution_version ?? null,
      organelles,
      counts: {
        active: organelles.filter((o) => o.status === "active").length,
        ready: organelles.filter((o) => o.status === "ready").length,
        required: catalog.filter((o) => o.required_for_cell).length,
        requiredActive: organelles.filter((o) => o.required && o.status === "active").length,
      },
    };
  });

  return NextResponse.json({
    ok: true,
    mode: "public_projection",
    observedAt: new Date().toISOString(),
    businesses: projected,
    catalog,
    barrio: { state: "private_not_exposed" },
  }, { headers });
}
