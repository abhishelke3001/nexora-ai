"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import BtcChart from "../components/BtcChart";

const assets = [
  "BTC/USD",
  "ETH/USD",
  "SOL/USD",
  "BNB/USD",
  "XRP/USD",
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "USD/CHF",
  "AUD/USD",
  "USD/CAD",
  "NZD/USD",
];

const analysisModes = [
  "Technical",
  "Price Action",
  "SMC",
  "ICT",
];

export default function AnalyzePage() {
  const [symbol, setSymbol] = useState("BTC/USD");
  const [mode, setMode] = useState("Technical");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  async function paperTradeSignal() {
    try {
      setActionMessage("");

      const response = await fetch("/api/paper-trades/signal", {
        method: "POST",
      });

      const result = await response.json();

      setActionMessage(
        result.opened
          ? `Paper ${result.verdict} opened successfully.`
          : result.reason || result.error || "No paper trade opened."
      );
    } catch {
      setActionMessage("Paper trade request failed.");
    }
  }

  async function sendTelegramSignal() {
    try {
      if (!ai) return;

      const message = [
        "🚨 NEXORA AI SIGNAL",
        "",
        `Asset: ${symbol}`,
        `Verdict: ${ai.verdict || "WAIT"}`,
        `Confidence: ${ai.confidence ?? "—"}%`,
        "",
        `Entry: ${ai.entry ?? "—"}`,
        `Stop Loss: ${ai.stopLoss ?? "—"}`,
        `Target 1: ${ai.target1 ?? "—"}`,
        `Target 2: ${ai.target2 ?? "—"}`,
        "",
        `Reason: ${ai.reasoning ?? ai.reason ?? "—"}`,
        "",
        "Source: NEXORA AI",
      ].join("\\n");

      const response = await fetch("/api/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      setActionMessage(
        response.ok
          ? "Telegram signal sent."
          : "Telegram send failed."
      );
    } catch {
      setActionMessage("Telegram send failed.");
    }
  }


  async function runAnalysis() {
    setLoading(true);
    setData(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbol,
          mode,
        }),
      });

      const result = await res.json();
      setData(result);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runAnalysis();

    const interval = setInterval(() => {
      runAnalysis();
    }, 300000);

    return () => clearInterval(interval);
  }, [symbol, mode]);

  const ai = data?.ai;
  const market = data?.market;

  return (
    <div className="min-h-screen bg-[#07090d] text-white">
      <Sidebar />

      <main className="lg:ml-64 p-6 lg:p-10">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.25em] text-gray-500">
            NEXORA AI
          </p>

          <h1 className="mt-2 text-3xl font-semibold">
            AI Analyze
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            {symbol.includes("/")
              ? ["EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "USD/CAD", "NZD/USD"].includes(symbol)
                ? "Real Twelve Data market data + real AI reasoning"
                : "Real Twelve Data market data + real AI reasoning"
              : "Real market data + real AI reasoning"}
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {analysisModes.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setData(null);
              }}
              className={`rounded-xl border px-4 py-2 text-sm transition ${
                mode === m
                  ? "border-white/30 bg-white text-black"
                  : "border-white/10 bg-[#0d1118] text-gray-400 hover:bg-white/5"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {assets.map((asset) => (
            <button
              key={asset}
              onClick={() => {
                setSymbol(asset);
                setData(null);
              }}
              className={`rounded-xl border px-4 py-2 text-sm transition ${
                symbol === asset
                  ? "border-white/30 bg-white text-black"
                  : "border-white/10 bg-[#0d1118] text-gray-400 hover:bg-white/5"
              }`}
            >
              {asset.replace("/USD", "")}
            </button>
          ))}
        </div>

        <div className="mt-6">
          <p className="mb-3 text-xs uppercase tracking-wider text-gray-500">
            Analysis Engine
          </p>

          <div className="flex flex-wrap gap-2">
            {analysisModes.map((mode) => (
              <button
                key={mode}
                className="rounded-xl border border-white/10 bg-[#0d1118] px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={runAnalysis}
          disabled={loading}
          className="mt-5 rounded-xl bg-white px-5 py-3 text-sm font-medium text-black hover:bg-gray-200 disabled:opacity-50"
        >
          {loading ? "Analyzing..." : `Analyze ${symbol}`}
        </button>

        {data && !data.error && ai && (
          <div className="mt-8 space-y-5">
            <div className="grid gap-5 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-[#0d1118] p-6">
                <p className="text-xs text-gray-500">VERDICT</p>

                <p
                  className={`mt-3 text-4xl font-bold ${
                    ai.verdict === "LONG"
                      ? "text-green-400"
                      : ai.verdict === "SHORT"
                      ? "text-red-400"
                      : "text-yellow-400"
                  }`}
                >
                  {ai.verdict}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0d1118] p-6">
                <p className="text-xs text-gray-500">
                  CONFIDENCE
                </p>

                <p className="mt-3 text-4xl font-bold">
                  {typeof ai.confidence === "number"
                    ? `${ai.confidence <= 1 ? ai.confidence * 100 : ai.confidence}%`
                    : "—"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0d1118] p-6">
                <p className="text-xs text-gray-500">
                  LIVE PRICE
                </p>

                <p className="mt-3 text-3xl font-semibold">
                  {market?.price ?? data?.price ?? "—"}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  {symbol.includes("/") && !symbol.endsWith("USD")
                    ? "Twelve Data · 1H"
                    : "Twelve Data · 1H"}
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-[#0d1118] p-6">
                <p className="text-xs text-gray-500">
                  MARKET STRUCTURE
                </p>

                <div className="mt-5 grid grid-cols-2 gap-5">
                  <div>
                    <p className="text-xs text-gray-500">Trend</p>
                    <p className="mt-1 font-medium">
                      {ai.trend}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">
                      Momentum
                    </p>
                    <p className="mt-1 font-medium">
                      {ai.momentum}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">RSI</p>
                    <p className="mt-1 font-medium">
                      {typeof (market?.indicators?.rsi ?? data?.indicators?.rsi) === "number"
                        ? (market?.indicators?.rsi ?? data?.indicators?.rsi).toFixed(2)
                        : "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">ATR</p>
                    <p className="mt-1 font-medium">
                      {typeof (market?.indicators?.atr ?? data?.indicators?.atr) === "number"
                        ? (market?.indicators?.atr ?? data?.indicators?.atr).toFixed(symbol.includes("/") && !symbol.endsWith("USD") ? 5 : 2)
                        : "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">EMA 20</p>
                    <p className="mt-1 font-medium">
                      {typeof (market?.indicators?.ema20 ?? data?.indicators?.ema20) === "number"
                        ? (market?.indicators?.ema20 ?? data?.indicators?.ema20).toFixed(symbol.includes("/") && !symbol.endsWith("USD") ? 5 : 2)
                        : "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">EMA 50</p>
                    <p className="mt-1 font-medium">
                      {typeof (market?.indicators?.ema50 ?? data?.indicators?.ema50) === "number"
                        ? (market?.indicators?.ema50 ?? data?.indicators?.ema50).toFixed(symbol.includes("/") && !symbol.endsWith("USD") ? 5 : 2)
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0d1118] p-6">
                <p className="text-xs text-gray-500">
                  TRADE LEVELS
                </p>

                <div className="mt-5 grid grid-cols-2 gap-5">
                  <div>
                    <p className="text-xs text-gray-500">Entry</p>
                    <p className="mt-1 font-medium">
                      {ai.entry ?? "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">
                      Stop Loss
                    </p>
                    <p className="mt-1 font-medium">
                      {ai.stopLoss ?? "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">
                      Target 1
                    </p>
                    <p className="mt-1 font-medium">
                      {ai.target1 ?? "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">
                      Target 2
                    </p>
                    <p className="mt-1 font-medium">
                      {ai.target2 ?? "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0d1118] p-3">
              <div className="mb-3 flex items-center justify-between px-3 pt-2">
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-500">
                    LIVE MARKET CHART
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    {symbol} · 1H · Twelve Data Live
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-green-400">
                  <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                  LIVE
                </div>
              </div>

              <BtcChart
                symbol={symbol}
                timeframe="1H"
                signal={data?.ai}
              />
            </div>


            <div className="rounded-2xl border border-white/10 bg-[#0d1118] p-6">
              <p className="text-xs uppercase tracking-wider text-gray-500">
                ACTIONS
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={paperTradeSignal}
                  disabled={
                    loading ||
                    !ai ||
                    (ai.verdict !== "LONG" &&
                      ai.verdict !== "SHORT")
                  }
                  className={`rounded-xl px-5 py-3 text-sm font-bold ${
                    ai?.verdict === "LONG"
                      ? "bg-green-500 text-black"
                      : ai?.verdict === "SHORT"
                        ? "bg-red-500 text-white"
                        : "bg-white/10 text-gray-500"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {ai?.verdict === "LONG" ||
                  ai?.verdict === "SHORT"
                    ? `Paper Trade ${ai.verdict}`
                    : "WAIT — No Paper Trade"}
                </button>

                <button
                  type="button"
                  onClick={sendTelegramSignal}
                  disabled={
                    !ai ||
                    (ai.verdict !== "LONG" &&
                      ai.verdict !== "SHORT")
                  }
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Send Telegram
                </button>

                <a
                  href="/performance"
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-gray-300"
                >
                  View Performance
                </a>

                <a
                  href="/paper-trading"
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-gray-300"
                >
                  Paper Trading
                </a>
              </div>

              {actionMessage && (
                <p className="mt-4 text-sm text-gray-400">
                  {actionMessage}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0d1118] p-6">
              <p className="text-xs text-gray-500">
                AI REASONING
              </p>

              <p className="mt-3 leading-7 text-gray-200">
                {ai.reasoning ?? ai.reason ?? "—"}
              </p>

              <div className="mt-6 border-t border-white/10 pt-5">
                <p className="text-xs text-gray-500">RISK</p>

                <p className="mt-2 text-sm leading-6 text-gray-400">
                  {ai.risk}
                </p>
              </div>
            </div>
          </div>
        )}

        {data?.error && (
          <div className="mt-8 rounded-xl border border-red-500/20 bg-red-500/5 p-5 text-sm text-red-400">
            {data.error}
          </div>
        )}
      </main>
    </div>
  );
}
