import { NextRequest, NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";

interface JwtPayload {
  user_id?: string;
  email?: string;
  account_type?: string;
  exp: number;
}

const BACKEND_URL = process.env.BACKEND_SERVICE_URL || "http://avry-backend:8081";

function getAuth(request: NextRequest): { token: string; payload: JwtPayload } | null {
  const token = request.cookies.get("aivory_access_token")?.value;
  if (!token) return null;
  try {
    const payload = jwtDecode<JwtPayload>(token);
    if (payload.exp * 1000 < Date.now()) return null;
    const role = payload.account_type;
    if (role !== "superadmin" && role !== "admin") return null;
    return { token, payload };
  } catch {
    return null;
  }
}

function isSuperAdmin(payload: JwtPayload): boolean {
  return payload.account_type === "superadmin";
}

export async function GET(request: NextRequest) {
  const auth = getAuth(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const range = request.nextUrl.searchParams.get("range") || "30d";

  // Return realistic mock analytics — production would use a proper analytics DB
  const now = Date.now();
  const dayMs = 86400000;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;

  const dailyVisits = Array.from({ length: days }, (_, i) => ({
    date: new Date(now - (days - 1 - i) * dayMs).toISOString().slice(0, 10),
    visits: Math.floor(Math.random() * 50) + 10,
  }));

  const totalVisits = dailyVisits.reduce((sum, d) => sum + d.visits, 0);

  return NextResponse.json({
    totalVisits,
    uniqueVisitors: Math.floor(totalVisits * 0.7),
    dailyVisits,
    topPages: [
      { page: "/", visits: Math.floor(totalVisits * 0.4) },
      { page: "/product", visits: Math.floor(totalVisits * 0.2) },
      { page: "/pricing", visits: Math.floor(totalVisits * 0.15) },
      { page: "/blog", visits: Math.floor(totalVisits * 0.1) },
      { page: "/careers", visits: Math.floor(totalVisits * 0.08) },
    ],
    topCountries: [
      { country_code: "ID", country_name: "Indonesia", visits: Math.floor(totalVisits * 0.4) },
      { country_code: "US", country_name: "United States", visits: Math.floor(totalVisits * 0.2) },
      { country_code: "SG", country_name: "Singapore", visits: Math.floor(totalVisits * 0.1) },
      { country_code: "MY", country_name: "Malaysia", visits: Math.floor(totalVisits * 0.08) },
      { country_code: "GB", country_name: "United Kingdom", visits: Math.floor(totalVisits * 0.05) },
    ],
  });
}
