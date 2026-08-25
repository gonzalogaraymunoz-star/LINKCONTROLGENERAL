import { NextResponse } from "next/server";

export async function GET() {
  const centralConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  const operationalGatewayConfigured = Boolean(
    process.env.OPERATIONAL_SUPABASE_URL &&
      process.env.OPERATIONAL_SUPABASE_SERVICE_ROLE_KEY,
  );

  return NextResponse.json({
    ok: true,
    service: "link-control-central",
    version: "0.2.0",
    mode: centralConfigured ? "central-connected" : "demo",
    dataPlanes: {
      central: {
        role: "LINK PREVIEW → LINK CONTROL CENTRAL",
        configured: centralConfigured,
      },
      operational: {
        role: "Hotel Experience / turismo / operación",
        gatewayConfigured: operationalGatewayConfigured,
      },
    },
    strategy: "two-free-supabase-projects-multi-tenant-controls",
    timestamp: new Date().toISOString(),
  });
}
