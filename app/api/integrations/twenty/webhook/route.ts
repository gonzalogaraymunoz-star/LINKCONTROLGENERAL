import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";

const ROOT_CONTROL_ID = "00000000-0000-0000-0000-000000000001";
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const safeEqual = (a: string, b: string) => {
  const left = Buffer.from(a); const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

function pickRecord(payload: Record<string, unknown>) {
  const candidates = [payload.record, payload.data, payload.after, payload.object];
  return candidates.find((value) => value && typeof value === "object") as Record<string, unknown> | undefined;
}

export async function POST(request: NextRequest) {
  const supabase = getCentralSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "central_supabase_not_configured" }, { status: 503 });

  const token = request.nextUrl.searchParams.get("token") || "";
  const { data: connection } = await supabase.from("integration_connections").select("id,webhook_token_hash,status").eq("provider", "twenty").eq("connection_key", "primary").maybeSingle();
  if (!connection?.webhook_token_hash || connection.status !== "active" || !safeEqual(digest(token), connection.webhook_token_hash)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const raw = await request.text();
  let payload: Record<string, unknown>;
  try { payload = JSON.parse(raw) as Record<string, unknown>; }
  catch { return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 }); }

  const record = pickRecord(payload) || {};
  const eventType = String(payload.event || payload.name || payload.type || "twenty.webhook");
  const objectName = String(payload.objectName || payload.objectType || record.objectName || "record");
  const externalId = String(record.id || payload.recordId || payload.id || "") || null;
  const globalId = String(record.controlCentralId || record.controlCentralClientId || payload.controlCentralId || "") || null;
  const dedupeKey = digest(raw);

  const { error: eventError } = await supabase.from("event_bus").insert({
    control_id: ROOT_CONTROL_ID, source_provider: "twenty", event_type: eventType,
    entity_type: objectName, global_id: globalId, external_id: externalId,
    correlation_id: String(payload.correlationId || "") || null, dedupe_key: dedupeKey,
    payload, occurred_at: typeof payload.createdAt === "string" ? payload.createdAt : null,
  });

  if (eventError && !eventError.message.toLowerCase().includes("duplicate")) {
    await supabase.from("integration_connections").update({ status: "error", last_error: eventError.message, updated_at: new Date().toISOString() }).eq("id", connection.id);
    return NextResponse.json({ ok: false, error: eventError.message }, { status: 500 });
  }

  if (globalId && externalId) {
    await supabase.from("integration_bindings").upsert({
      control_id: ROOT_CONTROL_ID, provider: "twenty", global_id: globalId,
      entity_type: objectName, external_object: objectName, external_id: externalId,
      sync_status: "connected", last_synced_at: new Date().toISOString(), metadata: { lastEvent: eventType },
    }, { onConflict: "provider,external_object,external_id" });
  }

  await supabase.from("integration_connections").update({ status: "active", last_seen_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() }).eq("id", connection.id);
  return NextResponse.json({ ok: true, deduped: Boolean(eventError), eventType, globalId });
}
