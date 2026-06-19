import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, proxyToService, unauthorized } from "@/lib/bff";

export interface BlueprintRecord {
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

function mapBlueprint(b: any): BlueprintRecord {
  const id = b.blueprint_id ?? b.id ?? "";
  return {
    id,
    userId: b.user_id ?? "",
    userEmail: b.user_email ?? b.email ?? "",
    tier: "blueprint",
    title: b.system_name ?? b.title ?? "Untitled Blueprint",
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

  if (result.notConfigured || result.unreachable) {
    return NextResponse.json([]);
  }

  if (!result.ok) {
    return NextResponse.json([], { status: 200 });
  }

  const raw = result.data as any;
  const items = raw?.blueprints ?? raw?.data ?? (Array.isArray(raw) ? raw : []);
  return NextResponse.json(items.map(mapBlueprint));
}
