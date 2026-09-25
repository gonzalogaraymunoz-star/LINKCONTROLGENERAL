import { NextRequest, NextResponse } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";

const DASHBOARD_KEY = "link-world-home";
const TZ = "America/Santiago";
const ALLOWED_WIDGETS = new Set(["clients", "attention", "products", "activity", "cell", "personal", "businesses"]);
const ALLOWED_CLIENT_COLUMNS = new Set([
  "name",
  "business",
  "role",
  "relationship_state",
  "agreement_status",
  "city",
  "country",
  "website",
  "products",
  "updated_at",
]);

const DEFAULT_VISIBLE_WIDGETS = ["clients", "attention", "products", "activity", "cell", "personal"];
const DEFAULT_CLIENT_COLUMNS = ["name", "business", "relationship_state", "agreement_status", "products", "updated_at"];
const DEFAULT_WIDGET_VIEWS = {
  clients: "table",
  products: "list",
  activity: "timeline",
  cell: "summary",
};

const VIEW_OPTIONS: Record<string, Set<string>> = {
  clients: new Set(["table", "cards", "compact"]),
  products: new Set(["list", "pipeline", "economy"]),
  activity: new Set(["timeline", "day", "entity"]),
  cell: new Set(["summary", "organelles"]),
};

const DEFAULT_LAYOUTS = {
  lg: [
    { i: "clients", x: 0, y: 0, w: 8, h: 7, minW: 5, minH: 5 },
    { i: "attention", x: 8, y: 0, w: 4, h: 7, minW: 3, minH: 4 },
    { i: "products", x: 0, y: 7, w: 6, h: 6, minW: 4, minH: 4 },
    { i: "activity", x: 6, y: 7, w: 6, h: 6, minW: 4, minH: 4 },
    { i: "cell", x: 0, y: 13, w: 12, h: 5, minW: 6, minH: 4 },
    { i: "personal", x: 0, y: 18, w: 12, h: 1, minW: 6, minH: 1 },
  ],
  md: [
    { i: "clients", x: 0, y: 0, w: 8, h: 7, minW: 5, minH: 5 },
    { i: "attention", x: 0, y: 7, w: 4, h: 6, minW: 3, minH: 4 },
    { i: "products", x: 4, y: 7, w: 4, h: 6, minW: 3, minH: 4 },
    { i: "activity", x: 0, y: 13, w: 8, h: 6, minW: 4, minH: 4 },
    { i: "cell", x: 0, y: 19, w: 8, h: 5, minW: 4, minH: 4 },
    { i: "personal", x: 0, y: 24, w: 8, h: 1, minW: 4, minH: 1 },
  ],
  sm: [
    { i: "clients", x: 0, y: 0, w: 4, h: 7, minW: 3, minH: 5 },
    { i: "attention", x: 0, y: 7, w: 4, h: 6, minW: 3, minH: 4 },
    { i: "products", x: 0, y: 13, w: 4, h: 6, minW: 3, minH: 4 },
    { i: "activity", x: 0, y: 19, w: 4, h: 6, minW: 3, minH: 4 },
    { i: "cell", x: 0, y: 25, w: 4, h: 6, minW: 3, minH: 4 },
    { i: "personal", x: 0, y: 31, w: 4, h: 1, minW: 3, minH: 1 },
  ],
};

function localDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function sanitizeLayouts(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_LAYOUTS;
  const result: Record<string, Array<Record<string, number | string>>> = {};
  for (const breakpoint of ["lg", "md", "sm"]) {
    const source = (value as Record<string, unknown>)[breakpoint];
    if (!Array.isArray(source)) continue;
    result[breakpoint] = source
      .filter((item) => item && typeof item === "object")
      .map((item) => {
        const row = item as Record<string, unknown>;
        const i = String(row.i || "");
        if (!ALLOWED_WIDGETS.has(i)) return null;
        return {
          i,
          x: Math.max(0, Number(row.x) || 0),
          y: Math.max(0, Number(row.y) || 0),
          w: Math.max(1, Number(row.w) || 1),
          h: Math.max(1, Number(row.h) || 1),
          minW: Math.max(1, Number(row.minW) || 1),
          minH: Math.max(1, Number(row.minH) || 1),
        };
      })
      .filter(Boolean) as Array<Record<string, number | string>>;
  }
  return Object.keys(result).length ? result : DEFAULT_LAYOUTS;
}

