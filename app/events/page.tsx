"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

type EventItem = {
  date: string;
  time: string;
  country: string;
  importance: "HIGH" | "MEDIUM";
  event: string;
  source: string;
  sourceUrl: string;
};

type Data = {
  success: boolean;
  today: string;
  source: string;
  events: EventItem[];
};

export default function EventsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const response = await fetch(
        "/api/events?t=" + Date.now(),
        { cache: "no-store" }
      );

      const json = await response.json();

      if (json.success) {
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 300_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <>
      <Sidebar />

      <main className="min-h-screen bg-[#070b12] text-white lg:ml-64">
        <header className="border-b border-white/10 px-6 py-6">
          <h1 className="text-3xl font-bold">
            Economic Events
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Official scheduled U.S. economic releases
          </p>
        </header>

        <section className="space-y-6 p-6">
          <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5">
            <p className="text-sm text-yellow-300">
              This is an official-release calendar, not a full
              global consensus calendar. Actual/forecast values are
              not inferred or fabricated.
            </p>
          </div>

          {loading ? (
            <p className="text-gray-500">
              Loading events...
            </p>
          ) : (
            <div className="space-y-3">
              {data?.events?.map((item) => (
                <a
                  key={`${item.date}-${item.event}`}
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-white/20 md:grid-cols-[120px_100px_1fr_90px]"
                >
                  <div>
                    <p className="text-xs text-gray-500">
                      DATE
                    </p>
                    <p className="mt-1 font-semibold">
                      {item.date}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">
                      TIME
                    </p>
                    <p className="mt-1">
                      {item.time}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">
                      EVENT
                    </p>
                    <p className="mt-1 font-semibold">
                      {item.event}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {item.source}
                    </p>
                  </div>

                  <div>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                        item.importance === "HIGH"
                          ? "border-red-500/20 bg-red-500/10 text-red-400"
                          : "border-yellow-500/20 bg-yellow-500/10 text-yellow-400"
                      }`}
                    >
                      {item.importance}
                    </span>
                  </div>
                </a>
              ))}

              {!data?.events?.length && (
                <p className="text-sm text-gray-500">
                  No scheduled events available.
                </p>
              )}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
