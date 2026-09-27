import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, pickQuery, proxyToService, unauthorized } from "@/lib/bff";

/**
 * The payment ledger for the admin table.
 *
 * Filtering, sorting and paging are all done by the payments service in
 * Postgres, so this route only forwards the view's state and maps snake_case to
 * the camelCase the UI uses.
 */

const FORWARDED = [
  "status", "product", "user_id", "search", "date_from", "date_to",
  "include_mock", "sort_by", "sort_dir", "page", "page_size",
] as const;

interface ServiceOrder {
  order_id?: string;
  payment_id?: string;
  user_id?: string;
  customer_email?: string;
  product?: string;
  amount?: number;
  amount_idr?: number | null;
  usd_idr_rate?: number | null;
  status?: string;
  payment_method?: string;
  payment_type?: string | null;
  transaction_status?: string | null;
  transaction_id?: string | null;
  fraud_status?: string | null;
  is_mock?: boolean;
  granted_at?: string | null;
  grant_error?: string | null;
  created_at?: string;
  updated_at?: string;
}

function mapOrder(o: ServiceOrder) {
  return {
    orderId: o.order_id ?? "",
    paymentId: o.payment_id ?? "",
    userId: o.user_id ?? "",
    email: o.customer_email ?? "",
    product: o.product ?? "",
    amount: typeof o.amount === "number" ? o.amount : 0,
    amountIdr: o.amount_idr ?? null,
    usdIdrRate: o.usd_idr_rate ?? null,
    status: o.status ?? "pending",
    paymentMethod: o.payment_method ?? "midtrans",
    paymentType: o.payment_type ?? "",
    transactionStatus: o.transaction_status ?? "",
    // Gateway transaction id for Midtrans orders; the customer's own bank/e-wallet
    // reference for manual ones, which is what an admin verifies against.
    transactionId: o.transaction_id ?? "",
    fraudStatus: o.fraud_status ?? "",
    isMock: Boolean(o.is_mock),
    grantedAt: o.granted_at ?? null,
    grantError: o.grant_error ?? null,
    createdAt: o.created_at ?? "",
    updatedAt: o.updated_at ?? "",
  };
}

export async function GET(request: NextRequest) {
  const token = getAccessToken(request);
  if (!token) return unauthorized();

  const result = await proxyToService({
    service: "payments",
    path: "/api/v1/payments/admin/orders",
    token,
    query: pickQuery(request, FORWARDED),
  });

  if (result.status === 401) return unauthorized();
  if (result.notConfigured) {
    return NextResponse.json({ error: "Payments service is not configured" }, { status: 503 });
  }
  if (!result.ok) {
    return NextResponse.json({ error: "Failed to reach payments service" }, { status: 502 });
  }

  const data = result.data as {
    payments?: ServiceOrder[];
    total?: number;
    page?: number;
    pages?: number;
    page_size?: number;
  } | null;

  return NextResponse.json({
    payments: (data?.payments ?? []).map(mapOrder),
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    pages: data?.pages ?? 1,
    pageSize: data?.page_size ?? 50,
  });
}
