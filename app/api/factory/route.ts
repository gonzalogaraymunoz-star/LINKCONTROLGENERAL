import { NextRequest, NextResponse } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";

const ALLOWED_PROVIDERS = new Set(["chatgpt","drive","github","vercel","supabase","control_central","external"]);

function db() {
  const client = getCentralSupabase();
  if (!client) throw new Error("Central Supabase is not configured");
  return client;
}

function safeUrl(raw: unknown) {
  if (typeof raw !== "string") return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return null;
    const host = u.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host.endsWith(".local")) return null;
    if (/^(10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host)) return null;
    return u.toString();
  } catch { return null; }
}

export async function GET() {
  try {
    const { data, error } = await db().from("factory_library").select("*").order("updated_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ products: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Factory unavailable" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = String(body.action || "");
    const supabase = db();

    if (action === "create_product") {
      const name = String(body.name || "").trim();
      if (!name) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
      const slugBase = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64) || "producto";
      const slug = `${slugBase}-${Date.now().toString(36)}`;
      const { data, error } = await supabase.from("factory_products").insert({
        name, slug,
        product_type: String(body.product_type || "website"),
        description: String(body.description || "").trim() || null,
        status: "draft"
      }).select().single();
      if (error) throw error;
      return NextResponse.json({ product: data });
    }

    if (action === "add_link") {
      const url = safeUrl(body.url);
      if (!url) return NextResponse.json({ error: "URL HTTPS válida requerida" }, { status: 400 });
      const provider = String(body.provider || "external");
      if (!ALLOWED_PROVIDERS.has(provider)) return NextResponse.json({ error: "Proveedor inválido" }, { status: 400 });
      const { data, error } = await supabase.from("factory_links").insert({
        product_id: body.product_id,
        provider,
        link_type: String(body.link_type || "resource"),
        label: String(body.label || provider).trim(),
        url,
        status: "unverified"
      }).select().single();
      if (error) throw error;
      return NextResponse.json({ link: data });
    }

    if (action === "verify_link") {
      const { data: link, error: readError } = await supabase.from("factory_links").select("id,url").eq("id", body.link_id).single();
      if (readError || !link) return NextResponse.json({ error: "Link no encontrado" }, { status: 404 });
      const url = safeUrl(link.url);
      if (!url) return NextResponse.json({ error: "URL bloqueada por seguridad" }, { status: 400 });
      let verified = false;
      try {
        const res = await fetch(url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(8000), headers: { "User-Agent": "LINK-Factory-Link-Check/1.0" } });
        verified = res.status >= 200 && res.status < 500;
      } catch { verified = false; }
      const { error } = await supabase.from("factory_links").update({
        status: verified ? "verified" : "broken",
        verified_at: verified ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }).eq("id", link.id);
      if (error) throw error;
      return NextResponse.json({ verified });
    }

    if (action === "add_business") {
      const name = String(body.business_name || "").trim();
      if (!name) return NextResponse.json({ error: "Negocio requerido" }, { status: 400 });
      const key = String(body.business_key || name.toLowerCase().replace(/[^a-z0-9]+/g, "-")).replace(/^-|-$/g, "");
      const { data, error } = await supabase.from("factory_product_businesses").insert({
        product_id: body.product_id,
        business_name: name,
        business_key: key,
        relation_role: String(body.relation_role || "owner")
      }).select().single();
      if (error) throw error;
      return NextResponse.json({ business: data });
    }

    if (action === "add_memory") {
      const title = String(body.title || "").trim();
      if (!title) return NextResponse.json({ error: "Título requerido" }, { status: 400 });
      const sourceUrl = body.source_url ? safeUrl(body.source_url) : null;
      if (body.source_url && !sourceUrl) return NextResponse.json({ error: "URL de fuente inválida" }, { status: 400 });
      const { data, error } = await supabase.from("factory_product_memories").insert({
        product_id: body.product_id,
        memory_type: String(body.memory_type || "context"),
        title,
        summary: String(body.summary || "").trim() || null,
        source_url: sourceUrl
      }).select().single();
      if (error) throw error;
      return NextResponse.json({ memory: data });
    }

    return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Factory error" }, { status: 500 });
  }
}