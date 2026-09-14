"use client";

import Sidebar from "../components/Sidebar";

export default function EarthRadarPage() {
  return (
    <>
      <Sidebar />

      <main className="min-h-screen bg-[#070b12] text-white lg:ml-64">
        <div className="border-b border-white/10 px-6 py-5">
          <h1 className="text-2xl font-bold">Earth Radar</h1>
          <p className="mt-1 text-sm text-gray-500">
            Global market news and intelligence
          </p>
        </div>

        <div className="p-6">
          <div className="relative min-h-[600px] overflow-hidden rounded-2xl border border-white/10 bg-[#0a1019]">
            <div className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "radial-gradient(circle at center, rgba(34,211,238,.25) 0, transparent 45%), linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)",
                backgroundSize: "100% 100%, 50px 50px, 50px 50px",
              }}
            />

            <div className="relative flex h-[600px] items-center justify-center">
              <div className="text-center">
                <div className="mb-4 text-6xl">🌍</div>
                <h2 className="text-xl font-semibold">Global Market Radar</h2>
                <p className="mt-2 text-sm text-gray-500">
                  Real-time global news intelligence will appear here.
                </p>

                <div className="mt-6 inline-flex rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-4 py-2 text-xs text-yellow-400">
                  LIVE NEWS DATA — NEXT INTEGRATION
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
