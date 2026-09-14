"use client";

import { useEffect, useState } from "react";
import { RefreshCw, TrendingDown, TrendingUp } from "lucide-react";

type Market = {
  symbol: string;
  name: string;
  type: string;
  price: number | null;
  change: number | null;
  previousClose: number | null;
  marketState: string | null;
  source: string;
};

export default function IndianMarketsPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState("");

  const loadMarkets = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/indian-markets", { cache: "no-store" });
      const json = await res.json();

      if (json.success) {
        setMarkets(json.data);
        setUpdatedAt(json.updatedAt);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarkets();
    const timer = setInterval(loadMarkets, 30000);
    return () => clearInterval(timer);
  }, []);

  const indices = markets.filter((m) => m.type === "INDEX");
  const stocks = markets.filter((m) => m.type === "STOCK");

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Indian Markets</h1>
            <p className="mt-2 text-zinc-400">
              Live NSE market intelligence powered by Yahoo Finance
            </p>
          </div>

          <button
            onClick={loadMarkets}
            className="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-900"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {loading && markets.length === 0 ? (
          <div className="text-zinc-400">Loading live Indian markets...</div>
        ) : (
          <>
            <section>
              <h2 className="mb-4 text-xl font-semibold">Major Indices</h2>

              <div className="grid gap-4 md:grid-cols-2">
                {indices.map((market) => {
                  const positive = (market.change ?? 0) >= 0;

                  return (
                    <div
                      key={market.symbol}
                      className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-zinc-400">{market.name}</p>
                          <p className="mt-2 text-3xl font-bold">
                            {market.price?.toLocaleString("en-IN", {
                              maximumFractionDigits: 2,
                            }) ?? "—"}
                          </p>
                        </div>

                        {positive ? (
                          <TrendingUp className="text-green-400" />
                        ) : (
                          <TrendingDown className="text-red-400" />
                        )}
                      </div>

                      <p
                        className={`mt-3 text-sm ${
                          positive ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {positive ? "+" : ""}
                        {market.change?.toFixed(2) ?? "—"}%
                      </p>

                      <p className="mt-4 text-xs text-zinc-500">
                        LIVE · {market.source}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="mt-10">
              <h2 className="mb-4 text-xl font-semibold">Indian Stocks</h2>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stocks.map((market) => {
                  const positive = (market.change ?? 0) >= 0;

                  return (
                    <div
                      key={market.symbol}
                      className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
                    >
                      <p className="text-sm text-zinc-400">{market.name}</p>
                      <p className="mt-2 text-2xl font-bold">
                        ₹
                        {market.price?.toLocaleString("en-IN", {
                          maximumFractionDigits: 2,
                        }) ?? "—"}
                      </p>
                      <p
                        className={`mt-2 text-sm ${
                          positive ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {positive ? "+" : ""}
                        {market.change?.toFixed(2) ?? "—"}%
                      </p>
                      <p className="mt-3 text-xs text-zinc-500">
                        LIVE · {market.source}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {updatedAt && (
              <p className="mt-8 text-xs text-zinc-600">
                Last update: {new Date(updatedAt).toLocaleTimeString("en-IN")}
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
