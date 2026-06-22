"use client";
import React, { useState, useEffect, useCallback } from "react";
import { getCookie } from "@/lib/cookies";
import RedactionInterface from "@/components/blog/RedactionInterface";
import BlogPostList from "@/components/blog/BlogPostList";
import BlogPostEditor, { BlogPostData, ContentBlock } from "@/components/blog/BlogPostEditor";

type BlogTab = "manage" | "create";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  status: string;
  author_name: string;
  excerpt: string | null;
  thumbnail_url: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
  redacted_sections: number[];
  published_at: string | null;
  created_at: string;
}

const BLOG_SERVICE_URL =
  process.env.NEXT_PUBLIC_BLOG_SERVICE_URL ?? "http://localhost:8089";

export default function BlogAdminPanel() {
  const [activeTab, setActiveTab] = useState<BlogTab>("manage");
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [redactingPost, setRedactingPost] = useState<any>(null);
  const [editingPost, setEditingPost] = useState<BlogPostData | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const token = getCookie("aivory_access_token");
      const res = await fetch(`${BLOG_SERVICE_URL}/api/admin/posts`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(Array.isArray(data) ? data : data.posts ?? []);
      }
    } catch {
      // silently fail — posts list will be empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "manage") {
      fetchPosts();
    }
  }, [activeTab, fetchPosts]);

  const handleRedactionSaved = (postId: string, redactedSections: number[]) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, redacted_sections: redactedSections } : p
      )
    );
    setRedactingPost(null);
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-white">Blog Management</h1>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-white/[0.07]">
        <button
          onClick={() => {
            setActiveTab("manage");
            setRedactingPost(null);
            setEditingPost(null);
          }}
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
            activeTab === "manage"
              ? "text-[#00e59e]"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Manage Posts
          {activeTab === "manage" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00e59e] rounded-t" />
          )}
        </button>
        <button
          onClick={() => {
            setActiveTab("create");
            setRedactingPost(null);
            setEditingPost(null);
          }}
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
            activeTab === "create"
              ? "text-[#00e59e]"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Create Post
          {activeTab === "create" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00e59e] rounded-t" />
          )}
        </button>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "manage" && (
          <>
            {redactingPost ? (
              <div className="rounded-xl border border-white/[0.07] bg-[#2a2a27] p-6">
                <RedactionInterface
                  post={redactingPost}
                  onRedactionSaved={(sections) =>
                    handleRedactionSaved(redactingPost.id, sections)
                  }
                  onClose={() => setRedactingPost(null)}
                />
              </div>
            ) : (
              <div className="rounded-xl border border-white/[0.07] bg-[#2a2a27] p-6">
                <BlogPostList
                  posts={posts as never[]}
                  loading={loading}
                  onEdit={(post) => {
                    // Handle both body formats: array or { blocks: [...] }
                    const rawPost = post as any;
                    let bodyData: { blocks: ContentBlock[] };
                    if (Array.isArray(rawPost.body)) {
                      bodyData = { blocks: rawPost.body as ContentBlock[] };
                    } else if (rawPost.body?.blocks) {
                      bodyData = rawPost.body as { blocks: ContentBlock[] };
                    } else {
                      bodyData = { blocks: [] };
                    }
                    const postData: BlogPostData = {
                      id: rawPost.id,
                      title: rawPost.title,
                      author_name: rawPost.author_name ?? "",
                      excerpt: rawPost.excerpt ?? "",
                      thumbnail_url: rawPost.thumbnail_url ?? "",
                      body: bodyData,
                    };
                    setEditingPost(postData);
                    setActiveTab("create");
                  }}
                  onRedact={(post) => setRedactingPost(post as any)}
                  onPostUpdated={fetchPosts}
                />
              </div>
            )}
          </>
        )}

        {activeTab === "create" && (
          <div className="rounded-xl border border-white/[0.07] bg-[#2a2a27] p-6">
            <BlogPostEditor
              key={editingPost?.id ?? "new"}
              editPost={editingPost ?? undefined}
              onSaved={() => {
                setEditingPost(null);
                fetchPosts();
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
