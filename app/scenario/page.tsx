"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

type Scenario = {
  success: boolean;
  currentPrice?: number;
  scenarioPrice?: number;
  shockPercent?: number;
  liveVerdict?: string;
  scenarioVerdict?: string;
  confidence?: number;
  technical?: {
    verdict?: string;
    ema20?: number | null;
    ema50?: number | null;
    rsi?: number | null;
    macd?: number | null;
  };
  lanes?: {
    technical?: string;
    flow?: string;
    news?: string;
    macro?: string;
  };
  scenarioLevels?: {
    entry?: number | null;
    stopLoss?: number | null;
    target1?: number | null;
    target2?: number | null;
  };
  error?: string;
};

export default function ScenarioPage() {
  const [shock, setShock] = useState(0);
  const [data, setData] = useState<Scenario | null>(null);
  const [loading, setLoading] = useState(false);

  async function runScenario(value: number) {
    setLoading(true);

    try {
      const response = await fetch(
        `/api/scenario?symbol=BTC/USD&shock=${value}&t=${Date.now()}`,
        { cache: "no-store" }
      );

      const json = await response.json();
      setData(json);
    } catch {
      setData({
        success: false,
        error: "Unable to load scenario data",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runScenario(0);
  }, []);

  return (
    <>
      <Sidebar />

      <main className="min-h-screen bg-[#070b12] text-white lg:ml-64">
        <header className="border-b border-white/10 px-6 py-6">
          <h1 className="text-3xl font-bold">Scenario Simulator</h1>
          <p className="mt-1 text-sm text-gray-500">
            Test BTC price scenarios against live NEXORA intelligence.
          </p>
        </header>

        <section className="space-y-6 p-6">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <label className="text-sm text-gray-400">
              Price shock
            </label>

            <div className="mt-3 flex flex-col gap-4 md:flex-row">
              <input
                type="number"
                value={shock}
                onChange={(e) => setShock(Number(e.target.value))}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3"
              />

              <button
                onClick={() => runScenario(shock)}
                disabled={loading}
                className="rounded-xl bg-white px-6 py-3 font-bold text-black"
              >
                {loading ? "Loading..." : "Run Scenario"}
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {[-10, -5, 0, 5, 10].map((value) => (
                <button
                  key={value}
                  onClick={() => {
                    setShock(value);
                    runScenario(value);
                  }}
                  className="rounded-lg border border-white/10 px-3 py-2 text-sm"
                >
                  {value > 0 ? `+${value}%` : `${value}%`}
                </button>
              ))}
            </div>
          </div>

          {data?.error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-red-400">
              {data.error}
            </div>
          )}

          {data?.success && (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <Card
                  label="Current BTC"
                  value={format(data.currentPrice)}
                />
                <Card
                  label="Scenario BTC"
                  value={format(data.scenarioPrice)}
                />
                <Card
                  label="Scenario"
                  value={`${data.shockPercent ?? 0}%`}
                />
                <Card
                  label="Scenario Verdict"
                  value={`${data.scenarioVerdict ?? "WAIT"} · ${data.confidence ?? 0}%`}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <Card
                  label="Technical"
                  value={data.technical?.verdict || "WAIT"}
                />
                <Card
                  label="Flow"
                  value={data.lanes?.flow || "NEUTRAL"}
                />
                <Card
                  label="News"
                  value={data.lanes?.news || "NEUTRAL"}
                />
                <Card
                  label="Macro"
                  value={data.lanes?.macro || "NEUTRAL"}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <Card
                  label="Entry"
                  value={format(data.scenarioLevels?.entry)}
                />
                <Card
                  label="Stop Loss"
                  value={format(data.scenarioLevels?.stopLoss)}
                />
                <Card
                  label="Target 1"
                  value={format(data.scenarioLevels?.target1)}
                />
                <Card
                  label="Target 2"
                  value={format(data.scenarioLevels?.target2)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <Card
                  label="EMA20"
                  value={format(data.technical?.ema20)}
                />
                <Card
                  label="EMA50"
                  value={format(data.technical?.ema50)}
                />
                <Card
                  label="RSI"
                  value={format(data.technical?.rsi)}
                />
                <Card
                  label="MACD"
                  value={format(data.technical?.macd)}
                />
              </div>
            </>
          )}
        </section>
      </main>
    </>
  );
}

function Card({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-2 text-xl font-bold">{value}</p>
    </div>
  );
}

function format(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";

  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
