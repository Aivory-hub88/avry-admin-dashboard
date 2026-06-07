// TODO: wire to real endpoint
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("aivory_access_token")?.value;

  if (!token) {
    const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    response.cookies.delete("aivory_access_token");
    response.cookies.delete("aivory_refresh_token");
    return response;
  }

  // Attempt to forward to real backend when available
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    try {
      const res = await fetch(`${apiUrl}/api/v1/admin/kpi`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.status === 401) {
        const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        response.cookies.delete("aivory_access_token");
        response.cookies.delete("aivory_refresh_token");
        return response;
      }

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch {
      // Backend not available — fall through to mock data
    }
  }

  // Mock KPI data (realistic values for an AI platform)
  const now = new Date();
  const creditUsageSeries = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (29 - i));
    return {
      date: date.toISOString().split("T")[0],
      credits: Math.floor(800 + Math.random() * 1200 + i * 15),
    };
  });

  const recentActivity = [
    {
      id: "act-001",
      type: "workflow_run",
      userId: "usr-a1b2c3",
      description: "Workflow 'Lead Enrichment' completed successfully",
      timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    },
    {
      id: "act-002",
      type: "agent_run",
      userId: "usr-d4e5f6",
      description: "Agent 'Data Extractor' started execution",
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
    {
      id: "act-003",
      type: "user_signup",
      userId: "usr-g7h8i9",
      description: "New user registered with enterprise tier",
      timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    },
    {
      id: "act-004",
      type: "workflow_error",
      userId: "usr-j1k2l3",
      description: "Workflow 'CRM Sync' failed: connection timeout",
      timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    },
    {
      id: "act-005",
      type: "credit_purchase",
      userId: "usr-m4n5o6",
      description: "User purchased 5,000 credits (Blueprint plan)",
      timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    },
    {
      id: "act-006",
      type: "agent_run",
      userId: "usr-p7q8r9",
      description: "Agent 'Email Classifier' completed with 98% accuracy",
      timestamp: new Date(Date.now() - 34 * 60 * 1000).toISOString(),
    },
    {
      id: "act-007",
      type: "workflow_run",
      userId: "usr-s1t2u3",
      description: "Workflow 'Invoice Processing' completed successfully",
      timestamp: new Date(Date.now() - 41 * 60 * 1000).toISOString(),
    },
    {
      id: "act-008",
      type: "integration_connect",
      userId: "usr-v4w5x6",
      description: "User connected Salesforce integration via OAuth",
      timestamp: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    },
    {
      id: "act-009",
      type: "workflow_run",
      userId: "usr-y7z8a9",
      description: "Workflow 'Slack Notifications' triggered by webhook",
      timestamp: new Date(Date.now() - 68 * 60 * 1000).toISOString(),
    },
    {
      id: "act-010",
      type: "agent_error",
      userId: "usr-b1c2d3",
      description: "Agent 'Document Parser' failed: unsupported file format",
      timestamp: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
    },
    {
      id: "act-011",
      type: "user_upgrade",
      userId: "usr-e4f5g6",
      description: "User upgraded from Snapshot to Blueprint tier",
      timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    },
    {
      id: "act-012",
      type: "workflow_run",
      userId: "usr-h7i8j9",
      description: "Workflow 'Customer Onboarding' completed in 1.2s",
      timestamp: new Date(Date.now() - 105 * 60 * 1000).toISOString(),
    },
    {
      id: "act-013",
      type: "agent_run",
      userId: "usr-k1l2m3",
      description: "Agent 'Sentiment Analyzer' processed 250 records",
      timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    },
    {
      id: "act-014",
      type: "integration_error",
      userId: "usr-n4o5p6",
      description: "HubSpot integration token expired — re-auth required",
      timestamp: new Date(Date.now() - 135 * 60 * 1000).toISOString(),
    },
    {
      id: "act-015",
      type: "workflow_run",
      userId: "usr-q7r8s9",
      description: "Workflow 'Data Pipeline' processed 1,200 rows",
      timestamp: new Date(Date.now() - 150 * 60 * 1000).toISOString(),
    },
    {
      id: "act-016",
      type: "credit_purchase",
      userId: "usr-t1u2v3",
      description: "User purchased 2,000 credits (Snapshot plan)",
      timestamp: new Date(Date.now() - 165 * 60 * 1000).toISOString(),
    },
    {
      id: "act-017",
      type: "agent_run",
      userId: "usr-w4x5y6",
      description: "Agent 'Lead Scorer' completed scoring 80 leads",
      timestamp: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    },
    {
      id: "act-018",
      type: "workflow_run",
      userId: "usr-z7a8b9",
      description: "Workflow 'Report Generator' exported PDF successfully",
      timestamp: new Date(Date.now() - 195 * 60 * 1000).toISOString(),
    },
    {
      id: "act-019",
      type: "user_signup",
      userId: "usr-c1d2e3",
      description: "New user registered with free tier",
      timestamp: new Date(Date.now() - 210 * 60 * 1000).toISOString(),
    },
    {
      id: "act-020",
      type: "workflow_error",
      userId: "usr-f4g5h6",
      description: "Workflow 'API Aggregator' failed: rate limit exceeded",
      timestamp: new Date(Date.now() - 225 * 60 * 1000).toISOString(),
    },
  ];

  const mockData = {
    activeUsers: 1247,
    workflowRunsToday: 384,
    workflowRunsLast7Days: 2891,
    workflowRunsLast30Days: 11432,
    creditUsageSeries,
    agentSuccessRate: {
      success: 847,
      failed: 63,
      running: 12,
    },
    recentActivity,
  };

  return NextResponse.json(mockData);
}
