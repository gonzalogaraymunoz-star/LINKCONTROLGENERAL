import { NextRequest, NextResponse } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = getCentralSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "central_supabase_not_configured" }, { status: 503 });
  }

  const [{ data: clients, error: clientError }, { data: cycles, error: cycleError }] = await Promise.all([
    supabase.from("clients").select("id,name,slug,short_code,accent,status").eq("status", "active").order("created_at"),
    supabase.from("client_cycles").select("id,client_id,stage,progress,status").eq("status", "active"),
  ]);

  if (clientError || cycleError) {
    return NextResponse.json({ ok: false, error: clientError?.message || cycleError?.message }, { status: 500 });
  }

  const origin = request.nextUrl.origin;
  const controls = (clients ?? []).filter(client => client.slug).map(client => {
    const cycle = (cycles ?? []).find(item => item.client_id === client.id);
    return {
      id: client.id,
      name: client.name,
      slug: client.slug,
      shortCode: client.short_code,
      accent: client.accent,
      stage: cycle?.stage ?? null,
      progress: cycle?.progress ?? 0,
      scope: client.slug,
      panelUrl: `${origin}/c/${client.slug}`,
      mcpEndpoint: `${origin}/c/${client.slug}/mcp`,
      dataSource: "Supabase · LINK CONTROL CENTRAL",
      mode: "live-read-protected",
      accessState: "authentication_required",
    };
  });

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    central: {
      name: "LINK CONTROL CENTRAL",
      scope: "root",
      panelUrl: origin,
      mcpEndpoint: `${origin}/mcp`,
      dataSource: "Supabase · LINK CONTROL CENTRAL",
      mode: "live-read-protected",
      accessState: "authentication_required",
      writeStatus: "blocked-until-authenticated-authorization",
    },
    controls,
    tools: ["get_scope", "health", "search_clients", "get_client_360", "list_work_items", "list_activity"],
    protocol: {
      transport: "Remote MCP over HTTPS",
      endpointRule: "Central uses /mcp. Scoped Controls use /c/<client-slug>/mcp.",
      readMode: "Live Supabase data; MCP route is protected and requires an authenticated access layer before distribution",
      writeMode: "Disabled until OAuth / authenticated authorization is implemented",
    },
  });
}
