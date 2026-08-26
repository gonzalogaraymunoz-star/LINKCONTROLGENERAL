import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const required = [
  "app/page.tsx",
  "app/mcp/route.ts",
  "app/api/central/route.ts",
  "app/api/onboarding/route.ts",
  "app/api/missions/route.ts",
  "app/c/[scope]/page.tsx",
  "app/c/[scope]/mcp/route.ts",
  "components/LinkControlApp.tsx",
  "components/ClientOnboardingBoard.tsx",
  "components/MissionsBoard.tsx",
  "components/StageMissions.tsx",
  "components/OperationalDock.tsx",
  "components/ControlActionsButton.tsx",
  "lib/mcp/handler.ts",
  "lib/crm/stages.ts",
  "lib/gateway/policy.ts",
  "lib/memory/rules.ts",
  "lib/supabase/server.ts",
  "supabase/migrations/0001_upgrade_link_preview_to_control.sql",
  "supabase/migrations/0006_client_onboarding_stage_workspace.sql",
  "supabase/migrations/0007_initialize_client_onboarding_stages.sql",
  "supabase/migrations/0008_add_onboarding_connection_verifications.sql",
  "supabase/migrations/0009_link_work_items_to_onboarding_stages.sql",
  "docs/CONSTITUTION.md",
  "docs/CLIENT_CONTROL_STANDARD.md",
  "docs/MEMORY_RULES.md",
  "docs/GATEWAY_CONTRACT.md",
  "docs/AUTH_PLAN.md",
];

const missing = required.filter(path => !existsSync(path));
if (missing.length) {
  console.error("Missing required files:", missing);
  process.exit(1);
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
if (packageJson.version !== "0.4.0") {
  console.error(`Unexpected version: ${packageJson.version}. Expected 0.4.0.`);
  process.exit(1);
}
for (const dep of ["next", "react", "@supabase/supabase-js", "mcp-handler", "@modelcontextprotocol/server", "zod"]) {
  if (!packageJson.dependencies?.[dep]) {
    console.error(`Missing dependency: ${dep}`);
    process.exit(1);
  }
}

const migration = readFileSync("supabase/migrations/0001_upgrade_link_preview_to_control.sql", "utf8");
for (const token of [
  "alter table public.clients add column if not exists control_id",
  "alter table public.projects add column if not exists control_id",
  "alter table public.agent_memories add column if not exists control_id",
  "create table if not exists public.controls",
  "create table if not exists public.events",
  "supabase-central",
  "supabase-operational",
]) {
  if (!migration.includes(token)) {
    console.error(`Migration contract missing: ${token}`);
    process.exit(1);
  }
}

const roots = ["app", "components", "lib"];
const forbidden = [
  { pattern: /localStorage\b/, label: "localStorage operational persistence" },
  { pattern: /modo demo/i, label: "demo UI language" },
  { pattern: /window\.prompt\(/, label: "prompt-driven fake UI" },
  { pattern: /window\.alert\(/, label: "alert-driven fake UI" },
];

function walk(root) {
  const entries = [];
  for (const name of readdirSync(root)) {
    const path = join(root, name);
    const stat = statSync(path);
    if (stat.isDirectory()) entries.push(...walk(path));
    else if (/\.(ts|tsx|js|jsx)$/.test(name)) entries.push(path);
  }
  return entries;
}

const violations = [];
for (const root of roots) {
  for (const path of walk(root)) {
    const source = readFileSync(path, "utf8");
    for (const rule of forbidden) if (rule.pattern.test(source)) violations.push(`${path}: ${rule.label}`);
  }
}
if (violations.length) {
  console.error("NO FAKE UI violations:\n" + violations.join("\n"));
  process.exit(1);
}

const missionsApi = readFileSync("app/api/missions/route.ts", "utf8");
for (const token of ["onboarding_stage_id", "work_items", "mission.created", "mission.completed"]) {
  if (!missionsApi.includes(token)) {
    console.error(`Missions contract missing: ${token}`);
    process.exit(1);
  }
}

console.log("LINK CONTROL v0.4 architecture contract: OK");
console.log(`Required files checked: ${required.length}`);
console.log("No Fake UI scan: OK");
console.log("Onboarding ↔ Missions ↔ work_items contract: OK");
