import { NextRequest, NextResponse } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";

const ROOT_CONTROL_ID = "00000000-0000-0000-0000-000000000001";
const CLIENT_NAME = "Caracol";
const SOURCE = "caracol-90d";

const missions = [
  { week: 1, start: "2026-08-31", end: "2026-09-06", phase: "ORDENAR", title: "Tomar el mando + producir", objective: "Ordenar la operación sin frenar la producción y salir con contenido real desde el primer día.", actions: ["Obtener administración operativa de Instagram/Facebook y Meta Business.", "Levantar línea base: alcance, reproducciones, mensajes y señales de asistencia.", "Ordenar biblioteca de fotos y videos y definir línea visual inmediata.", "Producir y publicar 3 reels: lunes Gin + karaoke, miércoles comunidad/rostro, viernes ambiente + música.", "Activar stories útiles durante la semana y registrar respuestas, comentarios y señales de asistencia."], deliverable: "3 reels publicados + stories + línea base + biblioteca inicial" },
  { week: 2, start: "2026-09-07", end: "2026-09-13", phase: "ORDENAR", title: "Presentar rostros", objective: "Convertir personas reales en activos reconocibles de Caracol.", actions: ["Grabar Ángel y al menos un rostro local.", "Obtener permisos de imagen necesarios.", "Crear una serie repetible de rostros y prueba social.", "Publicar 3 reels y mantener stories con operación real.", "Registrar qué rostro/formato genera mayor respuesta."], deliverable: "Primer sistema de rostros + 3 reels + registro de respuesta" },
  { week: 3, start: "2026-09-14", end: "2026-09-20", phase: "INSTALAR", title: "Activar hoteles", objective: "Abrir la ruta de conversión turística mediante recepción y recomendación contextual.", actions: ["Priorizar 4–6 hoteles piloto.", "Definir producto concreto por perfil de alojamiento.", "Preparar kit digital para recepción y guion de recomendación de 20 segundos.", "Crear QR/código de derivación por hotel cuando corresponda.", "Registrar primeros contactos y derivaciones."], deliverable: "Kit hotelero + 4–6 pilotos priorizados + sistema de registro" },
  { week: 4, start: "2026-09-21", end: "2026-09-27", phase: "INSTALAR", title: "Optimizar el primer ciclo", objective: "Repetir lo que funciona y eliminar lo débil.", actions: ["Comparar las 3 piezas semanales y su desempeño.", "Revisar comentarios, mensajes y señales de asistencia.", "Seleccionar formato/pieza ganadora.", "Ajustar copy, formato o reemplazar piezas débiles.", "Cerrar el primer mes con aprendizajes y siguiente foco."], deliverable: "Resumen mensual + decisiones de contenido y pauta" },
  { week: 5, start: "2026-09-28", end: "2026-10-04", phase: "CONECTAR", title: "Consolidar la ruta local", objective: "Instalar lunes, miércoles y viernes como rituales reconocibles.", actions: ["Mantener 3 piezas clave semanales.", "Reforzar karaoke + Gin, comunidad y ambiente.", "Usar rostros y prueba social en las piezas de mayor potencial.", "Seleccionar una pieza ganadora para pauta hiperlocal.", "Medir señales de asistencia en los días bajos."], deliverable: "Ritual semanal consistente + primera pauta basada en desempeño" },
  { week: 6, start: "2026-10-05", end: "2026-10-11", phase: "CONECTAR", title: "Pauta con intención", objective: "Empujar únicamente contenido que ya demuestra interés orgánico.", actions: ["Activar la pieza ganadora con radio hiperlocal.", "Controlar inversión y respuesta en 24–36 horas.", "Revisar alcance, reproducciones, compartidos y mensajes.", "Ajustar o detener si no responde.", "Registrar aprendizaje para la siguiente pieza."], deliverable: "Ciclo de pauta semanal + aprendizaje documentado" },
  { week: 7, start: "2026-10-12", end: "2026-10-18", phase: "CONECTAR", title: "Red de hoteles", objective: "Pasar de contactos aislados a una red activa de recomendación.", actions: ["Contactar y activar hoteles priorizados.", "Entregar material y explicar el producto en 20 segundos.", "Verificar uso de QR/código cuando exista.", "Registrar hotel, producto recomendado y derivaciones.", "Actualizar material según preguntas reales de recepción."], deliverable: "Hoteles activos + primeras derivaciones identificadas" },
  { week: 8, start: "2026-10-19", end: "2026-10-25", phase: "CONECTAR", title: "Medir la conversión", objective: "Conectar contenido, hoteles y comportamiento real del negocio.", actions: ["Cruzar publicaciones con mensajes y asistencia.", "Revisar ventas/visitas de lunes, miércoles y viernes.", "Medir derivaciones por hotel.", "Registrar UGC, menciones y clientes recurrentes.", "Decidir qué producto/oferta merece continuidad."], deliverable: "Tablero de conversión + decisiones de canal" },
  { week: 9, start: "2026-10-26", end: "2026-11-01", phase: "OPTIMIZAR", title: "Duplicar lo fuerte", objective: "Escalar formatos, rostros y mensajes que muestran mejor respuesta.", actions: ["Identificar top 3 formatos del ciclo.", "Identificar rostros con mejor respuesta.", "Repetir estructuras ganadoras sin copiar mecánicamente.", "Reducir contenido de baja respuesta.", "Actualizar calendario con base en evidencia."], deliverable: "Calendario optimizado + formatos ganadores definidos" },
  { week: 10, start: "2026-11-02", end: "2026-11-08", phase: "OPTIMIZAR", title: "Ajustar producto y oferta", objective: "Mejorar la propuesta comunicada según lo aprendido.", actions: ["Revisar qué promoción mueve asistencia sin deteriorar margen.", "Comparar productos comunicados por hotel.", "Ajustar mensajes de reserva y recomendación.", "Crear una activación puntual con objetivo medible.", "Registrar resultado y decisión."], deliverable: "Oferta ajustada + activación puntual medida" },
  { week: 11, start: "2026-11-09", end: "2026-11-15", phase: "OPTIMIZAR", title: "Eficiencia de producción", objective: "Determinar cuánto contenido puede sostenerse con la operación real.", actions: ["Medir tiempo de captura, edición y publicación.", "Construir biblioteca reutilizable.", "Definir formatos que requieren menos producción y mantienen rendimiento.", "Ordenar banco de respuestas y UGC.", "Eliminar tareas que no generan aprendizaje o resultado."], deliverable: "Sistema de producción sostenible" },
  { week: 12, start: "2026-11-16", end: "2026-11-22", phase: "OPTIMIZAR", title: "Preparar el siguiente ciclo", objective: "Convertir los aprendizajes en una estrategia de continuidad.", actions: ["Consolidar métricas de contenido, pauta, comunidad y hoteles.", "Identificar días, formatos y rostros con mayor respuesta.", "Identificar hoteles que convierten mejor y qué recomiendan.", "Preparar recomendaciones para el siguiente trimestre.", "Definir prioridades de inversión y producción."], deliverable: "Borrador de plan siguiente trimestre" },
  { week: 13, start: "2026-11-23", end: "2026-11-28", phase: "CIERRE 90 DÍAS", title: "Informe 90 días + decisión", objective: "Cerrar el piloto con evidencia y decidir cómo escalar.", actions: ["Comparar línea base vs. cierre.", "Definir formatos ganadores y costo/resultado de pauta.", "Identificar hoteles que convierten y productos recomendados.", "Revisar cumplimiento del calendario y entregables.", "Decidir renovar, escalar o ajustar el siguiente ciclo."], deliverable: "Informe 90 días + plan siguiente" },
];

