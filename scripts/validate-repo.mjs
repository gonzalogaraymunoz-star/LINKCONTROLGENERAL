import { existsSync, readFileSync } from "node:fs";

const required = [
  "app/page.tsx",
  "app/mcp/route.ts",
  "app/c/[scope]/page.tsx",
  "app/c/[scope]/mcp/route.ts",
  "components/LinkControlApp.tsx",
  "lib/mcp/handler.ts",
  "lib/crm/stages.ts",
  "lib/gateway/policy.ts",
  "lib/memory/rules.ts",
  "lib/supabase/server.ts",
  "supabase/migrations/0001_upgrade_link_preview_to_control.sql",
  "supabase/migrations/0002_harden_existing_rls_after_auth.sql",
  "docs/CONSTITUTION.md",
  "docs/MEMORY_RULES.md",
  "docs/GATEWAY_CONTRACT.md",
  "docs/AUTH_PLAN.md",
  "docs/SUPABASE_EXISTING_PROJECTS.md",
  "docs/FREE_ARCHITECTURE.md",
];

const missing = required.filter((path) => !existsSync(path));
if (missing.length) {
  console.error("Missing required files:", missing);
  process.exit(1);
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
if (packageJson.version !== "0.2.0") {
  console.error(`Unexpected version: ${packageJson.version}`);
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

console.log("LINK CONTROL v0.2 repo contract: OK");
console.log(`Required files checked: ${required.length}`);
console.log("Migration strategy: additive upgrade of LINK PREVIEW");
