"use client";

import { useState } from "react";
import BtcChart from "../components/BtcChart";
import Sidebar from "../components/Sidebar";

const symbols = [
  "BTC/USD",
  "ETH/USD",
  "SOL/USD",
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "USD/CHF",
  "AUD/USD",
  "USD/CAD",
  "NZD/USD",
];
const timeframes = ["15M", "1H", "4H", "1D"];

export default function ChartsPage() {
  const [symbol, setSymbol] = useState("BTC/USD");
  const [timeframe, setTimeframe] = useState("1H");
  const [signal, setSignal] = useState<any>(null);

  async function loadSignal() {
    try {
      const response = await fetch(
        `/api/verdict?symbol=${encodeURIComponent(symbol)}&t=${Date.now()}`,
        { cache: "no-store" }
      );

      if (!response.ok) return;

      const data = await response.json();

      if (data?.success) {
        setSignal({
          verdict: data.verdict,
          entry: data.levels?.entry,
          stopLoss: data.levels?.stopLoss,
          target1: data.levels?.target1,
          target2: data.levels?.target2,
        });
      }
    } catch {}
  }

  useEffect(() => {
    loadSignal();

    const timer = window.setInterval(loadSignal, 60_000);

    return () => window.clearInterval(timer);
  }, [symbol]);


  return (
    <>
      <Sidebar />

      <main className="min-h-screen bg-[#070b12] text-white lg:ml-64">
        <div className="border-b border-white/10 px-6 py-5">
          <h1 className="text-2xl font-bold">Charts</h1>
          <p className="mt-1 text-sm text-gray-500">
            Real-time market charts and technical intelligence
          </p>
        </div>

        <div className="p-6">
          <div className="mb-5 flex gap-2 overflow-x-auto">
            {symbols.map((item) => (
              <button
                key={item}
                onClick={() => setSymbol(item)}
                className={`rounded-xl px-5 py-3 text-sm font-semibold ${
                  symbol === item
                    ? "bg-cyan-500 text-black"
                    : "border border-white/10 bg-white/[0.04] text-gray-400"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">{symbol}</div>
                <div className="text-xs text-gray-500">
                  {symbol.includes("/") && symbol.endsWith("USD") ? "Twelve Data" : "Twelve Data"} · {timeframe}
                </div>
              </div>

              <div className="flex gap-2">
                {timeframes.map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`rounded-lg px-3 py-2 text-xs ${
                      tf === timeframe
                        ? "bg-white/10 text-white"
                        : "text-gray-500"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            <BtcChart symbol={symbol} timeframe={timeframe} signal={signal} />
          </div>
        </div>
      </main>
    </>
  );
}
