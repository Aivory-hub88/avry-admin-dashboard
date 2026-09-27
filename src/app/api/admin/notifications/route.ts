import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, pickQuery, proxyToService, unauthorized } from "@/lib/bff";

/**
 * Admin-wide notifications (payments today, more event types later).
 *
 * Distinct from /api/admin/reports, which is the admin-to-superadmin escalation
 * feature. These are system events; those are messages between people.
 */

interface ServiceNotification {
  id?: number;
  type?: string;
  title?: string;
  body?: string | null;
  meta?: Record<string, unknown> | null;
  read?: boolean;
  created_at?: string;
}

export async function GET(request: NextRequest) {
  const token = getAccessToken(request);
  if (!token) return unauthorized();

  const result = await proxyToService({
    service: "payments",
    path: "/api/v1/payments/admin/notifications",
    token,
    query: pickQuery(request, ["limit", "unread_only"]),
  });

  if (result.status === 401) return unauthorized();
  if (result.notConfigured) {
    // The bell should degrade to empty, not break the header.
    return NextResponse.json({ notifications: [], unread: 0 });
  }
  if (!result.ok) {
    return NextResponse.json({ notifications: [], unread: 0 });
  }

  const data = result.data as {
    notifications?: ServiceNotification[];
    unread?: number;
  } | null;

  return NextResponse.json({
    unread: data?.unread ?? 0,
    notifications: (data?.notifications ?? []).map((n) => ({
      id: n.id ?? 0,
      type: n.type ?? "",
      title: n.title ?? "",
      body: n.body ?? "",
      meta: n.meta ?? {},
      read: Boolean(n.read),
      createdAt: n.created_at ?? "",
    })),
  });
}
