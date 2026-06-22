import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_SERVICE_URL || process.env.NEXT_PUBLIC_API_URL || "";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = request.cookies.get("aivory_access_token")?.value;

  if (!token) {
    const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    response.cookies.delete("aivory_access_token");
    response.cookies.delete("aivory_refresh_token");
    return response;
  }

  if (BACKEND_URL) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/admin/admin-accounts/${id}/reactivate`, {
        method: "PATCH",
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
