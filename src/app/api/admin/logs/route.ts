// TODO: wire to real endpoint
import { NextRequest, NextResponse } from "next/server";

interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error";
  source: string;
  message: string;
  details?: Record<string, unknown>;
}

function generateLogs(): LogEntry[] {
  const now = Date.now();
  const sources = [
    "auth-service",
    "workflow-engine",
    "agent-runner",
    "credit-manager",
    "integration-hub",
    "api-gateway",
    "scheduler",
    "notification-service",
    "data-pipeline",
    "webhook-processor",
  ];

  const logTemplates: Array<{ level: "info" | "warn" | "error"; source: string; message: string; details?: Record<string, unknown> }> = [
    { level: "info", source: "auth-service", message: "User login successful", details: { userId: "usr-a1b2c3d4", ip: "203.0.113.42", method: "password" } },
    { level: "info", source: "workflow-engine", message: "Workflow 'Lead Enrichment Pipeline' started", details: { workflowId: "wf-001a2b3c", triggeredBy: "webhook" } },
    { level: "error", source: "workflow-engine", message: "Workflow execution failed: connection timeout", details: { workflowId: "wf-002b3c4d", step: "CRM Sync", retryCount: 3 } },
    { level: "warn", source: "credit-manager", message: "User approaching credit limit (90% used)", details: { userId: "usr-l2m3n4o5", used: 90, max: 100 } },
    { level: "info", source: "agent-runner", message: "Agent 'Email Classifier' completed successfully", details: { agentId: "agt-002b3c4d", durationMs: 3200, recordsProcessed: 200 } },
    { level: "error", source: "integration-hub", message: "OAuth token refresh failed for HubSpot", details: { userId: "usr-n4o5p6q7", provider: "hubspot", errorCode: "invalid_grant" } },
    { level: "info", source: "api-gateway", message: "Rate limit applied to user", details: { userId: "usr-b2c3d4e5", endpoint: "/api/v1/workflows", limit: 100, window: "1m" } },
    { level: "warn", source: "scheduler", message: "Scheduled job delayed by 45 seconds", details: { jobId: "job-daily-report", scheduledAt: "2024-04-15T00:00:00Z", actualStart: "2024-04-15T00:00:45Z" } },
    { level: "info", source: "notification-service", message: "Email notification sent successfully", details: { recipient: "alice.johnson@techcorp.com", template: "workflow_complete", messageId: "msg-abc123" } },
    { level: "error", source: "data-pipeline", message: "BigQuery write failed: quota exceeded", details: { table: "events.workflow_runs", rowsAttempted: 5000, errorCode: "quotaExceeded" } },
    { level: "info", source: "webhook-processor", message: "Webhook received and queued", details: { source: "stripe", event: "payment_intent.succeeded", webhookId: "we_1234" } },
    { level: "warn", source: "auth-service", message: "Multiple failed login attempts detected", details: { email: "unknown@attacker.com", attempts: 5, ip: "198.51.100.23" } },
    { level: "info", source: "workflow-engine", message: "Workflow 'Invoice Processing' completed", details: { workflowId: "wf-003c4d5e", durationMs: 2300, invoicesProcessed: 12 } },
    { level: "info", source: "credit-manager", message: "Credits deducted for workflow run", details: { userId: "usr-c3d4e5f6", creditsDeducted: 5, remaining: 675 } },
    { level: "error", source: "agent-runner", message: "Agent 'Document Parser' failed: unsupported format", details: { agentId: "agt-003c4d5e", fileName: "contract_v3.docx", errorType: "UnsupportedFileFormatError" } },
    { level: "info", source: "integration-hub", message: "Salesforce connection established", details: { userId: "usr-e5f6g7h8", provider: "salesforce", instanceUrl: "https://myorg.salesforce.com" } },
    { level: "warn", source: "api-gateway", message: "Slow response detected on /api/v1/agents", details: { responseTimeMs: 4800, threshold: 3000, endpoint: "/api/v1/agents" } },
    { level: "info", source: "scheduler", message: "Daily credit reset job completed", details: { usersReset: 0, jobDurationMs: 120 } },
    { level: "info", source: "notification-service", message: "Slack notification delivered", details: { channel: "#alerts", messageId: "slack-xyz789", workspaceId: "T01234567" } },
    { level: "error", source: "workflow-engine", message: "Workflow 'API Aggregator' failed: rate limit", details: { workflowId: "wf-008h9i0j", provider: "openai", retryAfter: 60 } },
    { level: "info", source: "auth-service", message: "Token refreshed successfully", details: { userId: "usr-g7h8i9j0", newExpiry: new Date(now + 15 * 60 * 1000).toISOString() } },
    { level: "warn", source: "data-pipeline", message: "Data transformation produced warnings", details: { pipelineId: "pipe-001", warnings: 3, warningTypes: ["null_value", "type_coercion"] } },
    { level: "info", source: "webhook-processor", message: "Webhook processed successfully", details: { webhookId: "we_5678", processingTimeMs: 45, actionsTriggered: 2 } },
    { level: "info", source: "credit-manager", message: "Credit purchase completed", details: { userId: "usr-f6g7h8i9", product: "Blueprint Plan", creditsAdded: 5000 } },
    { level: "error", source: "integration-hub", message: "Google Sheets API returned 403 Forbidden", details: { userId: "usr-j0k1l2m3", spreadsheetId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms", errorCode: 403 } },
    { level: "info", source: "agent-runner", message: "Agent 'Sentiment Analyzer' started", details: { agentId: "agt-004d5e6f", userId: "usr-g7h8i9j0", inputSize: 250 } },
    { level: "warn", source: "auth-service", message: "Refresh token nearing expiry", details: { userId: "usr-h8i9j0k1", expiresIn: "2d 4h" } },
    { level: "info", source: "workflow-engine", message: "Workflow 'Slack Notifications' triggered by webhook", details: { workflowId: "wf-004d5e6f", webhookSource: "github", event: "push" } },
    { level: "info", source: "api-gateway", message: "New API key generated", details: { userId: "usr-k1l2m3n4", keyPrefix: "aiv_sk_...xyz" } },
    { level: "error", source: "notification-service", message: "Email delivery failed: bounce", details: { recipient: "invalid@nonexistent.xyz", bounceType: "hard", messageId: "msg-def456" } },
    { level: "info", source: "data-pipeline", message: "Pipeline 'Data Pipeline' completed", details: { pipelineId: "pipe-002", rowsProcessed: 12000, durationMs: 15400 } },
    { level: "warn", source: "credit-manager", message: "Credit deduction failed: insufficient balance", details: { userId: "usr-i9j0k1l2", required: 10, available: 0 } },
    { level: "info", source: "integration-hub", message: "Nango OAuth flow completed", details: { userId: "usr-m3n4o5p6", provider: "notion", connectionId: "conn-abc123" } },
    { level: "info", source: "scheduler", message: "Workflow scheduled for next run", details: { workflowId: "wf-013m4n5o", nextRunAt: new Date(now + 60 * 60 * 1000).toISOString(), interval: "1h" } },
    { level: "error", source: "agent-runner", message: "Agent 'Customer Onboarding Agent' timed out", details: { agentId: "agt-012l3m4n", timeoutMs: 30000, lastStep: "stripe_webhook_confirm" } },
    { level: "info", source: "auth-service", message: "User logout successful", details: { userId: "usr-o5p6q7r8", sessionDuration: "4h 23m" } },
    { level: "warn", source: "workflow-engine", message: "Workflow step retrying after transient error", details: { workflowId: "wf-010j1k2l", step: "http_request", attempt: 2, maxAttempts: 3 } },
    { level: "info", source: "api-gateway", message: "CORS preflight request handled", details: { origin: "https://app.aivory.id", method: "POST", path: "/api/v1/workflows" } },
    { level: "info", source: "notification-service", message: "In-app notification created", details: { userId: "usr-n4o5p6q7", type: "workflow_complete", read: false } },
    { level: "error", source: "data-pipeline", message: "Schema validation failed for incoming data", details: { source: "webhook", missingFields: ["userId", "timestamp"], receivedFields: ["data", "event"] } },
    { level: "info", source: "webhook-processor", message: "Stripe payment webhook processed", details: { event: "invoice.payment_succeeded", customerId: "cus_Nx8aB2kL", amount: 14900 } },
    { level: "warn", source: "integration-hub", message: "Slack token will expire in 7 days", details: { userId: "usr-a1b2c3d4", provider: "slack", expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString() } },
    { level: "info", source: "agent-runner", message: "Agent 'Lead Scorer' completed", details: { agentId: "agt-006f7g8h", leadsScored: 80, durationMs: 4500 } },
    { level: "info", source: "credit-manager", message: "Monthly credit allocation applied", details: { usersUpdated: 847, totalCreditsAllocated: 2450000 } },
    { level: "error", source: "auth-service", message: "JWT signature verification failed", details: { ip: "192.0.2.100", tokenPrefix: "eyJhbGci...", reason: "invalid_signature" } },
    { level: "info", source: "workflow-engine", message: "Workflow 'Financial Reconciliation' completed", details: { workflowId: "wf-014n5o6p", durationMs: 12300, recordsReconciled: 4200 } },
    { level: "warn", source: "scheduler", message: "Job queue depth exceeding threshold", details: { queueDepth: 450, threshold: 400, jobType: "workflow_run" } },
    { level: "info", source: "api-gateway", message: "Health check passed", details: { service: "workflow-engine", latencyMs: 12, status: "healthy" } },
    { level: "info", source: "notification-service", message: "Weekly digest email sent", details: { recipients: 1247, successCount: 1241, failCount: 6 } },
    { level: "error", source: "integration-hub", message: "Airtable API returned 422 Unprocessable Entity", details: { userId: "usr-b2c3d4e5", baseId: "appXXXXXXXXXXXXXX", errorMessage: "INVALID_RECORDS" } },
    { level: "info", source: "data-pipeline", message: "Incremental sync completed", details: { source: "postgres", destination: "warehouse", rowsSynced: 3400, durationMs: 8900 } },
    { level: "warn", source: "agent-runner", message: "Agent memory usage high", details: { agentId: "agt-011k2l3m", memoryMb: 480, limitMb: 512 } },
    { level: "info", source: "webhook-processor", message: "GitHub webhook received", details: { event: "pull_request", repo: "aivory/backend", action: "opened" } },
    { level: "info", source: "auth-service", message: "Password reset email sent", details: { email: "henry.wilson@consulting.biz", expiresIn: "1h" } },
    { level: "error", source: "workflow-engine", message: "Workflow 'Support Ticket Router' failed: auth error", details: { workflowId: "wf-012l3m4n", provider: "zendesk", errorCode: "oauth_token_expired" } },
    { level: "info", source: "credit-manager", message: "Credit usage report generated", details: { period: "2024-04", totalCreditsUsed: 284500, topUser: "usr-o5p6q7r8" } },
    { level: "warn", source: "api-gateway", message: "Deprecated API version accessed", details: { version: "v0", endpoint: "/api/v0/console", userId: "usr-c3d4e5f6" } },
    { level: "info", source: "integration-hub", message: "Webhook endpoint registered", details: { userId: "usr-k1l2m3n4", provider: "stripe", endpointUrl: "https://api.aivory.id/webhooks/stripe" } },
    { level: "info", source: "scheduler", message: "Cleanup job removed 234 expired sessions", details: { sessionsRemoved: 234, jobDurationMs: 890 } },
    { level: "error", source: "notification-service", message: "Push notification delivery failed", details: { userId: "usr-d4e5f6g7", deviceToken: "fcm_token_xxx", errorCode: "UNREGISTERED" } },
    { level: "info", source: "data-pipeline", message: "Data export completed", details: { userId: "usr-e5f6g7h8", format: "CSV", rows: 15000, fileSizeKb: 2048 } },
    { level: "warn", source: "workflow-engine", message: "Long-running workflow detected", details: { workflowId: "wf-006f7g8h", runningForMs: 18200, threshold: 15000 } },
    { level: "info", source: "agent-runner", message: "Agent 'SEO Optimizer' completed", details: { agentId: "agt-016p7q8r", pagesAnalyzed: 45, durationMs: 7800 } },
    { level: "info", source: "auth-service", message: "New admin account created", details: { email: "newadmin@aivory.id", createdBy: "grandmaster@aivory.ai" } },
    { level: "error", source: "data-pipeline", message: "Redis connection lost during pipeline execution", details: { pipelineId: "pipe-003", step: "cache_write", retryCount: 5 } },
    { level: "warn", source: "credit-manager", message: "Bulk credit deduction requested", details: { userId: "usr-g7h8i9j0", amount: 5000, reason: "workflow_batch_run" } },
    { level: "info", source: "webhook-processor", message: "Webhook signature verified", details: { provider: "github", algorithm: "sha256", valid: true } },
    { level: "info", source: "integration-hub", message: "OAuth refresh token rotated", details: { userId: "usr-f6g7h8i9", provider: "google", oldTokenExpiry: new Date(now - 60 * 1000).toISOString() } },
    { level: "warn", source: "api-gateway", message: "Unusual traffic pattern detected", details: { userId: "usr-j0k1l2m3", requestsPerMinute: 85, normalBaseline: 20 } },
    { level: "info", source: "scheduler", message: "Billing cycle job completed", details: { invoicesGenerated: 312, totalAmount: 48750, currency: "USD" } },
    { level: "error", source: "agent-runner", message: "Agent 'Invoice Processor' validation error", details: { agentId: "agt-007g8h9i", invoiceId: "INV-2024-0892", mismatch: { expected: 1250.00, got: 1249.99 } } },
    { level: "info", source: "notification-service", message: "Escalation report notification sent", details: { reportId: "report-001", notifiedTo: "grandmaster@aivory.ai" } },
    { level: "info", source: "workflow-engine", message: "Workflow 'Content Moderation' triggered", details: { workflowId: "wf-016p7q8r", trigger: "scheduled", itemsQueued: 150 } },
    { level: "warn", source: "data-pipeline", message: "Duplicate records detected in sync", details: { source: "hubspot", duplicates: 23, action: "skipped" } },
    { level: "info", source: "auth-service", message: "2FA verification successful", details: { userId: "usr-m3n4o5p6", method: "totp" } },
    { level: "error", source: "integration-hub", message: "Webhook delivery failed after 3 retries", details: { webhookId: "wh-xyz789", targetUrl: "https://customer.example.com/webhook", lastError: "ECONNREFUSED" } },
    { level: "info", source: "api-gateway", message: "API documentation accessed", details: { path: "/api/docs", ip: "203.0.113.55", userAgent: "Mozilla/5.0" } },
    { level: "info", source: "credit-manager", message: "Free tier credit reset applied", details: { userId: "usr-i9j0k1l2", creditsReset: 100, resetType: "monthly" } },
    { level: "warn", source: "workflow-engine", message: "Workflow step skipped due to condition", details: { workflowId: "wf-009i0j1k", step: "send_email", condition: "user.tier !== 'free'", result: "skipped" } },
    { level: "info", source: "scheduler", message: "Stale workflow cleanup completed", details: { workflowsArchived: 18, olderThanDays: 90 } },
    { level: "error", source: "notification-service", message: "SMS delivery failed: invalid number", details: { userId: "usr-h8i9j0k1", phoneNumber: "+1555XXXXXXX", errorCode: "21211" } },
    { level: "info", source: "data-pipeline", message: "Real-time event stream connected", details: { streamId: "stream-001", source: "kafka", topic: "workflow.events" } },
    { level: "warn", source: "agent-runner", message: "Agent execution queue backing up", details: { queueDepth: 23, processingRate: "8/min", estimatedWait: "3min" } },
    { level: "info", source: "integration-hub", message: "Notion database sync completed", details: { userId: "usr-n4o5p6q7", databaseId: "notion-db-123", pagesSync: 45 } },
    { level: "info", source: "auth-service", message: "Session extended via remember-me token", details: { userId: "usr-b2c3d4e5", newExpiry: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString() } },
    { level: "error", source: "workflow-engine", message: "Circular dependency detected in workflow", details: { workflowId: "wf-015o6p7q", cycle: ["step-A", "step-C", "step-A"] } },
    { level: "info", source: "api-gateway", message: "Webhook endpoint health check passed", details: { endpointId: "ep-001", latencyMs: 28, status: 200 } },
    { level: "warn", source: "credit-manager", message: "Credit expiry warning sent", details: { userId: "usr-l2m3n4o5", creditsExpiring: 50, expiresAt: new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString() } },
    { level: "info", source: "data-pipeline", message: "Transformation rule applied successfully", details: { ruleId: "rule-007", inputRows: 5000, outputRows: 4987, filtered: 13 } },
    { level: "info", source: "scheduler", message: "Retry job completed successfully", details: { originalJobId: "job-wf-008", retryAttempt: 2, status: "success" } },
    { level: "error", source: "auth-service", message: "Account locked after too many failed attempts", details: { email: "frank.miller@saas.com", failedAttempts: 10, lockDuration: "30m" } },
    { level: "info", source: "notification-service", message: "Webhook notification dispatched", details: { userId: "usr-o5p6q7r8", event: "agent.completed", deliveredTo: "https://hooks.example.com/aivory" } },
    { level: "warn", source: "integration-hub", message: "API key rotation recommended", details: { userId: "usr-k1l2m3n4", keyAge: "180d", recommendation: "rotate_now" } },
    { level: "info", source: "workflow-engine", message: "Workflow version upgraded", details: { workflowId: "wf-011k2l3m", fromVersion: "1.2", toVersion: "1.3", migratedBy: "usr-k1l2m3n4" } },
    { level: "info", source: "agent-runner", message: "Agent 'Fraud Detection Agent' flagged transactions", details: { agentId: "agt-015o6p7q", flagged: 3, totalAnalyzed: 210, riskScore: 0.87 } },
    { level: "error", source: "data-pipeline", message: "Memory limit exceeded during aggregation", details: { pipelineId: "pipe-004", memoryUsedMb: 1024, limitMb: 1024, step: "group_by" } },
    { level: "info", source: "api-gateway", message: "GraphQL query executed", details: { userId: "usr-e5f6g7h8", queryComplexity: 45, durationMs: 120 } },
    { level: "warn", source: "scheduler", message: "Cron expression may cause overlap", details: { jobId: "job-sync-crm", expression: "*/5 * * * *", avgDurationMs: 320000 } },
    { level: "info", source: "credit-manager", message: "Enterprise credit pool shared", details: { orgId: "org-techcorp", totalPool: 50000, membersCount: 8, allocatedPerMember: 6250 } },
    { level: "info", source: "auth-service", message: "SAML SSO login successful", details: { userId: "usr-a1b2c3d4", idpName: "Okta", sessionId: "saml-sess-abc" } },
    { level: "error", source: "notification-service", message: "Template rendering failed", details: { templateId: "tmpl-onboarding-v2", error: "Missing variable: {{company_name}}", userId: "usr-c3d4e5f6" } },
    { level: "info", source: "integration-hub", message: "Zapier webhook trigger registered", details: { userId: "usr-d4e5f6g7", zapId: "zap-12345", triggerEvent: "workflow.completed" } },
    { level: "warn", source: "workflow-engine", message: "Workflow output size exceeds recommended limit", details: { workflowId: "wf-013m4n5o", outputSizeKb: 2048, recommendedLimitKb: 1024 } },
    { level: "info", source: "data-pipeline", message: "Backup completed successfully", details: { backupId: "bkp-2024-04-15", sizeGb: 12.4, destination: "s3://aivory-backups" } },
  ];

  // Generate 100 log entries with timestamps spread over the last 24 hours
  return logTemplates.slice(0, 100).map((template, i) => ({
    id: `log-${String(i + 1).padStart(4, "0")}`,
    timestamp: new Date(now - i * 14.4 * 60 * 1000).toISOString(), // spread over 24h
    level: template.level,
    source: template.source,
    message: template.message,
    details: template.details,
  }));
}

const mockLogs = generateLogs();

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
      const res = await fetch(`${apiUrl}/api/v1/admin/logs`, {
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

  return NextResponse.json({ logs: mockLogs });
}
