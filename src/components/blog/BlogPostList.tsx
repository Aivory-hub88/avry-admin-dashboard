"use client";
import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Badge from "@/components/ui/badge/Badge";
import { Modal } from "@/components/ui/modal";
import { getCookie } from "@/lib/cookies";

export interface BlogPostListItem {
  id: string;
  title: string;
  slug: string;
  status: string;
  redacted_sections: number[];
  published_at: string | null;
  created_at: string;
  [key: string]: unknown;
}

interface BlogPostListProps {
  posts: BlogPostListItem[];
  loading: boolean;
  onEdit: (post: BlogPostListItem) => void;
  onRedact: (post: BlogPostListItem) => void;
  onPostUpdated: () => void;
}

const BLOG_SERVICE_URL =
  "";

export default function BlogPostList({
  posts,
  loading,
  onEdit,
  onRedact,
  onPostUpdated,
}: BlogPostListProps) {
  const [deleteConfirmPost, setDeleteConfirmPost] = useState<BlogPostListItem | null>(
    null
  );
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const getAuthHeaders = (): Record<string, string> => {
    const token = getCookie("aivory_access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handleDelete = async (post: BlogPostListItem) => {
    setActionLoading(post.id);
    try {
      const res = await fetch(`/admin/api/admin/blog/api/admin/posts/${post.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        onPostUpdated();
      }
    } catch {
      // silently fail
    } finally {
      setActionLoading(null);
      setDeleteConfirmPost(null);
    }
  };

  const handleHide = async (post: BlogPostListItem) => {
    setActionLoading(post.id);
    try {
      const res = await fetch(
        `/admin/api/admin/blog/api/admin/posts/${post.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ status: "hidden" }),
        }
      );
      if (res.ok) {
        onPostUpdated();
      }
    } catch {
      // silently fail
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadgeColor = (
    status: string
  ): "success" | "warning" | "light" => {
    switch (status) {
      case "published":
        return "success";
      case "hidden":
        return "warning";
      default:
        return "light";
    }
  };

  if (loading) {
    return <p className="text-gray-400 text-sm">Loading posts…</p>;
  }

  if (posts.length === 0) {
    return (
      <p className="text-gray-400 text-sm">
        No blog posts found. Create your first post in the &ldquo;Create
        Post&rdquo; tab.
      </p>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-white/[0.05] bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
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
                  Published Date
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
              {posts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="px-5 py-4 text-start">
                    <div>
                      <span className="block font-medium text-white/90 text-theme-sm">
                        {post.title}
                      </span>
                      {post.redacted_sections?.length > 0 && (
                        <span className="text-xs text-red-400 mt-0.5 block">
                          {post.redacted_sections.length} section
                          {post.redacted_sections.length > 1 ? "s" : ""} redacted
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-start">
                    <Badge size="sm" color={getStatusBadgeColor(post.status)}>
                      {post.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-400 text-start text-theme-sm">
                    {formatDate(post.published_at)}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-start">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onEdit(post)}
                        disabled={actionLoading === post.id}
                        className="px-3 py-1.5 text-xs font-medium rounded-md bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 transition-colors disabled:opacity-50"
                        title="Edit post"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirmPost(post)}
                        disabled={actionLoading === post.id}
                        className="px-3 py-1.5 text-xs font-medium rounded-md bg-error-500/20 text-error-500 hover:bg-error-500/30 transition-colors disabled:opacity-50"
                        title="Delete post"
                      >
                        Delete
                      </button>
                      {post.status !== "hidden" && (
                        <button
                          onClick={() => handleHide(post)}
                          disabled={actionLoading === post.id}
                          className="px-3 py-1.5 text-xs font-medium rounded-md bg-warning-500/20 text-orange-400 hover:bg-warning-500/30 transition-colors disabled:opacity-50"
                          title="Hide post"
                        >
                          Hide
                        </button>
                      )}
                      <button
                        onClick={() => onRedact(post)}
                        disabled={actionLoading === post.id}
                        className="px-3 py-1.5 text-xs font-medium rounded-md bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors disabled:opacity-50"
                        title="Redact sections"
                      >
                        Redact
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmPost !== null}
        onClose={() => setDeleteConfirmPost(null)}
        className="max-w-md p-6"
      >
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error-500/15">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-error-500"
            >
              <path
                d="M12 9V14M12 21.41H5.94C2.47 21.41 1.02 18.93 2.7 15.9L5.82 10.28L8.76 5.00003C10.54 1.79003 13.46 1.79003 15.24 5.00003L18.18 10.29L21.3 15.91C22.98 18.94 21.52 21.42 18.06 21.42H12V21.41Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M11.995 17H12.004"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
            Delete Post
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Are you sure you want to delete &ldquo;
            {deleteConfirmPost?.title}&rdquo;? This action cannot be undone.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setDeleteConfirmPost(null)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteConfirmPost && handleDelete(deleteConfirmPost)}
              disabled={actionLoading === deleteConfirmPost?.id}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-error-500 text-white hover:bg-error-600 transition-colors disabled:opacity-50"
            >
              {actionLoading === deleteConfirmPost?.id
                ? "Deleting…"
                : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
