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
  const sourceFilter = searchParams.get("source");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    try {
      const backendUrl = new URL(`${apiUrl}/api/v1/admin/logs`);
      if (sourceFilter) {
        backendUrl.searchParams.set("source", sourceFilter);
      }

      const res = await fetch(backendUrl.toString(), {
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

  return NextResponse.json({ logs: [] });
}
