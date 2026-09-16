"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "./components/Sidebar";
import BtcChart from "./components/BtcChart";

type Market = {
  symbol: string;
  price: number;
  change24h: number | null;
};

type ScannerResult = {
  symbol: string;
  success: boolean;
  verdict: "LONG" | "SHORT" | "WAIT" | null;
  confidence: number | null;
  actionable: boolean;
  duplicate: boolean;
  telegramSent: boolean;
  signalId: string | null;
  error: string | null;
};

type ScannerResponse = {
  success: boolean;
  scanned: number;
  batch?: string[];
  totalSupported?: number;
  unsupported?: string[];
  actionableCount: number;
  actionable: ScannerResult[];
  results: ScannerResult[];
  durationMs?: number;
  batchSize?: number;
  cycleMinutes?: number;
};

function formatPrice(value: number) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 8,
  });
}

function verdictClass(verdict: ScannerResult["verdict"]) {
  if (verdict === "LONG") {
    return "text-emerald-400";
  }

  if (verdict === "SHORT") {
    return "text-red-400";
  }

  return "text-gray-400";
}

export default function Home() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [scanner, setScanner] = useState<ScannerResponse | null>(null);
  const [marketLoading, setMarketLoading] = useState(true);
  const [scannerLoading, setScannerLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function loadMarkets() {
    try {
      const response = await fetch("/api/market", {
        cache: "no-store",
      });

      const data = await response.json();

      if (Array.isArray(data)) {
        setMarkets(data);
      }
    } catch (error) {
      console.error("Market load failed:", error);
    } finally {
      setMarketLoading(false);
      setLastUpdated(new Date());
    }
  }

  async function loadScanner() {
    try {
      const response = await fetch("/api/automation/scan", {
        cache: "no-store",
      });

      const data = await response.json();

      if (data && typeof data === "object") {
        setScanner(data);
      }
    } catch (error) {
      console.error("Scanner load failed:", error);
    } finally {
      setScannerLoading(false);
    }
  }

  useEffect(() => {
    loadMarkets();
    loadScanner();

    const source = new EventSource("/api/stream");

    source.onmessage = (event) => {
      try {
        const tick = JSON.parse(event.data);

        if (
          tick.symbol &&
          typeof tick.price === "number"
        ) {
          setMarkets((current) =>
            current.map((market) =>
              market.symbol === tick.symbol
                ? {
                    ...market,
                    price: tick.price,
                  }
                : market
            )
          );

          setLastUpdated(new Date());
        }
      } catch {
        // Ignore malformed stream messages.
      }
    };

    return () => {
      source.close();
    };
  }, []);

  const actionableSignals = useMemo(
    () => scanner?.actionable ?? [],
    [scanner]
  );

  const liveMarkets = markets.slice(0, 6);

  return (
    <div className="min-h-screen bg-[#07090d] text-white">
      <Sidebar />

      <main className="lg:ml-64 p-4 sm:p-6 lg:p-10">
        {/* Header */}
        <section className="mb-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-gray-500">
                NEXORA AI
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Command Center
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                Live market intelligence, automated scanning and
                trade-quality monitoring.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-[#0d1118] px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
              <span className="text-xs font-medium text-emerald-300">
                SYSTEM LIVE
              </span>
              {lastUpdated && (
                <span className="text-xs text-gray-500">
                  {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Top status cards */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-[#0d1118] p-5">
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Scanner
            </p>

            <div className="mt-3 flex items-end justify-between">
              <p className="text-2xl font-semibold">
                {scannerLoading
                  ? "..."
                  : `${scanner?.scanned ?? 0}`}
              </p>

              <span className="text-xs text-gray-500">
                assets / run
              </span>
            </div>

            <p className="mt-2 text-xs text-gray-500">
              {scanner?.batchSize ?? 3} per batch ·{" "}
              {scanner?.cycleMinutes ?? 5} min cycle
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d1118] p-5">
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Supported Markets
            </p>

            <div className="mt-3 flex items-end justify-between">
              <p className="text-2xl font-semibold">
                {scanner?.totalSupported ?? 13}
              </p>

              <span className="text-xs text-gray-500">
                live universe
              </span>
            </div>

            <p className="mt-2 text-xs text-gray-500">
              XAG/USD + WTI/USD restricted on current data plan
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d1118] p-5">
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Actionable
            </p>

            <div className="mt-3 flex items-end justify-between">
              <p className="text-2xl font-semibold">
                {scanner?.actionableCount ?? 0}
              </p>

              <span
                className={`text-xs ${
                  (scanner?.actionableCount ?? 0) > 0
                    ? "text-emerald-400"
                    : "text-gray-500"
                }`}
              >
                A-grade only
              </span>
            </div>

            <p className="mt-2 text-xs text-gray-500">
              No valid setup = no alert
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d1118] p-5">
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Telegram
            </p>

            <div className="mt-3 flex items-end justify-between">
              <p className="text-2xl font-semibold text-emerald-400">
                CONNECTED
              </p>
            </div>

            <p className="mt-2 text-xs text-gray-500">
              Alerts restricted to new qualified signals
            </p>
          </div>
        </section>

        {/* Scanner */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-[#0d1118]">
          <div className="flex flex-col gap-3 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Live Scanner
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                Current production scan batch
              </p>
            </div>

            <div className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-gray-400">
              {scanner?.durationMs
                ? `${(scanner.durationMs / 1000).toFixed(1)}s`
                : "—"}{" "}
              last run
            </div>
          </div>

          <div className="divide-y divide-white/5">
            {scannerLoading ? (
              <div className="p-5 text-sm text-gray-500">
                Loading scanner...
              </div>
            ) : scanner?.results?.length ? (
              scanner.results.map((result) => (
                <div
                  key={result.symbol}
                  className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">
                      {result.symbol}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      {result.duplicate
                        ? "Existing signal / duplicate protected"
                        : result.error
                          ? result.error
                          : "Fresh analysis"}
                    </p>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p
                        className={`font-semibold ${verdictClass(
                          result.verdict
                        )}`}
                      >
                        {result.verdict ?? "WAIT"}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {result.confidence ?? 0}% confidence
                      </p>
                    </div>

                    <div
                      className={`rounded-full px-3 py-1 text-xs ${
                        result.actionable
                          ? "bg-emerald-400/10 text-emerald-300"
                          : "bg-white/5 text-gray-500"
                      }`}
                    >
                      {result.actionable
                        ? "ACTIONABLE"
                        : "WAIT"}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-5 text-sm text-gray-500">
                No scanner results yet.
              </div>
            )}
          </div>
        </section>

        {/* Actionable signals */}
        <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-white/10 bg-[#0d1118]">
            <div className="border-b border-white/10 p-5">
              <h2 className="text-lg font-semibold">
                Active A-Grade Signals
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                Only new, tradeable setups appear here.
              </p>
            </div>

            {actionableSignals.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-gray-500">
                  —
                </div>

                <p className="mt-4 text-sm font-medium text-gray-300">
                  No active A-grade setup
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  NEXORA will remain silent until all trade
                  requirements are satisfied.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {actionableSignals.map((signal) => (
                  <div
                    key={signal.signalId ?? signal.symbol}
                    className="p-5"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">
                        {signal.symbol}
                      </p>

                      <span className="text-emerald-400">
                        {signal.verdict}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-xl bg-black/20 p-3">
                        <p className="text-[10px] uppercase text-gray-500">
                          Confidence
                        </p>

                        <p className="mt-1 font-medium">
                          {signal.confidence ?? 0}%
                        </p>
                      </div>

                      <div className="rounded-xl bg-black/20 p-3">
                        <p className="text-[10px] uppercase text-gray-500">
                          Telegram
                        </p>

                        <p className="mt-1 font-medium text-emerald-400">
                          {signal.telegramSent
                            ? "Sent"
                            : "Pending"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-black/20 p-3">
                        <p className="text-[10px] uppercase text-gray-500">
                          Duplicate
                        </p>

                        <p className="mt-1 font-medium">
                          {signal.duplicate
                            ? "Yes"
                            : "No"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-black/20 p-3">
                        <p className="text-[10px] uppercase text-gray-500">
                          Signal ID
                        </p>

                        <p className="mt-1 truncate text-xs text-gray-400">
                          {signal.signalId ?? "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Market snapshot */}
          <div className="rounded-2xl border border-white/10 bg-[#0d1118]">
            <div className="border-b border-white/10 p-5">
              <h2 className="text-lg font-semibold">
                Market Snapshot
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                Live Twelve Data market feed
              </p>
            </div>

            <div className="divide-y divide-white/5">
              {marketLoading ? (
                <div className="p-5 text-sm text-gray-500">
                  Loading markets...
                </div>
              ) : liveMarkets.length ? (
                liveMarkets.map((market) => (
                  <div
                    key={market.symbol}
                    className="flex items-center justify-between p-4"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {market.symbol}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Live
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-medium">
                        {formatPrice(market.price)}
                      </p>

                      <p
                        className={`mt-1 text-xs ${
                          (market.change24h ?? 0) >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {market.change24h == null
                          ? "—"
                          : `${market.change24h >= 0 ? "+" : ""}${market.change24h.toFixed(2)}%`}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-5 text-sm text-gray-500">
                  No market data available.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* BTC chart */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-[#0d1118] p-4 sm:p-5">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                BTC/USD
              </h2>

              <p className="text-xs text-gray-500">
                Real Twelve Data 1H candles
              </p>
            </div>

            <span className="flex items-center gap-2 text-xs text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              LIVE
            </span>
          </div>

          <BtcChart />
        </section>

        {/* Footer status */}
        <div className="mt-6 flex flex-col gap-2 border-t border-white/5 pt-5 text-xs text-gray-600 sm:flex-row sm:items-center sm:justify-between">
          <span>
            NEXORA AI · Production intelligence engine
          </span>

          <span>
            Scanner:{" "}
            {scanner?.success ? "Operational" : "Unavailable"}
          </span>
        </div>
      </main>
    </div>
  );
}
