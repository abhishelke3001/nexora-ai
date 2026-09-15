"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

type Trade = {
  id: number;
  symbol: string;
  side: "BUY" | "SELL";
  price: number;
  amount: number;
  time: string;
};

type Position = {
  symbol: string;
  amount: number;
  avgPrice: number;
};

const START_BALANCE = 10000;

export default function PaperTradingPage() {
  const [prices, setPrices] = useState<any[]>([]);
  const [balance, setBalance] = useState(START_BALANCE);
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);

  async function loadPrices() {
    try {
      const r = await fetch("/api/market?t=" + Date.now(), {
        cache: "no-store",
      });

      if (!r.ok) {
        throw new Error(`Market API error: ${r.status}`);
      }

      const data = await r.json();

      if (!Array.isArray(data)) {
        throw new Error("Invalid market data");
      }

      setPrices(data);
    } catch (error) {
      console.error("Paper trading market load failed:", error);
      setPrices([]);
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem("nexora-paper");
    if (saved) {
      const data = JSON.parse(saved);
      setBalance(data.balance ?? START_BALANCE);
      setPositions(data.positions ?? []);
      setTrades(data.trades ?? []);
    }

    loadPrices();
    const id = setInterval(loadPrices, 300000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "nexora-paper",
      JSON.stringify({ balance, positions, trades })
    );
  }, [balance, positions, trades]);

  async function execute(symbol: string, side: "BUY" | "SELL") {
    const market = prices.find((p) => p.symbol === symbol);
    if (!market) return;

    const price = Number(market.price);
    const amountUSDT = Number(
      window.prompt(
        `${side} ${symbol}\nCurrent price: $${price.toLocaleString()}\n\nEnter USDT amount:`,
        "1000"
      )
    );

    if (!amountUSDT || amountUSDT <= 0) return;

    const quantity = amountUSDT / price;

    if (side === "BUY") {
      if (amountUSDT > balance) {
        alert("Insufficient paper balance.");
        return;
      }

      setBalance((b) => b - amountUSDT);

      setPositions((current) => {
        const existing = current.find((p) => p.symbol === symbol);

        if (!existing) {
          return [
            ...current,
            { symbol, amount: quantity, avgPrice: price },
          ];
        }

        const newAmount = existing.amount + quantity;
        const newAvg =
          (existing.amount * existing.avgPrice + amountUSDT) / newAmount;

        return current.map((p) =>
          p.symbol === symbol
            ? { ...p, amount: newAmount, avgPrice: newAvg }
            : p
        );
      });
    } else {
      const existing = positions.find((p) => p.symbol === symbol);

      if (!existing) {
        alert("No open position for this asset.");
        return;
      }

      const sellAmount = Math.min(quantity, existing.amount);
      const proceeds = sellAmount * price;

      setBalance((b) => b + proceeds);

      setPositions((current) =>
        current
          .map((p) =>
            p.symbol === symbol
              ? { ...p, amount: p.amount - sellAmount }
              : p
          )
          .filter((p) => p.amount > 0.00000001)
      );
    }

    setTrades((current) => [
      {
        id: Date.now(),
        symbol,
        side,
        price,
        amount: quantity,
        time: new Date().toLocaleString(),
      },
      ...current,
    ]);

    fetch("/api/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message:
          `📊 NEXORA AI PAPER TRADE\n\n` +
          `${side} ${symbol}\n` +
          `Price: $${price.toLocaleString()}\n` +
          `Amount: ${amountUSDT.toFixed(2)} USDT\n` +
          `Quantity: ${quantity.toFixed(6)}\n\n` +
          `Paper trading only.`,
      }),
    }).catch(() => {});
  }

  function resetPaperAccount() {
    if (!window.confirm("Reset paper account and delete trade history?")) return;

    setBalance(START_BALANCE);
    setPositions([]);
    setTrades([]);
    localStorage.removeItem("nexora-paper");
  }

  return (
    <>
      <Sidebar />

      <main className="min-h-screen bg-[#070b12] text-white lg:ml-64">
        <header className="border-b border-white/10 px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Paper Trading</h1>
              <p className="mt-1 text-sm text-gray-500">
                Simulated execution using live Twelve Data prices
              </p>
            </div>

            <button
              onClick={resetPaperAccount}
              className="rounded-lg border border-white/10 px-4 py-2 text-xs text-gray-400"
            >
              Reset
            </button>
          </div>
        </header>

        <section className="p-6">
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-xs text-gray-500">PAPER CASH</p>
              <p className="mt-2 text-2xl font-bold">
                {balance.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                USDT
              </p>
              <p className="mt-2 text-xs text-yellow-400">
                Simulated balance
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-xs text-gray-500">OPEN POSITIONS</p>
              <p className="mt-2 text-2xl font-bold">{positions.length}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-xs text-gray-500">TRADES</p>
              <p className="mt-2 text-2xl font-bold">{trades.length}</p>
            </div>
          </div>

          <h2 className="mb-4 text-lg font-semibold">Live Markets</h2>

          <div className="grid gap-5 md:grid-cols-3">
            {prices.map((p) => (
              <div
                key={p.symbol}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">{p.symbol}</h2>
                  <span className="text-xs text-green-400">LIVE</span>
                </div>

                <p className="mt-1 text-xs text-gray-500">Twelve Data</p>

                <p className="mt-6 text-3xl font-bold">
                  ${Number(p.price).toLocaleString()}
                </p>

                <p
                  className={
                    Number(p.change24h) >= 0
                      ? "mt-2 text-green-400"
                      : "mt-2 text-red-400"
                  }
                >
                  {Number(p.change24h).toFixed(2)}%
                </p>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => execute(p.symbol, "BUY")}
                    className="flex-1 rounded-xl bg-green-500 py-3 font-bold text-black"
                  >
                    BUY
                  </button>

                  <button
                    onClick={() => execute(p.symbol, "SELL")}
                    className="flex-1 rounded-xl bg-red-500 py-3 font-bold"
                  >
                    SELL
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="mb-4 text-lg font-semibold">Open Positions</h2>

            {positions.length === 0 ? (
              <p className="text-sm text-gray-500">No open positions.</p>
            ) : (
              <div className="space-y-3">
                {positions.map((p) => (
                  <div
                    key={p.symbol}
                    className="flex items-center justify-between border-b border-white/5 pb-3"
                  >
                    <span className="font-semibold">{p.symbol}</span>
                    <span className="text-sm text-gray-400">
                      {p.amount.toFixed(6)} @ $
                      {p.avgPrice.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="mb-4 text-lg font-semibold">Trade History</h2>

            {trades.length === 0 ? (
              <p className="text-sm text-gray-500">No trades yet.</p>
            ) : (
              <div className="space-y-3">
                {trades.slice(0, 20).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between border-b border-white/5 pb-3 text-sm"
                  >
                    <div>
                      <span
                        className={
                          t.side === "BUY"
                            ? "font-bold text-green-400"
                            : "font-bold text-red-400"
                        }
                      >
                        {t.side}
                      </span>{" "}
                      {t.symbol}
                    </div>

                    <div className="text-gray-400">
                      ${t.price.toLocaleString()} · {t.time}
                    </div>
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
