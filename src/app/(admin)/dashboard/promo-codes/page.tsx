"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import DataTable, { Column } from "@/components/shared/DataTable";
import ErrorState from "@/components/shared/ErrorState";
import ExportButton from "@/components/shared/ExportButton";
import { bffFetch } from "@/lib/bff";
import { affiliatePrefix } from "@/lib/promoAffiliate";

/**
 * Promo codes: generate them, see how they are being used, switch them off.
 *
 * The discount itself is applied by the payments service when an order is
 * priced, so nothing here can make a code worth more than it was created for.
 */

interface PromoCode extends Record<string, unknown> {
  code: string;
  discountType: "percent" | "fixed_usd";
  discountValue: number;
  maxRedemptions: number | null;
  perUserLimit: number;
  validFrom: string | null;
  expiresAt: string | null;
  products: string[] | null;
  active: boolean;
  campaign: string | null;
  note: string | null;
  createdAt: string | null;
  redeemed: number;
  discountGivenUsd: number;
  affiliateName: string | null;
  affiliateCompany: string | null;
  appliedUsers: number;
  checkoutUsers: number;
  paidUsers: number;
  conversionRate: number;
  revenueUsd: number;
}

interface AffiliateRow {
  affiliate: string;
  company: string | null;
  names: string | null;
  codes: number;
  appliedUsers: number;
  checkoutUsers: number;
  paidUsers: number;
  conversionRate: number;
  revenueUsd: number;
  discountGivenUsd: number;
}

interface Lead {
  userId: string;
  email: string | null;
  stage: "applied" | "checkout" | "paid";
  product: string | null;
  amountUsd: number | null;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
}

type CodeState = "active" | "inactive" | "expired" | "exhausted";

const PAGE_SIZE = 25;

// Empty selection means "every discountable product". Grouped and named as the
// marketing site sells them: "Step 2 — Operating Plan" checks out the
// `operational` / `business` products. Enterprise is absent because it is
// sales-assisted: there is no self-serve checkout for a code to discount.
const PRODUCT_GROUPS: {
  label: string;
  hint?: string;
  options: { value: string; label: string }[];
}[] = [
  {
    label: "Operating Plan",
    hint: "subscriptions — discounts the charge it's used on, renewals are full price",
    options: [
      { value: "operational", label: "Operational ($20/mo)" },
      { value: "business", label: "Business ($99/mo)" },
    ],
  },
  {
    label: "One-time",
    options: [
      { value: "ai_snapshot", label: "Business Operations Assessment" },
      { value: "ai_blueprint", label: "Transformation Blueprint" },
      { value: "ai_fullstack", label: "Complete Transformation Package" },
    ],
  },
  {
    label: "Credits",
    options: [{ value: "credits_", label: "Intelligence Credit packs (all)" }],
  },
];
const APPLIES_TO = PRODUCT_GROUPS.flatMap((g) => g.options);
const SUBSCRIPTION_PRODUCTS = PRODUCT_GROUPS[0].options.map((o) => o.value);

const STAGE_STYLES: Record<Lead["stage"], string> = {
  paid: "bg-[#b7cba6]/20 text-[#b7cba6]",
  checkout: "bg-yellow-500/20 text-yellow-400",
  applied: "bg-gray-500/20 text-gray-300",
};

const percent = (rate: number) => `${Math.round(rate * 1000) / 10}%`;
const usd = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

