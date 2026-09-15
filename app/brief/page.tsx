"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

type Brief = {
  symbol: string;
  headline: string;
  verdict: string;
  confidence: number;
  levels?: {
    entry?: number | null;
    stopLoss?: number | null;
    target1?: number | null;
    target2?: number | null;
  };
  activeSessions: string[];
  sessionOverlap: string;
  risks: string[];
  reasoning: string;
  market: {
    technical?: { verdict: string; confidence: number };
    flow?: { verdict: string; confidence: number };
    news?: { sentiment: string; score: number; headlineCount: number };
    macro?: { bias: string; score: number };
  };
  recentHeadlines: Array<{
    title: string;
    link: string;
    sentiment: string;
  }>;
};

export default function BriefPage() {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      const response = await fetch(
        "/api/brief?t=" + Date.now(),
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to load brief");
      }

      setBrief(data);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Daily brief failed"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    const timer = window.setInterval(load, 300_000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <>
      <Sidebar />

      <main className="min-h-screen bg-[#070b12] text-white lg:ml-64">
        <header className="border-b border-white/10 px-6 py-6">
          <h1 className="text-3xl font-bold">Daily Brief</h1>
          <p className="mt-1 text-sm text-gray-500">
            Live NEXORA market intelligence
          </p>
        </header>

        <section className="space-y-6 p-6">
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-gray-500">
              Building live market brief...
            </p>
          ) : brief ? (
            <>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <p className="text-xs uppercase tracking-widest text-gray-500">
                  {brief.symbol}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <h2
                    className={`text-4xl font-black ${
                      brief.verdict === "LONG"
                        ? "text-green-400"
                        : brief.verdict === "SHORT"
                          ? "text-red-400"
                          : "text-yellow-400"
                    }`}
                  >
                    {brief.verdict}
                  </h2>

                  <span className="rounded-full border border-white/10 px-3 py-1 text-sm">
                    {brief.confidence}% confidence
                  </span>
                </div>

                <p className="mt-5 max-w-3xl text-lg text-gray-300">
                  {brief.headline}
                </p>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-500">
                  {brief.reasoning}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <Card
                  label="Technical"
                  value={`${brief.market.technical?.verdict ?? "WAIT"} · ${brief.market.technical?.confidence ?? 0}%`}
                />
                <Card
                  label="Flow"
                  value={`${brief.market.flow?.verdict ?? "WAIT"} · ${brief.market.flow?.confidence ?? 0}%`}
                />
                <Card
                  label="News"
                  value={`${brief.market.news?.sentiment ?? "NEUTRAL"} · ${brief.market.news?.headlineCount ?? 0} headlines`}
                />
                <Card
                  label="Macro"
                  value={brief.market.macro?.bias ?? "NEUTRAL"}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <Card label="Entry" value={format(brief.levels?.entry)} />
                <Card label="Stop Loss" value={format(brief.levels?.stopLoss)} />
                <Card label="Target 1" value={format(brief.levels?.target1)} />
                <Card label="Target 2" value={format(brief.levels?.target2)} />
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <h2 className="text-lg font-semibold">
                  Current Trading Sessions
                </h2>

                <p className="mt-2 text-cyan-300">
                  {brief.sessionOverlap}
                </p>

                <p className="mt-2 text-sm text-gray-500">
                  {brief.activeSessions.length
                    ? brief.activeSessions.join(" · ")
                    : "No major session currently active"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <h2 className="text-lg font-semibold">
                  Key Risks
                </h2>

                {brief.risks.length ? (
                  <div className="mt-4 space-y-2">
                    {brief.risks.map((risk) => (
                      <div
                        key={risk}
                        className="rounded-lg border border-yellow-500/10 bg-yellow-500/5 p-3 text-sm text-yellow-300"
                      >
                        {risk}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-gray-500">
                    No major conflicts detected.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <h2 className="text-lg font-semibold">
                  Latest Headlines
                </h2>

                <div className="mt-4 space-y-3">
                  {brief.recentHeadlines.length ? (
                    brief.recentHeadlines.map((headline, index) => (
                      <a
                        key={`${headline.link}-${index}`}
                        href={headline.link}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-xl border border-white/5 bg-black/10 p-4 hover:border-white/10"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-sm font-medium">
                            {headline.title}
                          </span>

                          <span className="text-xs text-gray-500">
                            {headline.sentiment}
                          </span>
                        </div>
                      </a>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">
                      No current headlines.
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </section>
      </main>
    </>
  );
}

function Card({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  );
}

function format(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";

  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
