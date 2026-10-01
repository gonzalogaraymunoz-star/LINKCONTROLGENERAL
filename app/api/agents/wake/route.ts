import { NextRequest, NextResponse } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";
import { routeEventToAgent, wakeAgent } from "@/lib/agents/runtime";

const MAX_EVENTS_PER_WAKE = 1;

function authorizedCron(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) return request.headers.get("authorization") === `Bearer ${secret}`;
  return Boolean(request.headers.get("x-vercel-cron-schedule"));
}

export const maxDuration = 120;

function eventPriority(event: { source_provider?: string | null; event_type?: string | null }) {
  const value = `${event.source_provider || ""} ${event.event_type || ""}`.toLowerCase();
  if (/lead|prospect|contact|form|whatsapp|message|inbox/.test(value)) return 100;
  if (/payment|paid|checkout|purchase|sale|quote|cotiza|invoice|mercado.?pago/.test(value)) return 90;
  if (/onboard|welcome|activation|booking.?confirmed|reservation.?confirmed/.test(value)) return 80;
  if (/delivery|delivered|service|tour|arrival|attendance|fulfilled/.test(value)) return 70;
  if (/review|nps|referral|repeat|recompra|retention|testimonial|postventa/.test(value)) return 60;
  if (/rrss|social|post|campaign|traffic|attention|reach|click|impression|utm/.test(value)) return 50;
  if (String(event.source_provider || "").toLowerCase() === "link_game") return 10;
  return 30;
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
    .sort((a: any, b: any) => {
      const priorityDelta = eventPriority(b) - eventPriority(a);
      if (priorityDelta !== 0) return priorityDelta;
      return new Date(a.received_at || 0).getTime() - new Date(b.received_at || 0).getTime();
    })
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
      const errorMessage = wakeError?.message || "agent_wake_failed";
      console.error("LINK agent wake failed", {
        agentSlug,
        eventId: event.id,
        error: errorMessage,
      });

      await supabase.from("event_bus").upsert(
        {
          control_id: "00000000-0000-0000-0000-000000000001",
          source_provider: "agent-runtime",
          event_type: "AGENT_WAKE_FAILED",
          entity_type: event.entity_type || "business",
          global_id: event.global_id || null,
          correlation_id: event.id,
          dedupe_key: `agent_wake_failed:${event.id}:${agentSlug}`,
          payload: {
            source_event_id: event.id,
            source_event_type: event.event_type,
            agent_slug: agentSlug,
            error: errorMessage,
          },
          occurred_at: new Date().toISOString(),
        },
        { onConflict: "dedupe_key" },
      );

      results.push({
        ok: false,
        agentSlug,
        eventId: event.id,
        error: errorMessage,
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
