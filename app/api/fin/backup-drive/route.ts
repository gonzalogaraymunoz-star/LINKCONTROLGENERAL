import { NextRequest, NextResponse } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";
import { appendFinLedgerRows, googleDriveConfigured } from "@/lib/fin/google-drive";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(request: NextRequest) {
  const expected = process.env.LINK_PAYMENT_INTERNAL_TOKEN?.trim();
  if (!expected) return false;
  return request.headers.get("authorization") === `Bearer ${expected}`;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "FIN Drive backup worker",
    configured: googleDriveConfigured(),
  });
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!googleDriveConfigured()) {
    return NextResponse.json({ ok: false, error: "google_drive_service_account_not_configured" }, { status: 503 });
  }

  const supabase = getCentralSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "supabase_not_configured" }, { status: 503 });
  }

  const [{ data: configRows, error: configError }, { data: queue, error: queueError }] = await Promise.all([
    supabase.from("fin_config").select("key,value"),
    supabase
      .from("fin_drive_backup_queue")
      .select("*")
      .eq("status", "pending")
      .eq("object_type", "ledger_event")
      .order("created_at", { ascending: true })
      .limit(50),
  ]);

  if (configError || queueError) {
    return NextResponse.json({ ok: false, error: configError?.message || queueError?.message }, { status: 500 });
  }

  const config = Object.fromEntries((configRows || []).map((row) => [row.key, row.value]));
  const sheetId = config.drive_master_sheet_id;
  if (!sheetId) {
    return NextResponse.json({ ok: false, error: "fin_drive_master_sheet_missing" }, { status: 500 });
  }

  let synced = 0;
  let failed = 0;

  for (const item of queue || []) {
    await supabase
      .from("fin_drive_backup_queue")
      .update({ status: "processing", attempts: (item.attempts || 0) + 1, updated_at: new Date().toISOString() })
      .eq("id", item.id);

    try {
      const { data: event, error } = await supabase
        .from("fin_ledger_events")
        .select("*")
        .eq("id", item.object_id)
        .single();
      if (error || !event) throw new Error(error?.message || "ledger_event_missing");

      await appendFinLedgerRows(sheetId, [[
        event.id,
        event.recorded_at,
        event.event_type,
        event.actor,
        event.business_ref || "",
        event.order_ref || "",
        event.provider || "",
        event.amount ?? "",
        event.currency || "",
        event.status || "",
        "",
        event.correlation_id || "",
        event.event_key,
        JSON.stringify(event.metadata || {}),
      ]]);

      await supabase
        .from("fin_drive_backup_queue")
        .update({ status: "synced", synced_at: new Date().toISOString(), updated_at: new Date().toISOString(), last_error: null })
        .eq("id", item.id);
      synced += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "drive_backup_failed";
      await supabase
        .from("fin_drive_backup_queue")
        .update({ status: "failed", last_error: message.slice(0, 500), updated_at: new Date().toISOString() })
        .eq("id", item.id);
      failed += 1;
    }
  }

  await supabase.from("fin_ledger_events").insert({
    event_key: `drive.backup.batch:${crypto.randomUUID()}`,
    event_type: "drive.backup.batch.completed",
    category: "backup",
    direction: "neutral",
    actor: "linksubdot",
    source: "drive-backup-worker",
    status: failed ? "partial" : "synced",
    metadata: { processed: (queue || []).length, synced, failed },
  });

  return NextResponse.json({ ok: failed === 0, processed: (queue || []).length, synced, failed });
}
