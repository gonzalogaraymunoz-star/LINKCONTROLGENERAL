import { NextResponse } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = getCentralSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "central_supabase_not_configured" }, { status: 503 });
  const { id } = await context.params;
  const { data, error } = await supabase.from("gesture_comments").select("id,gesture_id,client_id,author_name,body,created_at,updated_at").eq("gesture_id", id).order("created_at", { ascending: true });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, comments: data ?? [] });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = getCentralSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "central_supabase_not_configured" }, { status: 503 });
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const text = String(body?.body ?? "").trim();
  if (!text) return NextResponse.json({ ok: false, error: "comment_required" }, { status: 400 });
  const { data: gesture, error: gestureError } = await supabase.from("client_gestures").select("id,client_id,control_id,title").eq("id", id).single();
  if (gestureError || !gesture) return NextResponse.json({ ok: false, error: "gesture_not_found" }, { status: 404 });
  const { data: comment, error } = await supabase.from("gesture_comments").insert({ gesture_id: id, client_id: gesture.client_id, control_id: gesture.control_id, author_name: String(body?.authorName ?? "CONTROL CENTRAL").slice(0, 120), body: text }).select("id,gesture_id,client_id,author_name,body,created_at,updated_at").single();
  if (error || !comment) return NextResponse.json({ ok: false, error: error?.message || "comment_not_created" }, { status: 400 });
  await supabase.from("event_bus").insert({ control_id: gesture.control_id, source_provider: "control_central", event_type: "gesture.comment_added", entity_type: "gesture", global_id: `client:${gesture.client_id}`, dedupe_key: `gesture.comment_added:${comment.id}`, payload: { gesture_id: id, comment_id: comment.id, client_id: gesture.client_id, title: gesture.title }, occurred_at: new Date().toISOString() });
  return NextResponse.json({ ok: true, comment }, { status: 201 });
}
