"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

type Performance = {
  success: boolean;
  totalSignals: number;
  actionableSignals: number;
  openSignals: number;
  closedSignals: number;
  wins: number;
  losses: number;
  expired: number;
  winRate: number;
  totalPnlPercent: number;
  averagePnlPercent: number;
  outcomes: {
    TP1: number;
    TP2: number;
    SL: number;
    EXPIRED: number;
  };
  recentSignals: Array<{
    id: string;
    symbol: string;
    verdict: string;
    confidence: number;
    outcome: string | null;
    pnl_percent: number | null;
    created_at: string;
  }>;
};

export default function PerformancePage() {
  const [data, setData] = useState<Performance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true);

      const response = await fetch(
        "/api/signal-performance?t=" + Date.now(),
        { cache: "no-store" }
      );

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(
          json.error || "Unable to load signal performance"
        );
      }

      setData(json);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Performance request failed"
      );
    } finally {
      setLoading(false);
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">
                Signal Performance
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Real results from stored NEXORA signals
              </p>
            </div>

            <button
              onClick={load}
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
              label="Total Signals"
              value={String(data?.totalSignals ?? 0)}
            />

            <Metric
              label="Actionable"
              value={String(data?.actionableSignals ?? 0)}
            />

            <Metric
              label="Win Rate"
              value={`${data?.winRate ?? 0}%`}
              positive={(data?.winRate ?? 0) >= 50}
            />

            <Metric
              label="Total P&L"
              value={`${data?.totalPnlPercent ?? 0}%`}
              positive={(data?.totalPnlPercent ?? 0) >= 0}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Metric
              label="TP1"
              value={String(data?.outcomes.TP1 ?? 0)}
              positive
            />

            <Metric
              label="TP2"
              value={String(data?.outcomes.TP2 ?? 0)}
              positive
            />

            <Metric
              label="Stop Loss"
              value={String(data?.outcomes.SL ?? 0)}
              positive={false}
            />

            <Metric
              label="Expired"
              value={String(data?.outcomes.EXPIRED ?? 0)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Metric
              label="Open Signals"
              value={String(data?.openSignals ?? 0)}
            />

            <Metric
              label="Closed Signals"
              value={String(data?.closedSignals ?? 0)}
            />

            <Metric
              label="Average P&L"
              value={`${data?.averagePnlPercent ?? 0}%`}
              positive={(data?.averagePnlPercent ?? 0) >= 0}
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="mb-4 text-lg font-semibold">
              Recent Signals
            </h2>

            {!data?.recentSignals?.length ? (
              <p className="text-sm text-gray-500">
                No signals recorded yet.
              </p>
            ) : (
              <div className="space-y-2">
                {data.recentSignals.map((signal) => (
                  <div
                    key={signal.id}
                    className="grid gap-3 rounded-xl border border-white/5 bg-black/10 p-4 md:grid-cols-7 md:items-center"
                  >
                    <strong>{signal.symbol}</strong>

                    <span
                      className={
                        signal.verdict === "LONG"
                          ? "font-bold text-green-400"
                          : signal.verdict === "SHORT"
                            ? "font-bold text-red-400"
                            : "font-bold text-yellow-400"
                      }
                    >
                      {signal.verdict}
                    </span>

                    <span>
                      {signal.confidence}% confidence
                    </span>

                    <span>
                      {signal.outcome || "OPEN"}
                    </span>

                    <span
                      className={
                        Number(signal.pnl_percent ?? 0) >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }
                    >
                      {signal.pnl_percent == null
                        ? "—"
                        : `${signal.pnl_percent}%`}
                    </span>

                    <span className="text-xs text-gray-500">
                      {new Date(
                        signal.created_at
                      ).toLocaleString()}
                    </span>

                    <span className="text-xs text-gray-600">
                      {signal.id.slice(0, 8)}
                    </span>
                  </div>
                ))}
              </div>
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
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xs text-gray-500">{label}</p>

      <p
        className={`mt-2 text-2xl font-bold ${
          positive === true
            ? "text-green-400"
            : positive === false
              ? "text-red-400"
              : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
