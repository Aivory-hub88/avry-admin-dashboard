import { NextRequest, NextResponse } from "next/server";
import { handleVpsPanelDirect, validateAdminToken } from "../route";
import { type VpsPanelRequestType } from "../query-routing";

export const dynamic = "force-dynamic";

// Global cache to prevent hitting vps-panel multiple times per polling interval
const cache = new Map<string, { data: string; lastFetch: number }>();
const CACHE_TTL_MS = 3000;

let globalInterval: ReturnType<typeof setInterval> | null = null;
let activeConnections = 0;

export async function GET(req: NextRequest) {
  // Validate token
  const token = req.cookies.get("aivory_access_token")?.value;
  const authResponse = validateAdminToken(token);
  if (!authResponse.valid) return NextResponse.json({ error: authResponse.error }, { status: 401 });

  const url = req.nextUrl;
  const path = url.searchParams.get("path") || "/system";
  const queryParam = url.searchParams.get("query") || "";
  const startParam = url.searchParams.get("start") || null;
  const endParam = url.searchParams.get("end") || null;
  const stepParam = url.searchParams.get("step") || null;
  const resolutionParam = url.searchParams.get("resolution") || null;
  const userIdParam = url.searchParams.get("userId") || null;

  // Map path to request type
  let requestType: VpsPanelRequestType = "system";
  if (path.includes("containers")) requestType = "containers";
  else if (path.includes("projects")) requestType = "project";
  else if (path.includes("history")) requestType = "history";
  else if (path.includes("users")) requestType = "users";

  const cacheKey = `${requestType}:${queryParam}:${startParam}:${endParam}:${stepParam}:${resolutionParam}:${userIdParam}`;

  const stream = new ReadableStream({
    async start(controller) {
      activeConnections++;
      let isClosed = false;
      const encoder = new TextEncoder();

      // Ensure global cleanup interval
      if (!globalInterval) {
        globalInterval = setInterval(() => {
          if (activeConnections <= 0) {
            clearInterval(globalInterval!);
            globalInterval = null;
          }
        }, 5000);
      }

      async function sendData() {
        if (isClosed) return;

        try {
          const now = Date.now();
          const cached = cache.get(cacheKey);

          // Return cached data if fetched recently (within TTL)
          if (cached && now - cached.lastFetch < CACHE_TTL_MS) {
            controller.enqueue(encoder.encode(`data: ${cached.data}\n\n`));
            return;
          }

          // Fetch from upstream using handleVpsPanelDirect
          const res = await handleVpsPanelDirect(requestType, {
            query: queryParam,
            start: startParam,
            end: endParam,
            step: stepParam,
            resolution: resolutionParam,
            userId: userIdParam,
          });

          if (!res.ok) {
            let errorMsg = "Upstream error";
            try {
              const body = await res.json();
              if (body.error) errorMsg = body.error;
            } catch {}
            controller.enqueue(encoder.encode(`data: {"error": "${errorMsg}"}\n\n`));
            return;
          }

          const body = await res.json();
          const finalData = JSON.stringify(body);

          cache.set(cacheKey, { data: finalData, lastFetch: Date.now() });
          
          if (!isClosed) {
            controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
          }
        } catch (err: any) {
          if (!isClosed) {
            controller.enqueue(encoder.encode(`data: {"error": "Failed to stream data: ${err.message}"}\n\n`));
          }
        }
      }

      // Initial fetch immediately
      await sendData();

      // Loop to fetch every 5s
      const interval = setInterval(sendData, 5000);

      req.signal.addEventListener("abort", () => {
        isClosed = true;
        clearInterval(interval);
        activeConnections--;
      });
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
