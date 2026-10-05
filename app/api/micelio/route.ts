import { NextResponse } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";
import { MICELIO_RECEPTION_FLOW, MICELIO_TECHNOLOGIES } from "@/lib/micelio/technology-registry";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getCentralSupabase();

  if (!supabase) {
    return NextResponse.json({
      ok: false,
      status: "backend_unavailable",
      message: "Micelio no puede declarar conexiones reales sin Control Central.",
      receptionFlow: MICELIO_RECEPTION_FLOW,
      technologies: MICELIO_TECHNOLOGIES,
    }, { status: 503 });
  }

  const [events, commands, entities] = await Promise.all([
    supabase.from("event_bus").select("id,event_type,source,created_at").order("created_at", { ascending: false }).limit(20),
    supabase.from("command_bus").select("id,gesture_code,status,created_at").order("created_at", { ascending: false }).limit(20),
    supabase.from("ecosystem_entities").select("id,global_id,entity_type,status,metadata").neq("status", "archived").limit(200),
  ]);

  const errors = [events.error, commands.error, entities.error].filter(Boolean).map((error: any) => error.message);

  return NextResponse.json({
    ok: errors.length === 0,
    status: errors.length === 0 ? "receiving" : "degraded",
    contract: {
      principle: "una entidad, un dueño canónico; el Micelio conecta por referencias, comandos, eventos y evidencia",
      flow: MICELIO_RECEPTION_FLOW,
      mutationChannel: "command_bus",
      evidenceChannel: "event_bus",
      identityChannel: "ecosystem_entities",
    },
    technologies: MICELIO_TECHNOLOGIES,
    live: {
      recentEvents: events.data ?? [],
      recentCommands: commands.data ?? [],
      knownEntities: entities.data ?? [],
    },
    errors,
  }, { status: errors.length === 0 ? 200 : 207 });
}
