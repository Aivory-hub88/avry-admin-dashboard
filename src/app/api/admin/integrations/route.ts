// TODO: wire to real endpoint
import { NextRequest, NextResponse } from "next/server";

interface IntegrationConnection {
  integrationId: string;
  integrationName: string;
  userId: string;
  provider: string;
  status: "connected" | "error" | "expired";
  lastSyncedAt: string;
  details?: Record<string, unknown>;
}

const now = Date.now();

const mockIntegrations: IntegrationConnection[] = [
  {
    integrationId: "int-001a2b3c",
    integrationName: "Salesforce CRM",
    userId: "usr-a1b2c3d4",
    provider: "salesforce",
    status: "connected",
    lastSyncedAt: new Date(now - 5 * 60 * 1000).toISOString(),
    details: { instanceUrl: "https://myorg.salesforce.com", apiVersion: "v58.0", syncedObjects: ["Contact", "Lead", "Opportunity"] },
  },
  {
    integrationId: "int-002b3c4d",
    integrationName: "HubSpot Marketing",
    userId: "usr-b2c3d4e5",
    provider: "hubspot",
    status: "error",
    lastSyncedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    details: { portalId: "12345678", errorCode: "invalid_grant", errorMessage: "OAuth token has been revoked" },
  },
  {
    integrationId: "int-003c4d5e",
    integrationName: "Google Sheets",
    userId: "usr-c3d4e5f6",
    provider: "google",
    status: "connected",
    lastSyncedAt: new Date(now - 15 * 60 * 1000).toISOString(),
    details: { spreadsheetId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms", sheetName: "Data Export", rowsSynced: 1240 },
  },
  {
    integrationId: "int-004d5e6f",
    integrationName: "Slack Workspace",
    userId: "usr-d4e5f6g7",
    provider: "slack",
    status: "expired",
    lastSyncedAt: new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString(),
    details: { workspaceId: "T01234567", workspaceName: "Freelance Dev", tokenExpiredAt: new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString() },
  },
  {
    integrationId: "int-005e6f7g",
    integrationName: "Notion Workspace",
    userId: "usr-e5f6g7h8",
    provider: "notion",
    status: "connected",
    lastSyncedAt: new Date(now - 30 * 60 * 1000).toISOString(),
    details: { workspaceId: "notion-ws-abc", databasesConnected: 3, pagesSync: 145 },
  },
  {
    integrationId: "int-006f7g8h",
    integrationName: "Stripe Payments",
    userId: "usr-f6g7h8i9",
    provider: "stripe",
    status: "connected",
    lastSyncedAt: new Date(now - 2 * 60 * 1000).toISOString(),
    details: { accountId: "acct_1234567890", mode: "live", webhooksActive: 3 },
  },
  {
    integrationId: "int-007g8h9i",
    integrationName: "Airtable Base",
    userId: "usr-g7h8i9j0",
    provider: "airtable",
    status: "error",
    lastSyncedAt: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
    details: { baseId: "appXXXXXXXXXXXXXX", errorCode: 422, errorMessage: "INVALID_RECORDS: Field type mismatch" },
  },
  {
    integrationId: "int-008h9i0j",
    integrationName: "GitHub Repository",
    userId: "usr-h8i9j0k1",
    provider: "github",
    status: "connected",
    lastSyncedAt: new Date(now - 45 * 60 * 1000).toISOString(),
    details: { org: "consulting-biz", reposConnected: 5, webhooksActive: 2 },
  },
  {
    integrationId: "int-009i0j1k",
    integrationName: "Zendesk Support",
    userId: "usr-i9j0k1l2",
    provider: "zendesk",
    status: "expired",
    lastSyncedAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
    details: { subdomain: "media-co", tokenExpiredAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(), ticketsSynced: 0 },
  },
  {
    integrationId: "int-010j1k2l",
    integrationName: "Jira Project",
    userId: "usr-j0k1l2m3",
    provider: "jira",
    status: "connected",
    lastSyncedAt: new Date(now - 10 * 60 * 1000).toISOString(),
    details: { cloudId: "jira-cloud-xyz", projectKey: "FIN", issuesSynced: 234 },
  },
  {
    integrationId: "int-011k2l3m",
    integrationName: "Shopify Store",
    userId: "usr-k1l2m3n4",
    provider: "shopify",
    status: "connected",
    lastSyncedAt: new Date(now - 20 * 60 * 1000).toISOString(),
    details: { shopDomain: "ecommerce-shop.myshopify.com", ordersSync: 1580, productsSync: 342 },
  },
  {
    integrationId: "int-012l3m4n",
    integrationName: "Mailchimp Audience",
    userId: "usr-l2m3n4o5",
    provider: "mailchimp",
    status: "error",
    lastSyncedAt: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
    details: { audienceId: "abc123def", errorCode: "API_KEY_MISSING", errorMessage: "API key not found in request" },
  },
  {
    integrationId: "int-013m4n5o",
    integrationName: "Google Analytics",
    userId: "usr-m3n4o5p6",
    provider: "google",
    status: "connected",
    lastSyncedAt: new Date(now - 60 * 60 * 1000).toISOString(),
    details: { propertyId: "GA4-123456789", dataStreams: 2, eventsTracked: 45000 },
  },
  {
    integrationId: "int-014n5o6p",
    integrationName: "QuickBooks Online",
    userId: "usr-n4o5p6q7",
    provider: "quickbooks",
    status: "connected",
    lastSyncedAt: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
    details: { companyId: "qb-company-123", invoicesSynced: 892, lastReconciliation: new Date(now - 24 * 60 * 60 * 1000).toISOString() },
  },
  {
    integrationId: "int-015o6p7q",
    integrationName: "Microsoft Teams",
    userId: "usr-o5p6q7r8",
    provider: "microsoft",
    status: "expired",
    lastSyncedAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
    details: { tenantId: "ms-tenant-xyz", teamId: "team-edtech", tokenExpiredAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString() },
  },
  {
    integrationId: "int-016p7q8r",
    integrationName: "Twilio SMS",
    userId: "usr-a1b2c3d4",
    provider: "twilio",
    status: "connected",
    lastSyncedAt: new Date(now - 8 * 60 * 1000).toISOString(),
    details: { accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", phoneNumbers: 2, messagesSent: 3400 },
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
      const res = await fetch(`${apiUrl}/api/v1/admin/integrations`, {
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

  return NextResponse.json({ integrations: mockIntegrations });
}
