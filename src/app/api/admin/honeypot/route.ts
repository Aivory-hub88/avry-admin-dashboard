import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Fetch stats from ssh-tarpit internal container on the aivory-network
    // It's exposed on port 8080 inside the container
    const res = await fetch("http://ssh-tarpit:8080/api/honeypot-stats", {
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch from tarpit" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Honeypot API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
