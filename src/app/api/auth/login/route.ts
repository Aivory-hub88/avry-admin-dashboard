import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const ALLOWED_ACCOUNT_TYPES = ["superadmin", "admin"];

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  // Authenticate with Supabase
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session || !data.user) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  // Fetch full user object to get complete metadata
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "Failed to fetch user data" },
      { status: 500 }
    );
  }

  // Resolve account_type — check user_metadata first, then app_metadata
  const accountType: string | undefined =
    userData.user.user_metadata?.account_type ??
    userData.user.app_metadata?.account_type;

  if (!accountType || !ALLOWED_ACCOUNT_TYPES.includes(accountType)) {
    // Sign out the Supabase session immediately — this user has no admin access
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "insufficient_permissions" },
      { status: 403 }
    );
  }

  const { access_token, refresh_token } = data.session;

  return NextResponse.json({
    access_token,
    refresh_token,
    token_type: "bearer",
  });
}
