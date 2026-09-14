import { NextResponse } from "next/server";
import { createClient } from "../../lib/supabase/server";

const COSTS = {
  analyze: 3,
  strategy: 5,
  deploy: 2,
  brief: 1,
  scenario: 1,
  backtest: 1,
};

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("plan, tokens")
    .eq("id", user.id)
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    plan: profile.plan,
    balance: profile.tokens,
    costs: COSTS,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { action } = await request.json();

  if (!action || !(action in COSTS)) {
    return NextResponse.json(
      { error: "Invalid token action" },
      { status: 400 }
    );
  }

  const cost = COSTS[action as keyof typeof COSTS];

  const { data: newBalance, error } = await supabase.rpc(
    "use_tokens",
    {
      amount: cost,
    }
  );

  if (error) {
    return NextResponse.json(
      {
        error:
          error.message === "Insufficient tokens"
            ? "Insufficient tokens"
            : error.message,
      },
      { status: 402 }
    );
  }

  return NextResponse.json({
    success: true,
    action,
    cost,
    balance: newBalance,
  });
}
