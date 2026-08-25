import { NextRequest, NextResponse } from "next/server";
import { protectedResourceMetadata } from "@/lib/mcp/access";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  return NextResponse.json(protectedResourceMetadata(request.nextUrl.origin));
}
