import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, proxyToService, unauthorized } from "@/lib/bff";

export interface BlueprintRecord extends Record<string, unknown> {
  id: string;
  userId: string;
  userEmail: string;
  tier: string;
  title: string;
  status: "draft" | "generating" | "completed" | "failed";
  sections: number;
  completedSections: number;
  generatedAt: string | null;
  createdAt: string;
  pdfUrl: string | null;
}

interface ServiceBlueprint {
  blueprint_id?: string;
  user_id?: string;
  user_email?: string;
  system_name?: string;
  created_at?: string;
  version?: string;
}

function mapBlueprint(b: ServiceBlueprint): BlueprintRecord {
  const id = b.blueprint_id ?? "";
  return {
    id,
    userId: b.user_id ?? "",
    userEmail: b.user_email ?? "",
    tier: "blueprint",
    title: b.system_name ?? "Untitled Blueprint",
    status: "completed",
    sections: 8,
    completedSections: 8,
    generatedAt: b.created_at ?? null,
    createdAt: b.created_at ?? "",
    pdfUrl: id ? `/api/v1/blueprint/${id}/download/pdf` : null,
  };
}

export async function GET(request: NextRequest) {
  const token = getAccessToken(request);
  if (!token) return unauthorized();

  const result = await proxyToService({
    service: "blueprint",
    path: "/api/v1/blueprint",
    token,
  });

  if (result.status === 401) return unauthorized();
  if (result.notConfigured) {
    return NextResponse.json(
      { error: "Blueprint service is not configured" },
      { status: 503 }
    );
  }
  if (!result.ok) {
    return NextResponse.json(
      { error: "Failed to reach blueprint service" },
      { status: 502 }
    );
  }

  const data = result.data as { blueprints?: ServiceBlueprint[] } | null;
  const raw = Array.isArray(data?.blueprints) ? data!.blueprints! : [];
  return NextResponse.json({ blueprints: raw.map(mapBlueprint) });
}
