"use client";

import { useEffect, useState } from "react";

import Sidebar from "./components/Sidebar";
import BtcChart from "./components/BtcChart";

type Market = {
  symbol: string;
  price: number;
  change24h: number | null;
};

type HealthResponse = {
  configured: boolean;
  status: string;
  scanner: {
    schedule: string;
    batchSize: number;
    cycleMinutes: number;
    supportedMarkets: number;
    telegram: boolean;
    twelveData: boolean;
    openAI: boolean;
  };
  timestamp: string;
};

function formatPrice(value: number) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 8,
  });
}

export default function Home() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);

  const [marketLoading, setMarketLoading] = useState(true);
  const [healthLoading, setHealthLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function loadMarkets() {
    try {
      const response = await fetch("/api/market", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Market request failed: ${response.status}`);
      }

      const data: unknown = await response.json();

      if (Array.isArray(data)) {
        setMarkets(data as Market[]);
      }
    } catch (error) {
      console.error("Market load failed:", error);
    } finally {
      setMarketLoading(false);
      setLastUpdated(new Date());
    }
  }

  async function loadHealth() {
    try {
      const response = await fetch("/api/cron-health", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Health request failed: ${response.status}`);
      }

      const data: unknown = await response.json();

      if (data && typeof data === "object") {
        setHealth(data as HealthResponse);
      }
    } catch (error) {
      console.error("Health load failed:", error);
    } finally {
      setHealthLoading(false);
    }
  }

  useEffect(() => {
    loadMarkets();
    loadHealth();

    const marketTimer = window.setInterval(() => {
      loadMarkets();
    }, 30_000);

    const healthTimer = window.setInterval(() => {
      loadHealth();
    }, 30_000);

    const source = new EventSource("/api/stream");

    source.onmessage = (event) => {
      try {
        const tick = JSON.parse(event.data);

        if (
          tick?.symbol &&
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
      window.clearInterval(marketTimer);
      window.clearInterval(healthTimer);
      source.close();
    };
  }, []);

  const systemLive = health?.status === "operational";
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

              <p className="mt-2 max-w-2xl text-sm text-gray-500">
                Live market intelligence, automated scanning,
                system health and trading infrastructure.
              </p>
            </div>

            <div className="flex w-fit items-center gap-3 rounded-full border border-white/10 bg-[#0d1118] px-4 py-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  systemLive
                    ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]"
                    : "bg-yellow-400"
                }`}
              />

              <span
                className={`text-xs font-medium ${
                  systemLive
                    ? "text-emerald-300"
                    : "text-yellow-300"
                }`}
              >
                {healthLoading
                  ? "CHECKING"
                  : systemLive
                    ? "SYSTEM LIVE"
                    : "CHECK SYSTEM"}
              </span>

              {lastUpdated && (
                <span className="text-xs text-gray-500">
                  {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Status cards */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-[#0d1118] p-5">
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Scanner
            </p>

            <p className="mt-3 text-2xl font-semibold">
              {healthLoading
                ? "..."
                : health?.scanner?.schedule ?? "—"}
            </p>

            <p className="mt-2 text-xs text-gray-500">
              Automated production schedule
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d1118] p-5">
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Batch Size
            </p>

            <p className="mt-3 text-2xl font-semibold">
              {healthLoading
                ? "..."
                : health?.scanner?.batchSize ?? "—"}
            </p>

            <p className="mt-2 text-xs text-gray-500">
              Assets scanned per cycle
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d1118] p-5">
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Supported Markets
            </p>

            <p className="mt-3 text-2xl font-semibold">
              {healthLoading
                ? "..."
                : health?.scanner?.supportedMarkets ?? "—"}
            </p>

            <p className="mt-2 text-xs text-gray-500">
              Current scanner universe
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d1118] p-5">
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Telegram
            </p>

            <p
              className={`mt-3 text-2xl font-semibold ${
                health?.scanner?.telegram
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}
            >
              {healthLoading
                ? "..."
                : health?.scanner?.telegram
                  ? "READY"
                  : "OFF"}
            </p>

            <p className="mt-2 text-xs text-gray-500">
              Automated alert channel
            </p>
          </div>
        </section>

        {/* Infrastructure status */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-[#0d1118]">
          <div className="border-b border-white/10 p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  NEXORA Infrastructure
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Production service health
                </p>
              </div>

              <span
                className={`w-fit rounded-full px-3 py-1 text-xs ${
                  systemLive
                    ? "bg-emerald-400/10 text-emerald-300"
                    : "bg-yellow-400/10 text-yellow-300"
                }`}
              >
                {health?.status ?? "Checking"}
              </span>
            </div>
          </div>

          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-black/20 p-4">
              <p className="text-xs text-gray-500">
                Twelve Data
              </p>

              <p
                className={`mt-2 text-sm font-medium ${
                  health?.scanner?.twelveData
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {health?.scanner?.twelveData
                  ? "Configured"
                  : "Unavailable"}
              </p>
            </div>

            <div className="rounded-xl bg-black/20 p-4">
              <p className="text-xs text-gray-500">
                OpenAI
              </p>

              <p
                className={`mt-2 text-sm font-medium ${
                  health?.scanner?.openAI
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {health?.scanner?.openAI
                  ? "Configured"
                  : "Unavailable"}
              </p>
            </div>

            <div className="rounded-xl bg-black/20 p-4">
              <p className="text-xs text-gray-500">
                Telegram
              </p>

              <p
                className={`mt-2 text-sm font-medium ${
                  health?.scanner?.telegram
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {health?.scanner?.telegram
                  ? "Configured"
                  : "Unavailable"}
              </p>
            </div>

            <div className="rounded-xl bg-black/20 p-4">
              <p className="text-xs text-gray-500">
                Cycle
              </p>

              <p className="mt-2 text-sm font-medium text-white">
                {health?.scanner?.cycleMinutes ?? "—"} min
              </p>
            </div>
          </div>
        </section>

        {/* Market snapshot */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-[#0d1118]">
          <div className="border-b border-white/10 p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  Market Snapshot
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Live Twelve Data market feed
                </p>
              </div>

              <span className="text-xs text-gray-500">
                Auto refresh · 30s
              </span>
            </div>
          </div>

          <div className="divide-y divide-white/5">
            {marketLoading ? (
              <div className="p-6 text-sm text-gray-500">
                Loading live markets...
              </div>
            ) : liveMarkets.length > 0 ? (
              liveMarkets.map((market) => (
                <div
                  key={market.symbol}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {market.symbol}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      Twelve Data · Live
                    </p>
                  </div>

                  <div className="flex items-center gap-6">
                    <p className="font-medium">
                      {formatPrice(market.price)}
                    </p>

                    <p
                      className={`w-20 text-right text-sm ${
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
              <div className="p-6 text-sm text-gray-500">
                No market data available.
              </div>
            )}
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

        {/* Automation summary */}
        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#0d1118] p-5">
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Automation
            </p>

            <h3 className="mt-2 text-xl font-semibold">
              Production scanner active
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              GitHub Actions triggers the production scanner on
              the configured schedule. The scanner processes a
              rotating batch of supported markets and keeps
              duplicate alert protection enabled.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/5 bg-black/20 p-4">
                <p className="text-xs text-gray-500">
                  Schedule
                </p>

                <p className="mt-1 text-sm font-medium">
                  {health?.scanner?.schedule ?? "—"}
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-black/20 p-4">
                <p className="text-xs text-gray-500">
                  Batch
                </p>

                <p className="mt-1 text-sm font-medium">
                  {health?.scanner?.batchSize ?? "—"} assets
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d1118] p-5">
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Alert Policy
            </p>

            <h3 className="mt-2 text-xl font-semibold">
              Strict trade filtering
            </h3>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-black/20 p-3">
                <span className="text-sm text-gray-400">
                  New signal only
                </span>

                <span className="text-xs text-emerald-400">
                  ACTIVE
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-black/20 p-3">
                <span className="text-sm text-gray-400">
                  Telegram protection
                </span>

                <span className="text-xs text-emerald-400">
                  ACTIVE
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-black/20 p-3">
                <span className="text-sm text-gray-400">
                  Production secret
                </span>

                <span className="text-xs text-emerald-400">
                  CONFIGURED
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-8 flex flex-col gap-2 border-t border-white/5 pt-5 text-xs text-gray-600 sm:flex-row sm:items-center sm:justify-between">
          <span>
            NEXORA AI · Production trading intelligence
          </span>

          <span>
            {health?.timestamp
              ? `Health checked ${new Date(
                  health.timestamp
                ).toLocaleTimeString()}`
              : "Health status unavailable"}
          </span>
        </footer>
      </main>
    </div>
  );
}
