import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";
import { wakeAgent } from "@/lib/agents/runtime";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://zgbnjlrxzvzpigmwidsp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_RE_eqhBaLeaUMHuBjLUY2Q_OZNBm9_A";

async function authorizeOwner(request: NextRequest) {
  const raw = request.headers.get("authorization") || "";
  const token = raw.startsWith("Bearer ") ? raw.slice(7).trim() : "";
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
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const service = getCentralSupabase();
  if (!service) return NextResponse.json({ ok: false, error: "central_supabase_not_configured" }, { status: 503 });

  const { data: skill, error } = await service
    .from("link_skills")
    .select("slug,name,status,metadata")
    .eq("slug", slug)
    .maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!skill) return NextResponse.json({ ok: false, error: "agent_not_found" }, { status: 404 });

  const metadata =
    skill.metadata && typeof skill.metadata === "object"
      ? (skill.metadata as Record<string, unknown>)
      : {};

  return NextResponse.json({
    ok: true,
    agent: {
      slug: skill.slug,
      name: skill.name,
      status: skill.status,
      runtime: "vercel",
      executionEnabled: metadata.execution_enabled === true,
      autonomyMode: metadata.autonomy_mode || null,
      stageKey: metadata.stage_key || null,
    },
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    await authorizeOwner(request);
    const { slug } = await context.params;
    const body = await request.json();
    const eventId = String(body?.eventId || "");
    if (!eventId) {
      return NextResponse.json({ ok: false, error: "eventId_required" }, { status: 400 });
    }

    const result = await wakeAgent({
      agentSlug: slug,
      eventId,
      businessGlobalId: body?.businessGlobalId || null,
    });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "agent_wake_failed" },
      { status: Number(error?.status || 500) },
    );
  }
}
