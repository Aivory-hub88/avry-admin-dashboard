import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, proxyToService, unauthorized } from "@/lib/bff";

interface WorkflowRun {
  workflowId: string;
  workflowName: string;
  userId: string;
  status: "active" | "inactive" | "error";
  triggeredAt: string;
  durationMs: number;
  error?: string;
}

function mapWorkflow(w: any): WorkflowRun {
  return {
    workflowId: w.workflow_id ?? w.id ?? "",
    workflowName: w.name ?? "Untitled Workflow",
    userId: w.user_id ?? "",
    status: w.status === "active" || w.status === "error" ? w.status : "inactive",
    triggeredAt: w.updated_at ?? w.created_at ?? "",
    durationMs: w.duration_ms ?? 0,
    ...(w.error ? { error: w.error } : {}),
  };
}

export async function GET(request: NextRequest) {
  const token = getAccessToken(request);
  if (!token) return unauthorized();

  const result = await proxyToService({
    service: "workflows",
    path: "/api/v1/workflows",
    token,
  });

  if (result.notConfigured || result.unreachable) {
    return NextResponse.json([]);
  }

  if (!result.ok) {
    return NextResponse.json([], { status: 200 });
  }

  const raw = result.data as any;
  const items = raw?.workflows ?? raw?.data ?? (Array.isArray(raw) ? raw : []);
  return NextResponse.json(items.map(mapWorkflow));
}
