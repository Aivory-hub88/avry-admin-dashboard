"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import DataTable, { Column, SortDirection } from "@/components/shared/DataTable";
import DetailView from "@/components/shared/DetailView";
import ErrorState from "@/components/shared/ErrorState";
import ExportButton from "@/components/shared/ExportButton";
import { bffFetch } from "@/lib/bff";

/**
 * The payment ledger.
 *
 * Filtering, sorting and paging are all server-side: the table asks for one page
 * at a time so it stays responsive as the ledger grows, and sorting applies
 * across the whole result set rather than reordering the rows on screen.
 */

interface Payment extends Record<string, unknown> {
  orderId: string;
  paymentId: string;
  userId: string;
  email: string;
  product: string;
  amount: number;
  amountIdr: number | null;
  usdIdrRate: number | null;
  status: string;
  paymentMethod: string;
  paymentType: string;
  transactionStatus: string;
  transactionId: string;
  fraudStatus: string;
  isMock: boolean;
  grantedAt: string | null;
  grantError: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Summary {
  orders: number;
  paid: number;
  pending: number;
  awaitingVerification: number;
  problem: number;
  revenueUsd: number;
  revenueIdr: number;
  paidWithoutIdr: number;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "awaiting_verification", label: "Awaiting verification (manual)" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "rejected", label: "Rejected" },
  { value: "amount_mismatch", label: "Amount mismatch" },
  { value: "paid_grant_failed", label: "Paid, grant failed" },
];

const PRODUCT_OPTIONS = [
  { value: "all", label: "All Products" },
  { value: "ai_snapshot", label: "AI Snapshot" },
  { value: "ai_blueprint", label: "AI Blueprint" },
  { value: "credits", label: "Credits (all packs)" },
  { value: "foundation", label: "Foundation" },
  { value: "acceleration", label: "Acceleration" },
  { value: "intelligence", label: "Intelligence" },
  { value: "wallet_topup", label: "Wallet top-up" },
];

const PAGE_SIZE = 25;

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-[#b7cba6]/20 text-[#b7cba6]",
  pending: "bg-yellow-500/20 text-yellow-400",
  awaiting_verification: "bg-blue-500/20 text-blue-300",
  rejected: "bg-gray-500/20 text-gray-300",
  failed: "bg-red-500/20 text-red-400",
  amount_mismatch: "bg-red-500/30 text-red-300",
  paid_grant_failed: "bg-orange-500/20 text-orange-300",
};

const formatIdr = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : `Rp ${value.toLocaleString("id-ID")}`;

