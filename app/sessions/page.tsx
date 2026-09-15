"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

type Session = {
  name: string;
  openUtc: number;
  closeUtc: number;
  active: boolean;
};

type SessionData = {
  sessions: Session[];
  activeSessions: string[];
  overlap: string;
  utcTime: string;
};

export default function SessionsPage() {
  const [data, setData] = useState<SessionData | null>(null);

  async function load() {
    const response = await fetch(
      "/api/sessions?t=" + Date.now(),
      { cache: "no-store" }
    );

    const json = await response.json();

    if (json.success) {
      setData(json);
    }
  }

  useEffect(() => {
    load();

    const timer = window.setInterval(load, 30_000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <>
      <Sidebar />

      <main className="min-h-screen bg-[#070b12] text-white lg:ml-64">
        <header className="border-b border-white/10 px-6 py-6">
          <h1 className="text-3xl font-bold">
            Trading Sessions
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Live global market-session status
          </p>
        </header>

        <section className="space-y-6 p-6">
          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-6">
            <p className="text-xs uppercase tracking-widest text-gray-500">
              CURRENT OVERLAP
            </p>

            <p className="mt-2 text-2xl font-bold text-cyan-300">
              {data?.overlap || "Loading..."}
            </p>

            {data?.utcTime && (
              <p className="mt-2 text-xs text-gray-500">
                UTC: {new Date(data.utcTime).toLocaleTimeString()}
              </p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {data?.sessions.map((session) => (
              <div
                key={session.name}
                className={`rounded-2xl border p-6 ${
                  session.active
                    ? "border-green-500/30 bg-green-500/5"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">
                    {session.name}
                  </h2>

                  <span
                    className={`h-3 w-3 rounded-full ${
                      session.active
                        ? "animate-pulse bg-green-400"
                        : "bg-gray-600"
                    }`}
                  />
                </div>

                <p
                  className={`mt-4 text-sm font-semibold ${
                    session.active
                      ? "text-green-400"
                      : "text-gray-500"
                  }`}
                >
                  {session.active ? "OPEN" : "CLOSED"}
                </p>

                <p className="mt-3 text-xs text-gray-500">
                  {session.openUtc
                    .toString()
                    .padStart(2, "0")}
                  :00 –{" "}
                  {session.closeUtc
                    .toString()
                    .padStart(2, "0")}
                  :00 UTC
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
