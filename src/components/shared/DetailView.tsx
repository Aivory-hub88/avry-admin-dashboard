"use client";
import { bffFetch } from "@/lib/bff";
import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export type RecordType = "user" | "agent" | "workflow" | "log" | "integration" | "diagnostic" | "blueprint" | "roadmap" | "impersonation_session";

interface DetailViewProps {
  title: string;
  recordType: RecordType;
  recordId: string;
  data: Record<string, unknown>;
  onClose: () => void;
}

export default function DetailView({ title, recordType, recordId, data, onClose }: DetailViewProps) {
  const { role, user } = useAuth();
  const [reportNote, setReportNote] = useState("");
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportStatus, setReportStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleReport = async () => {
    setReportStatus("sending");
    try {
      const res = await bffFetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordType,
          recordId,
          note: reportNote || undefined,
          reportedBy: user?.email,
        }),
      });
      if (res.ok) {
        setReportStatus("sent");
        setShowReportForm(false);
        setReportNote("");
      } else {
        setReportStatus("error");
      }
    } catch {
      setReportStatus("error");
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-[640px] bg-[#2a2a27] border-l border-white/[0.07] z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07]">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
            aria-label="Close panel"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <dl className="space-y-4">
            {Object.entries(data).map(([key, value]) => (
              <div key={key} className="grid grid-cols-3 gap-4">
                <dt className="text-xs font-medium uppercase tracking-wider text-gray-500 col-span-1 pt-0.5">
                  {key.replace(/_/g, " ")}
                </dt>
                <dd className="col-span-2 text-sm text-gray-200 break-all">
                  {value === null || value === undefined ? (
                    <span className="text-gray-600">—</span>
                  ) : typeof value === "object" ? (
                    <pre className="text-xs bg-white/5 rounded p-2 overflow-x-auto">
                      {JSON.stringify(value, null, 2)}
                    </pre>
                  ) : (
                    String(value)
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Footer — Report to Superadmin (admin only) */}
        {role === "admin" && (
          <div className="px-6 py-4 border-t border-white/[0.07]">
            {reportStatus === "sent" ? (
              <p className="text-sm text-[#b7cba6]">✓ Report sent to superadmin.</p>
            ) : (
              <>
                {!showReportForm ? (
                  <button
                    onClick={() => setShowReportForm(true)}
                    className="w-full rounded-lg border border-white/[0.07] px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors"
                  >
                    Report to Superadmin
                  </button>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      value={reportNote}
                      onChange={(e) => setReportNote(e.target.value)}
                      placeholder="Optional: describe the issue..."
                      rows={3}
                      className="w-full rounded-lg border border-white/[0.07] bg-white/5 px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#b7cba6]/50 resize-none"
                    />
                    {reportStatus === "error" && (
                      <p className="text-xs text-red-400">
                        Failed to send report. Please try again.
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={handleReport}
                        disabled={reportStatus === "sending"}
                        className="flex-1 rounded-lg bg-[#b7cba6]/15 px-4 py-2 text-sm font-medium text-[#b7cba6] hover:bg-[#b7cba6]/25 disabled:opacity-50 transition-colors"
                      >
                        {reportStatus === "sending" ? "Sending..." : "Send Report"}
                      </button>
                      <button
                        onClick={() => {
                          setShowReportForm(false);
                          setReportStatus("idle");
                        }}
                        className="rounded-lg border border-white/[0.07] px-4 py-2 text-sm text-gray-400 hover:bg-white/5 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
