import { NextRequest, NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";
import { Pool } from "pg";

interface JwtPayload { account_type?: string; exp: number; }
let _pool: Pool | null = null;
function getPool(): Pool {
  if (!_pool) _pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3, idleTimeoutMillis: 30000 });
  return _pool;
}
function isAdmin(token: string): boolean {
  try { const p = jwtDecode<JwtPayload>(token); return p.exp * 1000 > Date.now() && (p.account_type === "superadmin" || p.account_type === "admin"); }
  catch { return false; }
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get("aivory_access_token")?.value;
  if (!token || !isAdmin(token)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const pool = getPool();
    const { rows } = await pool.query(
      "SELECT id, email, account_type, company_name, is_active, created_at FROM users WHERE account_type IN ($1, $2) ORDER BY created_at DESC",
      ["superadmin", "admin"]
    );
    return NextResponse.json(rows.map((u: any) => ({
      id: u.id,
      email: u.email,
      accountType: u.account_type,
      fullName: u.company_name || u.email.split("@")[0],
      isActive: u.is_active,
      createdAt: u.created_at,
    })));
  } catch (err) {
    console.error("[admin-accounts]", err);
    return NextResponse.json([]);
  }
}
