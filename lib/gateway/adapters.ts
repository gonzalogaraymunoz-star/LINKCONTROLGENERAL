import { getCentralSupabase } from "@/lib/supabase/server";

export type GatewayAction =
  | "central.attention"
  | "supabase.central.health"
  | "supabase.operational.health"
  | "github.repo.health"
  | "vercel.project.health";

export type GatewayCapability = {
  id: GatewayAction;
  service: "central" | "supabase" | "github" | "vercel";
  label: string;
  description: string;
  available: boolean;
  mode: "read";
  reason?: string;
};

const DEFAULT_GITHUB_REPO = "gonzalogaraymunoz-star/LINKCONTROLGENERAL";

function configured(value?: string | null) {
  return Boolean(value && value.trim());
}

export function getGatewayCapabilities(): GatewayCapability[] {
  const central = Boolean(getCentralSupabase());
  const operational = configured(process.env.OPERATIONAL_SUPABASE_URL) && configured(process.env.OPERATIONAL_SUPABASE_SERVICE_ROLE_KEY);
  const githubRepo = process.env.LINK_GITHUB_REPO || DEFAULT_GITHUB_REPO;
  const vercel = configured(process.env.VERCEL_TOKEN) && configured(process.env.VERCEL_PROJECT_ID);

  return [
    {
      id: "central.attention",
      service: "central",
      label: "Revisar atención",
      description: "Lee trabajo pendiente y vencimientos reales de LINK CONTROL CENTRAL.",
      available: central,
      mode: "read",
      reason: central ? undefined : "Supabase Central no está configurado en servidor.",
    },
    {
      id: "supabase.central.health",
      service: "supabase",
      label: "Verificar Supabase Central",
      description: "Comprueba la fuente de verdad central con una consulta real.",
      available: central,
      mode: "read",
      reason: central ? undefined : "Falta SUPABASE_SERVICE_ROLE_KEY.",
    },
    {
      id: "supabase.operational.health",
      service: "supabase",
      label: "Verificar Data Plane",
      description: "Comprueba el Supabase operacional mediante su API REST real.",
      available: operational,
      mode: "read",
      reason: operational ? undefined : "Faltan credenciales del Operational Data Plane.",
    },
    {
      id: "github.repo.health",
      service: "github",
      label: "Verificar GitHub",
      description: `Consulta el repositorio ${githubRepo} mediante la API de GitHub.`,
      available: configured(githubRepo),
      mode: "read",
    },
    {
      id: "vercel.project.health",
      service: "vercel",
      label: "Verificar Vercel",
      description: "Consulta el proyecto real desplegado en Vercel.",
      available: vercel,
      mode: "read",
      reason: vercel ? undefined : "Faltan VERCEL_TOKEN y/o VERCEL_PROJECT_ID.",
    },
  ];
}

async function centralAttention() {
  const supabase = getCentralSupabase();
  if (!supabase) throw new Error("central_supabase_not_configured");

  const now = new Date();
  const horizon = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("work_items")
    .select("id,client_id,cycle_id,kind,title,due_at,priority,status")
    .neq("status", "done")
    .neq("status", "cancelled")
    .not("due_at", "is", null)
    .lte("due_at", horizon)
    .order("due_at", { ascending: true })
    .limit(20);

  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const overdue = rows.filter(item => item.due_at && new Date(item.due_at).getTime() < now.getTime());
  const upcoming = rows.filter(item => item.due_at && new Date(item.due_at).getTime() >= now.getTime());

  return {
    checkedAt: now.toISOString(),
    summary: `${overdue.length} vencidos · ${upcoming.length} próximos en 48 h`,
    overdue: overdue.slice(0, 8),
    upcoming: upcoming.slice(0, 8),
  };
}

async function centralSupabaseHealth() {
  const supabase = getCentralSupabase();
  if (!supabase) throw new Error("central_supabase_not_configured");
  const started = Date.now();
  const { count, error } = await supabase.from("clients").select("id", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return { checkedAt: new Date().toISOString(), latencyMs: Date.now() - started, activeSource: true, clientCount: count ?? 0 };
}

async function operationalSupabaseHealth() {
  const url = process.env.OPERATIONAL_SUPABASE_URL;
  const key = process.env.OPERATIONAL_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("operational_supabase_not_configured");
  const started = Date.now();
  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/`, {
    method: "GET",
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) throw new Error(`operational_supabase_http_${response.status}`);
  return { checkedAt: new Date().toISOString(), latencyMs: Date.now() - started, activeSource: true };
}

async function githubRepoHealth() {
  const repo = process.env.LINK_GITHUB_REPO || DEFAULT_GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN || process.env.LINK_GITHUB_TOKEN;
  const started = Date.now();
  const response = await fetch(`https://api.github.com/repos/${repo}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) throw new Error(`github_http_${response.status}`);
  const repoData = (await response.json()) as { full_name: string; default_branch: string; pushed_at: string; visibility?: string; private?: boolean };
  return {
    checkedAt: new Date().toISOString(),
    latencyMs: Date.now() - started,
    repository: repoData.full_name,
    defaultBranch: repoData.default_branch,
    pushedAt: repoData.pushed_at,
    visibility: repoData.visibility || (repoData.private ? "private" : "public"),
    authenticated: Boolean(token),
  };
}

async function vercelProjectHealth() {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;
  if (!token || !projectId) throw new Error("vercel_not_configured");
  const started = Date.now();
  const query = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
  const response = await fetch(`https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}${query}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) throw new Error(`vercel_http_${response.status}`);
  const project = (await response.json()) as { id: string; name: string; updatedAt?: number; framework?: string; latestDeployments?: Array<{ url?: string; state?: string; readyState?: string }> };
  const deployment = project.latestDeployments?.[0];
  return {
    checkedAt: new Date().toISOString(),
    latencyMs: Date.now() - started,
    projectId: project.id,
    project: project.name,
    framework: project.framework || null,
    deploymentUrl: deployment?.url || null,
    deploymentState: deployment?.readyState || deployment?.state || null,
  };
}

export async function executeGatewayAction(action: GatewayAction) {
  if (action === "central.attention") return centralAttention();
  if (action === "supabase.central.health") return centralSupabaseHealth();
  if (action === "supabase.operational.health") return operationalSupabaseHealth();
  if (action === "github.repo.health") return githubRepoHealth();
  if (action === "vercel.project.health") return vercelProjectHealth();
  throw new Error("unsupported_gateway_action");
}
