"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import DataTable, { Column } from "@/components/shared/DataTable";
import ErrorState from "@/components/shared/ErrorState";
import ExportButton from "@/components/shared/ExportButton";
import { bffFetch } from "@/lib/bff";

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
}

type CodeState = "active" | "inactive" | "expired" | "exhausted";

const PAGE_SIZE = 25;

const APPLIES_TO = [
  { value: "", label: "All products" },
  { value: "operational", label: "Operational plan" },
  { value: "business", label: "Business plan" },
  { value: "ai_snapshot", label: "Business Operations Assessment" },
  { value: "ai_blueprint", label: "Transformation Blueprint" },
  { value: "ai_fullstack", label: "Complete Transformation Package" },
  { value: "credits_", label: "Credit packs (all)" },
];

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

  // Generate form
  const [discountType, setDiscountType] = useState<"percent" | "fixed_usd">("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [count, setCount] = useState("1");
  const [customCode, setCustomCode] = useState("");
  const [prefix, setPrefix] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [perUserLimit, setPerUserLimit] = useState("1");
  const [expiresOn, setExpiresOn] = useState("");
  const [appliesTo, setAppliesTo] = useState("");
  const [campaign, setCampaign] = useState("");
  const [note, setNote] = useState("");
  const [generating, setGenerating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);
  const [busyCode, setBusyCode] = useState<string | null>(null);

  const countNum = Math.max(1, parseInt(count, 10) || 1);

  const filters = useMemo(
    () => ({
      search: search || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      campaign: campaignFilter === "all" ? undefined : campaignFilter,
    }),
    [search, statusFilter, campaignFilter]
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

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  // Any filter change invalidates the current page number.
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, campaignFilter]);

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
          code: countNum === 1 ? customCode.trim() || undefined : undefined,
          prefix: countNum > 1 ? prefix.trim() || undefined : undefined,
          maxRedemptions: maxRedemptions ? parseInt(maxRedemptions, 10) : null,
          perUserLimit: parseInt(perUserLimit, 10) || 1,
          // End of the chosen day in Jakarta time, where the customers are.
          expiresAt: expiresOn ? `${expiresOn}T23:59:59+07:00` : null,
          products: appliesTo ? [appliesTo] : null,
          campaign: campaign.trim() || undefined,
          note: note.trim() || undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Failed to generate promo codes");

      setGenerated(data.codes ?? []);
      setCopied(false);
      setCustomCode("");
      setPage(1);
      await fetchCodes();
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
            ? row.products.map((p) => p.replace(/_/g, " ").trim()).join(", ")
            : "All products"}
        </span>
      ),
    },
    {
      key: "redeemed",
      header: "Used",
      width: "120px",
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
      width: "110px",
      render: (row) => (
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

          <label className="text-xs text-gray-400">
            Applies to
            <select
              value={appliesTo}
              onChange={(e) => setAppliesTo(e.target.value)}
              className={`${inputClass} mt-1`}
            >
              {APPLIES_TO.map((o) => (
                <option key={o.value} value={o.value} className="bg-[#2a2a27]">
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          {countNum === 1 ? (
            <label className="text-xs text-gray-400">
              Custom code <span className="text-gray-600">(blank = random)</span>
              <input
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                placeholder="WELCOME20"
                maxLength={32}
                className={`${inputClass} mt-1 font-mono`}
              />
            </label>
          ) : (
            <label className="text-xs text-gray-400">
              Prefix <span className="text-gray-600">(optional)</span>
              <input
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                placeholder="LAUNCH"
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
              placeholder="Who this is for, or why"
              maxLength={300}
              className={`${inputClass} mt-1`}
            />
          </label>
        </div>

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

      <DataTable<PromoCode>
        columns={columns}
        data={codes}
        isLoading={isLoading}
        searchPlaceholder="Search code, campaign or note…"
        onSearch={setSearch}
        filterSlot={filterSlot}
        actionSlot={
          <ExportButton
            href="/admin/api/admin/promo-codes/export"
            params={{ status: filters.status, campaign: filters.campaign }}
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
