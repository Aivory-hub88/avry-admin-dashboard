"use client";
import React, { useEffect, useState, useCallback } from "react";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  Mail,
  Tag,
  Plus,
  X,
  Loader2,
  Send,
} from "lucide-react";
import { getCookie } from "@/lib/cookies";

// --- Types ---

interface Application {
  id: string;
  full_name: string;
  submitted_at: string;
  status: "submitted" | "shortlisted" | "rejected";
  tags: string[];
}

interface VacancyGroup {
  vacancy_id: string;
  vacancy_title: string;
  applications: Application[];
}

// --- Helpers ---

const CAREERS_SERVICE_URL =
  "";

async function fetchWithAuth(path: string, options: RequestInit = {}) {
  const token = getCookie("aivory_access_token");
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (!headers["Content-Type"] && options.method && options.method !== "GET") {
    headers["Content-Type"] = "application/json";
  }
  return fetch(`/admin/api/admin/careers${path}`, { ...options, headers });
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

// --- Sub-components ---

function StatusBadge({ status }: { status: Application["status"] }) {
  const config: Record<
    Application["status"],
    { label: string; className: string }
  > = {
    submitted: {
      label: "Submitted",
      className: "bg-gray-500/15 text-gray-400",
    },
    shortlisted: {
      label: "Shortlisted",
      className: "bg-green-500/15 text-green-400",
    },
    rejected: {
      label: "Rejected",
      className: "bg-red-500/15 text-red-400",
    },
  };

  const { label, className } = config[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

function TagList({
  tags,
  appId,
  onTagAdded,
}: {
  tags: string[];
  appId: string;
  onTagAdded: (appId: string, tag: string) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAddTag = async () => {
    const trimmed = newTag.trim();
    if (!trimmed) return;

    setSaving(true);
    try {
      const res = await fetchWithAuth(`/applications/${appId}/tags`, {
        method: "POST",
        body: JSON.stringify({ tag: trimmed }),
      });
      if (!res.ok) {
        throw new Error("Failed to add tag");
      }
      onTagAdded(appId, trimmed);
      setNewTag("");
      setIsAdding(false);
    } catch {
      // Silently fail — keep the input so user can retry
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === "Escape") {
      setIsAdding(false);
      setNewTag("");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded bg-white/[0.07] px-2 py-0.5 text-xs text-gray-300"
        >
          <Tag size={10} />
          {tag}
        </span>
      ))}
      {isAdding ? (
        <div className="inline-flex items-center gap-1">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tag name..."
            className="w-24 rounded border border-white/10 bg-white/[0.05] px-2 py-0.5 text-xs text-white placeholder-gray-500 focus:border-[#00e59e]/50 focus:outline-none"
            autoFocus
            disabled={saving}
          />
          <button
            onClick={handleAddTag}
            disabled={saving || !newTag.trim()}
            className="rounded p-0.5 text-green-400 hover:bg-green-500/10 disabled:opacity-50"
            title="Save tag"
          >
            {saving ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <CheckCircle size={12} />
            )}
          </button>
          <button
            onClick={() => {
              setIsAdding(false);
              setNewTag("");
            }}
            className="rounded p-0.5 text-gray-400 hover:bg-white/[0.07]"
            title="Cancel"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs text-gray-500 hover:bg-white/[0.05] hover:text-gray-300 transition-colors"
          title="Add tag"
        >
          <Plus size={10} />
          Tag
        </button>
      )}
    </div>
  );
}

function EmailDialog({
  appId,
  applicantName,
  onClose,
  onSent,
}: {
  appId: string;
  applicantName: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) return;

    setSending(true);
    setError("");
    try {
      const res = await fetchWithAuth(`/applications/${appId}/email`, {
        method: "POST",
        body: JSON.stringify({ subject: subject.trim(), body: body.trim() }),
      });
      if (!res.ok) {
        throw new Error(`Failed to send email (${res.status})`);
      }
      onSent();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-lg rounded-lg border border-white/[0.1] bg-[#1e1e1c] p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-medium text-white">
            Email to {applicantName}
          </h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-white/[0.07] hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-gray-400">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject..."
              className="w-full rounded border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#00e59e]/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
              rows={6}
              className="w-full rounded border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#00e59e]/50 focus:outline-none resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="rounded px-3 py-1.5 text-xs font-medium text-gray-400 hover:bg-white/[0.07] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !subject.trim() || !body.trim()}
              className="inline-flex items-center gap-1.5 rounded bg-[#00e59e]/15 px-3 py-1.5 text-xs font-medium text-[#00e59e] hover:bg-[#00e59e]/25 transition-colors disabled:opacity-50"
            >
              {sending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Send size={12} />
              )}
              Send Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main Component ---

export default function ApplicationList() {
  const [groups, setGroups] = useState<VacancyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedVacancies, setExpandedVacancies] = useState<Set<string>>(
    new Set()
  );
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [emailTarget, setEmailTarget] = useState<{
    appId: string;
    name: string;
  } | null>(null);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchWithAuth("/applications");
      if (!res.ok) {
        throw new Error(`Failed to fetch applications (${res.status})`);
      }
      const data: VacancyGroup[] = await res.json();
      setGroups(data);
      // Auto-expand all groups on initial load
      setExpandedVacancies(new Set(data.map((g) => g.vacancy_id)));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load applications"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const toggleGroup = (vacancyId: string) => {
    setExpandedVacancies((prev) => {
      const next = new Set(prev);
      if (next.has(vacancyId)) {
        next.delete(vacancyId);
      } else {
        next.add(vacancyId);
      }
      return next;
    });
  };

  const handleStatusChange = async (
    appId: string,
    newStatus: "shortlisted" | "rejected"
  ) => {
    setActionLoading(appId);
    try {
      const res = await fetchWithAuth(
        `/admin/api/admin/careers/applications/${appId}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: newStatus }),
        }
      );
      if (!res.ok) {
        throw new Error(`Failed to update status (${res.status})`);
      }
      // Update local state
      setGroups((prev) =>
        prev.map((group) => ({
          ...group,
          applications: group.applications.map((app) =>
            app.id === appId ? { ...app, status: newStatus } : app
          ),
        }))
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update status"
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleTagAdded = (appId: string, tag: string) => {
    setGroups((prev) =>
      prev.map((group) => ({
        ...group,
        applications: group.applications.map((app) =>
          app.id === appId
            ? { ...app, tags: [...app.tags, tag] }
            : app
        ),
      }))
    );
  };

  // --- Render ---

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-400">Loading applications...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={fetchApplications}
          className="mt-2 text-xs text-red-300 underline hover:text-red-200"
        >
          Try again
        </button>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-white/[0.07] bg-[#2a2a27] p-8 text-center">
        <p className="text-sm text-gray-400">
          No applications received yet. Applications will appear here once
          candidates submit them.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {groups.map((group) => {
          const isExpanded = expandedVacancies.has(group.vacancy_id);
          return (
            <div
              key={group.vacancy_id}
              className="rounded-lg border border-white/[0.07] bg-[#2a2a27] overflow-hidden"
            >
              {/* Vacancy group header */}
              <button
                onClick={() => toggleGroup(group.vacancy_id)}
                className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-white/[0.03] transition-colors"
                aria-expanded={isExpanded}
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown size={18} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={18} className="text-gray-400" />
                  )}
                  <h3 className="text-sm font-medium text-white">
                    {group.vacancy_title}
                  </h3>
                  <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-xs text-gray-400">
                    {group.applications.length} application
                    {group.applications.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </button>

              {/* Application rows */}
              {isExpanded && (
                <div className="border-t border-white/[0.05]">
                  {group.applications.length === 0 ? (
                    <div className="px-5 py-4 text-sm text-gray-500">
                      No applications for this vacancy yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-white/[0.05]">
                      {group.applications.map((app) => (
                        <div
                          key={app.id}
                          className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          {/* Left side: name, date, status, tags */}
                          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
                            <span className="text-sm font-medium text-white">
                              {app.full_name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(app.submitted_at)}
                            </span>
                            <StatusBadge status={app.status} />
                            <TagList
                              tags={app.tags}
                              appId={app.id}
                              onTagAdded={handleTagAdded}
                            />
                          </div>

                          {/* Right side: action buttons */}
                          <div className="flex items-center gap-2">
                            {app.status === "submitted" && (
                              <button
                                onClick={() =>
                                  handleStatusChange(app.id, "shortlisted")
                                }
                                disabled={actionLoading === app.id}
                                className="inline-flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/10 transition-colors disabled:opacity-50"
                                title="Shortlist"
                              >
                                {actionLoading === app.id ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <CheckCircle size={14} />
                                )}
                                Shortlist
                              </button>
                            )}
                            {app.status !== "rejected" && (
                              <button
                                onClick={() =>
                                  handleStatusChange(app.id, "rejected")
                                }
                                disabled={actionLoading === app.id}
                                className="inline-flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                                title="Reject"
                              >
                                {actionLoading === app.id ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <XCircle size={14} />
                                )}
                                Reject
                              </button>
                            )}
                            <button
                              onClick={() =>
                                setEmailTarget({
                                  appId: app.id,
                                  name: app.full_name,
                                })
                              }
                              className="inline-flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/10 transition-colors"
                              title="Send email"
                            >
                              <Mail size={14} />
                              Email
                            </button>
                            <a
                              href={`/dashboard/careers/applications/${app.id}`}
                              className="inline-flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/[0.07] transition-colors"
                              title="View Details"
                            >
                              View Details
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Email composition dialog */}
      {emailTarget && (
        <EmailDialog
          appId={emailTarget.appId}
          applicantName={emailTarget.name}
          onClose={() => setEmailTarget(null)}
          onSent={() => setEmailTarget(null)}
        />
      )}
    </>
  );
}
