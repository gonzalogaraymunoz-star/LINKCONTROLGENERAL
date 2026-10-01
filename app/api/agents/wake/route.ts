import { NextRequest, NextResponse } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";
import { routeEventToAgent, wakeAgent } from "@/lib/agents/runtime";

const MAX_EVENTS_PER_WAKE = 3;

function authorizedCron(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) return request.headers.get("authorization") === `Bearer ${secret}`;
  return Boolean(request.headers.get("x-vercel-cron-schedule"));
}

export async function GET(request: NextRequest) {
  if (!authorizedCron(request)) {
    return NextResponse.json({ ok: false, error: "cron_auth_required" }, { status: 401 });
  }

  const supabase = getCentralSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "central_supabase_not_configured" }, { status: 503 });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: events, error } = await supabase
    .from("event_bus")
    .select("id,source_provider,event_type,entity_type,global_id,received_at")
    .gte("received_at", since)
    .order("received_at", { ascending: true })
    .limit(30);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const candidates = (events || [])
    .filter((event: any) => !["agent-runtime", "control-central"].includes(String(event.source_provider || "")))
    .filter((event: any) => !/^(AGENT_|MISSION_)/.test(String(event.event_type || "")))
    .slice(0, 12);

  const results: unknown[] = [];
  let attempted = 0;

  for (const event of candidates) {
    if (attempted >= MAX_EVENTS_PER_WAKE) break;
    const agentSlug = routeEventToAgent(String(event.event_type || ""), String(event.source_provider || ""));

    const markerKey = `agent_wake:${event.id}:${agentSlug}`;
    const { data: marker } = await supabase
      .from("event_bus")
      .select("id")
      .eq("dedupe_key", markerKey)
      .maybeSingle();
    if (marker) continue;

    attempted += 1;
    try {
      results.push(
        await wakeAgent({
          agentSlug,
          eventId: event.id,
          businessGlobalId: event.global_id || null,
        }),
      );
    } catch (wakeError: any) {
      results.push({
        ok: false,
        agentSlug,
        eventId: event.id,
        error: wakeError?.message || "agent_wake_failed",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    checked: candidates.length,
    attempted,
    results,
  });
}
