"use client";

import Sidebar from "../components/Sidebar";

const plans = [
  { name: "Free", price: "₹0", tokens: "20 tokens", features: ["Basic AI analysis", "Charts", "Paper trading"] },
  { name: "Trader", price: "₹999/mo", tokens: "500 tokens", features: ["AI analysis", "Strategies", "Backtesting", "Telegram alerts"] },
  { name: "Pro", price: "₹1,499/mo", tokens: "1,500 tokens", features: ["Everything in Trader", "Advanced intelligence", "Priority analysis"] },
  { name: "Quant", price: "₹2,499/mo", tokens: "2,500 tokens", features: ["Everything in Pro", "Advanced backtesting", "Quant workflows"] },
];

export default function PricingPage() {
  return (
    <>
      <Sidebar />
      <main className="min-h-screen bg-[#070b12] text-white lg:ml-64">
        <div className="border-b border-white/10 px-6 py-5">
          <h1 className="text-2xl font-bold">Plans & Pricing</h1>
          <p className="mt-1 text-sm text-gray-500">
            Choose the intelligence level that fits your workflow
          </p>
        </div>

        <div className="p-6">
          <div className="mb-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5">
            <div className="text-sm text-gray-400">Current balance</div>
            <div className="mt-1 text-3xl font-bold">20 tokens</div>
            <div className="mt-1 text-xs text-gray-500">Free plan</div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-6 ${
                  plan.name === "Pro"
                    ? "border-cyan-500/40 bg-cyan-500/5"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <div className="text-lg font-semibold">{plan.name}</div>
                <div className="mt-4 text-3xl font-bold">{plan.price}</div>
                <div className="mt-2 text-sm text-cyan-400">{plan.tokens}</div>

                <div className="my-6 space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="text-sm text-gray-400">
                      ✓ {feature}
                    </div>
                  ))}
                </div>

                <button
                  disabled={plan.name === "Free"}
                  className="w-full rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {plan.name === "Free" ? "Current Plan" : "Choose Plan"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
