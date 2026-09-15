"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

type Headline = {
  title: string;
  link: string;
  datetime: string;
  sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
};

type NewsData = {
  success: boolean;
  symbol: string;
  asset: string;
  sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  score: number;
  headlineCount: number;
  headlines: Headline[];
  timestamp: string;
  error?: string;
};

export default function EarthRadarPage() {
  const [data, setData] = useState<NewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadNews() {
    try {
      const response = await fetch(
        "/api/news?symbol=BTC/USD&t=" + Date.now(),
        {
          cache: "no-store",
        }
      );

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(
          json.error || "Unable to load live news"
        );
      }

      setData(json);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "News request failed"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNews();

    const timer = window.setInterval(
      loadNews,
      5 * 60 * 1000
    );

    return () => window.clearInterval(timer);
  }, []);

  const sentiment = data?.sentiment || "NEUTRAL";

  return (
    <>
      <Sidebar />

      <main className="min-h-screen bg-[#070b12] text-white lg:ml-64">
        <header className="border-b border-white/10 px-6 py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">
                Earth Radar
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Live global market news and intelligence
              </p>
            </div>

            <button
              onClick={loadNews}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </header>

        <section className="space-y-6 p-6">
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-4">
            <Metric
              label="ASSET"
              value={data?.asset || "BTC"}
            />

            <Metric
              label="HEADLINES"
              value={String(data?.headlineCount || 0)}
            />

            <Metric
              label="NEWS BIAS"
              value={sentiment}
              tone={sentiment}
            />

            <Metric
              label="NEWS SCORE"
              value={String(data?.score || 0)}
              tone={
                (data?.score || 0) > 0
                  ? "BULLISH"
                  : (data?.score || 0) < 0
                    ? "BEARISH"
                    : "NEUTRAL"
              }
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-500">
                  LIVE NEWS INTELLIGENCE
                </p>
                <h2 className="mt-1 text-xl font-bold">
                  {data?.symbol || "BTC/USD"}
                </h2>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                LIVE
              </div>
            </div>

            {!data?.headlines?.length ? (
              <div className="rounded-xl border border-white/5 bg-black/10 p-8 text-center">
                <div className="text-4xl">🌍</div>
                <p className="mt-3 font-semibold">
                  No current headlines found
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  The news provider returned no matching headlines.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.headlines.map((headline, index) => (
                  <article
                    key={`${headline.link}-${index}`}
                    className="rounded-xl border border-white/5 bg-black/10 p-5 transition hover:border-white/10"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <a
                          href={headline.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-base font-semibold hover:text-cyan-300"
                        >
                          {headline.title}
                        </a>

                        <p className="mt-2 text-xs text-gray-500">
                          {headline.datetime
                            ? new Date(
                                headline.datetime
                              ).toLocaleString()
                            : "Time unavailable"}
                        </p>
                      </div>

                      <SentimentBadge
                        sentiment={headline.sentiment}
                      />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold">
              Intelligence Summary
            </h2>

            <p className="mt-3 text-sm leading-6 text-gray-400">
              NEXORA is currently reading live headlines for{" "}
              <span className="text-white">
                {data?.asset || "BTC"}
              </span>{" "}
              and converting the headline language into a
              directional news bias. This score is one input to
              the four-lane NEXORA verdict.
            </p>

            {data?.timestamp && (
              <p className="mt-4 text-xs text-gray-600">
                Last updated:{" "}
                {new Date(data.timestamp).toLocaleString()}
              </p>
            )}
          </div>
        </section>
      </main>
    </>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "BULLISH" | "BEARISH" | "NEUTRAL";
}) {
  const toneClass =
    tone === "BULLISH"
      ? "text-green-400"
      : tone === "BEARISH"
        ? "text-red-400"
        : tone === "NEUTRAL"
          ? "text-yellow-400"
          : "text-white";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}

function SentimentBadge({
  sentiment,
}: {
  sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
}) {
  const classes =
    sentiment === "BULLISH"
      ? "bg-green-500/10 text-green-400 border-green-500/20"
      : sentiment === "BEARISH"
        ? "bg-red-500/10 text-red-400 border-red-500/20"
        : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold ${classes}`}
    >
      {sentiment}
    </span>
  );
}
