import { NextRequest, NextResponse } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

const ARCHITECTURE_KEY = "link_architecture:nervous_system_v1";
const PULSE_CONTRACT_KEY = "link_live_pulse:contract_v1";
const PULSE_CURRENT_KEY = "link_live_pulse:current";
const CRON_KEY = "link_live_pulse";
const PAGE_LIMIT = 250;

type Row = Record<string, any>;
type PulseClass = "WORKING" | "AUTO_RESOLVABLE" | "WAITING_EXTERNAL" | "HUMAN_DECISION";

type Signal = {
  source: "event_bus" | "command_bus" | "agent_work_queue" | "agent_missions" | "agent_mission_evidence";
  id: string;
  at: string;
  classification: PulseClass;
  outcome: "ACTIVE" | "RESOLVED" | "WAITING" | "DECISION";
  label: string;
  evidence: Record<string, unknown>;
};

function authorizedCron(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

function bucketFor(date: Date) {
  const fiveMinutes = 5 * 60 * 1000;
  return new Date(Math.floor(date.getTime() / fiveMinutes) * fiveMinutes).toISOString();
}

function localDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function latestIso(values: Array<string | null | undefined>, fallback: string) {
  const valid = values.filter(Boolean) as string[];
  if (!valid.length) return fallback;
  return valid.sort((a, b) => new Date(a).getTime() - new Date(b).getTime()).at(-1) || fallback;
}

function eventSignal(row: Row): Signal {
  const payload = row.payload && typeof row.payload === "object" ? row.payload : {};
  const retry = payload.retry_scheduled === true;
  const failed = String(row.event_type || "") === "AGENT_WAKE_FAILED";
  return {
    source: "event_bus",
    id: String(row.id),
    at: row.received_at || row.occurred_at,
    classification: failed && !retry ? "WAITING_EXTERNAL" : "WORKING",
    outcome: failed && !retry ? "WAITING" : "ACTIVE",
    label: failed
      ? `${payload.agent_slug || "DOT"}: intento fallido${retry ? " con reintento programado" : " sin reintento"}`
      : `${row.source_provider}: ${row.event_type}`,
    evidence: {
      event_type: row.event_type,
      source_provider: row.source_provider,
      global_id: row.global_id || null,
      retry_scheduled: retry,
      work_id: payload.work_id || null,
    },
  };
}

function commandSignal(row: Row): Signal {
  const needsHuman =
    row.requires_approval === true &&
    row.approval_status === "pending" &&
    row.status === "pending";
  const resolved = row.status !== "pending";
  return {
    source: "command_bus",
    id: String(row.id),
    at: row.requested_at,
    classification: needsHuman
      ? "HUMAN_DECISION"
      : row.status === "pending"
        ? "AUTO_RESOLVABLE"
        : "WORKING",
    outcome: needsHuman ? "DECISION" : resolved ? "RESOLVED" : "ACTIVE",
    label: `${row.actor}: ${row.action_key} · ${row.status}`,
    evidence: {
      action_key: row.action_key,
      actor: row.actor,
      status: row.status,
      approval_status: row.approval_status,
      requires_approval: row.requires_approval,
      global_id: row.global_id || null,
    },
  };
}

function workSignal(row: Row): Signal {
  const status = String(row.status || "");
  const human = status === "awaiting_approval";
  const blocked = status === "blocked";
  const resolved = status === "completed" || status === "ignored";
  return {
    source: "agent_work_queue",
    id: String(row.id),
    at: row.updated_at,
    classification: human
      ? "HUMAN_DECISION"
      : blocked
        ? "WAITING_EXTERNAL"
        : resolved
          ? "AUTO_RESOLVABLE"
          : "WORKING",
    outcome: human ? "DECISION" : blocked ? "WAITING" : resolved ? "RESOLVED" : "ACTIVE",
    label: `${row.agent_slug}: ${row.work_type} · ${status}`,
    evidence: {
      agent_slug: row.agent_slug,
      status,
      stage_key: row.stage_key || null,
      mission_id: row.mission_id || null,
      attempt_count: row.attempt_count,
      max_attempts: row.max_attempts,
      last_error: row.last_error || null,
    },
  };
}

function missionSignal(row: Row): Signal {
  const status = String(row.status || "");
  const waiting = status === "blocked" || status === "waiting_evidence";
  const resolved = status === "verified" || status === "cancelled";
  return {
    source: "agent_missions",
    id: String(row.id),
    at: row.updated_at,
    classification: waiting ? "WAITING_EXTERNAL" : resolved ? "AUTO_RESOLVABLE" : "WORKING",
    outcome: waiting ? "WAITING" : resolved ? "RESOLVED" : "ACTIVE",
    label: `${row.mission_code}: ${row.title} · ${status}`,
    evidence: {
      mission_code: row.mission_code,
      status,
      assigned_agent_slug: row.assigned_agent_slug || null,
      stage_key: row.stage_key,
      business_global_id: row.business_global_id || null,
    },
  };
}

function evidenceSignal(row: Row): Signal {
  const status = String(row.status || "");
  const waiting = status === "requested" || status === "rejected";
  const resolved = status === "validated";
  const at = row.validated_at || row.received_at || row.requested_at;
  return {
    source: "agent_mission_evidence",
    id: String(row.id),
    at,
    classification: waiting ? "WAITING_EXTERNAL" : resolved ? "AUTO_RESOLVABLE" : "WORKING",
    outcome: waiting ? "WAITING" : resolved ? "RESOLVED" : "ACTIVE",
    label: `${row.requirement_key}: evidencia · ${status}`,
    evidence: {
      mission_id: row.mission_id,
      requirement_key: row.requirement_key,
      evidence_type: row.evidence_type,
      status,
    },
  };
}

function uniq(values: string[]) {
  return [...new Set(values)].slice(0, 80);
}

export async function GET(request: NextRequest) {
  if (!authorizedCron(request)) {
    return NextResponse.json({ ok: false, error: "cron_auth_required" }, { status: 401 });
  }

  const supabase = getCentralSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "central_supabase_not_configured" }, { status: 503 });
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const runBucket = bucketFor(now);

  const [contractsResult, snapshotResult, cronResult] = await Promise.all([
    supabase
      .from("deep_memories")
      .select("id,memory_key,structured_data,metadata,updated_at")
      .in("memory_key", [ARCHITECTURE_KEY, PULSE_CONTRACT_KEY])
      .is("archived_at", null),
    supabase
      .from("deep_memories")
      .select("id,namespace_id,content,structured_data,metadata,updated_at")
      .eq("memory_key", PULSE_CURRENT_KEY)
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("link_cron_registry")
      .select("id,cron_key,status,metadata")
      .eq("cron_key", CRON_KEY)
      .maybeSingle(),
  ]);

  if (contractsResult.error || snapshotResult.error || cronResult.error) {
    const error = contractsResult.error || snapshotResult.error || cronResult.error;
    return NextResponse.json({ ok: false, error: error?.message || "pulse_bootstrap_failed" }, { status: 500 });
  }

  const contracts = new Map((contractsResult.data || []).map((row: Row) => [row.memory_key, row]));
  if (!contracts.has(ARCHITECTURE_KEY) || !contracts.has(PULSE_CONTRACT_KEY)) {
    return NextResponse.json({ ok: false, error: "pulse_contract_missing" }, { status: 409 });
  }
  if (!cronResult.data) {
    return NextResponse.json({ ok: false, error: "pulse_cron_registry_missing" }, { status: 409 });
  }

  const duplicateResult = await supabase
    .from("link_cron_runs")
    .select("id,status,created_at")
    .eq("cron_id", cronResult.data.id)
    .contains("metadata", { run_bucket: runBucket })
    .limit(1)
    .maybeSingle();

  if (duplicateResult.error) {
    return NextResponse.json({ ok: false, error: duplicateResult.error.message }, { status: 500 });
  }
  if (duplicateResult.data) {
    return NextResponse.json({
      ok: true,
      mode: "shadow",
      duplicate: true,
      runBucket,
      existingRunId: duplicateResult.data.id,
    });
  }

  const snapshot = snapshotResult.data || null;
  const previousMeta = snapshot?.metadata || {};
  const fallbackCheckpoint =
    previousMeta.checkpoint_event_occurred_at ||
    previousMeta.checkpoint_work_updated_at ||
    snapshot?.updated_at ||
    new Date(now.getTime() - 15 * 60 * 1000).toISOString();

  const checkpointsBefore = {
    event: previousMeta.checkpoint_event_received_at || previousMeta.checkpoint_event_occurred_at || fallbackCheckpoint,
    command: previousMeta.checkpoint_command_at || fallbackCheckpoint,
    work: previousMeta.checkpoint_work_updated_at || fallbackCheckpoint,
    mission: previousMeta.checkpoint_mission_updated_at || previousMeta.checkpoint_work_updated_at || fallbackCheckpoint,
    evidence: previousMeta.checkpoint_evidence_at || previousMeta.checkpoint_work_updated_at || fallbackCheckpoint,
  };

  const [eventsResult, commandsResult, workResult, missionsResult, evidenceResult] = await Promise.all([
    supabase
      .from("event_bus")
      .select("id,event_type,source_provider,payload,global_id,occurred_at,received_at")
      .gt("received_at", checkpointsBefore.event)
      .order("received_at", { ascending: true })
      .limit(PAGE_LIMIT),
    supabase
      .from("command_bus")
      .select("id,actor,action_key,status,approval_status,requires_approval,requested_at,processed_at,global_id")
      .gt("requested_at", checkpointsBefore.command)
      .order("requested_at", { ascending: true })
      .limit(PAGE_LIMIT),
    supabase
      .from("agent_work_queue")
      .select("id,agent_slug,status,work_type,stage_key,mission_id,attempt_count,max_attempts,last_error,updated_at")
      .gt("updated_at", checkpointsBefore.work)
      .order("updated_at", { ascending: true })
      .limit(PAGE_LIMIT),
    supabase
      .from("agent_missions")
      .select("id,mission_code,title,status,assigned_agent_slug,stage_key,business_global_id,updated_at")
      .gt("updated_at", checkpointsBefore.mission)
      .order("updated_at", { ascending: true })
      .limit(PAGE_LIMIT),
    supabase
      .from("agent_mission_evidence")
      .select("id,mission_id,requirement_key,evidence_type,status,requested_at,received_at,validated_at")
      .or(`requested_at.gt.${checkpointsBefore.evidence},received_at.gt.${checkpointsBefore.evidence},validated_at.gt.${checkpointsBefore.evidence}`)
      .order("requested_at", { ascending: true })
      .limit(PAGE_LIMIT),
  ]);

  for (const result of [eventsResult, commandsResult, workResult, missionsResult, evidenceResult]) {
    if (result.error) {
      return NextResponse.json({ ok: false, error: result.error.message }, { status: 500 });
    }
  }

  const signals: Signal[] = [
    ...(eventsResult.data || []).map(eventSignal),
    ...(commandsResult.data || []).map(commandSignal),
    ...(workResult.data || []).map(workSignal),
    ...(missionsResult.data || []).map(missionSignal),
    ...(evidenceResult.data || []).map(evidenceSignal),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  const [
    activeWorkResult,
    activeMissionsResult,
    pendingApprovalsResult,
    openEvidenceResult,
  ] = await Promise.all([
    supabase
      .from("agent_work_queue")
      .select("id,agent_slug,status,work_type,stage_key,mission_id,reason,attempt_count,max_attempts,last_error,updated_at")
      .in("status", ["queued", "processing", "retry_wait", "awaiting_approval", "blocked"])
      .order("updated_at", { ascending: false })
      .limit(120),
    supabase
      .from("agent_missions")
      .select("id,mission_code,title,status,assigned_agent_slug,stage_key,business_global_id,updated_at")
      .in("status", ["approved", "active", "blocked", "waiting_evidence"])
      .order("updated_at", { ascending: false })
      .limit(120),
    supabase
      .from("command_bus")
      .select("id,actor,action_key,status,approval_status,requires_approval,requested_at,global_id")
      .eq("requires_approval", true)
      .eq("approval_status", "pending")
      .eq("status", "pending")
      .order("requested_at", { ascending: false })
      .limit(80),
    supabase
      .from("agent_mission_evidence")
      .select("id,mission_id,requirement_key,status,requested_by_agent,requested_at,received_at")
      .in("status", ["requested", "received", "rejected"])
      .order("requested_at", { ascending: false })
      .limit(120),
  ]);

  for (const result of [activeWorkResult, activeMissionsResult, pendingApprovalsResult, openEvidenceResult]) {
    if (result.error) {
      return NextResponse.json({ ok: false, error: result.error.message }, { status: 500 });
    }
  }

  const activeWork = activeWorkResult.data || [];
  const activeMissions = activeMissionsResult.data || [];
  const pendingApprovals = pendingApprovalsResult.data || [];
  const openEvidence = openEvidenceResult.data || [];

  const decisions = uniq([
    ...pendingApprovals.map(
      (row: Row) => `${row.actor}: decidir ${row.action_key} (${row.id})`,
    ),
    ...activeWork
      .filter((row: Row) => row.status === "awaiting_approval")
      .map((row: Row) => `${row.agent_slug}: trabajo ${row.work_type} espera aprobación (${row.id})`),
  ]);

  const waiting = uniq([
    ...activeWork
      .filter((row: Row) => row.status === "blocked")
      .map((row: Row) => `${row.agent_slug}: ${row.reason || row.work_type} (${row.id})`),
    ...activeMissions
      .filter((row: Row) => row.status === "blocked" || row.status === "waiting_evidence")
      .map((row: Row) => `${row.mission_code}: ${row.title} · ${row.status}`),
    ...openEvidence
      .filter((row: Row) => row.status === "requested" || row.status === "rejected")
      .map((row: Row) => `evidencia ${row.requirement_key}: ${row.status} · misión ${row.mission_id}`),
  ]);

  const working = uniq([
    ...activeWork
      .filter((row: Row) => ["queued", "processing", "retry_wait"].includes(String(row.status)))
      .map((row: Row) =>
        row.status === "retry_wait"
          ? `${row.agent_slug}: autorrecuperación programada (${row.attempt_count}/${row.max_attempts})`
          : `${row.agent_slug}: ${row.work_type} · ${row.status}`,
      ),
    ...activeMissions
      .filter((row: Row) => row.status === "approved" || row.status === "active")
      .map((row: Row) => `${row.mission_code}: ${row.title} · ${row.status}`),
    ...openEvidence
      .filter((row: Row) => row.status === "received")
      .map((row: Row) => `evidencia ${row.requirement_key}: recibida, pendiente de validación`),
  ]);

  const autoResolved = uniq(
    signals
      .filter((signal) => signal.outcome === "RESOLVED" && signal.classification !== "HUMAN_DECISION")
      .map((signal) => signal.label),
  );

  const shadowActions = signals
    .filter((signal) => signal.classification === "AUTO_RESOLVABLE" && signal.outcome === "ACTIVE")
    .slice(0, 80)
    .map((signal) => ({
      source: signal.source,
      id: signal.id,
      would: "route_or_continue_under_existing_rules",
      label: signal.label,
    }));

  const checkpointsAfter = {
    event: latestIso((eventsResult.data || []).map((row: Row) => row.received_at), checkpointsBefore.event),
    command: latestIso((commandsResult.data || []).map((row: Row) => row.requested_at), checkpointsBefore.command),
    work: latestIso((workResult.data || []).map((row: Row) => row.updated_at), checkpointsBefore.work),
    mission: latestIso((missionsResult.data || []).map((row: Row) => row.updated_at), checkpointsBefore.mission),
    evidence: latestIso(
      (evidenceResult.data || []).map((row: Row) => row.validated_at || row.received_at || row.requested_at),
      checkpointsBefore.evidence,
    ),
  };

  const sourceCounts = {
    events: eventsResult.data?.length || 0,
    commands: commandsResult.data?.length || 0,
    work: workResult.data?.length || 0,
    missions: missionsResult.data?.length || 0,
    evidence: evidenceResult.data?.length || 0,
    signals: signals.length,
  };

  const snapshotStructured = {
    mode: "shadow",
    baseline: false,
    pulse_at: nowIso,
    architecture_contract_key: ARCHITECTURE_KEY,
    pulse_contract_key: PULSE_CONTRACT_KEY,
    registry_cron_key: CRON_KEY,
    counts: sourceCounts,
    trabajando: working,
    autoresuelto: autoResolved,
    esperando_dependencia: waiting,
    decision_humana: decisions,
    shadow_actions: shadowActions,
    delta: signals.slice(0, 160),
    truncated: {
      event_bus: sourceCounts.events >= PAGE_LIMIT,
      command_bus: sourceCounts.commands >= PAGE_LIMIT,
      agent_work_queue: sourceCounts.work >= PAGE_LIMIT,
      agent_missions: sourceCounts.missions >= PAGE_LIMIT,
      agent_mission_evidence: sourceCounts.evidence >= PAGE_LIMIT,
    },
  };

  const snapshotContent =
    `Pulso sombra ${nowIso}: ${signals.length} señales nuevas; ` +
    `${working.length} frentes trabajando, ${waiting.length} dependencias, ` +
    `${decisions.length} decisiones humanas y ${autoResolved.length} resoluciones observadas. ` +
    "Modo sombra: no ejecutó acciones.";

  let snapshotId = snapshot?.id || null;
  if (snapshotId) {
    const updateResult = await supabase
      .from("deep_memories")
      .update({
        content: snapshotContent,
        structured_data: snapshotStructured,
        importance: decisions.length ? 5 : waiting.length ? 4 : 3,
        confidence: 1,
        source: "link_live_pulse_vercel_shadow",
        source_ref: "supabase:event_bus+command_bus+agent_work_queue+agent_missions+agent_mission_evidence",
        metadata: {
          ...(snapshot?.metadata || {}),
          mode: "shadow",
          run_bucket: runBucket,
          checkpoint_event_received_at: checkpointsAfter.event,
          checkpoint_event_occurred_at: checkpointsAfter.event,
          checkpoint_command_at: checkpointsAfter.command,
          checkpoint_work_updated_at: checkpointsAfter.work,
          checkpoint_mission_updated_at: checkpointsAfter.mission,
          checkpoint_evidence_at: checkpointsAfter.evidence,
          architecture_contract_key: ARCHITECTURE_KEY,
          pulse_contract_key: PULSE_CONTRACT_KEY,
          registered_in_link_cron_registry: true,
        },
        updated_at: nowIso,
      })
      .eq("id", snapshotId)
      .select("id")
      .single();
    if (updateResult.error) {
      return NextResponse.json({ ok: false, error: updateResult.error.message }, { status: 500 });
    }
  } else {
    const namespaceResult = await supabase
      .from("memory_namespaces")
      .select("id")
      .eq("scope_type", "system")
      .eq("scope_key", "link-nervous-system")
      .single();
    if (namespaceResult.error) {
      return NextResponse.json({ ok: false, error: namespaceResult.error.message }, { status: 500 });
    }
    const insertResult = await supabase
      .from("deep_memories")
      .insert({
        namespace_id: namespaceResult.data.id,
        memory_key: PULSE_CURRENT_KEY,
        kind: "link_live_pulse",
        content: snapshotContent,
        structured_data: snapshotStructured,
        importance: decisions.length ? 5 : waiting.length ? 4 : 3,
        confidence: 1,
        source: "link_live_pulse_vercel_shadow",
        source_ref: "supabase:event_bus+command_bus+agent_work_queue+agent_missions+agent_mission_evidence",
        metadata: {
          mode: "shadow",
          run_bucket: runBucket,
          checkpoint_event_received_at: checkpointsAfter.event,
          checkpoint_event_occurred_at: checkpointsAfter.event,
          checkpoint_command_at: checkpointsAfter.command,
          checkpoint_work_updated_at: checkpointsAfter.work,
          checkpoint_mission_updated_at: checkpointsAfter.mission,
          checkpoint_evidence_at: checkpointsAfter.evidence,
          architecture_contract_key: ARCHITECTURE_KEY,
          pulse_contract_key: PULSE_CONTRACT_KEY,
          registered_in_link_cron_registry: true,
        },
      })
      .select("id")
      .single();
    if (insertResult.error) {
      return NextResponse.json({ ok: false, error: insertResult.error.message }, { status: 500 });
    }
    snapshotId = insertResult.data.id;
  }

  const runResult = await supabase
    .from("link_cron_runs")
    .insert({
      cron_id: cronResult.data.id,
      edition: "shadow",
      run_at: nowIso,
      run_date: localDate(now),
      status: "SAVED",
      memory_key: PULSE_CURRENT_KEY,
      title: "LINK · Pulso Vivo · sombra",
      summary: snapshotContent,
      current_state: `${working.length} trabajando · ${waiting.length} esperando · ${decisions.length} decisiones`,
      target_state: "Observar y clasificar sin ejecutar",
      mission: "Detectar únicamente el delta operativo desde el último checkpoint",
      done_criterion: "Snapshot y checkpoints persistidos con evidencia real; cero acciones ejecutadas",
      next_step: decisions.length
        ? "Exponer solo las decisiones humanas reales en Control Central."
        : "Continuar observando en modo sombra.",
      needs_user_action: decisions.length > 0,
      user_action: decisions.length ? decisions[0] : null,
      evidence: [
        { source: "event_bus", count: sourceCounts.events, ids: (eventsResult.data || []).slice(-20).map((row: Row) => row.id) },
        { source: "command_bus", count: sourceCounts.commands, ids: (commandsResult.data || []).slice(-20).map((row: Row) => row.id) },
        { source: "agent_work_queue", count: sourceCounts.work, ids: (workResult.data || []).slice(-20).map((row: Row) => row.id) },
        { source: "agent_missions", count: sourceCounts.missions, ids: (missionsResult.data || []).slice(-20).map((row: Row) => row.id) },
        { source: "agent_mission_evidence", count: sourceCounts.evidence, ids: (evidenceResult.data || []).slice(-20).map((row: Row) => row.id) },
      ],
      blockers: waiting.slice(0, 40),
      visualization_payload: {
        mode: "shadow",
        working: working.length,
        waiting_external: waiting.length,
        human_decisions: decisions.length,
        auto_resolved: autoResolved.length,
        delta_signals: signals.length,
      },
      metadata: {
        mode: "shadow",
        run_bucket: runBucket,
        snapshot_id: snapshotId,
        architecture_contract_key: ARCHITECTURE_KEY,
        pulse_contract_key: PULSE_CONTRACT_KEY,
        checkpoints_before: checkpointsBefore,
        checkpoints_after: checkpointsAfter,
        no_actions_executed: true,
      },
    })
    .select("id")
    .single();

  if (runResult.error) {
    return NextResponse.json({ ok: false, error: runResult.error.message }, { status: 500 });
  }

  console.log("LINK live pulse shadow saved", {
    runId: runResult.data.id,
    runBucket,
    counts: sourceCounts,
    working: working.length,
    waiting: waiting.length,
    decisions: decisions.length,
    autoResolved: autoResolved.length,
  });

  return NextResponse.json({
    ok: true,
    mode: "shadow",
    runId: runResult.data.id,
    runBucket,
    counts: sourceCounts,
    state: {
      working: working.length,
      waitingExternal: waiting.length,
      humanDecisions: decisions.length,
      autoResolved: autoResolved.length,
      shadowActions: shadowActions.length,
    },
    checkpoints: checkpointsAfter,
    actionsExecuted: 0,
  });
}
