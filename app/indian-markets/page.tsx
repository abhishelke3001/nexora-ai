"use client";

import Sidebar from "../components/Sidebar";

const indices = [
  { name: "NIFTY 50", exchange: "NSE" },
  { name: "BANK NIFTY", exchange: "NSE" },
  { name: "SENSEX", exchange: "BSE" },
  { name: "NIFTY IT", exchange: "NSE" },
];

export default function IndianMarketsPage() {
  return (
    <>
      <Sidebar />

      <main className="min-h-screen bg-[#070b12] text-white lg:ml-64">
        <div className="border-b border-white/10 px-6 py-5">
          <h1 className="text-2xl font-bold">Indian Markets</h1>
          <p className="mt-1 text-sm text-gray-500">
            NSE & BSE market intelligence
          </p>
        </div>

        <div className="p-6">
          <div className="mb-6 flex gap-2">
            <button className="rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-black">
              NSE
            </button>

            <button className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-gray-400">
              BSE
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {indices.map((index) => (
              <div
                key={index.name}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{index.name}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      {index.exchange}
                    </div>
                  </div>

                  <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-2 py-1 text-[10px] text-yellow-400">
                    DATA PENDING
                  </div>
                </div>

                <div className="mt-8 text-sm text-gray-500">
                  Live market data will be connected later.
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold">Indian Stocks</h2>

            <p className="mt-2 text-sm text-gray-500">
              NSE/BSE stock watchlists, charts, AI analysis and signals will
              appear here after the real market-data integration.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}