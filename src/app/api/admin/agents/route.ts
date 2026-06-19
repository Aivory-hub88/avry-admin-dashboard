import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, proxyToService, unauthorized } from "@/lib/bff";

export async function GET(request: NextRequest) {
  const token = getAccessToken(request);
  if (!token) return unauthorized();

  // Try backend first
  const result = await proxyToService({ service: "backend", path: "/api/v1/agents", token });
  
  if (result.ok && result.data) {
    const raw = result.data as any;
    const agents = raw?.agents ?? raw?.data ?? (Array.isArray(raw) ? raw : []);
    return NextResponse.json(agents.map((a: any) => ({
      agentId: a.agent_id ?? a.id ?? "",
      agentName: a.name ?? "Unnamed Agent",
      userId: a.user_id ?? "",
      status: a.status ?? "inactive",
      totalRuns: a.total_runs ?? 0,
      successRate: a.success_rate ?? 0,
      lastRunAt: a.last_run_at ?? a.updated_at ?? "",
      createdAt: a.created_at ?? "",
    })));
  }

  // Fallback to empty
  return NextResponse.json([]);
}
