import { NextRequest, NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";
import { Pool } from "pg";

interface JwtPayload { account_type?: string; exp: number; }

let _pool: Pool | null = null;
function getPool(): Pool {
  if (!_pool) _pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2, idleTimeoutMillis: 30000 });
  return _pool;
}

function isAdmin(token: string): boolean {
  try {
    const p = jwtDecode<JwtPayload>(token);
    if (p.exp * 1000 < Date.now()) return false;
    return p.account_type === "superadmin" || p.account_type === "admin";
  } catch { return false; }
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get("aivory_access_token")?.value;
  if (!token || !isAdmin(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const pool = getPool();
    const { rows } = await pool.query(
      "SELECT id as \"userId\", account_type as tier FROM users WHERE is_active = true ORDER BY created_at"
    );
    return NextResponse.json({ users: rows });
  } catch {
    return NextResponse.json({ users: [] });
  }
}
