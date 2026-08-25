import { NextRequest, NextResponse } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";

const ROOT_CONTROL_ID = "00000000-0000-0000-0000-000000000001";
const ACTOR = "link-control-app";

async function recordEvent(
  supabase: NonNullable<ReturnType<typeof getCentralSupabase>>,
  input: { clientId?: string | null; eventType: string; objectType: string; objectId?: string | null; payload?: Record<string, unknown> },
) {
  await supabase.from("events").insert({
    control_id: ROOT_CONTROL_ID,
    client_id: input.clientId || null,
    event_type: input.eventType,
    actor: ACTOR,
    object_type: input.objectType,
    object_id: input.objectId || null,
    payload: input.payload || {},
  });
}

export async function GET() {
  const supabase = getCentralSupabase();
  if (!supabase) return NextResponse.json({ ok: false, configured: false, error: "central_supabase_not_configured" }, { status: 503 });

  const [{ data: clients, error: clientsError }, { data: cycles, error: cyclesError }, { data: needs }, { data: products }, { data: workItems }, { data: events }] = await Promise.all([
    supabase.from("clients").select("id,name,slug,status,short_code,accent,control_id").eq("status", "active").order("created_at"),
    supabase.from("client_cycles").select("id,client_id,need_id,product_id,stage,progress,next_milestone,status,updated_at").eq("status", "active"),
    supabase.from("needs").select("id,client_id,title,description,status"),
    supabase.from("products").select("id,name,description,product_type,active,metadata"),
    supabase.from("work_items").select("id,client_id,cycle_id,stage,kind,title,description,due_at,priority,status,source,created_at,updated_at").neq("status", "cancelled").order("created_at"),
    supabase.from("events").select("id,client_id,event_type,actor,object_type,object_id,payload,created_at").order("created_at", { ascending: false }).limit(100),
  ]);

  if (clientsError || cyclesError) return NextResponse.json({ ok: false, error: clientsError?.message || cyclesError?.message }, { status: 500 });
  return NextResponse.json({ ok: true, configured: true, clients: clients ?? [], cycles: cycles ?? [], needs: needs ?? [], products: products ?? [], workItems: workItems ?? [], events: events ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = getCentralSupabase();
  if (!supabase) return NextResponse.json({ ok: false, configured: false, error: "central_supabase_not_configured" }, { status: 503 });
  const body = await request.json();
  const action = String(body.action || "");

  if (action === "create_client") {
    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ ok: false, error: "missing_name" }, { status: 400 });
    const slug = String(body.slug || name).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const shortCode = String(body.shortCode || name.split(/\s+/).map((x: string) => x[0]).join("").slice(0,2).toUpperCase());
    const accent = String(body.accent || "#7a7a76");
    const { data, error } = await supabase.from("clients").insert({ control_id: ROOT_CONTROL_ID, name, slug, short_code: shortCode, accent, status: "active", metadata: { source: ACTOR } }).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    await recordEvent(supabase, { clientId: data.id, eventType: "client.created", objectType: "client", objectId: data.id, payload: { name } });
    return NextResponse.json({ ok: true, client: data });
  }

  if (action === "update_client") {
    const clientId = String(body.clientId || "");
    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) patch.name = String(body.name);
    if (body.accent !== undefined) patch.accent = String(body.accent);
    if (body.shortCode !== undefined) patch.short_code = String(body.shortCode);
    const { error } = await supabase.from("clients").update(patch).eq("id", clientId);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    await recordEvent(supabase, { clientId, eventType: "client.updated", objectType: "client", objectId: clientId, payload: patch });
    return NextResponse.json({ ok: true });
  }

  if (action === "create_cycle") {
    const clientId = String(body.clientId || "");
    const needTitle = String(body.need || "Nueva necesidad");
    const productName = String(body.product || "Producto por definir");
    const { data: need, error: needError } = await supabase.from("needs").insert({ control_id: ROOT_CONTROL_ID, client_id: clientId, title: needTitle, description: body.needDescription || null }).select().single();
    if (needError) return NextResponse.json({ ok: false, error: needError.message }, { status: 400 });
    const { data: product, error: productError } = await supabase.from("products").insert({ control_id: ROOT_CONTROL_ID, name: productName, description: body.productDescription || null, metadata: { client_id: clientId } }).select().single();
    if (productError) return NextResponse.json({ ok: false, error: productError.message }, { status: 400 });
    const { data: cycle, error: cycleError } = await supabase.from("client_cycles").insert({ control_id: ROOT_CONTROL_ID, client_id: clientId, need_id: need.id, product_id: product.id, stage: body.stage || "understand", next_milestone: body.nextMilestone || null }).select().single();
    if (cycleError) return NextResponse.json({ ok: false, error: cycleError.message }, { status: 400 });
    await recordEvent(supabase, { clientId, eventType: "cycle.created", objectType: "client_cycle", objectId: cycle.id, payload: { need_id: need.id, product_id: product.id, stage: cycle.stage } });
    return NextResponse.json({ ok: true, cycle });
  }

  if (action === "update_cycle") {
    const cycleId = String(body.cycleId || "");
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.stage !== undefined) patch.stage = body.stage;
    if (body.nextMilestone !== undefined) patch.next_milestone = body.nextMilestone;
    const { data, error } = await supabase.from("client_cycles").update(patch).eq("id", cycleId).select("id,client_id,stage,next_milestone").single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    await recordEvent(supabase, { clientId: data.client_id, eventType: body.stage !== undefined ? "stage.changed" : "cycle.updated", objectType: "client_cycle", objectId: cycleId, payload: patch });
    return NextResponse.json({ ok: true, cycle: data });
  }

  if (action === "update_need") {
    const needId = String(body.needId || "");
    const { data, error } = await supabase.from("needs").update({ title: String(body.title || ""), description: body.description || null, updated_at: new Date().toISOString() }).eq("id", needId).select("id,client_id,title").single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    await recordEvent(supabase, { clientId: data.client_id, eventType: "need.updated", objectType: "need", objectId: needId, payload: { title: data.title } });
    return NextResponse.json({ ok: true, need: data });
  }

  if (action === "update_product") {
    const productId = String(body.productId || "");
    const { data, error } = await supabase.from("products").update({ name: String(body.name || ""), description: body.description || null, updated_at: new Date().toISOString() }).eq("id", productId).select("id,name,metadata").single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    const clientId = data.metadata && typeof data.metadata === "object" && "client_id" in data.metadata ? String((data.metadata as Record<string, unknown>).client_id || "") : null;
    await recordEvent(supabase, { clientId, eventType: "product.updated", objectType: "product", objectId: productId, payload: { name: data.name } });
    return NextResponse.json({ ok: true, product: data });
  }

  if (action === "create_work_item") {
    const { data, error } = await supabase.from("work_items").insert({ control_id: ROOT_CONTROL_ID, client_id: body.clientId || null, cycle_id: body.cycleId || null, stage: body.stage || null, kind: body.kind || "task", title: String(body.title || "Nuevo trabajo"), description: body.description || null, due_at: body.dueAt || null, priority: body.priority || 2, status: "pending", source: body.source || "manual" }).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, workItem: data });
  }

  if (action === "update_work_item") {
    const workItemId = String(body.workItemId || "");
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) patch.title = String(body.title);
    if (body.description !== undefined) patch.description = body.description || null;
    if (body.dueAt !== undefined) patch.due_at = body.dueAt || null;
    if (body.priority !== undefined) patch.priority = Number(body.priority);
    if (body.kind !== undefined) patch.kind = String(body.kind);
    const { data, error } = await supabase.from("work_items").update(patch).eq("id", workItemId).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, workItem: data });
  }

  if (action === "set_work_status") {
    const workItemId = String(body.workItemId || "");
    const status = String(body.status || "pending");
    const patch = { status, completed_at: status === "done" ? new Date().toISOString() : null, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from("work_items").update(patch).eq("id", workItemId).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, workItem: data });
  }

  if (action === "archive_work_item") {
    const workItemId = String(body.workItemId || "");
    const { data, error } = await supabase.from("work_items").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", workItemId).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, workItem: data });
  }

  if (action === "archive_client") {
    const clientId = String(body.clientId || "");
    const { error } = await supabase.from("clients").update({ status: "archived", archived_at: new Date().toISOString() }).eq("id", clientId);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    await recordEvent(supabase, { clientId, eventType: "client.archived", objectType: "client", objectId: clientId });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
}
