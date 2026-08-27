import { NextResponse } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = getCentralSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "central_supabase_not_configured" }, { status: 503 });
  const body = await request.json().catch(() => null);
  if (!body?.clientId || !body?.title || !body?.startsAt) return NextResponse.json({ ok: false, error: "clientId_title_startsAt_required" }, { status: 400 });
  const { data: client, error: clientError } = await supabase.from("clients").select("id,control_id,name").eq("id", body.clientId).single();
  if (clientError || !client) return NextResponse.json({ ok: false, error: "client_not_found" }, { status: 404 });
  const { data: workspace } = await supabase.from("client_calendar_workspaces").select("id,status,google_calendar_id,timezone").eq("client_id", client.id).maybeSingle();
  const startsAt = new Date(body.startsAt);
  if (Number.isNaN(startsAt.getTime())) return NextResponse.json({ ok: false, error: "invalid_startsAt" }, { status: 400 });
  const endsAt = body.endsAt ? new Date(body.endsAt) : new Date(startsAt.getTime() + 60 * 60 * 1000);
  const { data, error } = await supabase.from("client_gestures").insert({
    control_id: client.control_id, client_id: client.id, calendar_workspace_id: workspace?.id ?? null,
    title: String(body.title).trim(), description: body.description ? String(body.description).trim() : null,
    gesture_type: body.gestureType || "task", status: "planned", starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(),
    timezone: workspace?.timezone || "America/Santiago", recurrence_rule: body.recurrenceRule || null,
    sync_status: workspace?.status === "connected" && workspace.google_calendar_id ? "pending_sync" : "pending_calendar_connection",
    source: "control_central", priority: Number(body.priority || 2), location: body.location ? String(body.location) : null,
    attendees: Array.isArray(body.attendees) ? body.attendees : [], reminders: Array.isArray(body.reminders) ? body.reminders : [{ method: "popup", minutes: 30 }],
    all_day: Boolean(body.allDay), metadata: { client_name: client.name, created_from: "dashboard" },
  }).select("*").single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  await supabase.from("event_bus").insert({ control_id: client.control_id, source_provider: "control_central", event_type: "gesture.created", entity_type: "gesture", global_id: `client:${client.id}`, dedupe_key: `gesture.created:${data.id}`, payload: { gesture_id: data.id, client_id: client.id, title: data.title, starts_at: data.starts_at, sync_status: data.sync_status }, occurred_at: new Date().toISOString() });
  return NextResponse.json({ ok: true, gesture: data }, { status: 201 });
}
