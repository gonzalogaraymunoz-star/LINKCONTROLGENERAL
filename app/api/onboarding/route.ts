import { NextRequest, NextResponse } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";

const ROOT_CONTROL_ID = "00000000-0000-0000-0000-000000000001";
const ACTOR = "link-control-onboarding";

type VerificationStatus = "verified" | "reachable" | "auth_required" | "failed" | "not_configured";
type Verification = { status: VerificationStatus; checked_at: string; message: string; target?: string };

async function recordEvent(supabase: NonNullable<ReturnType<typeof getCentralSupabase>>, input: { clientId: string; eventType: string; objectId?: string | null; payload?: Record<string, unknown> }) {
  await supabase.from("events").insert({
    control_id: ROOT_CONTROL_ID,
    client_id: input.clientId,
    event_type: input.eventType,
    actor: ACTOR,
    object_type: "client_onboarding_stage",
    object_id: input.objectId || null,
    payload: input.payload || {},
  });
}

function result(status: VerificationStatus, message: string, target?: string): Verification {
  return { status, message, target, checked_at: new Date().toISOString() };
}

async function safeFetch(url: string, init: RequestInit = {}) {
  return fetch(url, { ...init, redirect: "follow", cache: "no-store", signal: AbortSignal.timeout(7000) });
}

