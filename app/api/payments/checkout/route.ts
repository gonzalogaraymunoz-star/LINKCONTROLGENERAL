import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createStripeCheckoutSession, stripeConfigured } from "@/lib/payments/stripe";
import { getCentralSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ROOT_CONTROL_ID = "00000000-0000-0000-0000-000000000001";

const CheckoutSchema = z.object({
  amount: z.number().int().positive(),
  currency: z.string().regex(/^[A-Za-z]{3}$/).default("CLP"),
  quantity: z.number().int().positive().max(100).optional(),
  productName: z.string().trim().min(1).max(160),
  businessId: z.string().trim().min(1).max(120),
  productId: z.string().trim().min(1).max(120),
  orderId: z.string().trim().min(1).max(120),
  customerEmail: z.string().email().optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

function authorized(request: NextRequest) {
  const expected = process.env.LINK_PAYMENT_INTERNAL_TOKEN?.trim();
  if (!expected) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${expected}`;
}

function safeReturnUrl(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("invalid_return_url_protocol");
  }
  return url.toString();
}

async function auditPaymentLink(input: {
  businessId: string;
  productId: string;
  orderId: string;
  amount: number;
  currency: string;
  sessionId: string;
  paymentUrl: string;
}) {
  const supabase = getCentralSupabase();
  if (!supabase) return false;

  const { error } = await supabase.from("events").insert({
    control_id: ROOT_CONTROL_ID,
    client_id: null,
    event_type: "payment.checkout.created",
    actor: "linksubdot",
    object_type: "payment_checkout",
    object_id: input.orderId,
    payload: {
      provider: "stripe",
      business_id: input.businessId,
      product_id: input.productId,
      order_id: input.orderId,
      amount: input.amount,
      currency: input.currency.toUpperCase(),
      session_id: input.sessionId,
      payment_url: input.paymentUrl,
    },
  });

  return !error;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "LINKSUBDOT payment orchestrator",
    provider: "stripe",
    configured: stripeConfigured(),
    mode: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
  });
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!stripeConfigured()) {
    return NextResponse.json({ ok: false, error: "stripe_not_configured" }, { status: 503 });
  }

  try {
    const parsed = CheckoutSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "invalid_checkout_request", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const origin = request.nextUrl.origin;
    const input = parsed.data;
    const result = await createStripeCheckoutSession({
      ...input,
      currency: input.currency.toUpperCase(),
      successUrl: safeReturnUrl(input.successUrl, `${origin}/?payment=success&order_id=${encodeURIComponent(input.orderId)}`),
      cancelUrl: safeReturnUrl(input.cancelUrl, `${origin}/?payment=cancelled&order_id=${encodeURIComponent(input.orderId)}`),
    });

    const audited = await auditPaymentLink({
      businessId: input.businessId,
      productId: input.productId,
      orderId: input.orderId,
      amount: input.amount,
      currency: input.currency,
      sessionId: result.sessionId,
      paymentUrl: result.paymentUrl,
    });

    return NextResponse.json({ ok: true, result, audited });
  } catch (error) {
    const message = error instanceof Error ? error.message : "checkout_creation_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
