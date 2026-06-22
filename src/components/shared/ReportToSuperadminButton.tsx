"use client";
import { bffFetch } from "@/lib/bff";
import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

interface ReportToSuperadminButtonProps {
  recordType: string;
  recordId: string;
  reportedBy?: string;
}

type SubmitStatus = "idle" | "sending" | "sent" | "error";

export default function ReportToSuperadminButton({
  recordType,
  recordId,
  reportedBy,
}: ReportToSuperadminButtonProps) {
  const { role, user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<SubmitStatus>("idle");

  // Only render for admin role
  if (role !== "admin") return null;

  const handleSubmit = async () => {
    setStatus("sending");
    try {
      const res = await bffFetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordType,
          recordId,
          note: note.trim() || undefined,
          reportedBy: reportedBy ?? user?.email ?? "admin@aivory.id",
        }),
      });

      if (res.ok) {
        setStatus("sent");
        setShowForm(false);
        setNote("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <p className="text-sm text-[#00e59e]">✓ Report sent to superadmin.</p>
    );
  }

  if (!showForm) {
    return (
      <button
        onClick={() => {
          setStatus("idle");
          setShowForm(true);
        }}
        className="w-full rounded-lg border border-white/[0.07] px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors"
      >
        Report to Superadmin
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional: describe the issue..."
        rows={3}
        className="w-full rounded-lg border border-white/[0.07] bg-white/5 px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#00e59e]/50 resize-none"
      />
      {status === "error" && (
        <p className="text-xs text-red-400">
          Failed to send report. Please try again.
        </p>
      )}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={status === "sending"}
          className="flex-1 rounded-lg bg-[#00e59e]/15 px-4 py-2 text-sm font-medium text-[#00e59e] hover:bg-[#00e59e]/25 disabled:opacity-50 transition-colors"
        >
          {status === "sending" ? "Sending..." : "Send Report"}
        </button>
        <button
          onClick={() => {
            setShowForm(false);
            setStatus("idle");
          }}
          className="rounded-lg border border-white/[0.07] px-4 py-2 text-sm text-gray-400 hover:bg-white/5 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
