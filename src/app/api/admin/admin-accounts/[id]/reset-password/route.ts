// TODO: wire to real endpoint
import { NextRequest, NextResponse } from "next/server";
import { adminAccountsStore } from "../../_store";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const account = adminAccountsStore.find((a) => a.id === id);

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // Generate a mock temporary password
  const temporaryPassword = `TempPass${Math.random().toString(36).slice(2, 10)}!`;

  return NextResponse.json({ success: true, temporaryPassword });
}
