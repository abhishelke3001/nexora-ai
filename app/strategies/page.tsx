"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

export default function StrategiesPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const r = await fetch("/api/strategies?t=" + Date.now(), {
        cache: "no-store",
      });
      const json = await r.json();
      setData(Array.isArray(json) ? json : (json.strategies || []));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <Sidebar />

      <main className="min-h-screen bg-[#070b12] text-white lg:ml-64">
        <header className="border-b border-white/10 px-6 py-6">
          <h1 className="text-3xl font-bold">Strategies</h1>
          <p className="mt-1 text-sm text-gray-500">
            Live market strategy intelligence
          </p>
        </header>

        <section className="p-6">
          {loading ? (
            <p className="text-gray-400">Loading live market data...</p>
          ) : data.length === 0 ? (
            <p className="text-red-400">No live strategy data available.</p>
          ) : (
            <div className="grid gap-5 md:grid-cols-3">
              {data.map((item) => (
                <div
                  key={item.symbol}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold">{item.symbol}</h2>
                      <p className="text-xs text-gray-500">
                        Twelve Data · 1H · Live
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        item.trend === "BULLISH"
                          ? "bg-green-500/15 text-green-400"
                          : item.trend === "BEARISH"
                            ? "bg-red-500/15 text-red-400"
                            : "bg-yellow-500/15 text-yellow-400"
                      }`}
                    >
                      {item.trend}
                    </span>
                  </div>

                  <div className="mt-7">
                    <p className="text-xs text-gray-500">LIVE PRICE</p>
                    <p className="mt-1 text-3xl font-bold">
                      ${Number(item.price).toLocaleString()}
                    </p>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white/[0.04] p-4">
                      <p className="text-xs text-gray-500">SMA 20</p>
                      <p className="mt-1 font-semibold">
                        {Number(item.sma20).toLocaleString()}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white/[0.04] p-4">
                      <p className="text-xs text-gray-500">SMA 50</p>
                      <p className="mt-1 font-semibold">
                        {Number(item.sma50).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 text-xs text-gray-600">
                    Automatically refreshed every 10 seconds
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
