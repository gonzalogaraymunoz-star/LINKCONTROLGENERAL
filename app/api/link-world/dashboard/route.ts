import { NextRequest, NextResponse } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";

const DASHBOARD_KEY = "link-world-home";
const ALLOWED_WIDGETS = new Set(["clients", "activity", "products", "businesses"]);
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

const DEFAULT_VISIBLE_WIDGETS = ["clients", "activity", "products", "businesses"];
const DEFAULT_CLIENT_COLUMNS = [
  "name",
  "business",
  "relationship_state",
  "agreement_status",
  "products",
  "updated_at",
];

const DEFAULT_LAYOUTS = {
  lg: [
    { i: "clients", x: 0, y: 0, w: 8, h: 8, minW: 5, minH: 5 },
    { i: "activity", x: 8, y: 0, w: 4, h: 8, minW: 3, minH: 5 },
    { i: "products", x: 0, y: 8, w: 7, h: 6, minW: 4, minH: 4 },
    { i: "businesses", x: 7, y: 8, w: 5, h: 6, minW: 3, minH: 4 },
  ],
  md: [
    { i: "clients", x: 0, y: 0, w: 8, h: 8, minW: 5, minH: 5 },
    { i: "activity", x: 0, y: 8, w: 4, h: 7, minW: 3, minH: 5 },
    { i: "products", x: 4, y: 8, w: 4, h: 7, minW: 3, minH: 4 },
    { i: "businesses", x: 0, y: 15, w: 8, h: 5, minW: 3, minH: 4 },
  ],
  sm: [
    { i: "clients", x: 0, y: 0, w: 4, h: 8, minW: 3, minH: 5 },
    { i: "activity", x: 0, y: 8, w: 4, h: 7, minW: 3, minH: 5 },
    { i: "products", x: 0, y: 15, w: 4, h: 7, minW: 3, minH: 4 },
    { i: "businesses", x: 0, y: 22, w: 4, h: 5, minW: 3, minH: 4 },
  ],
};

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

export async function GET() {
  const supabase = getCentralSupabase();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, configured: false, error: "central_supabase_not_configured" },
      { status: 503 },
    );
  }

  const [
    clientsResult,
    businessesResult,
    productsResult,
    activityResult,
    requestsResult,
    relationsResult,
    preferencesResult,
  ] = await Promise.all([
    supabase
      .from("link_world_clients")
      .select("id,business_id,slug,name,role,relationship_state,city,country,website,summary,agreement_status,owned_facts,evidence,created_at,updated_at,global_id")
      .order("updated_at", { ascending: false }),
    supabase
      .from("link_world_businesses")
      .select("id,slug,name,sector,city,country,website,summary,verification_status,public_workspace,created_at,updated_at,global_id")
      .order("updated_at", { ascending: false }),
    supabase
      .from("link_world_products")
      .select("id,business_id,client_id,name,code,category,stage,currency,acquisition_price,public_price,responsibility_percent,client_benefit_share_percent,link_share_percent,minimum_link_share_percent,economic_state,responsibility_notes,agreement_notes,created_at,updated_at,global_id")
      .order("updated_at", { ascending: false }),
    supabase
      .from("link_world_activity")
      .select("id,action,target_type,target_id,origin,note,metadata,actor_id,created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("link_world_requests")
      .select("id,title,origin,status,business_ids,result_summary,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("link_world_relations")
      .select("id,source_business_id,target_business_id,relation_type,state,rationale,created_at,updated_at")
      .order("updated_at", { ascending: false })
      .limit(50),
    supabase
      .from("dashboard_preferences")
      .select("dashboard_key,title,visible_widgets,layouts,client_columns,updated_at")
      .eq("dashboard_key", DASHBOARD_KEY)
      .maybeSingle(),
  ]);

  const firstError = [
    clientsResult.error,
    businessesResult.error,
    productsResult.error,
    activityResult.error,
    requestsResult.error,
    relationsResult.error,
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

  const preference = preferencesResult.data;

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
    preferences: {
      dashboardKey: DASHBOARD_KEY,
      title: preference?.title || "LINK WORLD",
      visibleWidgets: Array.isArray(preference?.visible_widgets)
        ? preference.visible_widgets.filter((item: string) => ALLOWED_WIDGETS.has(item))
        : DEFAULT_VISIBLE_WIDGETS,
      layouts:
        preference?.layouts && Object.keys(preference.layouts).length
          ? sanitizeLayouts(preference.layouts)
          : DEFAULT_LAYOUTS,
      clientColumns: Array.isArray(preference?.client_columns)
        ? preference.client_columns.filter((item: string) => ALLOWED_CLIENT_COLUMNS.has(item))
        : DEFAULT_CLIENT_COLUMNS,
      updatedAt: preference?.updated_at || null,
    },
  });
}

export async function POST(request: NextRequest) {
  const supabase = getCentralSupabase();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, configured: false, error: "central_supabase_not_configured" },
      { status: 503 },
    );
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
  const updatedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("dashboard_preferences")
    .upsert(
      {
        dashboard_key: DASHBOARD_KEY,
        title: "LINK WORLD",
        visible_widgets: visibleWidgets.length ? visibleWidgets : DEFAULT_VISIBLE_WIDGETS,
        layouts,
        client_columns: clientColumns.length ? clientColumns : DEFAULT_CLIENT_COLUMNS,
        updated_at: updatedAt,
      },
      { onConflict: "dashboard_key" },
    )
    .select("dashboard_key,visible_widgets,layouts,client_columns,updated_at")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, preferences: data });
}
