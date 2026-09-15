"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

type Scenario = {
  currentPrice: number;
  scenarioPrice: number;
  shockPercent: number;
  verdict: string;
  confidence: number;
  currentLevels: {
    entry?: number | null;
    stopLoss?: number | null;
    target1?: number | null;
    target2?: number | null;
  };
  scenarioLevels: {
    entry?: number | null;
    stopLoss?: number | null;
    target1?: number | null;
    target2?: number | null;
  };
};

export default function ScenarioPage() {
  const [shock, setShock] = useState(0);
  const [data, setData] = useState<Scenario | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function simulate(value = shock) {
    try {
      setLoading(true);

      const response = await fetch(
        `/api/scenario?symbol=BTC/USD&shock=${encodeURIComponent(value)}&t=${Date.now()}`,
        { cache: "no-store" }
      );

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || "Scenario failed");
      }

      setData(json);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Scenario simulation failed"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    simulate(0);
  }, []);

  return (
    <>
      <Sidebar />

      <main className="min-h-screen bg-[#070b12] text-white lg:ml-64">
        <header className="border-b border-white/10 px-6 py-6">
          <h1 className="text-3xl font-bold">
            Scenario Simulator
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Test BTC price shocks against the current NEXORA market model.
          </p>
        </header>

        <section className="space-y-6 p-6">
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-end">
              <div className="flex-1">
                <label className="text-sm text-gray-400">
                  Price shock (%)
                </label>

                <input
                  type="number"
                  step="0.5"
                  value={shock}
                  onChange={(event) =>
                    setShock(Number(event.target.value))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
                  placeholder="-10 to +10"
                />
              </div>

              <button
                onClick={() => simulate()}
                disabled={loading}
                className="rounded-xl bg-white px-6 py-3 font-bold text-black disabled:opacity-50"
              >
                {loading ? "Simulating..." : "Run Scenario"}
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {[-10, -5, -2, 0, 2, 5, 10].map((value) => (
                <button
                  key={value}
                  onClick={() => {
                    setShock(value);
                    simulate(value);
                  }}
                  className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-gray-300"
                >
                  {value > 0 ? `+${value}%` : `${value}%`}
                </button>
              ))}
            </div>
          </div>

          {data && (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <Metric
                  label="Current BTC"
                  value={format(data.currentPrice)}
                />

                <Metric
                  label="Scenario BTC"
                  value={format(data.scenarioPrice)}
                />

                <Metric
                  label="Scenario"
                  value={
                    data.shockPercent > 0
                      ? `+${data.shockPercent}%`
                      : `${data.shockPercent}%`
                  }
                />

                <Metric
                  label="NEXORA Verdict"
                  value={`${data.verdict} · ${data.confidence}%`}
                  tone={data.verdict}
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Levels
                  title="Current levels"
                  levels={data.currentLevels}
                />

                <Levels
                  title="Scenario-adjusted levels"
                  levels={data.scenarioLevels}
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <h2 className="text-lg font-semibold">
                  Lane snapshot
                </h2>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <Lane
                    label="Technical"
                    value={data.lanes?.technical?.verdict}
                  />
                  <Lane
                    label="Flow"
                    value={data.lanes?.flow?.verdict}
                  />
                  <Lane
                    label="News"
                    value={data.lanes?.news?.sentiment}
                  />
                  <Lane
                    label="Macro"
                    value={data.lanes?.macro?.bias}
                  />
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  const color =
    tone === "LONG"
      ? "text-green-400"
      : tone === "SHORT"
        ? "text-red-400"
        : tone === "WAIT"
          ? "text-yellow-400"
          : "text-white";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${color}`}>
        {value}
      </p>
    </div>
  );
}

function Levels({
  title,
  levels,
}: {
  title: string;
  levels: {
    entry?: number | null;
    stopLoss?: number | null;
    target1?: number | null;
    target2?: number | null;
  };
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="text-lg font-semibold">{title}</h2>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Level label="Entry" value={levels.entry} />
        <Level label="Stop Loss" value={levels.stopLoss} />
        <Level label="Target 1" value={levels.target1} />
        <Level label="Target 2" value={levels.target2} />
      </div>
    </div>
  );
}

function Level({
  label,
  value,
}: {
  label: string;
  value?: number | null;
}) {
  return (
    <div className="rounded-xl bg-white/[0.04] p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 font-semibold">
        {value == null ? "—" : format(value)}
      </p>
    </div>
  );
}

function Lane({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div className="rounded-xl bg-white/[0.04] p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 font-semibold">{value || "NEUTRAL"}</p>
    </div>
  );
}

function format(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
