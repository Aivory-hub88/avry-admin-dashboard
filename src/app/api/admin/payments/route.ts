import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, proxyToService, unauthorized } from "@/lib/bff";

interface Payment {
  paymentId: string;
  orderId: string;
  userId: string;
  email: string;
  product: string;
  amount: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
}

// Raw record shape as stored/returned by the avry-payments service (snake_case).
interface ServicePayment {
  payment_id?: string;
  order_id?: string;
  user_id?: string;
  email?: string;
  customer_email?: string;
  product?: string;
  amount?: number;
  status?: string;
  payment_method?: string;
  created_at?: string;
}

function mapPayment(p: ServicePayment): Payment {
  return {
    paymentId: p.payment_id ?? "",
    orderId: p.order_id ?? "",
    userId: p.user_id ?? "",
    email: p.email ?? p.customer_email ?? "",
    product: p.product ?? "",
    amount: typeof p.amount === "number" ? p.amount : 0,
    status: p.status ?? "pending",
    paymentMethod: p.payment_method ?? "unknown",
    createdAt: p.created_at ?? "",
  };
}

export async function GET(request: NextRequest) {
  const token = getAccessToken(request);
  if (!token) return unauthorized();

  const result = await proxyToService({
    service: "payments",
    path: "/api/v1/payments/history/admin",
    token,
  });

  if (result.status === 401) return unauthorized();
  if (result.notConfigured) {
    return NextResponse.json(
      { error: "Payments service is not configured" },
      { status: 503 }
    );
  }
  if (!result.ok) {
    return NextResponse.json(
      { error: "Failed to reach payments service" },
      { status: 502 }
    );
  }

  const data = result.data as { payments?: ServicePayment[] } | null;
  const raw = Array.isArray(data?.payments) ? data!.payments! : [];
  return NextResponse.json({ payments: raw.map(mapPayment) });
}

export async function POST(request: NextRequest) {
  const token = getAccessToken(request);
  if (!token) return unauthorized();

  let body: {
    userId?: string;
    amount?: number;
    product?: string;
    paymentMethod?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.userId || typeof body.amount !== "number" || body.amount <= 0) {
    return NextResponse.json(
      { error: "userId and a positive amount are required" },
      { status: 400 }
    );
  }

  // The service /record endpoint takes parameters as query string.
  const result = await proxyToService({
    service: "payments",
    path: "/api/v1/payments/record",
    method: "POST",
    token,
    query: {
      user_id: body.userId,
      amount: String(body.amount),
      payment_method: body.paymentMethod ?? "manual",
      product: body.product ?? "ai_blueprint",
    },
  });

  if (result.status === 401) return unauthorized();
  if (result.notConfigured) {
    return NextResponse.json(
      { success: false, detail: "Payments service is not configured" },
      { status: 503 }
    );
  }
  if (!result.ok) {
    const detail =
      (result.data as { detail?: string } | null)?.detail ??
      "Failed to reach payments service";
    return NextResponse.json({ success: false, detail }, { status: 502 });
  }

  return NextResponse.json(result.data);
}
