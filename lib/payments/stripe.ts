export type StripeCheckoutInput = {
  amount: number;
  currency: string;
  quantity?: number;
  productName: string;
  businessId: string;
  productId: string;
  orderId: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
};

export type StripeCheckoutSession = {
  id: string;
  url: string | null;
  status: string | null;
  payment_status: string | null;
  amount_total: number | null;
  currency: string | null;
  created?: number | null;
  expires_at?: number | null;
  client_reference_id?: string | null;
  customer_email?: string | null;
  customer_details?: {
    email?: string | null;
    name?: string | null;
  } | null;
  metadata?: Record<string, string>;
  livemode?: boolean;
};

function stripeSecretKey() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) throw new Error("stripe_not_configured");
  return secretKey;
}

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

async function stripeRequest<T>(path: string, init?: RequestInit) {
  const response = await fetch(`https://api.stripe.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${stripeSecretKey()}`,
      ...(init?.headers || {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  const payload = (await response.json()) as T & {
    error?: { message?: string; code?: string; type?: string };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message || `stripe_http_${response.status}`);
  }
  return payload;
}

export async function createStripeCheckoutSession(input: StripeCheckoutInput) {
  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("success_url", input.successUrl);
  body.set("cancel_url", input.cancelUrl);
  body.set("client_reference_id", input.orderId);
  body.set("line_items[0][quantity]", String(input.quantity ?? 1));
  body.set("line_items[0][price_data][currency]", input.currency.toLowerCase());
  body.set("line_items[0][price_data][unit_amount]", String(input.amount));
  body.set("line_items[0][price_data][product_data][name]", input.productName);
  body.set("metadata[business_id]", input.businessId);
  body.set("metadata[product_id]", input.productId);
  body.set("metadata[order_id]", input.orderId);
  body.set("payment_intent_data[metadata][business_id]", input.businessId);
  body.set("payment_intent_data[metadata][product_id]", input.productId);
  body.set("payment_intent_data[metadata][order_id]", input.orderId);
  if (input.customerEmail) body.set("customer_email", input.customerEmail);

  const idempotencyKey = `link:${input.businessId}:${input.orderId}`.slice(0, 255);
  const payload = await stripeRequest<StripeCheckoutSession>("/v1/checkout/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": idempotencyKey,
    },
    body,
  });

  if (!payload.id || !payload.url) {
    throw new Error("stripe_checkout_missing_url");
  }

  return {
    provider: "stripe" as const,
    sessionId: payload.id,
    paymentUrl: payload.url,
    status: payload.status,
    paymentStatus: payload.payment_status,
    amountTotal: payload.amount_total,
    currency: payload.currency,
  };
}

export async function listStripeCheckoutSessions(limit = 40) {
  const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
  const payload = await stripeRequest<{ data: StripeCheckoutSession[]; has_more?: boolean }>(
    `/v1/checkout/sessions?limit=${safeLimit}`,
  );
  return payload.data || [];
}

export async function retrieveStripeCheckoutSession(sessionId: string) {
  if (!/^cs_(test|live)_/.test(sessionId)) throw new Error("invalid_checkout_session");
  return stripeRequest<StripeCheckoutSession>(
    `/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
  );
}
