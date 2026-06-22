import { NextRequest, NextResponse } from "next/server";

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
      // Backend not reachable — return empty response
    }
  }

  return NextResponse.json({ reports: [], unreadCount: 0 });
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

      // Forward error from backend
      const errorData = await res.json().catch(() => ({ error: `Backend error: ${res.status}` }));
      return NextResponse.json(errorData, { status: res.status });
    } catch {
      // Backend not reachable
    }
  }

  return NextResponse.json(
    { error: "Backend service unavailable" },
    { status: 503 }
  );
}