export async function GET() {
  const supabase = getCentralSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "central_supabase_not_configured" }, { status: 503 });

  const { data: client, error: clientError } = await supabase.from("clients").select("id,name,accent,status").ilike("name", CLIENT_NAME).eq("status", "active").maybeSingle();
  if (clientError) return NextResponse.json({ ok: false, error: clientError.message }, { status: 500 });
  if (!client) return NextResponse.json({ ok: false, error: "caracol_client_not_found" }, { status: 404 });

  const { data: items, error } = await supabase.from("work_items").select("id,title,description,due_at,priority,status,source,created_at,updated_at,kind").eq("client_id", client.id).eq("source", SOURCE).neq("status", "cancelled").order("due_at");
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, client, missions, items: items || [] });
}

export async function POST(request: NextRequest) {
  const supabase = getCentralSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "central_supabase_not_configured" }, { status: 503 });
  const body = await request.json();
  const action = String(body.action || "");

  const { data: client, error: clientError } = await supabase.from("clients").select("id,name").ilike("name", CLIENT_NAME).eq("status", "active").maybeSingle();
  if (clientError) return NextResponse.json({ ok: false, error: clientError.message }, { status: 500 });
  if (!client) return NextResponse.json({ ok: false, error: "caracol_client_not_found" }, { status: 404 });

  if (action === "seed") {
    const { data: existing, error: existingError } = await supabase.from("work_items").select("id,title").eq("client_id", client.id).eq("source", SOURCE);
    if (existingError) return NextResponse.json({ ok: false, error: existingError.message }, { status: 500 });
    const existingTitles = new Set((existing || []).map((x) => x.title));
    const pending = missions.filter((m) => !existingTitles.has(`S${String(m.week).padStart(2, "0")} · ${m.title}`));
    if (pending.length) {
      const rows = pending.map((m) => ({
        control_id: ROOT_CONTROL_ID,
        client_id: client.id,
        stage: null,
        kind: "action",
        title: `S${String(m.week).padStart(2, "0")} · ${m.title}`,
        description: `${m.objective}\n\nAcciones:\n${m.actions.map((a) => `• ${a}`).join("\n")}\n\nEntregable: ${m.deliverable}`,
        due_at: `${m.end}T23:59:00-04:00`,
        priority: m.week === 1 ? 1 : 2,
        status: "pending",
        source: SOURCE,
      }));
      const { error } = await supabase.from("work_items").insert(rows);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, seeded: pending.length });
  }

  if (action === "toggle") {
    const id = String(body.id || "");
    const status = body.status === "done" ? "done" : "pending";
    const { error } = await supabase.from("work_items").update({ status, updated_at: new Date().toISOString() }).eq("id", id).eq("client_id", client.id).eq("source", SOURCE);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
}