const formatDateTime = (value: string | null | undefined) =>
  value ? value.slice(0, 19).replace("T", " ") : "—";

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const [statusFilter, setStatusFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [includeMock, setIncludeMock] = useState(false);
  // Manual-payment decision state, keyed to the order open in the detail panel.
  const [decision, setDecision] = useState<{
    busy: boolean;
    error: string | null;
    reason: string;
  }>({ busy: false, error: null, reason: "" });
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Shared by the table query and the CSV export, so an export can never
  // disagree with what is on screen.
  const filters = useMemo(
    () => ({
      status: statusFilter === "all" ? undefined : statusFilter,
      product: productFilter === "all" ? undefined : productFilter,
      search: search || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      include_mock: includeMock,
      sort_by: sortBy,
      sort_dir: sortDir,
    }),
    [statusFilter, productFilter, search, dateFrom, dateTo, includeMock, sortBy, sortDir]
  );

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      Object.entries({ ...filters, page, page_size: PAGE_SIZE }).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") query.set(k, String(v));
      });

      const response = await bffFetch(`/api/admin/payments/orders?${query.toString()}`);
      if (!response.ok) throw new Error(`Failed to load payments (${response.status})`);
      const data = await response.json();

      setPayments(Array.isArray(data.payments) ? data.payments : []);
      setPages(data.pages ?? 1);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payments");
      setPayments([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters, page]);

  const fetchSummary = useCallback(async () => {
    try {
      const response = await bffFetch(
        `/api/admin/payments/summary?include_mock=${includeMock}`
      );
      if (response.ok) setSummary(await response.json());
    } catch {
      // A missing summary must not block the table.
    }
  }, [includeMock]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Any filter change invalidates the current page number.
  useEffect(() => {
    setPage(1);
  }, [statusFilter, productFilter, search, dateFrom, dateTo, includeMock]);

  /**
   * Approve or reject the manual payment open in the detail panel.
   *
   * Approving is what grants the entitlement, so the panel closes and the ledger
   * is re-read afterwards rather than optimistically restyling the row.
   */
  const decideManual = async (orderId: string, action: "approve" | "reject") => {
    if (action === "reject" && !decision.reason.trim()) {
      setDecision((d) => ({ ...d, error: "A reason is required to reject." }));
      return;
    }
    setDecision((d) => ({ ...d, busy: true, error: null }));
    try {
      const response = await bffFetch(
        `/api/admin/payments/manual/${encodeURIComponent(orderId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, reason: decision.reason || undefined }),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.detail || `Could not ${action} this payment`);
      }
      setSelectedPayment(null);
      setDecision({ busy: false, error: null, reason: "" });
      await Promise.all([fetchPayments(), fetchSummary()]);
    } catch (err) {
      setDecision((d) => ({
        ...d,
        busy: false,
        error: err instanceof Error ? err.message : `Could not ${action} this payment`,
      }));
    }
  };

  const columns: Column<Payment>[] = [
    {
      key: "createdAt",
      header: "Date",
      width: "160px",
      sortable: true,
      sortKey: "created_at",
      render: (row) => (
        <span className="whitespace-nowrap text-gray-300">
          {formatDateTime(row.createdAt)}
        </span>
      ),
    },
    {
      key: "email",
      header: "Customer",
      sortable: true,
      sortKey: "email",
      render: (row) => (
        <div className="min-w-0">
          <div className="truncate text-gray-200">{row.email || "—"}</div>
          <div className="truncate font-mono text-[11px] text-gray-500">{row.userId}</div>
        </div>
      ),
    },
    {
      key: "product",
      header: "Product",
      width: "150px",
      sortable: true,
      sortKey: "product",
      render: (row) => <span className="capitalize">{row.product.replace(/_/g, " ")}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      width: "150px",
      sortable: true,
      sortKey: "amount",
      render: (row) => (
        <div className="whitespace-nowrap">
          <div className="font-medium text-gray-100">{formatIdr(row.amountIdr)}</div>
          <div className="text-[11px] text-gray-500">${row.amount.toFixed(2)}</div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "130px",
      sortable: true,
      sortKey: "status",
      render: (row) => (
        <span className="inline-flex flex-col gap-1">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
              STATUS_STYLES[row.status] ?? "bg-white/10 text-gray-300"
            }`}
          >
            {row.status.replace(/_/g, " ")}
          </span>
          {row.isMock && (
            <span className="text-[10px] uppercase tracking-wide text-gray-500">mock</span>
          )}
        </span>
      ),
    },
    {
      key: "paymentType",
      header: "Method",
      width: "120px",
      sortable: true,
      sortKey: "payment_type",
      render: (row) => (
        <span className="capitalize text-gray-400">
          {(row.paymentType || row.paymentMethod).replace(/_/g, " ")}
        </span>
      ),
    },
  ];

  const filterSlot = (
    <>
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        aria-label="Filter by status"
        className="rounded-lg border border-white/[0.07] bg-white/5 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#b7cba6]/50"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#2a2a27]">
            {o.label}
          </option>
        ))}
      </select>
      <select
        value={productFilter}
        onChange={(e) => setProductFilter(e.target.value)}
        aria-label="Filter by product"
        className="rounded-lg border border-white/[0.07] bg-white/5 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#b7cba6]/50"
      >
        {PRODUCT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#2a2a27]">
            {o.label}
          </option>
        ))}
      </select>
      <input
        type="date"
        value={dateFrom}
        onChange={(e) => setDateFrom(e.target.value)}
        aria-label="From date"
        className="rounded-lg border border-white/[0.07] bg-white/5 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#b7cba6]/50"
      />
      <input
        type="date"
        value={dateTo}
        onChange={(e) => setDateTo(e.target.value)}
        aria-label="To date"
        className="rounded-lg border border-white/[0.07] bg-white/5 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#b7cba6]/50"
      />
      <label className="flex items-center gap-2 text-xs text-gray-400">
        <input
          type="checkbox"
          checked={includeMock}
          onChange={(e) => setIncludeMock(e.target.checked)}
          className="rounded border-white/20 bg-white/5"
        />
        Include mock/test
      </label>
    </>
  );

  if (error && payments.length === 0 && !isLoading) {
    return <ErrorState message={error} onRetry={fetchPayments} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Payments</h1>
        <p className="mt-1 text-sm text-gray-400">
          Every Midtrans order, with the exchange rate it was charged at.
        </p>
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <SummaryCard label="Orders" value={summary.orders.toLocaleString()} />
          <SummaryCard label="Paid" value={summary.paid.toLocaleString()} tone="good" />
          <SummaryCard
            label="Pending"
            value={summary.pending.toLocaleString()}
            sub={
              summary.awaitingVerification > 0
                ? `+ ${summary.awaitingVerification} manual awaiting review`
                : undefined
            }
            tone="warn"
          />
          <SummaryCard
            label="Revenue"
            value={formatIdr(summary.revenueIdr)}
            sub={
              summary.paidWithoutIdr > 0
                ? `excludes ${summary.paidWithoutIdr} legacy order(s) with no IDR recorded`
                : `$${summary.revenueUsd.toFixed(2)}`
            }
            tone="good"
          />
        </div>
      )}

      {summary && summary.awaitingVerification > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-200">
          <span>
            {summary.awaitingVerification} manual payment(s) awaiting verification.
            They grant nothing until approved.
          </span>
          <button
            onClick={() => setStatusFilter("awaiting_verification")}
            className="whitespace-nowrap rounded-lg border border-blue-400/40 px-3 py-1.5 text-xs font-medium text-blue-100 transition-colors hover:bg-blue-400/10"
          >
            Review queue
          </button>
        </div>
      )}

      {summary && summary.problem > 0 && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {summary.problem} order(s) need attention — filter by{" "}
          <span className="font-medium">Amount mismatch</span> or{" "}
          <span className="font-medium">Paid, grant failed</span>.
        </div>
      )}

      <DataTable<Payment>
        columns={columns}
        data={payments}
        isLoading={isLoading}
        onRowClick={setSelectedPayment}
        searchPlaceholder="Search order, payment id, user or email…"
        onSearch={setSearch}
        filterSlot={filterSlot}
        actionSlot={
          <ExportButton
            href="/admin/api/admin/payments/orders/export"
            params={filters}
            label="Export payments"
            disabled={total === 0}
          />
        }
        sort={{ by: sortBy, dir: sortDir }}
        onSortChange={(by, dir) => {
          setSortBy(by);
          setSortDir(dir);
          setPage(1);
        }}
        page={page}
        totalPages={pages}
        totalCount={total}
        onPageChange={setPage}
        emptyMessage="No payments match these filters."
      />

      {selectedPayment && (
        <DetailView
          title={`Order ${selectedPayment.orderId}`}
          recordType="payment"
          recordId={selectedPayment.paymentId}
          onClose={() => {
            setSelectedPayment(null);
            setDecision({ busy: false, error: null, reason: "" });
          }}
          actions={
            selectedPayment.status === "awaiting_verification" &&
            selectedPayment.paymentMethod?.startsWith("manual") ? (
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/[0.07] p-4">
                <h3 className="text-sm font-semibold text-blue-100">
                  Manual payment — verify before approving
                </h3>
                <p className="mt-1 text-xs text-blue-200/80">
                  Match the customer&apos;s reference{" "}
                  <span className="font-mono">
                    {selectedPayment.transactionId || "—"}
                  </span>{" "}
                  against the bank statement. Approving grants the entitlement
                  immediately and cannot be undone from here — use a refund instead.
                </p>
                <textarea
                  value={decision.reason}
                  onChange={(e) =>
                    setDecision((d) => ({ ...d, reason: e.target.value, error: null }))
                  }
                  rows={2}
                  placeholder="Note (required to reject, optional to approve)…"
                  className="mt-3 w-full resize-none rounded-lg border border-white/[0.07] bg-white/5 px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#b7cba6]/50"
                />
                {decision.error && (
                  <p className="mt-2 text-xs text-red-300">{decision.error}</p>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => decideManual(selectedPayment.orderId, "approve")}
                    disabled={decision.busy}
                    className="flex-1 rounded-lg bg-[#b7cba6]/20 px-4 py-2 text-sm font-medium text-[#b7cba6] transition-colors hover:bg-[#b7cba6]/30 disabled:opacity-50"
                  >
                    {decision.busy ? "Working…" : "Approve & grant"}
                  </button>
                  <button
                    onClick={() => decideManual(selectedPayment.orderId, "reject")}
                    disabled={decision.busy}
                    className="rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ) : undefined
          }
          data={{
            "Order ID": selectedPayment.orderId,
            "Payment ID": selectedPayment.paymentId,
            User: selectedPayment.userId,
            Email: selectedPayment.email || "—",
            Product: selectedPayment.product,
            "Amount (IDR)": formatIdr(selectedPayment.amountIdr),
            "Amount (USD)": `$${selectedPayment.amount.toFixed(2)}`,
            "Rate charged": selectedPayment.usdIdrRate
              ? `1 USD = Rp ${selectedPayment.usdIdrRate.toLocaleString("id-ID")}`
              : "—",
            Status: selectedPayment.status,
            "Transaction / reference": selectedPayment.transactionId || "—",
            "Midtrans status": selectedPayment.transactionStatus || "—",
            "Fraud status": selectedPayment.fraudStatus || "—",
            Method: selectedPayment.paymentType || selectedPayment.paymentMethod,
            "Mock / test": selectedPayment.isMock ? "yes" : "no",
            "Entitlement granted": formatDateTime(selectedPayment.grantedAt),
            ...(selectedPayment.grantError
              ? { "Grant error": selectedPayment.grantError }
              : {}),
            Created: formatDateTime(selectedPayment.createdAt),
            Updated: formatDateTime(selectedPayment.updatedAt),
          }}
        />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "good" | "warn";
}) {
  const accent =
    tone === "good" ? "text-[#b7cba6]" : tone === "warn" ? "text-yellow-400" : "text-white";
  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#2a2a27] p-4">
      <div className="text-xs uppercase tracking-wider text-gray-500">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${accent}`}>{value}</div>
      {sub && <div className="mt-1 text-[11px] text-gray-500">{sub}</div>}
    </div>
  );
}
