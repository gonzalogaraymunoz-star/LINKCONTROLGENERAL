// Redeploy marker: refreshed Stripe credential v2.
// Redeploy marker: Stripe TEST secret refreshed in Vercel.
import { NextRequest, NextResponse } from "next/server";
import { createStripeCheckoutSession, stripeConfigured } from "@/lib/payments/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  if (!stripeConfigured()) {
    return NextResponse.json({ ok: false, error: "stripe_not_configured" }, { status: 503 });
  }

  try {
    const orderId = `linksubdot-test-${Date.now()}`;
    const origin = request.nextUrl.origin;
    const result = await createStripeCheckoutSession({
      amount: 1000,
      currency: "CLP",
      quantity: 1,
      productName: "LINKSUBDOT — COBRO DE PRUEBA",
      businessId: "link-control-central",
      productId: "linksubdot-test-clp-1000",
      orderId,
      successUrl: `${origin}/?payment=success&order_id=${encodeURIComponent(orderId)}`,
      cancelUrl: `${origin}/?payment=cancelled&order_id=${encodeURIComponent(orderId)}`,
    });

    return NextResponse.json({
      ok: true,
      generatedBy: "LINKSUBDOT",
      testMode: true,
      amount: 1000,
      orderId,
      ...result,
      currency: "CLP",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "checkout_creation_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