function sanitizeWidgetViews(value: unknown) {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const result: Record<string, string> = { ...DEFAULT_WIDGET_VIEWS };
  for (const [widget, allowed] of Object.entries(VIEW_OPTIONS)) {
    const requested = String(source[widget] || "");
    if (allowed.has(requested)) result[widget] = requested;
  }
  return result;
}

export async function GET() {
  const supabase = getCentralSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, configured: false, error: "central_supabase_not_configured" }, { status: 503 });
  }

  const today = localDate();

  const [
    clientsResult,
    businessesResult,
    productsResult,
    activityResult,
    requestsResult,
    relationsResult,
    entitiesResult,
    cellsResult,
    bindingsResult,
    organelleTypesResult,
    personalWorkResult,
    dailyProgressResult,
    preferencesResult,
  ] = await Promise.all([
    supabase.from("link_world_clients")
      .select("id,business_id,slug,name,role,relationship_state,city,country,website,summary,agreement_status,owned_facts,evidence,created_at,updated_at,global_id")
      .order("updated_at", { ascending: false }),
    supabase.from("link_world_businesses")
      .select("id,slug,name,sector,city,country,website,summary,verification_status,public_workspace,created_at,updated_at,global_id")
      .order("updated_at", { ascending: false }),
    supabase.from("link_world_products")
      .select("id,business_id,client_id,name,code,category,stage,currency,acquisition_price,public_price,responsibility_percent,client_benefit_share_percent,link_share_percent,minimum_link_share_percent,economic_state,responsibility_notes,agreement_notes,created_at,updated_at,global_id")
      .order("updated_at", { ascending: false }),
    supabase.from("link_world_activity")
      .select("id,action,target_type,target_id,origin,note,metadata,actor_id,created_at")
      .order("created_at", { ascending: false }).limit(100),
    supabase.from("link_world_requests")
      .select("id,title,origin,status,business_ids,result_summary,created_at,updated_at")
      .order("created_at", { ascending: false }).limit(50),
    supabase.from("link_world_relations")
      .select("id,source_business_id,target_business_id,relation_type,state,rationale,created_at,updated_at")
      .order("updated_at", { ascending: false }).limit(50),
    supabase.from("ecosystem_entities")
      .select("id,global_id,entity_type,owner_domain,owner_table,owner_record_id,status,metadata,updated_at")
      .eq("entity_type", "business"),
    supabase.from("ecosystem_cells")
      .select("entity_id,lifecycle_stage,health_status,autonomy_level,constitution_version,last_gesture_code,metadata,created_at,updated_at"),
    supabase.from("ecosystem_cell_organelle_bindings")
      .select("id,cell_entity_id,organelle_key,provider_domain,resource_kind,resource_name,binding_key,truth_role,status,configuration,updated_at")
      .order("organelle_key"),
    supabase.from("ecosystem_organelle_types")
      .select("organelle_key,biological_name,system_name,purpose,required_for_cell,sort_order")
      .order("sort_order"),
    supabase.from("client_gestures")
      .select("id,title,status,starts_at,scope,is_money")
      .neq("status", "cancelled"),
    supabase.from("daily_progress")
      .select("body_minimum,mind_minimum,pocket_minimum,focused_seconds,tasks_completed,commercial_moves,closures")
      .eq("progress_date", today).maybeSingle(),
    supabase.from("dashboard_preferences")
      .select("dashboard_key,title,visible_widgets,layouts,client_columns,widget_views,updated_at")
      .eq("dashboard_key", DASHBOARD_KEY).maybeSingle(),
  ]);

  const firstError = [
    clientsResult.error,
    businessesResult.error,
    productsResult.error,
    activityResult.error,
    requestsResult.error,
    relationsResult.error,
    entitiesResult.error,
    cellsResult.error,
    bindingsResult.error,
    organelleTypesResult.error,
    personalWorkResult.error,
    dailyProgressResult.error,
    preferencesResult.error,
  ].find(Boolean);

  if (firstError) {
    return NextResponse.json({ ok: false, error: firstError.message }, { status: 500 });
  }

  const businesses = businessesResult.data ?? [];
  const products = productsResult.data ?? [];
  const businessById = new Map(businesses.map((business) => [business.id, business]));
  const productsByClient = new Map<string, typeof products>();

  for (const product of products) {
    if (!product.client_id) continue;
    const current = productsByClient.get(product.client_id) ?? [];
    current.push(product);
    productsByClient.set(product.client_id, current);
  }

  const clients = (clientsResult.data ?? []).map((client) => ({
    ...client,
    business: client.business_id ? businessById.get(client.business_id) ?? null : null,
    products: productsByClient.get(client.id) ?? [],
  }));

  const organelleTypeByKey = new Map((organelleTypesResult.data ?? []).map((row) => [row.organelle_key, row]));
  const entityById = new Map((entitiesResult.data ?? []).map((row) => [row.id, row]));
  const bindings = (bindingsResult.data ?? []).map((binding) => ({
    ...binding,
    type: organelleTypeByKey.get(binding.organelle_key) ?? null,
  }));

  const cells = (cellsResult.data ?? []).map((cell) => {
    const entity = entityById.get(cell.entity_id) ?? null;
    const business = entity?.owner_record_id ? businessById.get(entity.owner_record_id) ?? null : null;
    const organelles = bindings.filter((binding) => binding.cell_entity_id === cell.entity_id);
    return {
      ...cell,
      entity,
      business,
      organelles,
      activeOrganelles: organelles.filter((item) => ["active", "ready", "connected"].includes(String(item.status || "").toLowerCase())).length,
      requiredOrganelles: organelles.filter((item) => item.type?.required_for_cell).length,
    };
  });

  const attention: Array<Record<string, unknown>> = [];

  for (const business of businesses) {
    const state = String(business.verification_status || "").toLowerCase();
    if (!["verified", "active", "approved"].includes(state)) {
      attention.push({
        id: "business-verification-" + business.id,
        kind: "business",
        severity: "medium",
        title: business.name,
        detail: "Verificación del negocio: " + (business.verification_status || "sin definir"),
        targetId: business.id,
      });
    }
  }

  for (const client of clients) {
    const relation = String(client.relationship_state || "").toLowerCase();
    if (!["active", "approved", "confirmed"].includes(relation)) {
      attention.push({
        id: "client-relation-" + client.id,
        kind: "client",
        severity: "medium",
        title: client.name,
        detail: "Relación: " + (client.relationship_state || "sin definir"),
        targetId: client.id,
      });
    }
    const agreement = String(client.agreement_status || "").toLowerCase();
    if (!agreement || ["none", "pending", "draft", "unknown"].includes(agreement)) {
      attention.push({
        id: "client-agreement-" + client.id,
        kind: "client",
        severity: "high",
        title: client.name,
        detail: "Acuerdo comercial no definido",
        targetId: client.id,
      });
    }
  }

  for (const product of products) {
    if (product.public_price === null || product.public_price === undefined) {
      attention.push({
        id: "product-price-" + product.id,
        kind: "product",
        severity: "high",
        title: product.name,
        detail: "Precio público pendiente",
        targetId: product.id,
      });
    }
    if (product.acquisition_price === null || product.acquisition_price === undefined) {
      attention.push({
        id: "product-cost-" + product.id,
        kind: "product",
        severity: "high",
        title: product.name,
        detail: "Costo de adquisición pendiente",
        targetId: product.id,
      });
    }
    if (product.link_share_percent === null || product.link_share_percent === undefined) {
      attention.push({
        id: "product-link-share-" + product.id,
        kind: "product",
        severity: "high",
        title: product.name,
        detail: "Participación LINK pendiente",
        targetId: product.id,
      });
    }
  }

  for (const cell of cells) {
    if (!cell.health_status || String(cell.health_status).toLowerCase() === "unknown") {
      attention.push({
        id: "cell-health-" + cell.entity_id,
        kind: "cell",
        severity: "low",
        title: cell.business?.name || cell.entity?.global_id || "Célula LINK",
        detail: "Salud de la célula aún no evaluada",
        targetId: cell.entity_id,
      });
    }
  }

  const openPersonalItems = (personalWorkResult.data ?? []).filter((item) => !["completed", "cancelled"].includes(String(item.status || "").toLowerCase()));
  const todayItems = openPersonalItems.filter((item) => item.starts_at && localDate(new Date(item.starts_at)) === today);
  const progress = dailyProgressResult.data;
  const minimumsDone = [progress?.body_minimum, progress?.mind_minimum, progress?.pocket_minimum].filter(Boolean).length;

  const preference = preferencesResult.data;
  const availableWidgets = [
    "clients",
    attention.length ? "attention" : null,
    "products",
    "activity",
    cells.length ? "cell" : null,
    "personal",
    businesses.length > 1 ? "businesses" : null,
  ].filter(Boolean);

  return NextResponse.json({
    ok: true,
    configured: true,
    source: "link-world",
    generatedAt: new Date().toISOString(),
    clients,
    businesses,
    products,
    activity: activityResult.data ?? [],
    requests: requestsResult.data ?? [],
    relations: relationsResult.data ?? [],
    attention,
    cells,
    personalMission: {
      date: today,
      todayTasks: todayItems.length,
      openTasks: openPersonalItems.length,
      minimumsDone,
      minimumsTotal: 3,
      focusedSeconds: Number(progress?.focused_seconds || 0),
      commercialMoves: Number(progress?.commercial_moves || 0),
    },
    availableWidgets,
    preferences: {
      dashboardKey: DASHBOARD_KEY,
      title: preference?.title || "LINK WORLD",
      visibleWidgets: Array.isArray(preference?.visible_widgets)
        ? preference.visible_widgets.filter((item: string) => ALLOWED_WIDGETS.has(item))
        : DEFAULT_VISIBLE_WIDGETS,
      layouts: preference?.layouts && Object.keys(preference.layouts).length
        ? sanitizeLayouts(preference.layouts)
        : DEFAULT_LAYOUTS,
      clientColumns: Array.isArray(preference?.client_columns)
        ? preference.client_columns.filter((item: string) => ALLOWED_CLIENT_COLUMNS.has(item))
        : DEFAULT_CLIENT_COLUMNS,
      widgetViews: sanitizeWidgetViews(preference?.widget_views),
      updatedAt: preference?.updated_at || null,
    },
  });
}

