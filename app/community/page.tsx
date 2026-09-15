"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

type Post = {
  id: string;
  content: string;
  symbol?: string | null;
  verdict?: string | null;
  confidence?: number | null;
  author_name: string;
  created_at: string;
};

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      const response = await fetch(
        "/api/community?t=" + Date.now(),
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to load community");
      }

      setPosts(data.posts ?? []);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Community feed failed"
      );
    } finally {
      setLoading(false);
    }
  }

  async function createPost() {
    if (!content.trim()) return;

    try {
      setPosting(true);

      const response = await fetch("/api/community", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Post failed");
      }

      setContent("");
      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create post"
      );
    } finally {
      setPosting(false);
    }
  }

  useEffect(() => {
    load();

    const timer = window.setInterval(load, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <>
      <Sidebar />

      <main className="min-h-screen bg-[#070b12] text-white lg:ml-64">
        <header className="border-b border-white/10 px-6 py-6">
          <h1 className="text-3xl font-bold">
            Community
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Share market ideas, strategies and NEXORA signals
          </p>
        </header>

        <section className="mx-auto max-w-4xl space-y-6 p-6">
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Share a market idea, strategy or observation..."
              className="w-full rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white outline-none"
            />

            <div className="mt-4 flex justify-end">
              <button
                onClick={createPost}
                disabled={posting || !content.trim()}
                className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-black disabled:opacity-40"
              >
                {posting ? "Posting..." : "Post"}
              </button>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-gray-500">
              Loading community...
            </p>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
              <p className="font-semibold">
                No community posts yet
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Be the first to share an idea.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">
                        {post.author_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(
                          post.created_at
                        ).toLocaleString()}
                      </p>
                    </div>

                    {post.verdict && (
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          post.verdict === "LONG"
                            ? "bg-green-500/10 text-green-400"
                            : post.verdict === "SHORT"
                              ? "bg-red-500/10 text-red-400"
                              : "bg-yellow-500/10 text-yellow-400"
                        }`}
                      >
                        {post.verdict}
                      </span>
                    )}
                  </div>

                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-300">
                    {post.content}
                  </p>

                  <div className="mt-4 flex gap-3 text-xs text-gray-500">
                    {post.symbol && <span>{post.symbol}</span>}
                    {post.confidence != null && (
                      <span>
                        {post.confidence}% confidence
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
