"use client";

import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import BtcChart from "./components/BtcChart";

type Market = {
  symbol: string;
  price: number;
  change24h: number | null;
};

export default function Home() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadMarkets() {
    try {
      const res = await fetch("/api/market", { cache: "no-store" });
      const data = await res.json();

      if (Array.isArray(data)) {
        setMarkets(data);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMarkets();

    const interval = setInterval(loadMarkets, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#07090d] text-white">
      <Sidebar />

      <main className="lg:ml-64 p-6 lg:p-10">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.25em] text-gray-500">
            NEXORA AI
          </p>

          <h1 className="mt-2 text-3xl font-semibold">
            Markets
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Real-time crypto market intelligence
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {markets.map((market) => (
            <div
              key={market.symbol}
              className="rounded-2xl border border-white/10 bg-[#0d1118] p-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {market.symbol}
                </span>

                <span
                  className={`text-xs ${
                    (market.change24h ?? 0) >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {market.change24h == null
                    ? "—"
                    : `${market.change24h.toFixed(2)}%`}
                </span>
              </div>

              <p className="mt-4 text-2xl font-semibold">
                {loading
                  ? "Loading..."
                  : market.price != null
                    ? market.price.toLocaleString(undefined, {
                        maximumFractionDigits: 8,
                      })
                    : "—"}
              </p>

              <p className="mt-2 text-xs text-gray-500">
                Binance · Live
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-[#0d1118] p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                BTC/USDT
              </h2>
              <p className="text-xs text-gray-500">
                Real Binance 1H candles
              </p>
            </div>

            <span className="text-xs text-green-400">
              LIVE
            </span>
          </div>

          <BtcChart />
        </div>
      </main>
    </div>
  );
}
