// TODO: wire to real endpoint
import { NextRequest, NextResponse } from "next/server";

interface AgentExecution {
  agentId: string;
  agentName: string;
  userId: string;
  status: "running" | "success" | "failed";
  startedAt: string;
  durationMs: number;
  error?: string;
  payload?: Record<string, unknown>;
}

const now = Date.now();

const mockAgents: AgentExecution[] = [
  {
    agentId: "agt-001a2b3c",
    agentName: "Lead Enrichment Agent",
    userId: "usr-a1b2c3d4",
    status: "success",
    startedAt: new Date(now - 5 * 60 * 1000).toISOString(),
    durationMs: 1240,
    payload: { inputRecords: 50, enrichedRecords: 48, skipped: 2, source: "HubSpot" },
  },
  {
    agentId: "agt-002b3c4d",
    agentName: "Email Classifier",
    userId: "usr-b2c3d4e5",
    status: "running",
    startedAt: new Date(now - 2 * 60 * 1000).toISOString(),
    durationMs: 0,
    payload: { batchSize: 200, processed: 87, model: "gpt-4o-mini" },
  },
  {
    agentId: "agt-003c4d5e",
    agentName: "Document Parser",
    userId: "usr-c3d4e5f6",
    status: "failed",
    startedAt: new Date(now - 15 * 60 * 1000).toISOString(),
    durationMs: 3200,
    error: "UnsupportedFileFormatError: .docx files require LibreOffice runtime",
    payload: { fileName: "contract_v3.docx", fileSize: 245120 },
  },
  {
    agentId: "agt-004d5e6f",
    agentName: "Sentiment Analyzer",
    userId: "usr-g7h8i9j0",
    status: "success",
    startedAt: new Date(now - 30 * 60 * 1000).toISOString(),
    durationMs: 8750,
    payload: { reviewsProcessed: 250, positive: 182, neutral: 43, negative: 25 },
  },
  {
    agentId: "agt-005e6f7g",
    agentName: "Data Extractor",
    userId: "usr-d4e5f6g7",
    status: "success",
    startedAt: new Date(now - 45 * 60 * 1000).toISOString(),
    durationMs: 2100,
    payload: { pagesScraped: 12, recordsExtracted: 340, format: "JSON" },
  },
  {
    agentId: "agt-006f7g8h",
    agentName: "Lead Scorer",
    userId: "usr-e5f6g7h8",
    status: "success",
    startedAt: new Date(now - 60 * 60 * 1000).toISOString(),
    durationMs: 4500,
    payload: { leadsScored: 80, highPriority: 23, mediumPriority: 41, lowPriority: 16 },
  },
  {
    agentId: "agt-007g8h9i",
    agentName: "Invoice Processor",
    userId: "usr-f6g7h8i9",
    status: "failed",
    startedAt: new Date(now - 75 * 60 * 1000).toISOString(),
    durationMs: 1800,
    error: "ValidationError: Invoice total mismatch — expected 1250.00, got 1249.99",
    payload: { invoiceId: "INV-2024-0892", vendor: "Acme Corp" },
  },
  {
    agentId: "agt-008h9i0j",
    agentName: "CRM Sync Agent",
    userId: "usr-j0k1l2m3",
    status: "success",
    startedAt: new Date(now - 90 * 60 * 1000).toISOString(),
    durationMs: 6300,
    payload: { contactsSynced: 1200, updated: 340, created: 15, errors: 0, crm: "Salesforce" },
  },
  {
    agentId: "agt-009i0j1k",
    agentName: "Report Generator",
    userId: "usr-k1l2m3n4",
    status: "success",
    startedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    durationMs: 9200,
    payload: { reportType: "Monthly KPI", pages: 14, format: "PDF", recipients: 3 },
  },
  {
    agentId: "agt-010j1k2l",
    agentName: "Slack Notifier",
    userId: "usr-l2m3n4o5",
    status: "running",
    startedAt: new Date(now - 1 * 60 * 1000).toISOString(),
    durationMs: 0,
    payload: { channel: "#alerts", pendingMessages: 5 },
  },
  {
    agentId: "agt-011k2l3m",
    agentName: "Data Pipeline Agent",
    userId: "usr-m3n4o5p6",
    status: "success",
    startedAt: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
    durationMs: 15400,
    payload: { rowsProcessed: 12000, transformations: 8, destination: "BigQuery" },
  },
  {
    agentId: "agt-012l3m4n",
    agentName: "Customer Onboarding Agent",
    userId: "usr-n4o5p6q7",
    status: "failed",
    startedAt: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
    durationMs: 2800,
    error: "TimeoutError: Stripe webhook confirmation timed out after 30s",
    payload: { customerId: "cus_Nx8aB2kL", plan: "blueprint" },
  },
  {
    agentId: "agt-013m4n5o",
    agentName: "API Aggregator",
    userId: "usr-o5p6q7r8",
    status: "success",
    startedAt: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
    durationMs: 3600,
    payload: { apisQueried: 5, totalRecords: 8400, mergedRecords: 8350, conflicts: 50 },
  },
  {
    agentId: "agt-014n5o6p",
    agentName: "Content Summarizer",
    userId: "usr-h8i9j0k1",
    status: "success",
    startedAt: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
    durationMs: 5100,
    payload: { articlesProcessed: 30, avgSummaryLength: 280, model: "claude-3-haiku" },
  },
  {
    agentId: "agt-015o6p7q",
    agentName: "Fraud Detection Agent",
    userId: "usr-i9j0k1l2",
    status: "running",
    startedAt: new Date(now - 3 * 60 * 1000).toISOString(),
    durationMs: 0,
    payload: { transactionsQueued: 500, analyzed: 210, flagged: 3 },
  },
  {
    agentId: "agt-016p7q8r",
    agentName: "SEO Optimizer",
    userId: "usr-a1b2c3d4",
    status: "success",
    startedAt: new Date(now - 7 * 60 * 60 * 1000).toISOString(),
    durationMs: 7800,
    payload: { pagesAnalyzed: 45, suggestionsGenerated: 128, criticalIssues: 7 },
  },
];

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
      const res = await fetch(`${apiUrl}/api/v1/admin/agents`, {
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

  return NextResponse.json({ agents: mockAgents });
}
