"use client";
import React, { useState, useEffect, useCallback } from "react";
import DataTable, { Column } from "@/components/shared/DataTable";
import DetailView from "@/components/shared/DetailView";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import ErrorState from "@/components/shared/ErrorState";
import WriteGate from "@/components/rbac/WriteGate";

interface Payment extends Record<string, unknown> {
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

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

const PRODUCT_OPTIONS = [
  { value: "all", label: "All Products" },
  { value: "ai_snapshot", label: "AI Snapshot" },
  { value: "ai_blueprint", label: "AI Blueprint" },
  { value: "subscription", label: "Subscription" },
  { value: "credits", label: "Credits" },
];

const columns: Column<Payment>[] = [
  { key: "paymentId", header: "Payment ID", width: "140px" },
  { key: "orderId", header: "Order ID", width: "140px" },
  { key: "email", header: "Email" },
  {
    key: "product",
    header: "Product",
    width: "130px",
    render: (row) => (
      <span className="capitalize">{row.product.replace("ai_", "")}</span>
    ),
  },
  {
    key: "amount",
    header: "Amount",
    width: "100px",
    render: (row) => `$${row.amount.toFixed(2)}`,
  },
  {
    key: "status",
    header: "Status",
    width: "110px",
    render: (row) => (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
          row.status === "paid"
            ? "bg-[#00e59e]/20 text-[#00e59e]"
            : row.status === "failed"
            ? "bg-red-500/20 text-red-400"
            : row.status === "refunded"
            ? "bg-gray-500/20 text-gray-400"
            : "bg-yellow-500/20 text-yellow-400"
        }`}
      >
        {row.status}
      </span>
    ),
  },
  {
    key: "paymentMethod",
    header: "Method",
    width: "100px",
    render: (row) => (
      <span className="capitalize">{row.paymentMethod}</span>
    ),
  },
  {
    key: "createdAt",
    header: "Date",
    width: "140px",
    render: (row) => new Date(row.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
  },
];

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [emailSearch, setEmailSearch] = useState("");

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/admin/api/admin/payments");
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = "/admin/signin";
          return;
        }
        throw new Error(`Failed to load payments (${res.status})`);
      }
      const data = await res.json();
      setPayments(data.payments ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payments");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const filteredPayments = payments.filter((p) => {
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const matchesProduct = productFilter === "all" || p.product === productFilter;
    const matchesEmail = emailSearch === "" || p.email.toLowerCase().includes(emailSearch.toLowerCase());
    return matchesStatus && matchesProduct && matchesEmail;
  });

  const detailData = selectedPayment
    ? {
        "Payment ID": selectedPayment.paymentId,
        "Order ID": selectedPayment.orderId,
        "User ID": selectedPayment.userId,
        Email: selectedPayment.email,
        Product: selectedPayment.product,
        Amount: `$${selectedPayment.amount.toFixed(2)}`,
        Status: selectedPayment.status,
        "Payment Method": selectedPayment.paymentMethod,
        "Created At": new Date(selectedPayment.createdAt).toLocaleString(),
      }
    : {};

  const handleRecordManualPayment = () => {
    const userId = prompt("Enter User ID:");
    if (!userId) return;

    const amountInput = prompt("Enter Amount (USD):");
    if (!amountInput) return;

    const amount = parseFloat(amountInput);
    if (isNaN(amount) || amount <= 0) {
      alert("Invalid amount");
      return;
    }

    const product = prompt("Enter Product (ai_snapshot, ai_blueprint, subscription, credits):", "ai_blueprint");
    if (!product) return;

    const paymentMethod = prompt("Enter Payment Method:", "manual");

    fetch("/admin/api/admin/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        amount,
        paymentMethod,
        product,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          alert("Payment recorded successfully!");
          fetchPayments();
        } else {
          alert(`Failed: ${data.detail || "Unknown error"}`);
        }
      })
      .catch((err) => alert(`Error: ${err.message}`));
  };

  if (isLoading) return <LoadingSkeleton rows={8} />;
  if (error) return <ErrorState message={error} onRetry={fetchPayments} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Payments</h1>
        <WriteGate>
          <button
            onClick={handleRecordManualPayment}
            className="rounded-lg bg-[#00e59e]/15 px-4 py-2 text-sm font-medium text-[#00e59e] hover:bg-[#00e59e]/25 transition-colors"
          >
            Record Manual Payment
          </button>
        </WriteGate>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-white/[0.07] bg-[#2a2a27] px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#00e59e]/50"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          className="rounded-lg border border-white/[0.07] bg-[#2a2a27] px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#00e59e]/50"
        >
          {PRODUCT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filteredPayments}
        onRowClick={(row) => setSelectedPayment(row)}
        searchPlaceholder="Search by email..."
        onSearch={setEmailSearch}
        emptyMessage="No payments found."
      />

      {selectedPayment && (
        <DetailView
          title={`Payment: ${selectedPayment.paymentId}`}
          recordType="user"
          recordId={selectedPayment.paymentId}
          data={detailData as Record<string, unknown>}
          onClose={() => setSelectedPayment(null)}
        />
      )}
    </div>
  );
}
