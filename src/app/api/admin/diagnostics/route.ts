import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, proxyToService, unauthorized } from "@/lib/bff";

export interface DiagnosticRun {
  id: string;
  userId: string;
  userEmail: string;
  tier: string;
  type: "free" | "deep";
  status: "completed" | "in_progress" | "failed";
  score: number | null;
  phases: number;
  completedPhases: number;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
}

function mapDiagnostic(d: any): DiagnosticRun {
  return {
    id: d.diagnostic_id ?? d.id ?? "",
    userId: d.user_id ?? "",
    userEmail: d.user_email ?? d.email ?? "",
    tier: d.type === "paid" ? "blueprint" : "free",
    type: d.type === "free" ? "free" : "deep",
    status: d.status === "in_progress" || d.status === "failed" ? d.status : "completed",
    score: d.score ?? null,
    phases: 5,
    completedPhases: d.status === "completed" ? 5 : d.status === "in_progress" ? 3 : 0,
    startedAt: d.created_at ?? "",
    completedAt: d.updated_at ?? null,
    durationMs: null,
  };
}

export async function GET(request: NextRequest) {
  const token = getAccessToken(request);
  if (!token) return unauthorized();

  const result = await proxyToService({
    service: "diagnostics",
    path: "/api/v1/diagnostic",
    token,
  });

  if (result.notConfigured || result.unreachable) {
    return NextResponse.json([]);
  }

  if (!result.ok) {
    return NextResponse.json([], { status: 200 });
  }

  const raw = result.data as any;
  const items = raw?.diagnostics ?? raw?.data ?? (Array.isArray(raw) ? raw : []);
  return NextResponse.json(items.map(mapDiagnostic));
}
