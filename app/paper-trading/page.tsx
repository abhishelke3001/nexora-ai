"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

type Signal = {
  success: boolean;
  verdict?: "LONG" | "SHORT" | "WAIT";
  confidence?: number;
  lanes?: {
    technical?: { verdict: string; confidence: number };
    flow?: { verdict: string; confidence: number };
    news?: { sentiment: string; score: number };
    macro?: { bias: string; score: number };
  };
  levels?: {
    entry: number | null;
    stopLoss: number | null;
    target1: number | null;
    target2: number | null;
  };
};

type Position = {
  id: string;
  symbol: string;
  side: "LONG" | "SHORT";
  status: "OPEN" | "CLOSED";
  entry_price: number;
  current_price: number;
  stop_loss: number | null;
  take_profit: number | null;
  quantity: number;
  pnl: number;
  pnl_percent: number;
  opened_at: string;
  closed_at?: string | null;
  close_price?: number | null;
  close_reason?: string | null;
};

type PaperData = {
  balance: number;
  realizedPnl: number;
  unrealizedPnl: number;
  openPositions: Position[];
  history: Position[];
};

export default function PaperTradingPage() {
  const [signal, setSignal] = useState<Signal | null>(null);
  const [paper, setPaper] = useState<PaperData | null>(null);
  const [loadingSignal, setLoadingSignal] = useState(false);
  const [loadingPaper, setLoadingPaper] = useState(false);
  const [message, setMessage] = useState("");

  async function loadSignal() {
    try {
      setLoadingSignal(true);

      const response = await fetch(
        "/api/verdict?symbol=BTC/USD&t=" + Date.now(),
        { cache: "no-store" }
      );

      const data = await response.json();
      setSignal(data);
    } catch {
      setMessage("Unable to load live NEXORA signal.");
    } finally {
      setLoadingSignal(false);
    }
  }

  async function loadPaper() {
    try {
      setLoadingPaper(true);

      const response = await fetch(
        "/api/paper-trades?t=" + Date.now(),
        { cache: "no-store" }
      );

      const data = await response.json();

      if (data.success) {
        setPaper(data);
      } else {
        setMessage(data.error || "Unable to load paper trading.");
      }
    } catch {
      setMessage("Unable to load paper trading.");
    } finally {
      setLoadingPaper(false);
    }
  }

  async function sync() {
    await Promise.all([loadSignal(), loadPaper()]);
  }

  async function paperTradeSignal() {
    try {
      setMessage("");

      const response = await fetch("/api/paper-trades/signal", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setMessage(data.error || "Paper trade failed.");
        return;
      }

      if (!data.opened) {
        setMessage(data.reason || "NEXORA returned WAIT.");
      } else {
        setMessage(
          `Paper ${data.verdict} opened successfully.`
        );
      }

      await loadPaper();
    } catch {
      setMessage("Paper trade request failed.");
    }
  }

  useEffect(() => {
    sync();

    const timer = window.setInterval(sync, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  const verdict = signal?.verdict || "WAIT";
  const actionable =
    verdict === "LONG" || verdict === "SHORT";

  return (
    <>
      <Sidebar />

      <main className="min-h-screen bg-[#070b12] text-white lg:ml-64">
        <header className="border-b border-white/10 px-6 py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">
                Paper Trading
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Simulated trading using live NEXORA AI signals and
                Twelve Data prices.
              </p>
            </div>

            <button
              onClick={sync}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm"
            >
              {loadingSignal || loadingPaper
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </div>
        </header>

        <section className="space-y-8 p-6">
          {message && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-300">
              {message}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-xs text-gray-500">
                PAPER BALANCE
              </p>
              <p className="mt-2 text-2xl font-bold">
                {(paper?.balance ?? 10000).toLocaleString(
                  undefined,
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}{" "}
                USDT
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-xs text-gray-500">
                REALIZED P&L
              </p>
              <p
                className={`mt-2 text-2xl font-bold ${
                  (paper?.realizedPnl ?? 0) >= 0
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {(paper?.realizedPnl ?? 0).toFixed(2)}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-xs text-gray-500">
                UNREALIZED P&L
              </p>
              <p
                className={`mt-2 text-2xl font-bold ${
                  (paper?.unrealizedPnl ?? 0) >= 0
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {(paper?.unrealizedPnl ?? 0).toFixed(2)}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-xs text-gray-500">
                OPEN POSITIONS
              </p>
              <p className="mt-2 text-2xl font-bold">
                {paper?.openPositions?.length ?? 0}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-500">
                  NEXORA FOUR-LANE SIGNAL
                </p>

                <div className="mt-2 flex items-center gap-3">
                  <h2
                    className={`text-4xl font-black ${
                      verdict === "LONG"
                        ? "text-green-400"
                        : verdict === "SHORT"
                          ? "text-red-400"
                          : "text-yellow-400"
                    }`}
                  >
                    {verdict}
                  </h2>

                  <span className="rounded-full border border-white/10 px-3 py-1 text-sm text-gray-300">
                    {signal?.confidence ?? 0}% confidence
                  </span>
                </div>
              </div>

              <button
                onClick={paperTradeSignal}
                disabled={!actionable || loadingSignal}
                className={`rounded-xl px-5 py-3 font-bold ${
                  actionable
                    ? verdict === "LONG"
                      ? "bg-green-500 text-black"
                      : "bg-red-500 text-white"
                    : "cursor-not-allowed bg-white/10 text-gray-500"
                }`}
              >
                {actionable
                  ? `Paper Trade ${verdict}`
                  : "WAIT — No Trade"}
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <Lane
                label="Technical"
                value={
                  signal?.lanes?.technical?.verdict || "WAIT"
                }
                confidence={
                  signal?.lanes?.technical?.confidence
                }
              />

              <Lane
                label="Flow"
                value={
                  signal?.lanes?.flow?.verdict || "WAIT"
                }
                confidence={signal?.lanes?.flow?.confidence}
              />

              <Lane
                label="News"
                value={signal?.lanes?.news?.sentiment || "NEUTRAL"}
              />

              <Lane
                label="Macro"
                value={signal?.lanes?.macro?.bias || "NEUTRAL"}
              />
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <Level
                label="Entry"
                value={signal?.levels?.entry}
              />
              <Level
                label="Stop Loss"
                value={signal?.levels?.stopLoss}
              />
              <Level
                label="Target 1"
                value={signal?.levels?.target1}
              />
              <Level
                label="Target 2"
                value={signal?.levels?.target2}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="mb-4 text-lg font-semibold">
              Open Positions
            </h2>

            {!paper?.openPositions?.length ? (
              <p className="text-sm text-gray-500">
                No open paper positions.
              </p>
            ) : (
              <div className="space-y-3">
                {paper.openPositions.map((position) => (
                  <div
                    key={position.id}
                    className="grid gap-3 rounded-xl border border-white/5 bg-black/10 p-4 md:grid-cols-7 md:items-center"
                  >
                    <strong>{position.symbol}</strong>

                    <span
                      className={
                        position.side === "LONG"
                          ? "text-green-400"
                          : "text-red-400"
                      }
                    >
                      {position.side}
                    </span>

                    <span>
                      Entry{" "}
                      {position.entry_price.toLocaleString()}
                    </span>

                    <span>
                      Now{" "}
                      {position.current_price.toLocaleString()}
                    </span>

                    <span>
                      SL{" "}
                      {position.stop_loss?.toLocaleString() ||
                        "—"}
                    </span>

                    <span>
                      TP{" "}
                      {position.take_profit?.toLocaleString() ||
                        "—"}
                    </span>

                    <span
                      className={
                        position.pnl >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }
                    >
                      P&L {position.pnl.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="mb-4 text-lg font-semibold">
              Trade History
            </h2>

            {!paper?.history?.length ? (
              <p className="text-sm text-gray-500">
                No completed paper trades yet.
              </p>
            ) : (
              <div className="space-y-3">
                {paper.history.slice(0, 50).map((trade) => (
                  <div
                    key={trade.id}
                    className="grid gap-3 rounded-xl border border-white/5 bg-black/10 p-4 md:grid-cols-7 md:items-center"
                  >
                    <strong>{trade.symbol}</strong>

                    <span
                      className={
                        trade.side === "LONG"
                          ? "text-green-400"
                          : "text-red-400"
                      }
                    >
                      {trade.side}
                    </span>

                    <span>
                      Entry{" "}
                      {trade.entry_price.toLocaleString()}
                    </span>

                    <span>
                      Exit{" "}
                      {trade.close_price?.toLocaleString() ||
                        "—"}
                    </span>

                    <span>{trade.close_reason || "—"}</span>

                    <span
                      className={
                        trade.pnl >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }
                    >
                      {trade.pnl.toFixed(2)}
                    </span>

                    <span className="text-xs text-gray-500">
                      {new Date(
                        trade.closed_at || trade.opened_at
                      ).toLocaleString()}
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

function Lane({
  label,
  value,
  confidence,
}: {
  label: string;
  value: string;
  confidence?: number;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/10 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-2 font-bold">{value}</p>
      {confidence != null && (
        <p className="mt-1 text-xs text-gray-500">
          {confidence}% confidence
        </p>
      )}
    </div>
  );
}

function Level({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/10 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-2 font-semibold">
        {value != null
          ? value.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : "—"}
      </p>
    </div>
  );
}
