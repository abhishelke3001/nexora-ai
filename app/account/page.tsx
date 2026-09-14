import { redirect } from "next/navigation";
import { createClient } from "../lib/supabase/server";

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, tokens")
    .eq("id", user.id)
    .single();

  const plan = profile?.plan ?? "Free";
  const tokens = profile?.tokens ?? 20;

  return (
    <main className="min-h-screen bg-[#070b12] text-white px-6 py-10 lg:ml-64">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold">Account</h1>
        <p className="mt-2 text-gray-500">
          {user.email}
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#0a1019] p-6">
            <p className="text-sm text-gray-500">Current Plan</p>
            <p className="mt-2 text-2xl font-bold">{plan}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0a1019] p-6">
            <p className="text-sm text-gray-500">Token Balance</p>
            <p className="mt-2 text-2xl font-bold">{tokens}</p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-[#0a1019] p-6">
          <h2 className="text-lg font-semibold">Token Costs</h2>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span>AI Analyze</span>
              <span>3 tokens</span>
            </div>
            <div className="flex justify-between">
              <span>Strategy Build</span>
              <span>5 tokens</span>
            </div>
            <div className="flex justify-between">
              <span>Deploy</span>
              <span>2 tokens</span>
            </div>
            <div className="flex justify-between">
              <span>Daily Brief</span>
              <span>1 token</span>
            </div>
            <div className="flex justify-between">
              <span>Scenario</span>
              <span>1 token</span>
            </div>
            <div className="flex justify-between">
              <span>Backtest</span>
              <span>1 token</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
