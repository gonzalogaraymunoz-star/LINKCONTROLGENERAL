import { NextResponse } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = getCentralSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "central_supabase_not_configured" }, { status: 503 });
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const allowedStatuses = ["planned", "scheduled", "completed", "cancelled"];
  if (body.status !== undefined) {
    if (!allowedStatuses.includes(body.status)) return NextResponse.json({ ok: false, error: "invalid_status" }, { status: 400 });
    update.status = body.status;
  }
  if (body.title !== undefined) update.title = String(body.title).trim().slice(0, 240);
  if (body.description !== undefined) update.description = body.description ? String(body.description) : null;
  if (body.startsAt !== undefined) update.starts_at = new Date(body.startsAt).toISOString();
  if (body.endsAt !== undefined) update.ends_at = body.endsAt ? new Date(body.endsAt).toISOString() : null;
  if (body.recurrenceRule !== undefined) update.recurrence_rule = body.recurrenceRule || null;
  if (body.location !== undefined) update.location = body.location ? String(body.location).slice(0, 500) : null;
  if (body.attendees !== undefined) update.attendees = Array.isArray(body.attendees) ? body.attendees : [];
  if (body.reminders !== undefined) update.reminders = Array.isArray(body.reminders) ? body.reminders : [];
  if (body.allDay !== undefined) update.all_day = Boolean(body.allDay);

  const { data: gesture, error } = await supabase.from("client_gestures").update(update).eq("id", id).select("*").single();
  if (error || !gesture) return NextResponse.json({ ok: false, error: error?.message || "gesture_not_found" }, { status: 404 });
  await supabase.from("event_bus").insert({ control_id: gesture.control_id, source_provider: "control_central", event_type: "gesture.updated", entity_type: "gesture", global_id: `client:${gesture.client_id}`, dedupe_key: `gesture.updated:${gesture.id}:${Date.now()}`, payload: { gesture_id: gesture.id, client_id: gesture.client_id, status: gesture.status, title: gesture.title }, occurred_at: new Date().toISOString() });
  return NextResponse.json({ ok: true, gesture });
}
