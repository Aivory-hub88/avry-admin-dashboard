import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, proxyToService, unauthorized } from "@/lib/bff";

export interface DiagnosticRun extends Record<string, unknown> {
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

interface ServiceDiagnostic {
  diagnostic_id?: string;
  user_id?: string;
  user_email?: string;
  company_name?: string;
  type?: string;
  status?: string;
  score?: number | null;
  created_at?: string;
  updated_at?: string;
}

function mapDiagnostic(d: ServiceDiagnostic): DiagnosticRun {
  // The service uses "free" / "paid"; the admin UI uses "free" / "deep".
  const type: "free" | "deep" = d.type === "free" ? "free" : "deep";
  const status =
    d.status === "in_progress" || d.status === "failed" ? d.status : "completed";
  return {
    id: d.diagnostic_id ?? "",
    userId: d.user_id ?? "",
    userEmail: d.user_email ?? "",
    tier: d.type === "paid" ? "blueprint" : "snapshot",
    type,
    status,
    score: typeof d.score === "number" ? d.score : null,
    phases: type === "free" ? 3 : 5,
    completedPhases: status === "completed" ? (type === "free" ? 3 : 5) : 0,
    startedAt: d.created_at ?? "",
    completedAt: status === "completed" ? d.updated_at ?? d.created_at ?? null : null,
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

  if (result.status === 401) return unauthorized();
  if (result.notConfigured) {
    return NextResponse.json(
      { error: "Diagnostics service is not configured" },
      { status: 503 }
    );
  }
  if (!result.ok) {
    return NextResponse.json(
      { error: "Failed to reach diagnostics service" },
      { status: 502 }
    );
  }

  const data = result.data as { diagnostics?: ServiceDiagnostic[] } | null;
  const raw = Array.isArray(data?.diagnostics) ? data!.diagnostics! : [];
  return NextResponse.json({ diagnostics: raw.map(mapDiagnostic) });
}
