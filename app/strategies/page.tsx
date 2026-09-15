"use client";

import { useState } from "react";
import Sidebar from "../components/Sidebar";

type Strategy = {
  prompt: string;
  timeframe: string;
  riskPercent: number;
  rewardRisk: number;
  allowedSides: string[];
  entryRules: string[];
};

type BacktestResult = {
  success: boolean;
  strategy?: Strategy;
  finalBalance?: number;
  returnPercent?: number;
  trades?: number;
  wins?: number;
  losses?: number;
  winRate?: number;
  grossProfit?: number;
  grossLoss?: number;
  profitFactor?: number | string;
  maxDrawdown?: number;
  tradeHistory?: Array<{
    side: string;
    entry: number;
    exit: number;
    pnl: number;
    result: string;
  }>;
  error?: string;
};

export default function StrategiesPage() {
  const [prompt, setPrompt] = useState(
    "Buy BTC when price is above EMA20 and EMA50, RSI above 55, risk 1%, target 2R. Long only."
  );

  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function buildAndBacktest() {
    if (!prompt.trim()) return;

    setLoading(true);
    setStatus("");
    setResult(null);

    try {
      const strategyResponse = await fetch("/api/strategies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const strategyData = await strategyResponse.json();

      if (!strategyResponse.ok || !strategyData.success) {
        throw new Error(
          strategyData.error || "Strategy parsing failed"
        );
      }

      setStrategy(strategyData.strategy);

      const backtestResponse = await fetch("/api/backtest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const backtestData = await backtestResponse.json();

      if (!backtestResponse.ok || !backtestData.success) {
        throw new Error(
          backtestData.error || "Backtest failed"
        );
      }

      setResult(backtestData);
      setStatus("Strategy built and backtested successfully.");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Sidebar />

      <main className="min-h-screen bg-[#070b12] text-white lg:ml-64">
        <header className="border-b border-white/10 px-6 py-6">
          <h1 className="text-3xl font-bold">Strategy Builder</h1>
          <p className="mt-1 text-sm text-gray-500">
            Write a trading idea, turn it into rules, and backtest it on
            historical candles.
          </p>
        </header>

        <section className="space-y-6 p-6">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <label className="text-sm font-semibold text-gray-300">
              Describe your strategy
            </label>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              className="mt-3 w-full rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white outline-none focus:border-white/20"
              placeholder="Example: Buy BTC when price is above EMA20 and EMA50, RSI above 55, risk 1%, target 2R."
            />

            <div className="mt-4 flex flex-wrap gap-3">
              {[
                "Buy BTC above EMA20 and EMA50, RSI above 55, risk 1%, target 2R. Long only.",
                "Short BTC when EMA20 is below EMA50 and RSI below 45, risk 1%, target 2R.",
                "Buy BTC when MACD is bullish and RSI above 50, risk 0.5%, target 3R.",
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => setPrompt(example)}
                  className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-gray-400 hover:text-white"
                >
                  Use example
                </button>
              ))}
            </div>

            <button
              onClick={buildAndBacktest}
              disabled={loading}
              className="mt-5 rounded-xl bg-white px-6 py-3 font-bold text-black disabled:opacity-50"
            >
              {loading ? "Building + backtesting..." : "Build & Backtest"}
            </button>

            {status && (
              <p className="mt-4 text-sm text-gray-400">
                {status}
              </p>
            )}
          </div>

          {strategy && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500">
                    Parsed Strategy
                  </p>
                  <h2 className="mt-1 text-xl font-bold">
                    {strategy.prompt}
                  </h2>
                </div>

                <span className="rounded-full border border-white/10 px-3 py-1 text-xs">
                  {strategy.timeframe}
                </span>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-4">
                <Stat label="Risk" value={`${strategy.riskPercent}%`} />
                <Stat label="Reward / Risk" value={`${strategy.rewardRisk}R`} />
                <Stat
                  label="Allowed sides"
                  value={strategy.allowedSides.join(" / ")}
                />
                <Stat
                  label="Rules"
                  value={String(strategy.entryRules.length)}
                />
              </div>

              <div className="mt-6">
                <p className="text-xs uppercase tracking-widest text-gray-500">
                  Entry rules
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {strategy.entryRules.map((rule) => (
                    <span
                      key={rule}
                      className="rounded-lg bg-white/[0.05] px-3 py-2 text-sm"
                    >
                      {rule}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {result?.success && (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <Metric
                  label="Return"
                  value={`${result.returnPercent}%`}
                  positive={(result.returnPercent ?? 0) >= 0}
                />

                <Metric
                  label="Win rate"
                  value={`${result.winRate}%`}
                  positive={(result.winRate ?? 0) >= 50}
                />

                <Metric
                  label="Profit factor"
                  value={String(result.profitFactor)}
                  positive={
                    result.profitFactor !== "INF" &&
                    Number(result.profitFactor ?? 0) >= 1
                  }
                />

                <Metric
                  label="Max drawdown"
                  value={`${result.maxDrawdown}%`}
                  positive={false}
                />
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <Metric
                  label="Final balance"
                  value={`$${result.finalBalance?.toLocaleString()}`}
                  positive={(result.returnPercent ?? 0) >= 0}
                />

                <Metric
                  label="Trades"
                  value={String(result.trades)}
                  positive
                />

                <Metric
                  label="Wins / losses"
                  value={`${result.wins} / ${result.losses}`}
                  positive={(result.wins ?? 0) >= (result.losses ?? 0)}
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <h2 className="mb-4 text-lg font-semibold">
                  Backtest trades
                </h2>

                {!result.tradeHistory?.length ? (
                  <p className="text-sm text-gray-500">
                    No trades generated for this strategy.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {result.tradeHistory.map((trade, index) => (
                      <div
                        key={`${trade.entry}-${index}`}
                        className="grid gap-2 rounded-xl border border-white/5 bg-black/10 p-4 md:grid-cols-6 md:items-center"
                      >
                        <span
                          className={
                            trade.side === "LONG"
                              ? "font-bold text-green-400"
                              : "font-bold text-red-400"
                          }
                        >
                          {trade.side}
                        </span>

                        <span>
                          Entry {trade.entry.toLocaleString()}
                        </span>

                        <span>
                          Exit {trade.exit.toLocaleString()}
                        </span>

                        <span
                          className={
                            trade.pnl >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }
                        >
                          {trade.pnl.toFixed(2)}
                        </span>

                        <span>{trade.result}</span>

                        <span className="text-xs text-gray-500">
                          Trade #{index + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-white/[0.04] p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function Metric({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xs text-gray-500">{label}</p>
      <p
        className={`mt-2 text-2xl font-bold ${
          positive ? "text-green-400" : "text-red-400"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
