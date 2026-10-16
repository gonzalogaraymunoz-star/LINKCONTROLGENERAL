import { NextResponse } from "next/server";
import { MICELIO_TECHNOLOGIES } from "@/lib/micelio/technology-registry";

export const dynamic = "force-dynamic";

export async function GET() {
  const playground = MICELIO_TECHNOLOGIES.find((item) => item.id === "playground");
  return NextResponse.json({
    ok: true,
    technology: playground,
    contract: {
      ownership: "LINK Preview Studio remains source of truth for projects, previews, versions, references and deliverables.",
      readSurface: "/api/projects?id=<project_id>",
      toolSurface: "/api/mcp",
      acceptedEvidence: ["project", "design_preview", "deliverable", "integration", "activity"],
      micelioRule: "reference, do not duplicate",
    },
  });
}