const STATUS_FILTERS = [
  { value: "all", label: "All codes" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Deactivated" },
  { value: "expired", label: "Expired" },
  { value: "exhausted", label: "Fully redeemed" },
];

const STATE_STYLES: Record<CodeState, string> = {
  active: "bg-[#b7cba6]/20 text-[#b7cba6]",
  inactive: "bg-gray-500/20 text-gray-300",
  expired: "bg-yellow-500/20 text-yellow-400",
  exhausted: "bg-orange-500/20 text-orange-300",
};

const PERCENT_PRESETS = [10, 20, 30, 50];
const COUNT_PRESETS = [1, 10, 20, 30, 50, 100];

const inputClass =
  "w-full rounded-lg border border-white/[0.07] bg-white/5 px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#b7cba6]/50";

const selectClass =
  "rounded-lg border border-white/[0.07] bg-white/5 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#b7cba6]/50";

function PresetChips({
  options,
  current,
  onPick,
  suffix = "",
}: {
  options: number[];
  current: string;
  onPick: (value: string) => void;
  suffix?: string;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {options.map((n) => {
        const active = current === String(n);
        return (
          <button
            key={n}
            type="button"
            onClick={() => onPick(String(n))}
            aria-pressed={active}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              active
                ? "border-[#b7cba6] bg-[#b7cba6]/20 text-[#b7cba6]"
                : "border-white/[0.1] text-gray-300 hover:bg-white/5"
            }`}
          >
            {n}
            {suffix}
          </button>
        );
      })}
    </div>
  );
}

function stateOf(c: PromoCode): CodeState {
  if (!c.active) return "inactive";
  if (c.expiresAt && new Date(c.expiresAt).getTime() <= Date.now()) return "expired";
  if (c.maxRedemptions !== null && c.redeemed >= c.maxRedemptions) return "exhausted";
  return "active";
}

const discountLabel = (c: PromoCode) =>
  c.discountType === "percent" ? `${c.discountValue}% off` : `$${c.discountValue.toFixed(2)} off`;

const formatDate = (value: string | null) => (value ? value.slice(0, 10) : "—");

function chipClass(on: boolean) {
  return `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
    on
      ? "border-[#b7cba6] bg-[#b7cba6]/20 text-[#b7cba6]"
      : "border-white/[0.1] text-gray-300 hover:bg-white/5"
  }`;
}

function Funnel({ applied, checkout, paid }: { applied: number; checkout: number; paid: number }) {
  return (
    <span className="whitespace-nowrap text-gray-200" title="applied → checkout → paid customers">
      {applied} <span className="text-gray-600">→</span> {checkout}{" "}
      <span className="text-gray-600">→</span> <span className="text-[#b7cba6]">{paid}</span>
    </span>
  );
}

function LeadsModal({ code, onClose }: { code: string; onClose: () => void }) {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await bffFetch(`/api/admin/promo-codes/${encodeURIComponent(code)}/leads`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || "Failed to load leads");
        if (!cancelled) setLeads(Array.isArray(data.leads) ? data.leads : []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load leads");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-3xl rounded-xl border border-white/10 bg-[#1e1e20] p-6 shadow-2xl">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 text-gray-400 transition-colors hover:text-white"
        >
          ✕
        </button>
        <h2 className="text-lg font-semibold text-white">Leads</h2>
        <p className="mb-4 font-mono text-sm text-gray-400">{code}</p>
        {error ? (
          <p className="text-sm text-red-300">{error}</p>
        ) : leads === null ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : leads.length === 0 ? (
          <p className="text-sm text-gray-400">Nobody has used this code yet.</p>
        ) : (
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs text-gray-400">
                  <th className="py-2 pr-3 font-medium">Customer</th>
                  <th className="py-2 pr-3 font-medium">Stage</th>
                  <th className="py-2 pr-3 font-medium">Product</th>
                  <th className="py-2 pr-3 font-medium">Paid</th>
                  <th className="py-2 font-medium">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.userId} className="border-b border-white/5">
                    <td className="py-2 pr-3">
                      <div className="text-gray-200">{l.email ?? "—"}</div>
                      <div className="font-mono text-[11px] text-gray-500">{l.userId}</div>
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_STYLES[l.stage]}`}
                      >
                        {l.stage}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-gray-400">
                      {l.product
                        ? (APPLIES_TO.find((o) => o.value === l.product)?.label ?? l.product)
                        : "—"}
                    </td>
                    <td className="py-2 pr-3 text-gray-300">
                      {l.stage === "paid" && l.amountUsd !== null ? usd(l.amountUsd) : "—"}
                    </td>
                    <td className="py-2 text-gray-400">{formatDate(l.lastSeenAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PromoCodesPage() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [campaigns, setCampaigns] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [affiliateFilter, setAffiliateFilter] = useState("all");
  const [affiliates, setAffiliates] = useState<AffiliateRow[]>([]);
  const [leadsCode, setLeadsCode] = useState<string | null>(null);

  // Generate form
  const [discountType, setDiscountType] = useState<"percent" | "fixed_usd">("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [count, setCount] = useState("1");
  const [customCode, setCustomCode] = useState("");
  const [prefix, setPrefix] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [perUserLimit, setPerUserLimit] = useState("1");
  const [expiresOn, setExpiresOn] = useState("");
  const [appliesTo, setAppliesTo] = useState<string[]>([]);
  const [campaign, setCampaign] = useState("");
  const [note, setNote] = useState("");
  const [affiliateName, setAffiliateName] = useState("");
  const [affiliateCompany, setAffiliateCompany] = useState("");
  const [generating, setGenerating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);
  const [busyCode, setBusyCode] = useState<string | null>(null);

  const countNum = Math.max(1, parseInt(count, 10) || 1);
  const derivedPrefix = affiliatePrefix(affiliateName, affiliateCompany);
  // What generated codes will start with, mirroring the service's rule: a
  // custom code or an explicit prefix wins over the affiliate-derived one.
  const usesCustomCode = countNum === 1 && customCode.trim() !== "";
  const effectivePrefix = usesCustomCode ? null : prefix.trim() || derivedPrefix;
  const allSubscriptions =
    appliesTo.length === SUBSCRIPTION_PRODUCTS.length &&
    SUBSCRIPTION_PRODUCTS.every((p) => appliesTo.includes(p));

  const filters = useMemo(
    () => ({
      search: search || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      campaign: campaignFilter === "all" ? undefined : campaignFilter,
      affiliate: affiliateFilter === "all" ? undefined : affiliateFilter,
    }),
    [search, statusFilter, campaignFilter, affiliateFilter]
  );

  const fetchCodes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      Object.entries({ ...filters, page, page_size: PAGE_SIZE }).forEach(([k, v]) => {
        if (v !== undefined && v !== "") query.set(k, String(v));
      });
      const response = await bffFetch(`/api/admin/promo-codes?${query.toString()}`);
      if (!response.ok) throw new Error(`Failed to load promo codes (${response.status})`);
      const data = await response.json();
      setCodes(Array.isArray(data.codes) ? data.codes : []);
      setPages(data.pages ?? 1);
      setTotal(data.total ?? 0);
      setCampaigns(Array.isArray(data.campaigns) ? data.campaigns : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load promo codes");
      setCodes([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters, page]);

  const fetchAffiliates = useCallback(async () => {
    try {
      const response = await bffFetch("/api/admin/promo-codes/affiliates");
      if (!response.ok) return;
      const data = await response.json();
      setAffiliates(Array.isArray(data.affiliates) ? data.affiliates : []);
    } catch {
      // The per-code table still works without the roll-up.
    }
  }, []);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  useEffect(() => {
    fetchAffiliates();
  }, [fetchAffiliates]);

  // Any filter change invalidates the current page number.
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, campaignFilter, affiliateFilter]);

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const value = parseFloat(discountValue);
    if (!Number.isFinite(value) || value <= 0) {
      setFormError("Enter a discount greater than zero.");
      return;
    }
    if (discountType === "percent" && value > 99) {
      setFormError("A percentage discount can be at most 99%.");
      return;
    }

    setGenerating(true);
    try {
      const response = await bffFetch("/api/admin/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discountType,
          discountValue: value,
          count: countNum,
          code: usesCustomCode ? customCode.trim() : undefined,
          prefix: usesCustomCode ? undefined : prefix.trim() || undefined,
          maxRedemptions: maxRedemptions ? parseInt(maxRedemptions, 10) : null,
          perUserLimit: parseInt(perUserLimit, 10) || 1,
          // End of the chosen day in Jakarta time, where the customers are.
          expiresAt: expiresOn ? `${expiresOn}T23:59:59+07:00` : null,
          products: appliesTo.length ? appliesTo : null,
          campaign: campaign.trim() || undefined,
          note: note.trim() || undefined,
          affiliateName: affiliateName.trim() || undefined,
          affiliateCompany: affiliateCompany.trim() || undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Failed to generate promo codes");

      setGenerated(data.codes ?? []);
      setCopied(false);
      setCustomCode("");
      setPage(1);
      await Promise.all([fetchCodes(), fetchAffiliates()]);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to generate promo codes");
    } finally {
      setGenerating(false);
    }
  };

  const copyGenerated = async () => {
    if (!generated?.length) return;
    try {
      await navigator.clipboard.writeText(generated.join("\n"));
      setCopied(true);
    } catch {
      setFormError("Could not copy — select the codes and copy them manually.");
    }
  };

  const toggleActive = async (row: PromoCode) => {
    setBusyCode(row.code);
    try {
      const response = await bffFetch(`/api/admin/promo-codes/${encodeURIComponent(row.code)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !row.active }),
      });
      if (!response.ok) throw new Error("Could not update this promo code");
      await fetchCodes();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not update this promo code");
    } finally {
      setBusyCode(null);
    }
  };

  const columns: Column<PromoCode>[] = [
    {
      key: "code",
      header: "Code",
      width: "210px",
      render: (row) => (
        <div className="min-w-0">
          <div className="truncate font-mono text-sm text-gray-100">{row.code}</div>
          {(row.affiliateCompany || row.affiliateName) && (
            <div className="truncate text-[11px] text-[#b7cba6]/80">
              {[row.affiliateCompany, row.affiliateName].filter(Boolean).join(" · ")}
            </div>
          )}
          {row.campaign && (
            <div className="truncate text-[11px] text-gray-500">{row.campaign}</div>
          )}
        </div>
      ),
    },
    {
      key: "discountValue",
      header: "Discount",
      width: "120px",
      render: (row) => (
        <span className="whitespace-nowrap text-gray-200">{discountLabel(row)}</span>
      ),
    },
    {
      key: "products",
      header: "Applies to",
      render: (row) => (
        <span className="text-gray-400">
          {row.products?.length
            ? row.products
                .map((p) => APPLIES_TO.find((o) => o.value === p)?.label ?? p.replace(/_/g, " ").trim())
                .join(", ")
            : "All products"}
        </span>
      ),
    },
    {
      key: "redeemed",
      header: "Used",
      width: "100px",
      render: (row) => (
        <div className="whitespace-nowrap">
          <div className="text-gray-100">
            {row.redeemed}
            {row.maxRedemptions !== null ? ` / ${row.maxRedemptions}` : ""}
          </div>
          {row.discountGivenUsd > 0 && (
            <div className="text-[11px] text-gray-500">
              −${row.discountGivenUsd.toFixed(2)} given
            </div>
          )}
        </div>
      ),
    },
    {
      key: "conversionRate",
      header: "Leads → paid",
      width: "150px",
      render: (row) => (
        <div>
          <Funnel applied={row.appliedUsers} checkout={row.checkoutUsers} paid={row.paidUsers} />
          <div className="text-[11px] text-gray-500">
            {row.appliedUsers
              ? `${percent(row.conversionRate)} · ${usd(row.revenueUsd)}`
              : "no leads yet"}
          </div>
        </div>
      ),
    },
    {
      key: "expiresAt",
      header: "Expires",
      width: "110px",
      render: (row) => (
        <span className="whitespace-nowrap text-gray-400">{formatDate(row.expiresAt)}</span>
      ),
    },
    {
      key: "state",
      header: "Status",
      width: "130px",
      render: (row) => {
        const state = stateOf(row);
        return (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATE_STYLES[state]}`}
          >
            {state === "exhausted" ? "fully redeemed" : state}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "",
      width: "180px",
      render: (row) => (
        <div className="flex gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLeadsCode(row.code);
            }}
            className="rounded-lg border border-white/[0.1] px-3 py-1 text-xs text-gray-300 transition-colors hover:bg-white/5"
          >
            Leads
          </button>
          <button
          onClick={(e) => {
            e.stopPropagation();
            toggleActive(row);
          }}
          disabled={busyCode === row.code}
          className="rounded-lg border border-white/[0.1] px-3 py-1 text-xs text-gray-300 transition-colors hover:bg-white/5 disabled:opacity-50"
        >
          {busyCode === row.code ? "…" : row.active ? "Deactivate" : "Activate"}
          </button>
        </div>
      ),
    },
  ];

  const filterSlot = (
    <>
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        aria-label="Filter by status"
        className={selectClass}
      >
        {STATUS_FILTERS.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#2a2a27]">
            {o.label}
          </option>
        ))}
      </select>
      {affiliates.length > 0 && (
        <select
          value={affiliateFilter}
          onChange={(e) => setAffiliateFilter(e.target.value)}
          aria-label="Filter by affiliate"
          className={selectClass}
        >
          <option value="all" className="bg-[#2a2a27]">
            All affiliates
          </option>
          {affiliates.map((a) => (
            <option key={a.affiliate} value={a.affiliate} className="bg-[#2a2a27]">
              {a.affiliate}
            </option>
          ))}
        </select>
      )}
      {campaigns.length > 0 && (
        <select
          value={campaignFilter}
          onChange={(e) => setCampaignFilter(e.target.value)}
          aria-label="Filter by campaign"
          className={selectClass}
        >
          <option value="all" className="bg-[#2a2a27]">
            All campaigns
          </option>
          {campaigns.map((c) => (
            <option key={c} value={c} className="bg-[#2a2a27]">
              {c}
            </option>
          ))}
        </select>
      )}
    </>
  );

  if (error && codes.length === 0 && !isLoading) {
    return <ErrorState message={error} onRetry={fetchCodes} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Promo Codes</h1>
        <p className="mt-1 text-sm text-gray-400">
          Generate discount codes for checkout. A discount applies to the one charge it is used
          on; the customer still receives the full product.
        </p>
      </div>

      <form onSubmit={generate} className="rounded-xl border border-white/[0.07] bg-[#2a2a27] p-5">
        <h2 className="text-sm font-semibold text-white">Generate codes</h2>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs text-gray-400 lg:col-span-2">
            For company{" "}
            <span className="text-gray-600">(affiliate or partner — its leads are tracked)</span>
            <input
              value={affiliateCompany}
              onChange={(e) => setAffiliateCompany(e.target.value)}
              placeholder="PT Distributor Nusantara"
              maxLength={120}
              className={`${inputClass} mt-1`}
            />
          </label>

          <label className="text-xs text-gray-400 lg:col-span-2">
            For person <span className="text-gray-600">(optional)</span>
            <input
              value={affiliateName}
              onChange={(e) => setAffiliateName(e.target.value)}
              placeholder="Budi Santoso"
              maxLength={120}
              className={`${inputClass} mt-1`}
            />
          </label>

          <label className="text-xs text-gray-400">
            Discount type
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as "percent" | "fixed_usd")}
              className={`${inputClass} mt-1`}
            >
              <option value="percent" className="bg-[#2a2a27]">
                Percentage (%)
              </option>
              <option value="fixed_usd" className="bg-[#2a2a27]">
                Fixed amount (USD)
              </option>
            </select>
          </label>

          <label className="text-xs text-gray-400">
            {discountType === "percent" ? "Percent off" : "USD off"}
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={discountType === "percent" ? "20" : "5.00"}
              className={`${inputClass} mt-1`}
            />
            {discountType === "percent" && (
              <PresetChips
                options={PERCENT_PRESETS}
                current={discountValue}
                onPick={setDiscountValue}
                suffix="%"
              />
            )}
          </label>

          <label className="text-xs text-gray-400">
            How many codes
            <input
              type="number"
              min="1"
              max="500"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              className={`${inputClass} mt-1`}
            />
            <PresetChips options={COUNT_PRESETS} current={count} onPick={setCount} />
          </label>

          <div className="text-xs text-gray-400 sm:col-span-2 lg:col-span-4">
            Applies to <span className="text-gray-600">(pick one or more)</span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setAppliesTo([])}
                aria-pressed={appliesTo.length === 0}
                className={chipClass(appliesTo.length === 0)}
              >
                All products
              </button>
              <button
                type="button"
                onClick={() => setAppliesTo(SUBSCRIPTION_PRODUCTS)}
                aria-pressed={allSubscriptions}
                className={chipClass(allSubscriptions)}
              >
                All Operating Plans
              </button>
            </div>
            {PRODUCT_GROUPS.map((group) => (
              <div key={group.label} className="mt-3">
                <div className="text-[11px] uppercase tracking-wide text-gray-500">
                  {group.label}
                  {group.hint && (
                    <span className="ml-1 normal-case tracking-normal text-gray-600">
                      — {group.hint}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {group.options.map((o) => {
                    const on = appliesTo.includes(o.value);
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() =>
                          setAppliesTo((cur) =>
                            cur.includes(o.value)
                              ? cur.filter((v) => v !== o.value)
                              : [...cur, o.value]
                          )
                        }
                        aria-pressed={on}
                        className={chipClass(on)}
                      >
                        {on ? "✓ " : ""}
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {countNum === 1 && (
            <label className="text-xs text-gray-400">
              Custom code <span className="text-gray-600">(blank = generated)</span>
              <input
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                placeholder="WELCOME20"
                maxLength={32}
                className={`${inputClass} mt-1 font-mono`}
              />
            </label>
          )}
          {!usesCustomCode && (
            <label className="text-xs text-gray-400">
              Prefix{" "}
              <span className="text-gray-600">
                ({derivedPrefix ? "blank = from affiliate" : "optional"})
              </span>
              <input
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                placeholder={derivedPrefix || "LAUNCH"}
                maxLength={16}
                className={`${inputClass} mt-1 font-mono`}
              />
            </label>
          )}

          <label className="text-xs text-gray-400">
            Max redemptions per code <span className="text-gray-600">(blank = unlimited)</span>
            <input
              type="number"
              min="1"
              value={maxRedemptions}
              onChange={(e) => setMaxRedemptions(e.target.value)}
              className={`${inputClass} mt-1`}
            />
          </label>

          <label className="text-xs text-gray-400">
            Uses per customer
            <input
              type="number"
              min="1"
              value={perUserLimit}
              onChange={(e) => setPerUserLimit(e.target.value)}
              className={`${inputClass} mt-1`}
            />
          </label>

          <label className="text-xs text-gray-400">
            Expires <span className="text-gray-600">(end of day, WIB)</span>
            <input
              type="date"
              value={expiresOn}
              onChange={(e) => setExpiresOn(e.target.value)}
              className={`${inputClass} mt-1`}
            />
          </label>

          <label className="text-xs text-gray-400 lg:col-span-2">
            Campaign <span className="text-gray-600">(groups codes for filtering and export)</span>
            <input
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
              placeholder="october-launch"
              maxLength={64}
              className={`${inputClass} mt-1`}
            />
          </label>

          <label className="text-xs text-gray-400 lg:col-span-2">
            Internal note
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Context for the team"
              maxLength={300}
              className={`${inputClass} mt-1`}
            />
          </label>
        </div>

        {effectivePrefix !== null && (
          <p className="mt-3 text-xs text-gray-500">
            Codes will look like{" "}
            <span className="font-mono text-gray-300">
              {effectivePrefix ? `${effectivePrefix}-` : ""}K7M2Q9XA
            </span>
            {derivedPrefix && !prefix.trim()
              ? " — unique per code, and the prefix shows whose it is."
              : ""}
          </p>
        )}

        {formError && <p className="mt-3 text-xs text-red-300">{formError}</p>}

        <div className="mt-4">
          <button
            type="submit"
            disabled={generating}
            className="rounded-lg bg-[#b7cba6]/20 px-5 py-2 text-sm font-medium text-[#b7cba6] transition-colors hover:bg-[#b7cba6]/30 disabled:opacity-50"
          >
            {generating
              ? "Generating…"
              : countNum === 1
                ? "Create code"
                : `Generate ${countNum} codes`}
          </button>
        </div>

        {generated && generated.length > 0 && (
          <div className="mt-5 rounded-lg border border-[#b7cba6]/30 bg-[#b7cba6]/[0.07] p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-[#b7cba6]">
                {generated.length} code{generated.length === 1 ? "" : "s"} created
              </span>
              <button
                type="button"
                onClick={copyGenerated}
                className="rounded-lg border border-[#b7cba6]/40 px-3 py-1 text-xs text-[#b7cba6] hover:bg-[#b7cba6]/10"
              >
                {copied ? "Copied" : "Copy all"}
              </button>
            </div>
            <pre className="mt-3 max-h-48 overflow-auto font-mono text-xs text-gray-200">
              {generated.join("\n")}
            </pre>
          </div>
        )}
      </form>

      {affiliates.length > 0 && (
        <div className="rounded-xl border border-white/[0.07] bg-[#2a2a27] p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">Affiliate conversion</h2>
            <span className="text-[11px] text-gray-500">
              customers who applied a code → started checkout → paid. Click a row to filter.
            </span>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs text-gray-400">
                  <th className="py-2 pr-3 font-medium">Affiliate</th>
                  <th className="py-2 pr-3 font-medium">Codes</th>
                  <th className="py-2 pr-3 font-medium">Leads → paid</th>
                  <th className="py-2 pr-3 font-medium">Conversion</th>
                  <th className="py-2 pr-3 font-medium">Revenue</th>
                  <th className="py-2 font-medium">Discount given</th>
                </tr>
              </thead>
              <tbody>
                {affiliates.map((a) => (
                  <tr
                    key={a.affiliate}
                    onClick={() =>
                      setAffiliateFilter((cur) => (cur === a.affiliate ? "all" : a.affiliate))
                    }
                    className={`cursor-pointer border-b border-white/5 transition-colors hover:bg-white/5 ${
                      affiliateFilter === a.affiliate ? "bg-[#b7cba6]/[0.07]" : ""
                    }`}
                  >
                    <td className="py-2 pr-3">
                      <div className="text-gray-200">{a.affiliate}</div>
                      {a.company && a.names && (
                        <div className="text-[11px] text-gray-500">{a.names}</div>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-gray-300">{a.codes}</td>
                    <td className="py-2 pr-3">
                      <Funnel
                        applied={a.appliedUsers}
                        checkout={a.checkoutUsers}
                        paid={a.paidUsers}
                      />
                    </td>
                    <td className="py-2 pr-3 text-gray-200">
                      {a.appliedUsers ? percent(a.conversionRate) : "—"}
                    </td>
                    <td className="py-2 pr-3 text-gray-200">{usd(a.revenueUsd)}</td>
                    <td className="py-2 text-gray-400">{usd(a.discountGivenUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {leadsCode && <LeadsModal code={leadsCode} onClose={() => setLeadsCode(null)} />}

      <DataTable<PromoCode>
        columns={columns}
        data={codes}
        isLoading={isLoading}
        searchPlaceholder="Search code, affiliate, campaign or note…"
        onSearch={setSearch}
        filterSlot={filterSlot}
        actionSlot={
          <ExportButton
            href="/admin/api/admin/promo-codes/export"
            params={{
              status: filters.status,
              campaign: filters.campaign,
              affiliate: filters.affiliate,
            }}
            label="Export codes"
            filename="aivory-promo-codes.csv"
            disabled={total === 0}
          />
        }
        page={page}
        totalPages={pages}
        totalCount={total}
        onPageChange={setPage}
        emptyMessage="No promo codes yet. Generate your first batch above."
      />
    </div>
  );
}
