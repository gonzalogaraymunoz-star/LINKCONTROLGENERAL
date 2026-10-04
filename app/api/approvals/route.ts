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
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw Object.assign(new Error("invalid_session"), { status: 401 });

  const service = getCentralSupabase();
  if (!service) throw Object.assign(new Error("central_supabase_not_configured"), { status: 503 });

  const { data: member } = await service
    .from("app_members")
    .select("role,status")
    .eq("user_id", data.user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!member || !["owner", "admin"].includes(String(member.role))) {
    throw Object.assign(new Error("owner_required"), { status: 403 });
  }
  return { service };
}

function actionLabel(key: string) {
  const labels: Record<string, string> = {
    "stage.diagnosis.record": "Registrar un diagnóstico",
    "mission.create": "Crear una misión",
    "agent.assign": "Asignar una misión",
    "evidence.request": "Pedir evidencia",
    "stage.escalate": "Escalar un problema",
    "stage.block_scale": "Frenar el avance",
    "stage.verify": "Verificar una etapa",
    "stage.handoff.propose": "Proponer una entrega",
    "stage.handoff.accept": "Aceptar una entrega",
  };
  return labels[key] || key;
}

function summaryFor(actionKey: string, payload: Record<string, any>) {
  if (actionKey === "mission.create") {
    return payload.title ? `Quiere abrir una misión: ${payload.title}` : "Quiere abrir una nueva misión.";
  }
  if (actionKey === "stage.diagnosis.record") {
    return payload.title ? `Quiere dejar registrado: ${payload.title}` : "Quiere registrar un diagnóstico.";
  }
  if (actionKey === "evidence.request") {
    return payload.description ? String(payload.description) : "Necesita una evidencia concreta para poder continuar.";
  }
  if (actionKey === "agent.assign") {
    return `Quiere asignar ${payload.mission_code || "una misión"} a ${payload.assigned_agent_slug || "otro actor"}.`;
  }
  if (actionKey === "stage.escalate") {
    return payload.reason ? `Quiere escalar este bloqueo: ${payload.reason}` : "Quiere escalar un bloqueo a Dirección.";
  }
  if (actionKey === "stage.block_scale") {
    return payload.reason ? `Quiere frenar el avance: ${payload.reason}` : "Quiere frenar el avance hasta resolver un riesgo.";
  }
  if (actionKey === "stage.verify") {
    return payload.note ? `Considera que puede verificarse: ${payload.note}` : "Considera que la etapa ya puede verificarse.";
  }
  return "Hay una decisión gobernada esperando revisión.";
}

export async function GET(request: NextRequest) {
  try {
    const { service } = await authenticate(request);

    const [{ data: commands, error: commandError }, { data: skills, error: skillsError }] = await Promise.all([
      service
        .from("command_bus")
        .select("id,actor,action_key,global_id,payload,status,approval_status,requested_at")
        .eq("status", "pending")
        .eq("approval_status", "pending")
        .order("requested_at", { ascending: true })
        .limit(50),
      service
        .from("link_skills")
        .select("slug,name,metadata")
        .eq("status", "active"),
    ]);

    if (commandError) throw commandError;
    if (skillsError) throw skillsError;

    const actors = new Map(
      (skills || []).map((row: any) => [
        row.slug,
        String(row.metadata?.display_label || row.name || row.slug)
          .replace(/^LINKDOT\s*·?\s*/i, "")
          .replace(/^LINK\s*/i, ""),
      ]),
    );

    const items = (commands || []).map((command: any) => {
      const payload = command.payload && typeof command.payload === "object" ? command.payload : {};
      return {
        id: command.id,
        actor: command.actor,
        actorName: actors.get(command.actor) || command.actor,
        actionKey: command.action_key,
        actionLabel: actionLabel(command.action_key),
        summary: summaryFor(command.action_key, payload),
        requestedAt: command.requested_at,
        globalId: command.global_id,
      };
    });

    return NextResponse.json({ ok: true, count: items.length, items });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "approval_queue_unavailable" },
      { status: Number(error?.status || 500) },
    );
  }
}
