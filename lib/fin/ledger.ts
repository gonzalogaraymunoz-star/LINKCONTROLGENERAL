import { getCentralSupabase } from "@/lib/supabase/server";

export type FinCheckoutRecord = {
  businessId: string;
  productId: string;
  orderId: string;
  amount: number;
  currency: string;
  provider: "stripe";
  sessionId: string;
  paymentUrl: string;
  status?: string | null;
  paymentStatus?: string | null;
  customerEmail?: string;
  source: string;
};

export async function recordFinCheckoutCreated(input: FinCheckoutRecord) {
  const supabase = getCentralSupabase();
  if (!supabase) return { recorded: false, reason: "supabase_not_configured" as const };

  const eventKey = `${input.provider}.checkout.created:${input.sessionId}`;
  const { error: eventInsertError } = await supabase.from("fin_ledger_events").upsert(
    {
      event_key: eventKey,
      event_type: "payment.checkout.created",
      category: "collection",
      direction: "in",
      business_ref: input.businessId,
      order_ref: input.orderId,
      payment_ref: input.sessionId,
      provider: input.provider,
      provider_ref: input.sessionId,
      amount: input.amount,
      currency: input.currency.toUpperCase(),
      status: input.paymentStatus || input.status || "created",
      actor: "linksubdot",
      source: input.source,
      correlation_id: input.orderId,
      metadata: {
        product_id: input.productId,
        payment_url: input.paymentUrl,
        customer_email: input.customerEmail || null,
      },
    },
    { onConflict: "event_key", ignoreDuplicates: true },
  );

  if (eventInsertError) return { recorded: false, reason: eventInsertError.message };

  const { data: event, error: eventReadError } = await supabase
    .from("fin_ledger_events")
    .select("id")
    .eq("event_key", eventKey)
    .maybeSingle();

  if (eventReadError) return { recorded: false, reason: eventReadError.message };

  const { error: snapshotError } = await supabase.from("fin_payment_snapshot").upsert(
    {
      order_ref: input.orderId,
      business_ref: input.businessId,
      product_ref: input.productId,
      provider: input.provider,
      provider_session_id: input.sessionId,
      checkout_url: input.paymentUrl,
      amount: input.amount,
      currency: input.currency.toUpperCase(),
      status: input.status || "open",
      payment_status: input.paymentStatus || "unpaid",
      customer_email: input.customerEmail || null,
      last_event_id: event?.id || null,
      metadata: { source: input.source },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "order_ref" },
  );

  if (snapshotError) {
    return { recorded: false, reason: snapshotError.message, eventId: event?.id || null };
  }

  return { recorded: true, eventId: event?.id || null };
}

export async function readFinMemory(limit = 50) {
  const supabase = getCentralSupabase();
  if (!supabase) {
    return {
      payments: [],
      recentEvents: [],
      businesses: [],
      paymentRoutes: [],
      ledgerCount: 0,
      documentCount: 0,
      pendingBackups: 0,
      failedBackups: 0,
      driveRootId: "",
      driveMasterSheetId: "",
      configured: false,
      error: "supabase_not_configured",
    };
  }

  const [
    paymentsResult,
    eventsResult,
    businessesResult,
    routesResult,
    eventCountResult,
    documentCountResult,
    backupResult,
    configResult,
  ] = await Promise.all([
    supabase.from("fin_payment_snapshot").select("*").order("updated_at", { ascending: false }).limit(limit),
    supabase
      .from("fin_ledger_events")
      .select("id,event_type,business_ref,order_ref,provider,amount,currency,status,actor,source,recorded_at")
      .order("recorded_at", { ascending: false })
      .limit(30),
    supabase
      .from("fin_businesses")
      .select("business_key,display_name,description,aliases,default_currency,active,sort_order,metadata")
      .eq("active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("fin_business_payment_routes")
      .select("id,business_key,method_type,provider,label,account_ref,currency,enabled,priority,settlement_mode,reconciliation_mode,metadata")
      .order("priority", { ascending: true }),
    supabase.from("fin_ledger_events").select("id", { count: "exact", head: true }),
    supabase.from("fin_documents").select("id", { count: "exact", head: true }),
    supabase.from("fin_drive_backup_queue").select("status"),
    supabase
      .from("fin_config")
      .select("key,value")
      .in("key", ["drive_root_folder_id", "drive_master_sheet_id"]),
  ]);

  const statuses = backupResult.data || [];
  const config = Object.fromEntries((configResult.data || []).map((item) => [item.key, item.value]));
  return {
    payments: paymentsResult.data || [],
    recentEvents: eventsResult.data || [],
    businesses: businessesResult.data || [],
    paymentRoutes: routesResult.data || [],
    ledgerCount: eventCountResult.count || 0,
    documentCount: documentCountResult.count || 0,
    pendingBackups: statuses.filter((item) => item.status === "pending" || item.status === "processing").length,
    failedBackups: statuses.filter((item) => item.status === "failed").length,
    driveRootId: config.drive_root_folder_id || "",
    driveMasterSheetId: config.drive_master_sheet_id || "",
    configured: true,
    error:
      paymentsResult.error?.message ||
      eventsResult.error?.message ||
      businessesResult.error?.message ||
      routesResult.error?.message ||
      eventCountResult.error?.message ||
      documentCountResult.error?.message ||
      backupResult.error?.message ||
      configResult.error?.message ||
      "",
  };
}
