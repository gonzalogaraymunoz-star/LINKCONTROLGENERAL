import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createStripeCheckoutSession, stripeConfigured } from "@/lib/payments/stripe";
import { getCentralSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOT_CONTROL_ID = "00000000-0000-0000-0000-000000000001";

const FormSchema = z.object({
  businessId: z.string().trim().min(1).max(120),
  productName: z.string().trim().min(1).max(160),
  productId: z.string().trim().min(1).max(120),
  amount: z.coerce.number().int().min(100).max(10_000_000),
  customerEmail: z.union([z.literal(""), z.string().email()]).optional(),
});

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === request.nextUrl.host;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ ok: false, error: "test_generator_disabled" }, { status: 404 });
  }
  if (!sameOrigin(request)) {
    return NextResponse.json({ ok: false, error: "forbidden_origin" }, { status: 403 });
  }
  if (!stripeConfigured()) {
    return NextResponse.json({ ok: false, error: "stripe_not_configured" }, { status: 503 });
  }

  const raw = Object.fromEntries((await request.formData()).entries());
  const parsed = FormSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_form", issues: parsed.error.issues }, { status: 400 });
  }

  const input = parsed.data;
  const orderId = `fin-${input.businessId.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 40)}-${Date.now()}`;
  const origin = request.nextUrl.origin;

  try {
    const result = await createStripeCheckoutSession({
      amount: input.amount,
      currency: "CLP",
      quantity: 1,
      productName: input.productName,
      businessId: input.businessId,
      productId: input.productId,
      orderId,
      customerEmail: input.customerEmail || undefined,
      successUrl: `${origin}/fin?payment=success&order_id=${encodeURIComponent(orderId)}`,
      cancelUrl: `${origin}/fin?payment=cancelled&order_id=${encodeURIComponent(orderId)}`,
    });

    const supabase = getCentralSupabase();
    if (supabase) {
      await supabase.from("events").insert({
        control_id: ROOT_CONTROL_ID,
        client_id: null,
        event_type: "payment.checkout.created",
        actor: "linksubdot",
        object_type: "payment_checkout",
        object_id: orderId,
        payload: {
          provider: "stripe",
          source: "fin-panel",
          business_id: input.businessId,
          product_id: input.productId,
          order_id: orderId,
          amount: input.amount,
          currency: "CLP",
          session_id: result.sessionId,
          payment_url: result.paymentUrl,
        },
      });
    }

    return NextResponse.redirect(
      new URL(`/fin?created=${encodeURIComponent(result.sessionId)}`, origin),
      303,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "checkout_creation_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
