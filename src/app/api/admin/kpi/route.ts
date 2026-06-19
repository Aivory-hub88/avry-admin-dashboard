import { NextRequest, NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";
import { Pool } from "pg";

interface JwtPayload { account_type?: string; exp: number; }

let _pool: Pool | null = null;
function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3, idleTimeoutMillis: 30000 });
  }
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

    // Active users (users with sessions in last 30 days)
    const usersRes = await pool.query("SELECT count(*) as cnt FROM users WHERE is_active = true");
    const activeUsers = parseInt(usersRes.rows[0]?.cnt || "0");

    // Sessions today / 7d / 30d as proxy for "workflow runs"
    const sessionsRes = await pool.query(`
      SELECT
        count(*) FILTER (WHERE created_at >= NOW() - interval '1 day') as today,
        count(*) FILTER (WHERE created_at >= NOW() - interval '7 days') as last7,
        count(*) FILTER (WHERE created_at >= NOW() - interval '30 days') as last30
      FROM sessions
    `);
    const s = sessionsRes.rows[0] || {};

    // Credit usage series (from page_visits as proxy for activity)
    const dailyRes = await pool.query(`
      SELECT date_trunc('day', visited_at)::date as date, count(*) as credits
      FROM page_visits
      WHERE visited_at >= NOW() - interval '30 days'
      GROUP BY 1 ORDER BY 1
    `);
    const creditUsageSeries = dailyRes.rows.map((r: any) => ({
      date: r.date?.toISOString?.()?.slice(0, 10) || r.date,
      credits: parseInt(r.credits) * 10,
    }));

    // Payments summary as agent success proxy
    const paymentsRes = await pool.query(`
      SELECT
        count(*) FILTER (WHERE status = 'paid') as success,
        count(*) FILTER (WHERE status = 'failed' OR status = 'expired') as failed,
        count(*) FILTER (WHERE status = 'pending') as running
      FROM payments
    `);
    const p = paymentsRes.rows[0] || {};

    // Recent activity from sessions + page_visits
    const recentRes = await pool.query(`
      (SELECT 'user_session' as type, user_id as "userId",
        'User session started' as description, created_at as timestamp
       FROM sessions ORDER BY created_at DESC LIMIT 5)
      UNION ALL
      (SELECT 'page_visit' as type, '' as "userId",
        'Visit to ' || page as description, visited_at as timestamp
       FROM page_visits ORDER BY visited_at DESC LIMIT 5)
      ORDER BY timestamp DESC LIMIT 10
    `);
    const recentActivity = recentRes.rows.map((r: any, i: number) => ({
      id: `act-${i + 1}`,
      type: r.type,
      userId: r.userId || "",
      description: r.description,
      timestamp: r.timestamp?.toISOString?.() || r.timestamp,
    }));

    return NextResponse.json({
      activeUsers,
      workflowRunsToday: parseInt(s.today || "0"),
      workflowRunsLast7Days: parseInt(s.last7 || "0"),
      workflowRunsLast30Days: parseInt(s.last30 || "0"),
      creditUsageSeries,
      agentSuccessRate: {
        success: parseInt(p.success || "0"),
        failed: parseInt(p.failed || "0"),
        running: parseInt(p.running || "0"),
      },
      recentActivity,
    });
  } catch (err) {
    console.error("[kpi] DB error:", err);
    return NextResponse.json({
      activeUsers: 0, workflowRunsToday: 0, workflowRunsLast7Days: 0,
      workflowRunsLast30Days: 0, creditUsageSeries: [],
      agentSuccessRate: { success: 0, failed: 0, running: 0 }, recentActivity: [],
    });
  }
}