async function verifyGitHub(value: string): Promise<Verification> {
  const match = value.trim().match(/github\.com\/([^/]+)\/([^/#?]+)/i);
  if (!match) return result("failed", "Usa la URL completa del repositorio GitHub.", value);
  const repo = `${match[1]}/${match[2].replace(/\.git$/i, "")}`;
  const headers: Record<string, string> = { Accept: "application/vnd.github+json", "User-Agent": "LINK-CONTROL" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  try {
    const response = await safeFetch(`https://api.github.com/repos/${repo}`, { headers });
    if (response.status === 200) return result("verified", `Repositorio ${repo} accesible desde el backend.`, value);
    if (response.status === 401 || response.status === 403) return result("auth_required", "El repositorio requiere una credencial GitHub válida en el backend.", value);
    if (response.status === 404) return result("failed", "Repositorio no encontrado o privado sin acceso del backend.", value);
    return result("failed", `GitHub respondió HTTP ${response.status}.`, value);
  } catch { return result("failed", "No fue posible contactar GitHub.", value); }
}

async function verifySupabase(value: string): Promise<Verification> {
  const raw = value.trim();
  const match = raw.match(/https?:\/\/([a-z0-9-]+)\.supabase\.co/i);
  const ref = match?.[1] || (/^[a-z0-9]{10,}$/i.test(raw) ? raw : null);
  if (!ref) return result("failed", "Usa el project ref o la URL https://<ref>.supabase.co.", value);
  const target = `https://${ref}.supabase.co/auth/v1/health`;
  try {
    const response = await safeFetch(target);
    if (response.ok) return result("verified", `Proyecto Supabase ${ref} responde en Auth Health.`, value);
    if (response.status === 401 || response.status === 403) return result("auth_required", "Proyecto localizado, pero requiere autenticación para comprobar acceso.", value);
    return result("failed", `Supabase respondió HTTP ${response.status}.`, value);
  } catch { return result("failed", "No fue posible contactar el proyecto Supabase.", value); }
}

async function verifyVercel(value: string): Promise<Verification> {
  const raw = value.trim();
  let url: URL;
  try { url = new URL(raw.startsWith("http") ? raw : `https://${raw}`); } catch { return result("failed", "Ingresa una URL válida de despliegue Vercel.", value); }
  if (url.hostname === "vercel.com" || url.hostname === "www.vercel.com") return result("auth_required", "El enlace del dashboard fue registrado. Para verificación automática usa también la URL pública del deployment o configura VERCEL_TOKEN.", value);
  try {
    const response = await safeFetch(url.toString(), { method: "HEAD" });
    if (response.status >= 200 && response.status < 400) return result("verified", `Deployment responde HTTP ${response.status}.`, value);
    if (response.status === 401 || response.status === 403) return result("auth_required", "Deployment localizado pero protegido por autenticación.", value);
    return result("failed", `Deployment respondió HTTP ${response.status}.`, value);
  } catch { return result("failed", "No fue posible contactar el deployment.", value); }
}

async function verifyDrive(value: string): Promise<Verification> {
  const raw = value.trim();
  const match = raw.match(/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([^/?#]+)/i);
  if (!match) return result("failed", "Usa el enlace completo de una carpeta de Google Drive.", value);
  try {
    const response = await safeFetch(raw, { method: "HEAD" });
    if (response.status >= 200 && response.status < 400) return result("reachable", "La carpeta existe y el enlace es alcanzable. El acceso interno requiere Google OAuth para considerarse verificado.", value);
    if (response.status === 401 || response.status === 403) return result("auth_required", "La carpeta existe pero requiere autenticación Google.", value);
    return result("failed", `Google Drive respondió HTTP ${response.status}.`, value);
  } catch { return result("failed", "No fue posible contactar Google Drive.", value); }
}

async function verifyMcp(value: string): Promise<Verification> {
  const raw = value.trim();
  let url: URL;
  try { url = new URL(raw); } catch { return result("failed", "Ingresa una URL MCP válida.", value); }
  try {
    const response = await safeFetch(url.toString(), { method: "GET", headers: { Accept: "application/json, text/event-stream" } });
    if (response.status === 200 || response.status === 405) return result("reachable", "El endpoint MCP responde. La negociación completa se valida en la etapa de pruebas.", value);
    if (response.status === 401 || response.status === 403) return result("auth_required", "Endpoint MCP localizado y protegido por autenticación.", value);
    return result("failed", `Endpoint MCP respondió HTTP ${response.status}.`, value);
  } catch { return result("failed", "No fue posible contactar el endpoint MCP.", value); }
}

async function verifyConnection(kind: string, value: string) {
  if (!value.trim()) return result("not_configured", "Primero registra la conexión.");
  if (kind === "github_repo") return verifyGitHub(value);
  if (kind === "supabase_project") return verifySupabase(value);
  if (kind === "vercel_project") return verifyVercel(value);
  if (kind === "drive_root") return verifyDrive(value);
  if (kind === "mcp_url") return verifyMcp(value);
  return result("failed", "Tipo de conexión no soportado.", value);
}

const SELECT = "id,client_id,stage_key,stage_order,title,status,checklist,fields,links,folders,observations,exit_criteria,verifications,completed_at,updated_at";

export async function GET(request: NextRequest) {
  const supabase = getCentralSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "central_supabase_not_configured" }, { status: 503 });
  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ ok: false, error: "missing_client_id" }, { status: 400 });
  const { data, error } = await supabase.from("client_onboarding_stages").select(SELECT).eq("client_id", clientId).order("stage_order");
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, stages: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = getCentralSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "central_supabase_not_configured" }, { status: 503 });
  const body = await request.json();
  const clientId = String(body.clientId || "");
  const stageKey = String(body.stageKey || "");
  if (!clientId || !stageKey) return NextResponse.json({ ok: false, error: "missing_scope" }, { status: 400 });

  const { data: current, error: currentError } = await supabase.from("client_onboarding_stages").select("id,stage_order,status,fields,verifications").eq("client_id", clientId).eq("stage_key", stageKey).single();
  if (currentError || !current) return NextResponse.json({ ok: false, error: currentError?.message || "stage_not_found" }, { status: 404 });

  if (body.action === "verify_connection") {
    const kind = String(body.kind || "");
    const value = String(body.value ?? current.fields?.[kind] ?? "");
    const verification = await verifyConnection(kind, value);
    const verifications = { ...(current.verifications || {}), [kind]: verification };
    const { data, error } = await supabase.from("client_onboarding_stages").update({ verifications, updated_at: new Date().toISOString() }).eq("id", current.id).select(SELECT).single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    await recordEvent(supabase, { clientId, eventType: "onboarding.connection.verified", objectId: current.id, payload: { stage_key: stageKey, kind, verification } });
    return NextResponse.json({ ok: true, stage: data, verification });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [inputKey, dbKey] of [["checklist","checklist"],["fields","fields"],["links","links"],["folders","folders"],["observations","observations"],["status","status"],["verifications","verifications"]] as const) if (body[inputKey] !== undefined) patch[dbKey] = body[inputKey];

  if (body.status === "done") {
    const checklist = Array.isArray(body.checklist) ? body.checklist : [];
    const incomplete = checklist.filter((item: { done?: boolean }) => !item.done);
    if (incomplete.length) return NextResponse.json({ ok: false, error: "checklist_incomplete", pending: incomplete }, { status: 409 });

    const { data: pendingMissions, error: missionsError } = await supabase
      .from("work_items")
      .select("id,title")
      .eq("onboarding_stage_id", current.id)
      .eq("kind", "action")
      .neq("status", "done")
      .neq("status", "cancelled");
    if (missionsError) return NextResponse.json({ ok: false, error: missionsError.message }, { status: 400 });
    if ((pendingMissions || []).length) return NextResponse.json({ ok: false, error: "missions_incomplete", pending: pendingMissions }, { status: 409 });

    patch.completed_at = new Date().toISOString();
  } else if (body.status !== undefined) patch.completed_at = null;

  const { data, error } = await supabase.from("client_onboarding_stages").update(patch).eq("id", current.id).select(SELECT).single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  if (body.status === "done") await supabase.from("client_onboarding_stages").update({ status: "in_progress", updated_at: new Date().toISOString() }).eq("client_id", clientId).eq("stage_order", current.stage_order + 1).eq("status", "pending");
  await recordEvent(supabase, { clientId, eventType: body.status === "done" ? "onboarding.stage.completed" : "onboarding.stage.updated", objectId: current.id, payload: { stage_key: stageKey, status: data.status } });
  return NextResponse.json({ ok: true, stage: data });
}
