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

// In-memory template store (production should use PostgreSQL)
const templates: any[] = [
  { id: "tpl-001", name: "Email Campaign Automation", description: "Automated email sequences", category: "marketing", tags: ["email", "drip"], status: "active", workflow_json: {}, created_at: "2025-01-15T10:00:00Z" },
  { id: "tpl-002", name: "Lead Scoring Pipeline", description: "Score and route leads automatically", category: "sales", tags: ["leads", "scoring"], status: "active", workflow_json: {}, created_at: "2025-02-01T08:00:00Z" },
  { id: "tpl-003", name: "Customer Onboarding", description: "Automated onboarding workflow", category: "operations", tags: ["onboarding", "welcome"], status: "draft", workflow_json: {}, created_at: "2025-03-10T14:00:00Z" },
];

export async function GET(request: NextRequest) {
  const auth = getAuth(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
  const auth = getAuth(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  if (!body.name) return NextResponse.json({ error: "Missing required field: name" }, { status: 400 });

  const newTemplate = {
    id: `tpl-${Date.now()}`,
    name: body.name,
    description: body.description || null,
    category: body.category || "general",
    tags: body.tags || [],
    status: body.status || "draft",
    workflow_json: body.workflow_json || {},
    created_by: auth.payload.user_id || null,
    created_at: new Date().toISOString(),
  };
  templates.push(newTemplate);
  return NextResponse.json(newTemplate, { status: 201 });
}
