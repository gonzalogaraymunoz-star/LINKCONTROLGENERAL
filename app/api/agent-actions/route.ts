import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://zgbnjlrxzvzpigmwidsp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_RE_eqhBaLeaUMHuBjLUY2Q_OZNBm9_A";

function bearer(request: NextRequest) {
  const raw = request.headers.get("authorization") || "";
  return raw.startsWith("Bearer ") ? raw.slice(7).trim() : "";
}

async function authenticate(request: NextRequest) {
  const token = bearer(request);
  if (!token) throw Object.assign(new Error("auth_required"), { status: 401 });

  const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData.user) {
    throw Object.assign(new Error("invalid_session"), { status: 401 });
  }

  const service = getCentralSupabase();
  if (!service) throw Object.assign(new Error("central_supabase_not_configured"), { status: 503 });

  const { data: member } = await service
    .from("app_members")
    .select("user_id,role,status")
    .eq("user_id", userData.user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!member) throw Object.assign(new Error("member_required"), { status: 403 });
  return { user: userData.user, member, service };
}

function jsonError(error: any) {
  return NextResponse.json(
    { ok: false, error: error?.message || "agent_action_error" },
    { status: Number(error?.status || 500) },
  );
}

export async function GET(request: NextRequest) {
  try {
    const { service, member } = await authenticate(request);
    const agentSlug = String(request.nextUrl.searchParams.get("agent") || "");
    if (!agentSlug) return NextResponse.json({ ok: false, error: "agent_required" }, { status: 400 });

    const { data: grants, error: grantsError } = await service
      .from("agent_action_grants")
      .select("agent_slug,action_key,autonomy_level,approval_required,enabled,constraints,action_registry(action_key,provider,description,permission_key,mode,input_schema,metadata)")
      .eq("agent_slug", agentSlug)
      .eq("enabled", true)
      .order("action_key");
    if (grantsError) throw grantsError;

    const { data: commands } = await service
      .from("command_bus")
      .select("id,action_key,actor,target_provider,entity_type,global_id,payload,status,result,error,requested_at,processed_at,requires_approval,approval_status,approved_by,approved_at")
      .eq("actor", agentSlug)
      .order("requested_at", { ascending: false })
      .limit(30);

    const { data: missions } = await service
      .from("agent_missions")
      .select("id,mission_code,business_global_id,stage_key,title,problem_statement,diagnosis,expected_outcome,created_by_agent,assigned_agent_slug,status,priority,metadata,created_at,updated_at")
      .or(`created_by_agent.eq.${agentSlug},assigned_agent_slug.eq.${agentSlug}`)
      .order("updated_at", { ascending: false })
      .limit(30);

    const missionIds = (missions || []).map((m: any) => m.id);
    const { data: evidence } = missionIds.length
      ? await service
          .from("agent_mission_evidence")
          .select("id,mission_id,requirement_key,description,evidence_type,status,requested_by_agent,provided_by,evidence_uri,note,metadata,requested_at,received_at,validated_at")
          .in("mission_id", missionIds)
          .order("requested_at", { ascending: false })
      : { data: [] as any[] };

    return NextResponse.json({
      ok: true,
      role: member.role,
      agentSlug,
      grants: grants || [],
      commands: commands || [],
      missions: missions || [],
      evidence: evidence || [],
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { service, member, user } = await authenticate(request);
    const body = await request.json();
    const op = String(body?.op || "");

    if (op === "propose") {
      const agentSlug = String(body.agentSlug || "");
      const actionKey = String(body.actionKey || "");
      if (!agentSlug || !actionKey) {
        return NextResponse.json({ ok: false, error: "agent_and_action_required" }, { status: 400 });
      }

      const { data, error } = await service.rpc("link_agent_propose_action_v1", {
        p_agent_slug: agentSlug,
        p_action_key: actionKey,
        p_entity_type: body.entityType || null,
        p_global_id: body.globalId || null,
        p_payload: body.payload || {},
        p_idempotency_key: body.idempotencyKey || null,
      });
      if (error) throw error;
      return NextResponse.json({ ok: true, commandId: data });
    }

    if (op === "decide") {
      if (!["owner", "admin"].includes(String(member.role))) {
        return NextResponse.json({ ok: false, error: "owner_approval_required" }, { status: 403 });
      }
      const { data, error } = await service.rpc("link_control_decide_agent_action_v1", {
        p_command_id: body.commandId,
        p_decision: body.decision,
        p_approved_by: user.email || user.id,
      });
      if (error) throw error;
      return NextResponse.json({ ok: true, decision: data });
    }

    if (op === "submit_evidence") {
      const { data, error } = await service.rpc("link_submit_mission_evidence_v1", {
        p_mission_code: body.missionCode,
        p_requirement_key: body.requirementKey,
        p_provided_by: user.email || user.id,
        p_evidence_uri: body.evidenceUri || null,
        p_note: body.note || null,
        p_metadata: body.metadata || {},
      });
      if (error) throw error;
      return NextResponse.json({ ok: true, evidence: data });
    }

    if (op === "validate_evidence") {
      if (!["owner", "admin"].includes(String(member.role))) {
        return NextResponse.json({ ok: false, error: "owner_validation_required" }, { status: 403 });
      }
      const { data, error } = await service.rpc("link_validate_mission_evidence_v1", {
        p_mission_code: body.missionCode,
        p_requirement_key: body.requirementKey,
        p_valid: Boolean(body.valid),
        p_validated_by: user.email || user.id,
        p_note: body.note || null,
      });
      if (error) throw error;
      return NextResponse.json({ ok: true, evidence: data });
    }

    return NextResponse.json({ ok: false, error: "unsupported_operation" }, { status: 400 });
  } catch (error) {
    return jsonError(error);
  }
}
