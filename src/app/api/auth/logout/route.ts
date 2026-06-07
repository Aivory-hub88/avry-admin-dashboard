import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(_request: NextRequest) {
  // Sign out from Supabase (invalidates the session server-side)
  await supabase.auth.signOut();

  const response = NextResponse.json({ success: true });

  // Clear both auth cookies
  response.cookies.set("aivory_access_token", "", {
    maxAge: 0,
    path: "/",
    httpOnly: false,
    sameSite: "lax",
  });
  response.cookies.set("aivory_refresh_token", "", {
    maxAge: 0,
    path: "/",
    httpOnly: false,
    sameSite: "lax",
  });

  return response;
}
