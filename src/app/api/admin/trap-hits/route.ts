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
    const res = await fetch(`${BACKEND_URL}/api/v1/trap-hits`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch trap hits" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Trap hits API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
