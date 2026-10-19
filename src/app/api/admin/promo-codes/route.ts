import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, pickQuery, proxyToService, unauthorized } from "@/lib/bff";

/**
 * Promo codes: list and generate.
 *
 * Codes live in the payments service, which is also what prices every order, so
 * there is exactly one place that decides what a code is worth. This route only
 * forwards the admin's token and reshapes the payload for the UI.
 */

const FORWARDED = ["search", "campaign", "status", "affiliate", "page", "page_size"] as const;

interface ServiceCode {
  code: string;
  discount_type: "percent" | "fixed_usd";
  discount_value: number;
  max_redemptions: number | null;
  max_customers: number | null;
  customers_used: number;
  per_user_limit: number;
  valid_from: string | null;
  expires_at: string | null;
  products: string[] | null;
  active: boolean;
  campaign: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string | null;
  redeemed: number;
  discount_given_usd: number;
  affiliate_name: string | null;
  affiliate_company: string | null;
  applied_users: number;
  checkout_users: number;
  paid_users: number;
  conversion_rate: number;
  revenue_usd: number;
}

function mapCode(c: ServiceCode) {
  return {
    code: c.code,
    discountType: c.discount_type,
    discountValue: c.discount_value,
    maxRedemptions: c.max_redemptions,
    maxCustomers: c.max_customers ?? null,
    customersUsed: c.customers_used ?? 0,
    perUserLimit: c.per_user_limit,
    validFrom: c.valid_from,
    expiresAt: c.expires_at,
    products: c.products,
    active: c.active,
    campaign: c.campaign,
    note: c.note,
    createdBy: c.created_by,
    createdAt: c.created_at,
    redeemed: c.redeemed ?? 0,
    discountGivenUsd: c.discount_given_usd ?? 0,
    affiliateName: c.affiliate_name ?? null,
    affiliateCompany: c.affiliate_company ?? null,
    appliedUsers: c.applied_users ?? 0,
    checkoutUsers: c.checkout_users ?? 0,
    paidUsers: c.paid_users ?? 0,
    conversionRate: c.conversion_rate ?? 0,
    revenueUsd: c.revenue_usd ?? 0,
  };
}

/** The service reports errors as `detail` (string, or `{error}` for promo rules). */
function errorMessage(data: unknown, fallback: string): string {
  const detail = (data as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    // FastAPI validation errors: surface the first, readable.
    const first = detail[0] as { msg?: string; loc?: unknown[] } | undefined;
    if (first?.msg) {
      const field = first.loc?.[first.loc.length - 1];
      return field ? `${String(field)}: ${first.msg}` : first.msg;
    }
  }
  const nested = (detail as { error?: string } | undefined)?.error;
  return nested || fallback;
}

export async function GET(request: NextRequest) {
  const token = getAccessToken(request);
  if (!token) return unauthorized();

  const result = await proxyToService({
    service: "payments",
    path: "/api/v1/payments/promo/admin",
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
    codes?: ServiceCode[];
    total?: number;
    page?: number;
    pages?: number;
    campaigns?: string[];
  } | null;

  return NextResponse.json({
    codes: (data?.codes ?? []).map(mapCode),
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    pages: data?.pages ?? 1,
    campaigns: data?.campaigns ?? [],
  });
}

interface GenerateBody {
  discountType?: string;
  discountValue?: number;
  count?: number;
  code?: string;
  prefix?: string;
  maxRedemptions?: number | null;
  maxCustomers?: number | null;
  perUserLimit?: number;
  validFrom?: string | null;
  expiresAt?: string | null;
  products?: string[] | null;
  campaign?: string;
  note?: string;
  affiliateName?: string;
  affiliateCompany?: string;
}

export async function POST(request: NextRequest) {
  const token = getAccessToken(request);
  if (!token) return unauthorized();

  let body: GenerateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const result = await proxyToService({
    service: "payments",
    path: "/api/v1/payments/promo/admin/generate",
    method: "POST",
    token,
    body: {
      discount_type: body.discountType,
      discount_value: body.discountValue,
      count: body.count ?? 1,
      code: body.code || undefined,
      prefix: body.prefix || undefined,
      max_redemptions: body.maxRedemptions ?? undefined,
      max_customers: body.maxCustomers ?? undefined,
      per_user_limit: body.perUserLimit ?? 1,
      valid_from: body.validFrom || undefined,
      expires_at: body.expiresAt || undefined,
      products: body.products?.length ? body.products : undefined,
      campaign: body.campaign || undefined,
      note: body.note || undefined,
      affiliate_name: body.affiliateName || undefined,
      affiliate_company: body.affiliateCompany || undefined,
    },
  });

  if (result.status === 401) return unauthorized();
  if (result.notConfigured) {
    return NextResponse.json({ error: "Payments service is not configured" }, { status: 503 });
  }
  if (!result.ok) {
    return NextResponse.json(
      { error: errorMessage(result.data, "Failed to generate promo codes") },
      { status: result.status >= 400 && result.status < 500 ? result.status : 502 }
    );
  }

  const data = result.data as { created?: number; codes?: string[] } | null;
  return NextResponse.json({ created: data?.created ?? 0, codes: data?.codes ?? [] });
}
