import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_SERVICE_URL || process.env.NEXT_PUBLIC_API_URL || "";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("aivory_access_token")?.value;

  if (!token) {
    const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    response.cookies.delete("aivory_access_token");
    response.cookies.delete("aivory_refresh_token");
    return response;
  }

  if (BACKEND_URL) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/admin/admin-accounts`, {
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
        // Normalize: backend returns { admins: [...], total: N }
        // Settings page expects { accounts: [...] }
        const admins = data.admins || [];
        return NextResponse.json({ admins, accounts: admins, total: admins.length });
      }
    } catch {
      // Backend not reachable — return empty response
    }
  }

  return NextResponse.json({ admins: [], accounts: [], total: 0 });
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get("aivory_access_token")?.value;

  if (!token) {
    const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    response.cookies.delete("aivory_access_token");
    response.cookies.delete("aivory_refresh_token");
    return response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (BACKEND_URL) {
    try {
      // Transform frontend payload to backend format
      const frontendBody = body as Record<string, unknown>;
      const backendBody = {
        email: frontendBody.email,
        password: frontendBody.password,
        accountType: frontendBody.accountType || "admin",
      };

      const res = await fetch(`${BACKEND_URL}/api/v1/admin/admin-accounts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(backendBody),
      });

      if (res.status === 401) {
        const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        response.cookies.delete("aivory_access_token");
        response.cookies.delete("aivory_refresh_token");
        return response;
      }

      const data = await res.json().catch(() => null);
      return NextResponse.json(data ?? { error: `Backend error: ${res.status}` }, { status: res.status });
    } catch {
      // Backend not reachable
    }
  }

  return NextResponse.json(
    { error: "Backend service unavailable" },
    { status: 503 }
  );
}
