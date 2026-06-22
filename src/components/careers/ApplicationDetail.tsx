"use client";
import React, { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  Loader2,
  Mail,
  Plus,
  Send,
  Tag,
} from "lucide-react";
import { getCookie } from "@/lib/cookies";

// --- Types ---

interface ScreeningResponse {
  question: string;
  answer: string;
}

interface ApplicationDetail {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  cover_letter: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  cv_original_filename: string | null;
  screening_responses: ScreeningResponse[];
  status: "submitted" | "shortlisted" | "rejected";
  tags: string[];
  submitted_at: string;
}

// --- Helpers ---

const CAREERS_SERVICE_URL =
  process.env.NEXT_PUBLIC_CAREERS_SERVICE_URL ?? "http://localhost:8090";

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
  return fetch(`${CAREERS_SERVICE_URL}${path}`, { ...options, headers });
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

// --- Sub-components ---

function StatusBadge({ status }: { status: ApplicationDetail["status"] }) {
  const config: Record<
    ApplicationDetail["status"],
    { label: string; className: string }
  > = {
    submitted: {
      label: "Submitted",
      className: "bg-blue-500/15 text-blue-400",
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
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

// --- Main Component ---

interface ApplicationDetailProps {
  applicationId: string;
}

export default function ApplicationDetail({
  applicationId,
}: ApplicationDetailProps) {
  const [application, setApplication] = useState<ApplicationDetail | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Email composer state
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState("");
  const [emailError, setEmailError] = useState("");

  // Tag management state
  const [newTag, setNewTag] = useState("");
  const [addingTag, setAddingTag] = useState(false);
  const [tagError, setTagError] = useState("");

  // CV download state
  const [downloadingCv, setDownloadingCv] = useState(false);

  const fetchApplication = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchWithAuth(
        `/api/admin/applications/${applicationId}`
      );
      if (!res.ok) {
        throw new Error(`Failed to fetch application (${res.status})`);
      }
      const data: ApplicationDetail = await res.json();
      setApplication(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load application"
      );
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    fetchApplication();
  }, [fetchApplication]);

  const handleDownloadCv = async () => {
    setDownloadingCv(true);
    try {
      const token = getCookie("aivory_access_token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(
        `${CAREERS_SERVICE_URL}/api/admin/applications/${applicationId}/cv`,
        { headers }
      );
      if (!res.ok) {
        throw new Error(`Failed to download CV (${res.status})`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        application?.cv_original_filename ?? "cv-download";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download CV");
    } finally {
      setDownloadingCv(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSubject.trim() || !emailBody.trim()) return;

    setSendingEmail(true);
    setEmailError("");
    setEmailSuccess("");
    try {
      const res = await fetchWithAuth(
        `/api/admin/applications/${applicationId}/email`,
        {
          method: "POST",
          body: JSON.stringify({
            subject: emailSubject.trim(),
            body: emailBody.trim(),
          }),
        }
      );
      if (!res.ok) {
        throw new Error(`Failed to send email (${res.status})`);
      }
      setEmailSuccess("Email sent successfully.");
      setEmailSubject("");
      setEmailBody("");
    } catch (err) {
      setEmailError(
        err instanceof Error ? err.message : "Failed to send email"
      );
    } finally {
      setSendingEmail(false);
    }
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim()) return;

    setAddingTag(true);
    setTagError("");
    try {
      const res = await fetchWithAuth(
        `/api/admin/applications/${applicationId}/tags`,
        {
          method: "POST",
          body: JSON.stringify({ tag: newTag.trim() }),
        }
      );
      if (!res.ok) {
        throw new Error(`Failed to add tag (${res.status})`);
      }
      // Update local state
      setApplication((prev) =>
        prev
          ? { ...prev, tags: [...prev.tags, newTag.trim()] }
          : prev
      );
      setNewTag("");
    } catch (err) {
      setTagError(err instanceof Error ? err.message : "Failed to add tag");
    } finally {
      setAddingTag(false);
    }
  };

  // --- Render ---

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-400">Loading application...</span>
      </div>
    );
  }

  if (error && !application) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={fetchApplication}
          className="mt-2 text-xs text-red-300 underline hover:text-red-200"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!application) return null;

  return (
    <div className="space-y-6">
      {/* Header with back link */}
      <div className="flex items-center justify-between">
        <a
          href="/dashboard/careers"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Applications
        </a>
        <StatusBadge status={application.status} />
      </div>

      {/* Applicant Info Section */}
      <section className="rounded-lg border border-white/[0.07] bg-[#2a2a27] p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">
          Applicant Information
        </h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">
              Full Name
            </dt>
            <dd className="mt-1 text-sm text-white">{application.full_name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">
              Email
            </dt>
            <dd className="mt-1 text-sm text-white">{application.email}</dd>
          </div>
          {application.phone && (
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">
                Phone
              </dt>
              <dd className="mt-1 text-sm text-white">{application.phone}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">
              Submitted
            </dt>
            <dd className="mt-1 text-sm text-white">
              {formatDate(application.submitted_at)}
            </dd>
          </div>
        </dl>
      </section>

      {/* Links Section */}
      {(application.github_url || application.linkedin_url) && (
        <section className="rounded-lg border border-white/[0.07] bg-[#2a2a27] p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Profile Links
          </h2>
          <div className="flex flex-wrap gap-3">
            {application.github_url && (
              <a
                href={application.github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-white/[0.07] px-4 py-2 text-sm text-gray-300 hover:border-white/20 hover:text-white transition-colors"
              >
                <ExternalLink size={14} />
                GitHub Profile
              </a>
            )}
            {application.linkedin_url && (
              <a
                href={application.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-white/[0.07] px-4 py-2 text-sm text-gray-300 hover:border-white/20 hover:text-white transition-colors"
              >
                <ExternalLink size={14} />
                LinkedIn Profile
              </a>
            )}
          </div>
        </section>
      )}

      {/* Cover Letter Section */}
      {application.cover_letter && (
        <section className="rounded-lg border border-white/[0.07] bg-[#2a2a27] p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Cover Letter
          </h2>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
            {application.cover_letter}
          </div>
        </section>
      )}

      {/* Screening Responses Section */}
      {application.screening_responses &&
        application.screening_responses.length > 0 && (
          <section className="rounded-lg border border-white/[0.07] bg-[#2a2a27] p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Screening Responses
            </h2>
            <dl className="space-y-4">
              {application.screening_responses.map((item, index) => (
                <div key={index}>
                  <dt className="text-sm font-medium text-gray-400">
                    {item.question}
                  </dt>
                  <dd className="mt-1 text-sm text-white">{item.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

      {/* CV Download Section */}
      <section className="rounded-lg border border-white/[0.07] bg-[#2a2a27] p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">
          Curriculum Vitae
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-300">
            {application.cv_original_filename ?? "CV file"}
          </span>
          <button
            onClick={handleDownloadCv}
            disabled={downloadingCv}
            className="inline-flex items-center gap-2 rounded-lg bg-[#00e59e]/10 px-4 py-2 text-sm font-medium text-[#00e59e] hover:bg-[#00e59e]/20 transition-colors disabled:opacity-50"
          >
            {downloadingCv ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
            Download CV
          </button>
        </div>
      </section>

      {/* Tags Section */}
      <section className="rounded-lg border border-white/[0.07] bg-[#2a2a27] p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Tags</h2>
        {/* Existing tags */}
        {application.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {application.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3 py-1 text-xs font-medium text-gray-300"
              >
                <Tag size={10} />
                {tag}
              </span>
            ))}
          </div>
        )}
        {/* Add new tag */}
        <form onSubmit={handleAddTag} className="flex items-center gap-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Add a tag..."
            className="flex-1 rounded-lg border border-white/[0.07] bg-[#1e1e1c] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#00e59e]/50 focus:outline-none focus:ring-1 focus:ring-[#00e59e]/50"
          />
          <button
            type="submit"
            disabled={addingTag || !newTag.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.07] px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/[0.12] transition-colors disabled:opacity-50"
          >
            {addingTag ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}
            Add
          </button>
        </form>
        {tagError && (
          <p className="mt-2 text-xs text-red-400">{tagError}</p>
        )}
      </section>

      {/* Email Composer Section */}
      <section className="rounded-lg border border-white/[0.07] bg-[#2a2a27] p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">
          <Mail size={18} className="mr-2 inline-block" />
          Send Email to Applicant
        </h2>
        <form onSubmit={handleSendEmail} className="space-y-4">
          <div>
            <label
              htmlFor="email-subject"
              className="mb-1 block text-xs font-medium uppercase text-gray-500"
            >
              Subject
            </label>
            <input
              id="email-subject"
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Email subject..."
              className="w-full rounded-lg border border-white/[0.07] bg-[#1e1e1c] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#00e59e]/50 focus:outline-none focus:ring-1 focus:ring-[#00e59e]/50"
            />
          </div>
          <div>
            <label
              htmlFor="email-body"
              className="mb-1 block text-xs font-medium uppercase text-gray-500"
            >
              Message
            </label>
            <textarea
              id="email-body"
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              placeholder="Write your message..."
              rows={6}
              className="w-full rounded-lg border border-white/[0.07] bg-[#1e1e1c] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#00e59e]/50 focus:outline-none focus:ring-1 focus:ring-[#00e59e]/50 resize-y"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={
                sendingEmail || !emailSubject.trim() || !emailBody.trim()
              }
              className="inline-flex items-center gap-2 rounded-lg bg-[#00e59e] px-4 py-2 text-sm font-medium text-black hover:bg-[#00e59e]/90 transition-colors disabled:opacity-50"
            >
              {sendingEmail ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              Send Email
            </button>
            {emailSuccess && (
              <p className="text-xs text-green-400">{emailSuccess}</p>
            )}
            {emailError && (
              <p className="text-xs text-red-400">{emailError}</p>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
