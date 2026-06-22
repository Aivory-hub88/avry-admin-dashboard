import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, proxyToService, unauthorized } from "@/lib/bff";

interface WorkflowRun extends Record<string, unknown> {
  workflowId: string;
  workflowName: string;
  userId: string;
  status: "active" | "inactive" | "error";
  triggeredAt: string;
  durationMs: number;
  error?: string;
}

interface ServiceWorkflow {
  workflow_id?: string;
  name?: string;
  user_id?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  error?: string;
}

function mapWorkflow(w: ServiceWorkflow): WorkflowRun {
  const status =
    w.status === "active" || w.status === "error" ? w.status : "inactive";
  return {
    workflowId: w.workflow_id ?? "",
    workflowName: w.name ?? "Untitled Workflow",
    userId: w.user_id ?? "",
    status,
    triggeredAt: w.updated_at ?? w.created_at ?? "",
    durationMs: 0,
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

  if (result.status === 401) return unauthorized();
  if (result.notConfigured) {
    return NextResponse.json(
      { error: "Workflows service is not configured" },
      { status: 503 }
    );
  }
  if (!result.ok) {
    return NextResponse.json(
      { error: "Failed to reach workflows service" },
      { status: 502 }
    );
  }

  const data = result.data as { workflows?: ServiceWorkflow[] } | null;
  const raw = Array.isArray(data?.workflows) ? data!.workflows! : [];
  return NextResponse.json({ workflows: raw.map(mapWorkflow) });
}
