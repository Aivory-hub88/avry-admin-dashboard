"use client";
import React, { useEffect, useState, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";
import { Modal } from "../ui/modal";
import { useModal } from "@/hooks/useModal";
import { getCookie } from "@/lib/cookies";

const CAREERS_SERVICE_URL =
  "";

interface Vacancy {
  id: string;
  title: string;
  status: "draft" | "open" | "closed";
  posted_at: string | null;
  department?: string;
  location?: string;
  employment_type?: string;
}

interface VacancyListProps {
  onEdit?: (vacancy: Vacancy) => void;
}

function getStatusBadgeColor(
  status: Vacancy["status"]
): "light" | "success" | "error" {
  switch (status) {
    case "draft":
      return "light";
    case "open":
      return "success";
    case "closed":
      return "error";
    default:
      return "light";
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function VacancyList({ onEdit }: VacancyListProps) {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [closingVacancy, setClosingVacancy] = useState<Vacancy | null>(null);
  const { isOpen: isConfirmOpen, openModal: openConfirm, closeModal: closeConfirm } = useModal();

  const fetchVacancies = useCallback(async () => {
    try {
      setError(null);
      const token = getCookie("aivory_access_token");
      const res = await fetch(`/admin/api/admin/careers/vacancies`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch vacancies (${res.status})`);
      }

      const data = await res.json();
      setVacancies(Array.isArray(data) ? data : data.vacancies ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vacancies");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVacancies();
  }, [fetchVacancies]);

  const updateVacancyStatus = async (vacancy: Vacancy, newStatus: "open" | "closed") => {
    setTogglingId(vacancy.id);

    try {
      const token = getCookie("aivory_access_token");
      const res = await fetch(
        `/admin/api/admin/careers/vacancies/${vacancy.id}/status`,
        {
          method: "PATCH",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!res.ok) {
        throw new Error(`Failed to update status (${res.status})`);
      }

      setVacancies((prev) =>
        prev.map((v) => (v.id === vacancy.id ? { ...v, status: newStatus } : v))
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update vacancy status"
      );
    } finally {
      setTogglingId(null);
    }
  };

  const handleCloseClick = (vacancy: Vacancy) => {
    setClosingVacancy(vacancy);
    openConfirm();
  };

  const handleConfirmClose = async () => {
    if (closingVacancy) {
      closeConfirm();
      await updateVacancyStatus(closingVacancy, "closed");
      setClosingVacancy(null);
    }
  };

  const handleCancelClose = () => {
    closeConfirm();
    setClosingVacancy(null);
  };

  const handleReopenClick = (vacancy: Vacancy) => {
    updateVacancyStatus(vacancy, "open");
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-white/[0.07] bg-[#2a2a27] p-6">
        <p className="text-sm text-gray-400">Loading vacancies...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-white/[0.07] bg-[#2a2a27] p-6">
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            fetchVacancies();
          }}
          className="mt-3 text-sm text-[#00e59e] hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (vacancies.length === 0) {
    return (
      <div className="rounded-lg border border-white/[0.07] bg-[#2a2a27] p-6">
        <h2 className="text-lg font-medium text-white mb-2">
          Manage Vacancies
        </h2>
        <p className="text-sm text-gray-400">
          No vacancies found. Create one from the &quot;Create Vacancy&quot; tab.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-white/[0.05] bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-[700px]">
            <Table>
              <TableHeader className="border-b border-white/[0.05]">
                <TableRow>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-400 text-start text-theme-xs"
                  >
                    Title
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-400 text-start text-theme-xs"
                  >
                    Status
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-400 text-start text-theme-xs"
                  >
                    Posted At
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-400 text-start text-theme-xs"
                  >
                    Actions
                  </TableCell>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-white/[0.05]">
                {vacancies.map((vacancy) => (
                  <TableRow key={vacancy.id}>
                    <TableCell className="px-5 py-4 text-start">
                      <span className="font-medium text-white/90 text-theme-sm">
                        {vacancy.title}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-start">
                      <Badge size="sm" color={getStatusBadgeColor(vacancy.status)}>
                        {vacancy.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-gray-400 text-start text-theme-sm">
                      {formatDate(vacancy.posted_at)}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-start">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onEdit?.(vacancy)}
                          className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium text-white/80 ring-1 ring-inset ring-white/[0.12] hover:bg-white/[0.05] hover:text-white transition"
                        >
                          Edit
                        </button>
                        {vacancy.status === "open" && (
                          <button
                            onClick={() => handleCloseClick(vacancy)}
                            disabled={togglingId === vacancy.id}
                            className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-400/30 hover:bg-red-400/10 transition disabled:opacity-50"
                          >
                            {togglingId === vacancy.id ? "Closing..." : "Close"}
                          </button>
                        )}
                        {vacancy.status === "closed" && (
                          <button
                            onClick={() => handleReopenClick(vacancy)}
                            disabled={togglingId === vacancy.id}
                            className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium text-[#00e59e] ring-1 ring-inset ring-[#00e59e]/30 hover:bg-[#00e59e]/10 transition disabled:opacity-50"
                          >
                            {togglingId === vacancy.id ? "Reopening..." : "Reopen"}
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Close vacancy confirmation dialog */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={handleCancelClose}
        className="max-w-[440px] p-6"
      >
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
            <svg
              className="h-6 w-6 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>
          <h4 className="mb-2 text-lg font-semibold text-white">
            Close Vacancy
          </h4>
          <p className="text-sm text-gray-400 leading-relaxed">
            Are you sure you want to close{" "}
            <span className="font-medium text-white/80">
              &ldquo;{closingVacancy?.title}&rdquo;
            </span>
            ? This will remove it from the public careers page. You can reopen it
            later.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={handleCancelClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 ring-1 ring-inset ring-white/[0.12] hover:bg-white/[0.05] hover:text-white transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmClose}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition"
            >
              Close Vacancy
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
