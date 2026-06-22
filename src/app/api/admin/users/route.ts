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

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/admin/users`, {
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

    return NextResponse.json({ users: [] });
  } catch {
    // Backend not reachable — return empty response
    return NextResponse.json({ users: [] });
  }
}
