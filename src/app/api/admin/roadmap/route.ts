import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, proxyToService, unauthorized } from "@/lib/bff";

export interface RoadmapItem extends Record<string, unknown> {
  id: string;
  userId: string;
  userEmail: string;
  tier: string;
  title: string;
  category: "automation" | "integration" | "ai_agent" | "analytics" | "infrastructure";
  priority: "high" | "medium" | "low";
  status: "pending" | "in_progress" | "completed" | "deferred";
  estimatedWeeks: number;
  completionPercent: number;
  createdAt: string;
  updatedAt: string;
}

interface ServiceRoadmap {
  roadmap_id?: string;
  user_id?: string;
  user_email?: string;
  title?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

function mapRoadmap(r: ServiceRoadmap): RoadmapItem {
  const status =
    r.status === "in_progress" ||
    r.status === "completed" ||
    r.status === "deferred"
      ? r.status
      : "pending";
  return {
    id: r.roadmap_id ?? "",
    userId: r.user_id ?? "",
    userEmail: r.user_email ?? "",
    tier: "blueprint",
    title: r.title ?? "AI Readiness Roadmap",
    category: "automation",
    priority: "medium",
    status,
    estimatedWeeks: 0,
    completionPercent: status === "completed" ? 100 : 0,
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

  if (result.status === 401) return unauthorized();
  if (result.notConfigured) {
    return NextResponse.json(
      { error: "Roadmap service is not configured" },
      { status: 503 }
    );
  }
  if (!result.ok) {
    return NextResponse.json(
      { error: "Failed to reach roadmap service" },
      { status: 502 }
    );
  }

  const data = result.data as { roadmap?: ServiceRoadmap[] } | null;
  const raw = Array.isArray(data?.roadmap) ? data!.roadmap! : [];
  return NextResponse.json({ roadmap: raw.map(mapRoadmap) });
}
