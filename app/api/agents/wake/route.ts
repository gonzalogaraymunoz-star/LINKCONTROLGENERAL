import { NextRequest, NextResponse } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";
import { wakeAgent } from "@/lib/agents/runtime";

const ROOT_CONTROL_ID = "00000000-0000-0000-0000-000000000001";

function authorizedCron(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) return request.headers.get("authorization") === `Bearer ${secret}`;
  return Boolean(request.headers.get("x-vercel-cron-schedule"));
}

export const maxDuration = 120;

async function updateScope(
  supabase: NonNullable<ReturnType<typeof getCentralSupabase>>,
  work: any,
  patch: Record<string, unknown>,
) {
  let query = supabase.from("agent_scope_state").update({
    ...patch,
    updated_at: new Date().toISOString(),
  }).eq("agent_slug", work.agent_slug);

  if (work.business_global_id) {
    query = query.eq("business_global_id", work.business_global_id);
    if (work.stage_key) query = query.eq("stage_key", work.stage_key);
  } else {
    query = query.eq("scope_key", "ecosystem:link-director");
  }

  const { error } = await query;
  if (error) throw error;
}

export async function GET(request: NextRequest) {
  if (!authorizedCron(request)) {
    return NextResponse.json({ ok: false, error: "cron_auth_required" }, { status: 401 });
  }

  const supabase = getCentralSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "central_supabase_not_configured" }, { status: 503 });
  }

  const { data: refresh, error: refreshError } = await supabase.rpc("link_refresh_agent_work_queue_v1");
  if (refreshError) {
    return NextResponse.json({ ok: false, error: refreshError.message }, { status: 500 });
  }

  const { data: claimed, error: claimError } = await supabase.rpc("link_claim_agent_work_v1");
  if (claimError) {
    return NextResponse.json({ ok: false, error: claimError.message }, { status: 500 });
  }

  const work = Array.isArray(claimed) ? claimed[0] : null;
  if (!work) {
    return NextResponse.json({ ok: true, attempted: 0, refresh, state: "idle" });
  }

  try {
    const result: any = await wakeAgent({
      agentSlug: work.agent_slug,
      eventId: work.source_event_id || null,
      businessGlobalId: work.business_global_id || null,
      workItemId: work.id,
      stageKey: work.stage_key || null,
      workType: work.work_type || null,
      workReason: work.reason || null,
      missionId: work.mission_id || null,
    });

    const decision = result?.decision || null;
    const proposed = decision?.decision === "propose";
    const commandId = proposed ? String(decision?.commandId || "") || null : null;
    const queueStatus = proposed ? "awaiting_approval" : "completed";
    const now = new Date().toISOString();

    const { error: queueError } = await supabase
      .from("agent_work_queue")
      .update({
        status: queueStatus,
        command_id: commandId,
        last_error: null,
        next_attempt_at: null,
        completed_at: proposed ? null : now,
        updated_at: now,
        metadata: {
          ...(work.metadata || {}),
          last_result: result,
        },
      })
      .eq("id", work.id);
    if (queueError) throw queueError;

    await updateScope(supabase, work, {
      state: proposed ? "waiting_approval" : (work.mission_id ? "working" : "watching"),
      current_work_id: proposed ? work.id : null,
      last_wake_at: now,
      last_success_at: now,
    });

    if (!proposed) {
      await supabase.rpc("link_refresh_agent_work_queue_v1");
    }

    return NextResponse.json({
      ok: true,
      attempted: 1,
      refresh,
      work: {
        id: work.id,
        agentSlug: work.agent_slug,
        stageKey: work.stage_key,
        workType: work.work_type,
        reason: work.reason,
        attempt: work.attempt_count,
      },
      result,
    });
  } catch (wakeError: any) {
    const errorMessage = wakeError?.message || "agent_wake_failed";
    const attemptCount = Number(work.attempt_count || 1);
    const configuredMaxAttempts = Number(work.max_attempts || 2);
    const transientGatewayFailure = /gateway|aborted|temporarily unavailable|timeout|timed out|service unavailable/i.test(errorMessage);
    const maxAttempts = transientGatewayFailure ? Math.max(configuredMaxAttempts, 4) : configuredMaxAttempts;
    const shouldRetry = attemptCount < maxAttempts;
    const now = new Date().toISOString();
    const retryDelayMinutes = transientGatewayFailure ? Math.min(5 * attemptCount, 20) : 15;
    const nextAttempt = shouldRetry
      ? new Date(Date.now() + retryDelayMinutes * 60 * 1000).toISOString()
      : null;

    console.error("LINK agent work failed", {
      workId: work.id,
      agentSlug: work.agent_slug,
      attemptCount,
      maxAttempts,
      error: errorMessage,
    });

    await supabase
      .from("agent_work_queue")
      .update({
        status: shouldRetry ? "retry_wait" : "blocked",
        max_attempts: maxAttempts,
        last_error: errorMessage,
        next_attempt_at: nextAttempt,
        updated_at: now,
      })
      .eq("id", work.id);

    await updateScope(supabase, work, {
      state: shouldRetry ? "retry_wait" : "blocked",
      current_work_id: work.id,
      last_wake_at: now,
      last_failure_at: now,
    });

    await supabase.from("event_bus").upsert(
      {
        control_id: ROOT_CONTROL_ID,
        source_provider: "agent-runtime",
        event_type: "AGENT_WAKE_FAILED",
        entity_type: work.business_global_id ? "business" : "system",
        global_id: work.business_global_id || null,
        correlation_id: String(work.source_event_id || work.id),
        dedupe_key: `agent_work_failed:${work.id}`,
        payload: {
          work_id: work.id,
          source_event_id: work.source_event_id || work.id,
          source_event_type: work.event_type || work.work_type,
          agent_slug: work.agent_slug,
          stage_key: work.stage_key || null,
          attempt_count: attemptCount,
          max_attempts: maxAttempts,
          retry_scheduled: shouldRetry,
          transient_gateway_failure: transientGatewayFailure,
          retry_delay_minutes: shouldRetry ? retryDelayMinutes : null,
          error: errorMessage,
        },
        occurred_at: now,
      },
      { onConflict: "dedupe_key" },
    );

    return NextResponse.json({
      ok: false,
      attempted: 1,
      refresh,
      work: {
        id: work.id,
        agentSlug: work.agent_slug,
        stageKey: work.stage_key,
        workType: work.work_type,
        attempt: attemptCount,
        maxAttempts,
      },
      retryScheduled: shouldRetry,
      error: errorMessage,
    });
  }
}
