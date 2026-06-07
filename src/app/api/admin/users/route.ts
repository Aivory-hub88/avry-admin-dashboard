// TODO: wire to real endpoint
import { NextRequest, NextResponse } from "next/server";

interface AdminUserView {
  userId: string;
  email: string;
  accountType: string;
  tier: string;
  creditsUsed: number;
  creditsMax: number;
  createdAt: string;
  payments: Array<{
    paymentId: string;
    product: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
}

const mockUsers: AdminUserView[] = [
  {
    userId: "usr-a1b2c3d4",
    email: "alice.johnson@techcorp.com",
    accountType: "enterprise",
    tier: "enterprise",
    creditsUsed: 8420,
    creditsMax: 50000,
    createdAt: "2024-01-15T09:23:00Z",
    payments: [
      { paymentId: "pay-001", product: "Enterprise Plan", amount: 499, status: "succeeded", createdAt: "2024-01-15T09:23:00Z" },
      { paymentId: "pay-002", product: "Credit Top-up 10k", amount: 99, status: "succeeded", createdAt: "2024-03-10T14:00:00Z" },
    ],
  },
  {
    userId: "usr-b2c3d4e5",
    email: "bob.smith@startup.io",
    accountType: "blueprint",
    tier: "blueprint",
    creditsUsed: 1850,
    creditsMax: 5000,
    createdAt: "2024-02-20T11:45:00Z",
    payments: [
      { paymentId: "pay-003", product: "Blueprint Plan", amount: 149, status: "succeeded", createdAt: "2024-02-20T11:45:00Z" },
    ],
  },
  {
    userId: "usr-c3d4e5f6",
    email: "carol.white@agency.co",
    accountType: "snapshot",
    tier: "snapshot",
    creditsUsed: 320,
    creditsMax: 1000,
    createdAt: "2024-03-05T08:12:00Z",
    payments: [
      { paymentId: "pay-004", product: "Snapshot Plan", amount: 49, status: "succeeded", createdAt: "2024-03-05T08:12:00Z" },
    ],
  },
  {
    userId: "usr-d4e5f6g7",
    email: "david.lee@freelance.dev",
    accountType: "free",
    tier: "free",
    creditsUsed: 45,
    creditsMax: 100,
    createdAt: "2024-03-18T16:30:00Z",
    payments: [],
  },
  {
    userId: "usr-e5f6g7h8",
    email: "emma.davis@bigcorp.com",
    accountType: "enterprise",
    tier: "enterprise",
    creditsUsed: 22100,
    creditsMax: 50000,
    createdAt: "2023-11-01T10:00:00Z",
    payments: [
      { paymentId: "pay-005", product: "Enterprise Plan", amount: 499, status: "succeeded", createdAt: "2023-11-01T10:00:00Z" },
      { paymentId: "pay-006", product: "Enterprise Plan", amount: 499, status: "succeeded", createdAt: "2024-02-01T10:00:00Z" },
      { paymentId: "pay-007", product: "Credit Top-up 20k", amount: 179, status: "succeeded", createdAt: "2024-04-01T10:00:00Z" },
    ],
  },
  {
    userId: "usr-f6g7h8i9",
    email: "frank.miller@saas.com",
    accountType: "blueprint",
    tier: "blueprint",
    creditsUsed: 4200,
    creditsMax: 5000,
    createdAt: "2024-01-28T13:20:00Z",
    payments: [
      { paymentId: "pay-008", product: "Blueprint Plan", amount: 149, status: "succeeded", createdAt: "2024-01-28T13:20:00Z" },
      { paymentId: "pay-009", product: "Credit Top-up 2k", amount: 29, status: "succeeded", createdAt: "2024-03-28T13:20:00Z" },
    ],
  },
  {
    userId: "usr-g7h8i9j0",
    email: "grace.chen@analytics.ai",
    accountType: "enterprise",
    tier: "enterprise",
    creditsUsed: 31500,
    creditsMax: 50000,
    createdAt: "2023-09-15T07:00:00Z",
    payments: [
      { paymentId: "pay-010", product: "Enterprise Plan", amount: 499, status: "succeeded", createdAt: "2023-09-15T07:00:00Z" },
      { paymentId: "pay-011", product: "Enterprise Plan", amount: 499, status: "succeeded", createdAt: "2023-12-15T07:00:00Z" },
      { paymentId: "pay-012", product: "Enterprise Plan", amount: 499, status: "succeeded", createdAt: "2024-03-15T07:00:00Z" },
    ],
  },
  {
    userId: "usr-h8i9j0k1",
    email: "henry.wilson@consulting.biz",
    accountType: "snapshot",
    tier: "snapshot",
    creditsUsed: 780,
    creditsMax: 1000,
    createdAt: "2024-04-02T09:15:00Z",
    payments: [
      { paymentId: "pay-013", product: "Snapshot Plan", amount: 49, status: "succeeded", createdAt: "2024-04-02T09:15:00Z" },
    ],
  },
  {
    userId: "usr-i9j0k1l2",
    email: "isabella.brown@media.co",
    accountType: "free",
    tier: "free",
    creditsUsed: 0,
    creditsMax: 100,
    createdAt: "2024-04-10T14:55:00Z",
    payments: [],
  },
  {
    userId: "usr-j0k1l2m3",
    email: "james.taylor@fintech.io",
    accountType: "blueprint",
    tier: "blueprint",
    creditsUsed: 2100,
    creditsMax: 5000,
    createdAt: "2024-02-14T11:00:00Z",
    payments: [
      { paymentId: "pay-014", product: "Blueprint Plan", amount: 149, status: "succeeded", createdAt: "2024-02-14T11:00:00Z" },
    ],
  },
  {
    userId: "usr-k1l2m3n4",
    email: "kate.anderson@ecommerce.shop",
    accountType: "enterprise",
    tier: "enterprise",
    creditsUsed: 15000,
    creditsMax: 50000,
    createdAt: "2023-12-01T08:30:00Z",
    payments: [
      { paymentId: "pay-015", product: "Enterprise Plan", amount: 499, status: "succeeded", createdAt: "2023-12-01T08:30:00Z" },
      { paymentId: "pay-016", product: "Enterprise Plan", amount: 499, status: "succeeded", createdAt: "2024-03-01T08:30:00Z" },
    ],
  },
  {
    userId: "usr-l2m3n4o5",
    email: "liam.martinez@devshop.dev",
    accountType: "free",
    tier: "free",
    creditsUsed: 88,
    creditsMax: 100,
    createdAt: "2024-04-15T17:20:00Z",
    payments: [],
  },
  {
    userId: "usr-m3n4o5p6",
    email: "mia.garcia@healthtech.med",
    accountType: "blueprint",
    tier: "blueprint",
    creditsUsed: 3800,
    creditsMax: 5000,
    createdAt: "2024-01-05T10:45:00Z",
    payments: [
      { paymentId: "pay-017", product: "Blueprint Plan", amount: 149, status: "succeeded", createdAt: "2024-01-05T10:45:00Z" },
      { paymentId: "pay-018", product: "Credit Top-up 2k", amount: 29, status: "failed", createdAt: "2024-03-05T10:45:00Z" },
    ],
  },
  {
    userId: "usr-n4o5p6q7",
    email: "noah.robinson@logistics.net",
    accountType: "snapshot",
    tier: "snapshot",
    creditsUsed: 150,
    creditsMax: 1000,
    createdAt: "2024-03-25T12:00:00Z",
    payments: [
      { paymentId: "pay-019", product: "Snapshot Plan", amount: 49, status: "succeeded", createdAt: "2024-03-25T12:00:00Z" },
    ],
  },
  {
    userId: "usr-o5p6q7r8",
    email: "olivia.clark@edtech.edu",
    accountType: "enterprise",
    tier: "enterprise",
    creditsUsed: 42000,
    creditsMax: 50000,
    createdAt: "2023-08-20T06:00:00Z",
    payments: [
      { paymentId: "pay-020", product: "Enterprise Plan", amount: 499, status: "succeeded", createdAt: "2023-08-20T06:00:00Z" },
      { paymentId: "pay-021", product: "Enterprise Plan", amount: 499, status: "succeeded", createdAt: "2023-11-20T06:00:00Z" },
      { paymentId: "pay-022", product: "Enterprise Plan", amount: 499, status: "succeeded", createdAt: "2024-02-20T06:00:00Z" },
      { paymentId: "pay-023", product: "Credit Top-up 20k", amount: 179, status: "succeeded", createdAt: "2024-04-01T06:00:00Z" },
    ],
  },
  {
    userId: "usr-admin01",
    email: "admin@aivory.id",
    accountType: "admin",
    tier: "admin",
    creditsUsed: 0,
    creditsMax: 0,
    createdAt: "2023-06-01T00:00:00Z",
    payments: [],
  },
  {
    userId: "usr-super01",
    email: "irfan.reichmann@aivory.id",
    accountType: "superadmin",
    tier: "superadmin",
    creditsUsed: 0,
    creditsMax: 0,
    createdAt: "2023-01-01T00:00:00Z",
    payments: [],
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
      const res = await fetch(`${apiUrl}/api/v1/admin/users`, {
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

  return NextResponse.json({ users: mockUsers });
}
