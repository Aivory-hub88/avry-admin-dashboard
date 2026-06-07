// TODO: wire to real endpoint
import { NextRequest, NextResponse } from "next/server";
import { adminAccountsStore, AdminAccount } from "./_store";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("aivory_access_token")?.value;

  if (!token) {
    const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    response.cookies.delete("aivory_access_token");
    response.cookies.delete("aivory_refresh_token");
    return response;
  }

  // Attempt to forward to real backend when available
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    try {
      const res = await fetch(`${apiUrl}/api/v1/admin/admin-accounts`, {
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
      // Backend not available — fall through to mock data
    }
  }

  return NextResponse.json({ accounts: adminAccountsStore });
}

export async function POST(request: NextRequest) {
  // TODO: wire to real endpoint
  const token = request.cookies.get("aivory_access_token")?.value;

  if (!token) {
    const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    response.cookies.delete("aivory_access_token");
    response.cookies.delete("aivory_refresh_token");
    return response;
  }

  let body: {
    email?: string;
    full_name?: string;
    password?: string;
    force_password_change?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email, full_name, password, force_password_change } = body;

  if (!email || !full_name || !password) {
    return NextResponse.json(
      { error: "Missing required fields: email, full_name, password" },
      { status: 400 }
    );
  }

  const newAccount: AdminAccount = {
    id: `adm-${Date.now()}`,
    email,
    fullName: full_name,
    status: "active",
    createdAt: new Date().toISOString(),
    lastLogin: null,
    forcePasswordChange: force_password_change ?? true,
  };

  adminAccountsStore.push(newAccount);

  return NextResponse.json({ account: newAccount }, { status: 201 });
}
