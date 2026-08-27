import { NextResponse } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = getCentralSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "central_supabase_not_configured" }, { status: 503 });
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const allowed = ["planned", "scheduled", "completed", "cancelled"];
  if (!body?.status || !allowed.includes(body.status)) return NextResponse.json({ ok: false, error: "invalid_status" }, { status: 400 });
  const { data: gesture, error } = await supabase.from("client_gestures").update({ status: body.status, updated_at: new Date().toISOString() }).eq("id", id).select("id,client_id,control_id,title,status,starts_at,sync_status").single();
  if (error || !gesture) return NextResponse.json({ ok: false, error: error?.message || "gesture_not_found" }, { status: 404 });
  await supabase.from("event_bus").insert({ control_id: gesture.control_id, source_provider: "control_central", event_type: "gesture.status_changed", entity_type: "gesture", global_id: `client:${gesture.client_id}`, dedupe_key: `gesture.status_changed:${gesture.id}:${body.status}:${Date.now()}`, payload: { gesture_id: gesture.id, client_id: gesture.client_id, status: body.status, title: gesture.title }, occurred_at: new Date().toISOString() });
  return NextResponse.json({ ok: true, gesture });
}
