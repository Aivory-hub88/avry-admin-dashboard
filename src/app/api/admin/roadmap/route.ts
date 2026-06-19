import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, proxyToService, unauthorized } from "@/lib/bff";

export interface RoadmapItem {
  id: string;
  userId: string;
  userEmail: string;
  tier: string;
  title: string;
  category: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in_progress" | "completed" | "deferred";
  estimatedWeeks: number;
  completionPercent: number;
  createdAt: string;
  updatedAt: string;
}

function mapRoadmap(r: any): RoadmapItem {
  return {
    id: r.roadmap_id ?? r.id ?? "",
    userId: r.user_id ?? "",
    userEmail: r.user_email ?? r.email ?? "",
    tier: "blueprint",
    title: r.title ?? r.system_name ?? "Untitled Roadmap",
    category: r.category ?? "automation",
    priority: r.priority ?? "medium",
    status: r.status === "in_progress" || r.status === "completed" || r.status === "deferred" ? r.status : "pending",
    estimatedWeeks: r.estimated_weeks ?? 4,
    completionPercent: r.completion_percent ?? 0,
    createdAt: r.created_at ?? "",
    updatedAt: r.updated_at ?? r.created_at ?? "",
  };
}

export async function GET(request: NextRequest) {
  const token = getAccessToken(request);
  if (!token) return unauthorized();

  const result = await proxyToService({
    service: "roadmap",
    path: "/api/v1/roadmap",
    token,
  });

  if (result.notConfigured || result.unreachable) {
    return NextResponse.json([]);
  }

  if (!result.ok) {
    return NextResponse.json([], { status: 200 });
  }

  const raw = result.data as any;
  const items = raw?.roadmap ?? raw?.data ?? (Array.isArray(raw) ? raw : []);
  return NextResponse.json(items.map(mapRoadmap));
}
