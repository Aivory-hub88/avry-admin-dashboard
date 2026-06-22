import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_SERVICE_URL || "http://avry-backend:8081";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("aivory_access_token")?.value;

  if (!token) {
    const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    response.cookies.delete("aivory_access_token");
    response.cookies.delete("aivory_refresh_token");
    return response;
  }

  // Fetch real data from backend endpoints we know exist
  try {
    const [usersRes, agentsRes] = await Promise.allSettled([
      fetch(`${BACKEND_URL}/api/v1/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`${BACKEND_URL}/api/v1/agents`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    let activeUsers = 0;
    if (usersRes.status === "fulfilled" && usersRes.value.ok) {
      const data = await usersRes.value.json();
      activeUsers = (data.users || []).length;
    }

    let agentSuccess = 0, agentFailed = 0, agentRunning = 0;
    if (agentsRes.status === "fulfilled" && agentsRes.value.ok) {
      const data = await agentsRes.value.json();
      const agents = Array.isArray(data) ? data : data.agents || [];
      for (const a of agents) {
        if (a.status === "success" || a.status === "completed") agentSuccess++;
        else if (a.status === "failed" || a.status === "error") agentFailed++;
        else if (a.status === "running" || a.status === "active") agentRunning++;
      }
    }

    return NextResponse.json({
      activeUsers,
      workflowRunsToday: 0,
      workflowRunsLast7Days: 0,
      workflowRunsLast30Days: 0,
      creditUsageSeries: [],
      agentSuccessRate: {
        success: agentSuccess,
        failed: agentFailed,
        running: agentRunning,
      },
      recentActivity: [],
    });
  } catch {
    return NextResponse.json({
      activeUsers: 0,
      workflowRunsToday: 0,
      workflowRunsLast7Days: 0,
      workflowRunsLast30Days: 0,
      creditUsageSeries: [],
      agentSuccessRate: { success: 0, failed: 0, running: 0 },
      recentActivity: [],
    });
  }
}
