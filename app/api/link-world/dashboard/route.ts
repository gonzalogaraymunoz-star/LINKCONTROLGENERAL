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
    documentSpacesResult,
    documentRoutesResult,
    financialFollowupResult,
    transactionsResult,
    documentsResult,
    entityRelationsResult,
    gestureTasksResult,
    commandBusResult,
    eventBusResult,
    projectsResult,
    studiesResult,
    preferencesResult,
  ] = await Promise.all([
    supabase.from("link_world_clients")
      .select("id,business_id,slug,name,role,relationship_state,city,country,website,summary,agreement_status,owned_facts,evidence,created_at,updated_at,global_id")
      .order("updated_at", { ascending: false }),
    supabase.from("link_world_businesses")
      .select("id,slug,name,sector,city,country,website,summary,owned_facts,verification_status,public_workspace,created_at,updated_at,global_id")
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
    supabase.from("link_world_business_document_spaces")
      .select("id,business_id,business_global_id,business_name,folder_id,folder_url,status"),
    supabase.from("link_world_business_document_routes")
      .select("id,space_id,route_key,folder_name,folder_id,folder_url"),
    supabase.from("link_world_financial_followup")
      .select("*"),
    supabase.from("link_world_transactions")
      .select("id,business_id,business_global_id,counterparty_id,product_id,status,direction,transaction_type,amount,currency,documentary_status,occurred_at,due_at,paid_at,settled_at")
      .order("occurred_at", { ascending: false }).limit(100),
    supabase.from("link_world_documents")
      .select("id,business_id,transaction_id,document_type,route_key,drive_url,file_name,issue_date,amount,currency,created_at")
      .order("created_at", { ascending: false }).limit(100),
    supabase.from("entity_relations")
      .select("id,source_global_id,target_global_id,relation,state,metadata")
      .limit(500),
    supabase.from("gesture_tasks")
      .select("id,global_id,status,title,objective,resolution_criteria,recommended_action,metadata,completed_at,updated_at")
      .limit(500),
    supabase.from("command_bus")
      .select("id,global_id,status,action_key,requires_approval,approval_status,processed_at,requested_at")
      .limit(500),
    supabase.from("event_bus")
      .select("id,global_id,event_type,occurred_at,gesture_code")
      .limit(500),
    supabase.from("projects")
      .select("id,client_id,status,phase,kind")
      .limit(500),
    supabase.from("study_studies")
      .select("id,client_id,status,title")
      .limit(500),
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
    documentSpacesResult.error,
    documentRoutesResult.error,
    financialFollowupResult.error,
    transactionsResult.error,
    documentsResult.error,
    entityRelationsResult.error,
    gestureTasksResult.error,
    commandBusResult.error,
    eventBusResult.error,
    projectsResult.error,
    studiesResult.error,
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

  const routesBySpace = new Map<string, typeof documentRoutesResult.data>();
  for (const route of documentRoutesResult.data ?? []) {
    const current = routesBySpace.get(route.space_id) ?? [];
    current.push(route);
    routesBySpace.set(route.space_id, current);
  }
  const documentSpaceByBusiness = new Map((documentSpacesResult.data ?? []).map((space) => [
    space.business_id,
    { ...space, routes: routesBySpace.get(space.id) ?? [] },
  ]));
  const financialByBusiness = new Map((financialFollowupResult.data ?? []).map((row) => [row.business_id, row]));
  const transactionsByBusiness = new Map<string, typeof transactionsResult.data>();
  for (const transaction of transactionsResult.data ?? []) {
    const current = transactionsByBusiness.get(transaction.business_id) ?? [];
    current.push(transaction);
    transactionsByBusiness.set(transaction.business_id, current);
  }
  const documentsByBusiness = new Map<string, typeof documentsResult.data>();
  for (const document of documentsResult.data ?? []) {
    const current = documentsByBusiness.get(document.business_id) ?? [];
    current.push(document);
    documentsByBusiness.set(document.business_id, current);
  }

  const clients = (clientsResult.data ?? []).map((client) => ({
    ...client,
    business: client.business_id ? businessById.get(client.business_id) ?? null : null,
    products: productsByClient.get(client.id) ?? [],
    documentSpace: client.business_id ? documentSpaceByBusiness.get(client.business_id) ?? null : null,
    financial: client.business_id ? financialByBusiness.get(client.business_id) ?? null : null,
    recentTransactions: client.business_id ? (transactionsByBusiness.get(client.business_id) ?? []).slice(0, 8) : [],
    recentDocuments: client.business_id ? (documentsByBusiness.get(client.business_id) ?? []).slice(0, 8) : [],
  }));

  const organelleTypeByKey = new Map((organelleTypesResult.data ?? []).map((row) => [row.organelle_key, row]));
  const entityById = new Map((entitiesResult.data ?? []).map((row) => [row.id, row]));
  const bindings = (bindingsResult.data ?? []).map((binding) => ({
    ...binding,
    type: organelleTypeByKey.get(binding.organelle_key) ?? null,
  }));

  const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
  const asRecord = (value: unknown): Record<string, any> =>
    value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};

  const cells = (cellsResult.data ?? []).map((cell) => {
    const entity = entityById.get(cell.entity_id) ?? null;
    const business = entity?.owner_record_id ? businessById.get(entity.owner_record_id) ?? null : null;
    const allOrganelles = bindings.filter((binding) => binding.cell_entity_id === cell.entity_id);

    if (!business || !entity?.global_id) {
      return {
        ...cell,
        entity,
        business,
        organelles: [],
        activeOrganelles: 0,
        requiredOrganelles: allOrganelles.filter((item) => item.type?.required_for_cell).length,
        completion: 0,
        efficiency: 0,
        missingRequired: [],
      };
    }

    const businessProducts = products.filter((item) => item.business_id === business.id);
    const businessClients = (clientsResult.data ?? []).filter((item) => item.business_id === business.id);
    const worldRelations = (relationsResult.data ?? []).filter((item) =>
      item.source_business_id === business.id || item.target_business_id === business.id
    );
    const graphRelations = (entityRelationsResult.data ?? []).filter((item) =>
      (item.source_global_id === entity.global_id || item.target_global_id === entity.global_id) &&
      String(item.relation || "").toLowerCase() !== "governed_by"
    );
    const gestures = (gestureTasksResult.data ?? []).filter((item) => item.global_id === entity.global_id);
    const commands = (commandBusResult.data ?? []).filter((item) => item.global_id === entity.global_id);
    const events = (eventBusResult.data ?? []).filter((item) => item.global_id === entity.global_id);
    const sourceClientId = String(asRecord(business.owned_facts).source_control_client_id || "");
    const projects = sourceClientId
      ? (projectsResult.data ?? []).filter((item) => String(item.client_id || "") === sourceClientId)
      : [];
    const studies = sourceClientId
      ? (studiesResult.data ?? []).filter((item) => String(item.client_id || "") === sourceClientId)
      : [];
    const documents = documentsByBusiness.get(business.id) ?? [];
    const transactions = transactionsByBusiness.get(business.id) ?? [];

    const promptFor = (key: string, label: string, next: string) => {
      const base = "@link-world Revisa " + business.name + " usando su estado actual en LINK WORLD. ";
      const prompts: Record<string, string> = {
        nucleus: base + "Quiero " + next.toLowerCase() + ". Completa solo lo que falte, separa hechos de propuestas y no escribas cambios hasta que los apruebe.",
        membrane: base + "Quiero definir los límites, permisos y respaldos que debe tener este negocio. Propón la configuración mínima y no la registres hasta que la apruebe.",
        receptors: base + "Quiero conectar una entrada o integración real al negocio. Revisa qué existe primero y propón el siguiente conector sin inventar conexiones.",
        cytoskeleton: base + "Quiero ordenar sus relaciones reales con Links, productos y otras células. Revisa el grafo actual y propón el siguiente vínculo útil.",
        mitochondria: base + "Quiero revisar su economía y energía: precios, costos, márgenes y viabilidad de los productos existentes. Usa los datos reales y señala lo pendiente.",
        ribosome: base + "Quiero revisar lo que este negocio está produciendo o construyendo. Usa los proyectos reales y propón el siguiente avance.",
        reticulum: base + "Quiero revisar los gestos y flujo operativo de este negocio. No crees tareas innecesarias; propón solo acciones que tengan un resultado verificable.",
        golgi: base + "Quiero revisar cómo este negocio distribuye y comercializa sus productos mediante sus Links reales. Propón el siguiente avance comercial verificable.",
        memory: base + "Quiero consolidar la memoria y evidencia de este negocio sin duplicar la fuente de verdad. Revisa documentos y antecedentes existentes.",
        intelligence: base + "Quiero investigar una oportunidad de este negocio. Parte de los estudios existentes y separa claramente hipótesis de hechos.",
        signaling: base + "Quiero revisar las señales y eventos verificables emitidos por este negocio y detectar qué resultado debería registrarse a continuación.",
        transport: base + "Quiero revisar los comandos y gestos codificados de este negocio, su estado y qué intención falta transportar o resolver.",
      };
      return prompts[key] || base + "Quiero trabajar el área " + label + ": " + next + ".";
    };

    const scoreOrganelle = (binding: any) => {
      const key = String(binding.organelle_key || "");
      const label = binding.type?.biological_name || binding.type?.system_name || key;
      const taggedGestures = gestures.filter((gesture) => String(asRecord(gesture.metadata).organelle_key || "") === key);
      let actionCount = taggedGestures.length;
      let completion = 0;
      let efficiency = 0;
      let nextGesture = "Revisar esta área";

      if (key === "nucleus") {
        actionCount += 1;
        const identityFields = [business.name, business.sector, business.city, business.country, business.summary];
        const identityCoverage = identityFields.filter(Boolean).length / identityFields.length;
        const verified = ["verified", "active", "approved"].includes(String(business.verification_status || "").toLowerCase());
        completion = identityCoverage * 80 + (verified ? 20 : 0);
        efficiency = completion;
        nextGesture = verified ? "Mantener identidad actualizada" : "Completar y verificar la identidad";
      } else if (key === "cytoskeleton") {
        const relations = [...worldRelations, ...graphRelations];
        actionCount += relations.length;
        const active = relations.filter((item: any) => ["active", "confirmed", "agreed", "linked"].includes(String(item.state || "").toLowerCase())).length;
        completion = relations.length ? Math.max(35, active / relations.length * 100) : 0;
        efficiency = relations.length ? Math.max(30, active / relations.length * 100) : 0;
        nextGesture = relations.length ? "Revisar y fortalecer las relaciones activas" : "Crear la primera relación real";
      } else if (key === "mitochondria") {
        actionCount += businessProducts.length;
        if (businessProducts.length) {
          const scores = businessProducts.map((product) => {
            let score = 0;
            if (product.public_price != null) score += 25;
            if (["ready", "active"].includes(String(product.economic_state || "").toLowerCase())) score += 25;
            if (["agreed", "active", "recorded", "learning", "expanding"].includes(String(product.stage || "").toLowerCase())) score += 20;
            if (product.acquisition_price != null || product.link_share_percent != null || product.responsibility_percent != null) score += 15;
            if (product.agreement_notes && !/pendiente|pending/i.test(String(product.agreement_notes))) score += 15;
            return score;
          });
          completion = scores.reduce((a, b) => a + b, 0) / scores.length;
          efficiency = businessProducts.filter((product) => ["ready", "active"].includes(String(product.economic_state || "").toLowerCase())).length / businessProducts.length * 100;
        }
        nextGesture = businessProducts.length ? "Cerrar la economía pendiente de los productos" : "Definir el primer producto económico";
      } else if (key === "ribosome") {
        actionCount += projects.length;
        if (projects.length) {
          const active = projects.filter((project) => ["active", "in_progress", "open"].includes(String(project.status || "").toLowerCase())).length;
          const phased = projects.filter((project) => Boolean(project.phase)).length;
          completion = active / projects.length * 70 + phased / projects.length * 30;
          efficiency = active / projects.length * 100;
        }
        nextGesture = projects.length ? "Revisar el avance de los proyectos activos" : "Crear el primer activo o proyecto";
      } else if (key === "reticulum") {
        actionCount += gestures.length;
        if (gestures.length) {
          const done = gestures.filter((gesture) => ["done", "completed", "closed"].includes(String(gesture.status || "").toLowerCase())).length;
          const defined = gestures.filter((gesture) => Boolean(gesture.objective) && Boolean(gesture.resolution_criteria)).length;
          completion = done / gestures.length * 70 + defined / gestures.length * 30;
          efficiency = done / gestures.length * 100;
        }
        nextGesture = gestures.length ? "Resolver los gestos abiertos con criterio verificable" : "Crear el primer gesto útil";
      } else if (key === "golgi") {
        actionCount += businessClients.length;
        if (businessClients.length) {
          const scores = businessClients.map((client) => {
            const relation = String(client.relationship_state || "").toLowerCase();
            const agreement = String(client.agreement_status || "").toLowerCase();
            const relationScore = ["active", "confirmed", "agreed"].includes(relation) ? 55 : relation === "conversation" ? 35 : relation === "detected" ? 20 : 0;
            const agreementScore = ["active", "signed", "agreed", "confirmed"].includes(agreement) ? 45 : ["proposal", "negotiation"].includes(agreement) ? 25 : 0;
            return relationScore + agreementScore;
          });
          completion = scores.reduce((a, b) => a + b, 0) / scores.length;
          efficiency = businessClients.filter((client) => ["active", "confirmed", "agreed"].includes(String(client.relationship_state || "").toLowerCase())).length / businessClients.length * 100;
        }
        nextGesture = businessClients.length ? "Avanzar los Links hacia acuerdos reales" : "Crear el primer Link comercial";
      } else if (key === "memory") {
        actionCount += documents.length;
        completion = documents.length ? Math.min(100, 45 + documents.length * 10) : 0;
        const documentedTransactions = transactions.filter((transaction) => ["complete", "backed_up", "verified"].includes(String(transaction.documentary_status || "").toLowerCase())).length;
        efficiency = transactions.length ? documentedTransactions / transactions.length * 100 : documents.length ? 70 : 0;
        nextGesture = documents.length ? "Mantener evidencia y respaldo documental al día" : "Registrar la primera evidencia documental";
      } else if (key === "intelligence") {
        actionCount += studies.length;
        if (studies.length) {
          const mature = studies.filter((study) => ["completed", "validated", "closed", "approved"].includes(String(study.status || "").toLowerCase())).length;
          completion = 50 + mature / studies.length * 50;
          efficiency = mature / studies.length * 100;
        }
        nextGesture = studies.length ? "Convertir estudios maduros en decisiones" : "Abrir el primer estudio u oportunidad";
      } else if (key === "signaling") {
        actionCount += events.length;
        completion = events.length ? 100 : 0;
        efficiency = events.length ? 100 : 0;
        nextGesture = events.length ? "Revisar la última señal y su consecuencia" : "Emitir la primera señal verificable";
      } else if (key === "transport") {
        actionCount += commands.length;
        if (commands.length) {
          const succeeded = commands.filter((command) => String(command.status || "").toLowerCase() === "succeeded").length;
          completion = succeeded / commands.length * 100;
          efficiency = succeeded / commands.length * 100;
        }
        nextGesture = commands.length ? "Resolver comandos pendientes o fallidos" : "Transportar la primera intención real";
      } else if (key === "membrane") {
        nextGesture = "Definir límites, permisos y respaldo mínimo";
      } else if (key === "receptors") {
        nextGesture = "Conectar la primera entrada o integración real";
      }

      if (taggedGestures.length && actionCount === taggedGestures.length) {
        const done = taggedGestures.filter((gesture) => ["done", "completed", "closed"].includes(String(gesture.status || "").toLowerCase())).length;
        completion = Math.max(completion, done / taggedGestures.length * 100);
        efficiency = Math.max(efficiency, done / taggedGestures.length * 100);
      }

      const alive = actionCount > 0;
      return {
        ...binding,
        alive,
        actionCount,
        completion: clamp(completion),
        efficiency: clamp(efficiency),
        nextGesture,
        prompt: promptFor(key, label, nextGesture),
      };
    };

    const scored = allOrganelles.map(scoreOrganelle);
    const liveOrganelles = scored.filter((item) => item.alive);
    const required = scored.filter((item) => item.type?.required_for_cell);
    const optionalLive = liveOrganelles.filter((item) => !item.type?.required_for_cell);
    const weighted = [
      ...required.map((item) => ({ score: item.completion, weight: 1.25 })),
      ...optionalLive.map((item) => ({ score: item.completion, weight: 1 })),
    ];
    const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
    const completion = totalWeight ? clamp(weighted.reduce((sum, item) => sum + item.score * item.weight, 0) / totalWeight) : 0;
    const efficiencyWeight = liveOrganelles.length || 1;
    const efficiency = liveOrganelles.length
      ? clamp(liveOrganelles.reduce((sum, item) => sum + item.efficiency, 0) / efficiencyWeight)
      : 0;
    const missingRequired = required
      .filter((item) => !item.alive)
      .map((item) => ({
        key: item.organelle_key,
        label: item.type?.system_name || item.type?.biological_name || item.organelle_key,
        prompt: promptFor(item.organelle_key, item.type?.biological_name || item.organelle_key, item.nextGesture),
      }));

    return {
      ...cell,
      entity,
      business,
      organelles: liveOrganelles,
      potentialOrganelles: allOrganelles.length,
      activeOrganelles: liveOrganelles.length,
      requiredOrganelles: required.length,
      completion,
      efficiency,
      healthCalculated: completion >= 80 && efficiency >= 70 ? "Sólida" : completion >= 50 ? "En desarrollo" : "Formándose",
      missingRequired,
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