export async function POST(request: NextRequest) {
  const supabase = getCentralSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, configured: false, error: "central_supabase_not_configured" }, { status: 503 });
  }

  const body = await request.json();
  if (String(body.action || "") !== "save_preferences") {
    return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
  }

  const visibleWidgets = Array.isArray(body.visibleWidgets)
    ? body.visibleWidgets.map(String).filter((item: string) => ALLOWED_WIDGETS.has(item))
    : DEFAULT_VISIBLE_WIDGETS;

  const clientColumns = Array.isArray(body.clientColumns)
    ? body.clientColumns.map(String).filter((item: string) => ALLOWED_CLIENT_COLUMNS.has(item))
    : DEFAULT_CLIENT_COLUMNS;

  const layouts = sanitizeLayouts(body.layouts);
  const widgetViews = sanitizeWidgetViews(body.widgetViews);
  const updatedAt = new Date().toISOString();

  const { data, error } = await supabase.from("dashboard_preferences").upsert({
    dashboard_key: DASHBOARD_KEY,
    title: "LINK WORLD",
    visible_widgets: visibleWidgets,
    layouts,
    client_columns: clientColumns,
    widget_views: widgetViews,
    updated_at: updatedAt,
  }, { onConflict: "dashboard_key" })
    .select("dashboard_key,visible_widgets,layouts,client_columns,widget_views,updated_at").single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, preferences: data });
}
