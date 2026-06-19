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

function mapPayment(p: any): Payment {
  return {
    paymentId: p.payment_id ?? p.id ?? "",
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
    path: "/api/v1/payments",
    token,
  });

  if (result.notConfigured || result.unreachable) {
    return NextResponse.json([]);
  }

  if (!result.ok) {
    return NextResponse.json([], { status: 200 });
  }

  const raw = result.data as any;
  const items = raw?.payments ?? raw?.data ?? (Array.isArray(raw) ? raw : []);
  return NextResponse.json(items.map(mapPayment));
}

export async function POST(request: NextRequest) {
  const token = getAccessToken(request);
  if (!token) return unauthorized();

  const body = await request.json();
  const result = await proxyToService({
    service: "payments",
    path: "/api/v1/payments/record",
    method: "POST",
    token,
    body,
  });

  if (result.notConfigured || result.unreachable) {
    return NextResponse.json({ error: "Payment service unavailable" }, { status: 503 });
  }

  return NextResponse.json(result.data, { status: result.status });
}
