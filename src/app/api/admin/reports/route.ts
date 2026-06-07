// TODO: wire to real endpoint
import { NextRequest, NextResponse } from "next/server";

// In-memory store for mock reports (resets on server restart)
const mockReports: Array<{
  id: string;
  recordType: string;
  recordId: string;
  reportedBy: string;
  note?: string;
  createdAt: string;
  isRead: boolean;
  readAt?: string;
}> = [];

export async function GET(request: NextRequest) {
  const token = request.cookies.get("aivory_access_token")?.value;

  if (!token) {
    const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    response.cookies.delete("aivory_access_token");
    response.cookies.delete("aivory_refresh_token");
    return response;
  }

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unread") === "true";

  // Attempt to forward to real backend when available
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    try {
      const url = new URL(`${apiUrl}/api/v1/admin/reports`);
      if (unreadOnly) url.searchParams.set("unread", "true");
      const res = await fetch(url.toString(), {
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

  const filtered = unreadOnly
    ? mockReports.filter((r) => !r.isRead)
    : mockReports;

  return NextResponse.json({
    reports: filtered,
    count: filtered.length,
  });
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get("aivory_access_token")?.value;

  if (!token) {
    const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    response.cookies.delete("aivory_access_token");
    response.cookies.delete("aivory_refresh_token");
    return response;
  }

  let body: { recordType?: string; recordId?: string; note?: string; reportedBy?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { recordType, recordId, note, reportedBy } = body;

  if (!recordType || !recordId) {
    return NextResponse.json(
      { error: "recordType and recordId are required" },
      { status: 400 }
    );
  }

  // Attempt to forward to real backend when available
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    try {
      const res = await fetch(`${apiUrl}/api/v1/admin/reports`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recordType, recordId, note, reportedBy }),
      });

      if (res.status === 401) {
        const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        response.cookies.delete("aivory_access_token");
        response.cookies.delete("aivory_refresh_token");
        return response;
      }

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data, { status: 201 });
      }
    } catch {
      // Backend not available — fall through to mock data
    }
  }

  const report = {
    id: `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    recordType,
    recordId,
    reportedBy: reportedBy ?? "admin@aivory.id",
    note: note ?? undefined,
    createdAt: new Date().toISOString(),
    isRead: false,
  };

  mockReports.push(report);

  return NextResponse.json(report, { status: 201 });
}
